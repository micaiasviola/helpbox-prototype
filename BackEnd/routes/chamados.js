/**
 * @file routes/chamados.js
 * @description API de Gerenciamento de Tickets.
 * * Este é o arquivo mais complexo do backend. Ele gerencia todo o ciclo de vida do chamado:
 * Abertura (com IA), Listagem (com filtros avançados), Atualização (Técnico) e Fechamento (Cliente).
 * * Destaque: Implementei uma ordenação personalizada no SQL (CASE WHEN) para garantir que
 * cada usuário veja primeiro o que é mais relevante para ele.
 * @author [Micaias Viola - Full Stack Developer]
 */

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');
const { gerarRespostaIA } = require('../services/iaService.js');
const verificarAdm = require('../middlewares/verificarADM.js');

// ====================================================================
// FUNÇÕES AUXILIARES (REUTILIZÁVEIS)
// ====================================================================

/**
 * @function fetchChamadosList
 * @description Engine de Busca Centralizada.
 * * Criei esta função para eliminar a duplicação de código entre as rotas /meus, /tecnico e / (todos).
 * Ela encapsula a lógica de paginação (OFFSET/FETCH), filtros dinâmicos e a ordenação complexa.
 * * @param {Object} req Objeto de requisição do Express.
 * @param {Object} res Objeto de resposta do Express.
 * @param {string} customWhere Cláusula WHERE específica da rota (ex: só meus chamados).
 * @param {string} customOrder Cláusula ORDER BY específica (opcional).
 * @param {Object} params Parâmetros adicionais para o SQL (ex: usuarioId).
 */
async function fetchChamadosList(req, res, customWhere = '', customOrder = '', params = {}) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const offset = (page - 1) * pageSize;
    
    // Pega o ID do usuário da sessão para usar na ordenação (mesmo se não vier nos params)
    const usuarioLogadoId = params.usuarioId || req.session?.usuario?.id || 0;

    const searchTerm = (req.query.q || '').trim();
    const statusFilter = req.query.status || '';
    
    // Detecção inteligente: se o usuário digitou números, ele provavelmente quer buscar por ID
    const isNumericInput = /^\d+$/.test(searchTerm);

    let whereClause = `1 = 1`;
    
    // Filtros Dinâmicos
    if (customWhere) whereClause += ` AND ${customWhere}`;
    if (statusFilter) whereClause += ` AND C.status_Cham = @statusFilter`;
    
    // Busca Inteligente (ID ou Texto)
    if (searchTerm) {
        if (isNumericInput) {
            whereClause += ` AND (
                CAST(C.id_Cham AS NVARCHAR(20)) LIKE @searchIdPattern 
                OR C.titulo_Cham LIKE @searchTerm 
                OR C.descricao_Cham LIKE @searchTerm
            )`;
        } else {
            whereClause += ` AND (C.titulo_Cham LIKE @searchTerm OR C.descricao_Cham LIKE @searchTerm)`;
        }
    }

    /**
     * LÓGICA DE ORDENAÇÃO 
     * * O SQL Server precisa ordenar os resultados ANTES de paginar.
     * * A regra é: 
     * 1. Meus chamados em andamento (Urgente).
     * 2. Chamados livres para pegar (Oportunidade).
     * 3. Resto (Histórico).
     * * Isso garante que, mesmo na página 1, o técnico veja o que importa.
     */
    const defaultOrder = `
        ORDER BY 
        CASE 
            -- 1. CONTINUAR (Peso 0)
            -- 'Em andamento' E o técnico sou eu
            WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 
            
            -- 2. ASSUMIR (Peso 1)
            -- 'Em andamento' E (Sem técnico) E (Eu NÃO sou o criador - regra de conflito de interesse)
            WHEN C.status_Cham = 'Em andamento' 
                 AND (C.tecResponsavel_Cham IS NULL OR C.tecResponsavel_Cham = 0)
                 AND C.clienteId_Cham <> @usuarioId THEN 1
            
            -- 3. OLHO / RESTO (Peso 2)
            ELSE 2 
        END ASC,
        
        -- DESEMPATE DO GRUPO "OLHO"
        -- Mostra 'Aberto' (Novos) antes de 'Fechado'
        CASE WHEN C.status_Cham = 'Aberto' THEN 0 ELSE 1 END ASC,

        -- FINALMENTE: Data mais recente
        C.dataAbertura_Cham DESC 
    `;
    
    const finalOrder = customOrder || defaultOrder;

    try {
        const pool = await getPool();
        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .input('statusFilter', sql.NVarChar, statusFilter)
            .input('searchTerm', sql.NVarChar, `%${searchTerm}%`)
            .input('usuarioId', sql.Int, usuarioLogadoId);

        if (isNumericInput) {
            request.input('searchIdPattern', sql.NVarChar, `${searchTerm}%`);
        }

        for (const [key, value] of Object.entries(params)) {
            if (key !== 'usuarioId') {
                request.input(key, sql.Int, value);
            }
        }

        // Executa duas queries: Uma para os dados paginados e outra para o total (para a paginação do front)
        const query = `
            SELECT C.*, U.nome_User, U.sobrenome_User, 
                   TEC.nome_User as tecNome, TEC.sobrenome_User as tecSobrenome
            FROM Chamado AS C
            INNER JOIN Usuario AS U ON C.clienteId_Cham = U.id_User
            LEFT JOIN Usuario AS TEC ON C.tecResponsavel_Cham = TEC.id_User
            WHERE ${whereClause}
            ${finalOrder}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

            SELECT COUNT(C.id_Cham) AS totalCount 
            FROM Chamado AS C
            WHERE ${whereClause};
        `;

        const result = await request.query(query);

        res.json({
            chamados: result.recordsets[0],
            totalCount: result.recordsets[1][0].totalCount,
            page,
            pageSize
        });

    } catch (error) {
        console.error('Erro fetchChamadosList:', error);
        res.status(500).json({ error: 'Erro ao listar chamados.' });
    }
}

