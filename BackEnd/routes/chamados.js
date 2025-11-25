const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');
const { gerarRespostaIA } = require('../services/iaService.js');
const verificarAdm = require('../middlewares/verificarADM.js');

// ====================================================================
// 🛠️ FUNÇÕES AUXILIARES (REUTILIZÁVEIS)
// ====================================================================

/**
 * Função Central para buscar listas de chamados paginadas.
 */
async function fetchChamadosList(req, res, customWhere = '', customOrder = '', params = {}) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const offset = (page - 1) * pageSize;
    
    // Pega o ID do usuário da sessão para usar na ordenação (mesmo se não vier nos params)
    const usuarioLogadoId = params.usuarioId || req.session?.usuario?.id || 0;

    const searchTerm = (req.query.q || '').trim();
    const statusFilter = req.query.status || '';
    const isNumericInput = /^\d+$/.test(searchTerm);

    let whereClause = `1 = 1`;
    
    // Filtros
    if (customWhere) whereClause += ` AND ${customWhere}`;
    if (statusFilter) whereClause += ` AND C.status_Cham = @statusFilter`;
    
    // Busca Inteligente
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

    // 🚨 ORDENAÇÃO CORRIGIDA (SQL SERVER) 🚨
    // A lógica aqui deve ser IDÊNTICA à do Javascript do Frontend
    const defaultOrder = `
        ORDER BY 
        CASE 
            -- 1. CONTINUAR (Peso 0)
            -- 'Em andamento' E o técnico sou eu
            WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 
            
            -- 2. ASSUMIR (Peso 1)
            -- 'Em andamento' E (Sem técnico) E (Eu NÃO sou o criador)
            WHEN C.status_Cham = 'Em andamento' 
                 AND (C.tecResponsavel_Cham IS NULL OR C.tecResponsavel_Cham = 0)
                 AND C.clienteId_Cham <> @usuarioId THEN 1
            
            -- 3. OLHO / RESTO (Peso 2)
            -- Inclui: Fechados, Abertos, De outros técnicos, e os MEUS que estão sem técnico
            ELSE 2 
        END ASC,
        
        -- DESEMPATE DO GRUPO "OLHO" (Opcional)
        -- Queremos ver 'Abertos' antes de 'Fechados' dentro do grupo 3
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
            // Importante: Passamos o usuário logado para o SQL conseguir calcular a ordem
            .input('usuarioId', sql.Int, usuarioLogadoId);

        if (isNumericInput) {
            request.input('searchIdPattern', sql.NVarChar, `${searchTerm}%`);
        }

        // Adiciona params extras se houver
        for (const [key, value] of Object.entries(params)) {
             // Evita erro de duplicidade se usuarioId já foi passado acima
            if (key !== 'usuarioId') {
                request.input(key, sql.Int, value);
            }
        }

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
// 🚦 ROTAS DE LISTAGEM
// ====================================================================

// 1. MEUS CHAMADOS
router.get('/meus', async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    const tipoFilter = req.query.tipo || ''; // 'criado' ou 'atribuido'

    if (!usuarioId) return res.status(401).json({ error: 'Não autenticado' });

    let where = '';
    
    // Define o Escopo (WHERE)
    if (tipoFilter === 'criado') {
        where = `C.clienteId_Cham = @usuarioId`;
    } else if (tipoFilter === 'atribuido') {
        where = `C.tecResponsavel_Cham = @usuarioId`;
    } else {
        // Padrão: Vejo o que abri OU o que resolvo
        where = `(C.tecResponsavel_Cham = @usuarioId OR C.clienteId_Cham = @usuarioId)`;
    }

    // Ordenação por Ação (Action Order)
    const order = `
        ORDER BY 
        CASE WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 ELSE 1 END ASC,
        CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 WHEN 'Fechado' THEN 3 ELSE 9 END ASC,
        C.dataAbertura_Cham DESC
    `;

    await fetchChamadosList(req, res, where, order, { usuarioId });
});

// 2. CHAMADOS TÉCNICOS (LIVRES)
router.get('/tecnico', async (req, res) => {
    const nivel = req.session?.usuario?.nivel_acesso;
    const usuarioId = req.session?.usuario?.id; // <--- Pegar o ID aqui

    if (nivel < 2) return res.status(403).json({ error: 'Acesso negado.' });

    // Nota: O filtro WHERE já garante que só vem sem técnico, 
    // mas a ORDENAÇÃO precisa saber quem é você para jogar os seus para o final da lista.
    const where = `C.tecResponsavel_Cham IS NULL AND C.status_Cham = 'Em andamento'`;
    
    // Podemos deixar vazio para usar o 'defaultOrder' inteligente que criamos acima
    // OU forçar uma ordem específica se preferir. 
    // Vamos usar vazio para aproveitar a lógica inteligente (Meus criados vão pro fim).
    await fetchChamadosList(req, res, where, '', { usuarioId });
});

// 3. TODOS OS CHAMADOS (ADMIN)
router.get('/', verificarAdm, async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    
    // Mesma lógica de ordenação de ação que em /meus
    const order = `
        ORDER BY 
        CASE WHEN C.status_Cham = 'Em andamento' AND C.tecResponsavel_Cham = @usuarioId THEN 0 ELSE 1 END ASC,
        CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 ELSE 9 END ASC,
        C.dataAbertura_Cham DESC
    `;
    await fetchChamadosList(req, res, '', '', { usuarioId });
});

// ====================================================================
// 🔍 ROTA DE DETALHE
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
// 📝 ROTA POST (CRIAR) - BLINDADA CONTRA ERROS COMUNS
// ====================================================================

router.post('/', async (req, res) => {
    try {
        const { titulo, categoria, descricao, status, impacto, usuarios, frequencia } = req.body;
        const clienteId = req.session?.usuario?.id;

        const dataAbertura = new Date(req.body.dataAbertura || new Date());
        const dataProblema = req.body.dataProblema ? new Date(req.body.dataProblema) : dataAbertura;

        // 1. CHAMA A IA
        const respostaIA = await gerarRespostaIA(categoria, descricao, titulo, frequencia, impacto, usuarios);
        
        // Tratamento e corte de texto (Solução para o erro String truncated)
        let solucaoFinal = respostaIA.solucao || "Sem sugestão da IA."; 
        if (solucaoFinal.length > 3500) {
            solucaoFinal = solucaoFinal.substring(0, 3500) + '... [Texto cortado por limite de tamanho]';
        }

        const prioridadeFinal = respostaIA.prioridade || 'M';

        console.log(`[Novo Chamado] Prioridade IA: ${prioridadeFinal}`);

        const pool = await getPool();
        
        // Solução para o erro de Triggers (OUTPUT INTO)
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
                -- Tabela temporária para receber o ID gerado (contorna problema de Triggers)
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

                -- Seleciona o registro completo
                SELECT * FROM Chamado 
                WHERE id_Cham = (SELECT TOP 1 id_Cham FROM @OutputTbl);
            `);

        if (result.recordset && result.recordset.length > 0) {
            res.status(201).json(result.recordset[0]);
        } else {
            // Fallback de segurança se a tabela temporária falhar (raro)
            const fallback = await pool.request().query('SELECT TOP 1 * FROM Chamado ORDER BY id_Cham DESC');
            if(fallback.recordset.length > 0) {
                 res.status(201).json(fallback.recordset[0]);
            } else {
                 throw new Error("Chamado criado, mas ID não retornado.");
            }
        }

    } catch (error) {
        console.error('Erro POST Backend:', error);
        // Retorna JSON válido com o erro para o frontend ler
        res.status(500).json({ error: 'Erro no servidor: ' + error.message });
    }
});

// ====================================================================
// 🔄 ROTA PUT (ATUALIZAR GERAL E AÇÕES)
// ====================================================================

router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status_Cham, dataFechamento_Cham, tecResponsavel_Cham, solucaoTec_Cham, solucaoFinal_Cham } = req.body;

        const pool = await getPool();
        const request = pool.request().input('id', sql.Int, id);
        
        let updates = [];

        // Construção dinâmica da query (evita inputs desnecessários)
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

// 🚀 ROTAS DE AÇÃO ESPECÍFICAS (ATALHOS)

// Escalar (Muda status e remove técnico)
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

// Fechar (Cliente)
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

// Reabrir
router.put('/reabrir/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await (await getPool()).request()
            .input('id', sql.Int, id)
            .query(`UPDATE Chamado SET status_Cham = 'Em andamento', tecResponsavel_Cham = NULL, dataFechamento_Cham = NULL WHERE id_Cham = @id`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Concordar
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
// 🗑️ ROTA DELETE
// ====================================================================

router.delete('/:id', verificarAdm, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const pool = await getPool();
        
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