// ====================================================================
// ROTAS DE LISTAGEM
// ====================================================================

// GET /meus: Lista chamados relacionados ao usuário logado.
// Suporta filtro 'tipo' para distinguir "Criados por mim" vs "Atribuídos a mim".
router.get('/meus', async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    const tipoFilter = req.query.tipo || ''; 

    if (!usuarioId) return res.status(401).json({ error: 'Não autenticado' });

    let where = '';
    
    if (tipoFilter === 'criado') {
        where = `C.clienteId_Cham = @usuarioId`;
    } else if (tipoFilter === 'atribuido') {
        where = `C.tecResponsavel_Cham = @usuarioId`;
    } else {
        // Default: Mostra tudo que tem a ver comigo
        where = `(C.tecResponsavel_Cham = @usuarioId OR C.clienteId_Cham = @usuarioId)`;
    }

    // Ordenação Específica para "Meus Chamados" (Prioriza o que eu preciso resolver)
    const order = `
        ORDER BY 
        CASE WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 ELSE 1 END ASC,
        CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 WHEN 'Fechado' THEN 3 ELSE 9 END ASC,
        C.dataAbertura_Cham DESC
    `;

    await fetchChamadosList(req, res, where, order, { usuarioId });
});

// GET /tecnico: Fila de Chamados Livres (Pool).
// Apenas técnicos podem ver. Mostra o que está "sobrando" para ser pego.
router.get('/tecnico', async (req, res) => {
    const nivel = req.session?.usuario?.nivel_acesso;
    const usuarioId = req.session?.usuario?.id;

    if (nivel < 2) return res.status(403).json({ error: 'Acesso negado.' });

    const where = `C.tecResponsavel_Cham IS NULL AND C.status_Cham = 'Em andamento'`;
    
    // Uso a ordenação padrão (defaultOrder) que já trata a lógica de "Assumir"
    await fetchChamadosList(req, res, where, '', { usuarioId });
});

// GET /: Visão Administrativa (Ver Tudo).
// Rota protegida pelo middleware verificarAdm.
router.get('/', verificarAdm, async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    
    const order = `
        ORDER BY 
        CASE WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 ELSE 1 END ASC,
        CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 ELSE 9 END ASC,
        C.dataAbertura_Cham DESC
    `;
    await fetchChamadosList(req, res, '', '', { usuarioId });
});

// ====================================================================
// ROTA DE DETALHE
// ====================================================================

router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido.' });

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT C.*, 
                       U.nome_User as clienteNome, U.sobrenome_User as clienteSobrenome,
                       TEC.nome_User as tecNome, TEC.sobrenome_User as tecSobrenome
                FROM Chamado C
                INNER JOIN Usuario U ON C.clienteId_Cham = U.id_User
                LEFT JOIN Usuario TEC ON C.tecResponsavel_Cham = TEC.id_User
                WHERE C.id_Cham = @id
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: 'Chamado não encontrado.' });
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Erro GET ID:', error);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// ====================================================================
// ROTA POST (CRIAR)
// ====================================================================

// POST /: Abertura de Chamado.
// Integração com IA para classificação automática e sugestão de solução.
router.post('/', async (req, res) => {
    try {
        const { titulo, categoria, descricao, status, impacto, usuarios, frequencia } = req.body;
        const clienteId = req.session?.usuario?.id;

        const dataAbertura = new Date(req.body.dataAbertura || new Date());
        const dataProblema = req.body.dataProblema ? new Date(req.body.dataProblema) : dataAbertura;

        // 1. Inteligência Artificial
        // Antes de salvar, consulto a IA para obter uma prioridade sugerida e uma possível solução.
        const respostaIA = await gerarRespostaIA(categoria, descricao, titulo, frequencia, impacto, usuarios);
        
        // Tratamento de limite de texto (Segurança contra Buffer Overflow no banco)
        let solucaoFinal = respostaIA.solucao || "Sem sugestão da IA."; 
        if (solucaoFinal.length > 3500) {
            solucaoFinal = solucaoFinal.substring(0, 3500) + '... [Texto cortado]';
        }

        const prioridadeFinal = respostaIA.prioridade || 'M';

        console.log(`[Novo Chamado] Prioridade IA: ${prioridadeFinal}`);

        const pool = await getPool();
        
        // Uso OUTPUT INSERTED para garantir que recebo o ID gerado, mesmo em alta concorrência.
        const result = await pool.request()
            .input('clienteId', sql.Int, clienteId)
            .input('titulo', sql.VarChar(255), titulo)
            .input('categoria', sql.VarChar(50), categoria)
            .input('descricao', sql.VarChar(sql.MAX), descricao)
            .input('status', sql.VarChar(20), status || 'Aberto')
            .input('dataAbertura', sql.DateTime, dataAbertura)
            .input('dataProblema', sql.DateTime, dataProblema)
            .input('impacto', sql.VarChar(50), impacto || null)
            .input('usuarios', sql.VarChar(50), usuarios || null)
            .input('frequencia', sql.VarChar(50), frequencia || null)
            .input('prioridade', sql.Char(1), prioridadeFinal)
            .input('solucaoIA', sql.NVarChar(sql.MAX), solucaoFinal)
            .query(`
                DECLARE @OutputTbl TABLE (id_Cham INT);

                INSERT INTO Chamado (
                    clienteId_Cham, titulo_Cham, status_Cham, dataAbertura_Cham, categoria_Cham, descricao_Cham,
                    dataProblema, impacto_Cham, usuarios_Cham, frequencia_Cham, prioridade_Cham, solucaoIA_Cham
                )
                OUTPUT INSERTED.id_Cham INTO @OutputTbl
                VALUES (
                    @clienteId, @titulo, @status, @dataAbertura, @categoria, @descricao,
                    @dataProblema, @impacto, @usuarios, @frequencia, @prioridade, @solucaoIA
                );

                SELECT * FROM Chamado 
                WHERE id_Cham = (SELECT TOP 1 id_Cham FROM @OutputTbl);
            `);

        if (result.recordset && result.recordset.length > 0) {
            res.status(201).json(result.recordset[0]);
        } else {
            // Fallback de segurança raro
            const fallback = await pool.request().query('SELECT TOP 1 * FROM Chamado ORDER BY id_Cham DESC');
            if(fallback.recordset.length > 0) {
                 res.status(201).json(fallback.recordset[0]);
            } else {
                 throw new Error("Chamado criado, mas ID não retornado.");
            }
        }

    } catch (error) {
        console.error('Erro POST Backend:', error);
        res.status(500).json({ error: 'Erro no servidor: ' + error.message });
    }
});

// ====================================================================
// ROTA PUT (ATUALIZAR GERAL)
// ====================================================================

// PUT /:id : Atualização Genérica.
// Construo a query dinamicamente para atualizar apenas os campos enviados.
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status_Cham, dataFechamento_Cham, tecResponsavel_Cham, solucaoTec_Cham, solucaoFinal_Cham } = req.body;

        const pool = await getPool();
        const request = pool.request().input('id', sql.Int, id);
        
        let updates = [];

        if (status_Cham) {
            updates.push("status_Cham = @status");
            request.input('status', sql.VarChar(20), status_Cham);
        }
        if (solucaoTec_Cham !== undefined) {
            updates.push("solucaoTec_Cham = @solTec");
            request.input('solTec', sql.VarChar(sql.MAX), solucaoTec_Cham);
        }
        if (solucaoFinal_Cham !== undefined) {
            updates.push("solucaoFinal_Cham = @solFinal");
            request.input('solFinal', sql.VarChar(sql.MAX), solucaoFinal_Cham);
        }
        if (dataFechamento_Cham) {
            updates.push("dataFechamento_Cham = @dtFechamento");
            request.input('dtFechamento', sql.DateTime, new Date(dataFechamento_Cham));
        }
        if (tecResponsavel_Cham !== undefined) {
            updates.push("tecResponsavel_Cham = @tecResp");
            request.input('tecResp', sql.Int, tecResponsavel_Cham || null);
        }

        if (updates.length === 0) return res.status(400).json({ error: 'Nada para atualizar.' });

        await request.query(`UPDATE Chamado SET ${updates.join(', ')} WHERE id_Cham = @id`);
        res.json({ success: true });

    } catch (error) {
        console.error('Erro PUT:', error);
        res.status(500).json({ error: 'Erro ao atualizar.' });
    }
});

// ROTAS DE FLUXO DE TRABALHO (Workflow)

// PUT /escalar: Transição de Aberto -> Em Andamento (Envia para pool de técnicos)
router.put('/escalar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status_Cham } = req.body;
        
        await (await getPool()).request()
            .input('id', sql.Int, id)
            .input('status', sql.VarChar(20), status_Cham)
            .query(`UPDATE Chamado SET status_Cham = @status, tecResponsavel_Cham = NULL WHERE id_Cham = @id`);
            
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /fechar: Cliente valida e fecha o chamado.
// Validação de Segurança: Garanto que apenas o dono do chamado pode fechar.
router.put('/fechar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const usuarioId = req.session?.usuario?.id;

        const pool = await getPool();
        const check = await pool.request().input('id', sql.Int, id).query('SELECT clienteId_Cham FROM Chamado WHERE id_Cham = @id');
        
        if (!check.recordset[0] || check.recordset[0].clienteId_Cham !== usuarioId) {
            return res.status(403).json({ error: 'Permissão negada.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .query(`UPDATE Chamado SET status_Cham = 'Fechado', dataFechamento_Cham = GETDATE(), solucaoFinal_Cham = 'Fechado pelo cliente' WHERE id_Cham = @id`);
            
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /reabrir: Cliente não aceitou a solução.
// Reseta o status para 'Em andamento' e remove o técnico para que outro possa pegar.
router.put('/reabrir/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await (await getPool()).request()
            .input('id', sql.Int, id)
            .query(`UPDATE Chamado SET status_Cham = 'Em andamento', tecResponsavel_Cham = NULL, dataFechamento_Cham = NULL WHERE id_Cham = @id`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /concordar: Feedback positivo (NPS).
router.put('/concordar/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await (await getPool()).request()
            .input('id', sql.Int, id)
            .query(`UPDATE Chamado SET solucaoFinal_Cham = 'Concordância registrada' WHERE id_Cham = @id`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====================================================================
// ROTA DELETE (ADMIN)
// ====================================================================

router.delete('/:id', verificarAdm, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const pool = await getPool();
        
        // Regra de Negócio: Apenas chamados 'Fechado' podem ser excluídos para manter histórico de auditoria.
        const check = await pool.request().input('id', sql.Int, id).query('SELECT status_Cham FROM Chamado WHERE id_Cham = @id');
        if (!check.recordset[0]) return res.status(404).json({ error: 'Não encontrado.' });
        if (check.recordset[0].status_Cham !== 'Fechado') return res.status(400).json({ error: 'Apenas chamados fechados podem ser excluídos.' });

        await pool.request().input('id', sql.Int, id).query('DELETE FROM Chamado WHERE id_Cham = @id');
        res.json({ success: true });
    } catch (error) {
        console.error('Erro DELETE:', error);
        res.status(500).json({ error: 'Erro ao excluir.' });
    }
});

module.exports = router;