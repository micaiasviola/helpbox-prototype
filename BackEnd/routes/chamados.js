//rotas para chamado

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

const verificarAdm = require('../middlewares/verificarADM.js');

/**
 * Constrói a cláusula WHERE baseada no nível de acesso do usuário.
 */
function getDynamicWhereClause(nivelAcesso, fullWhereClause) {
    let baseWhere = fullWhereClause;
    
    // Inicia a cláusula de escopo
    let scopeClause = "";

    if (nivelAcesso === 1) {
        // NÍVEL 1 (CLIENTE): Vê APENAS o que abriu.
        scopeClause = `C.clienteId_Cham = @usuarioId`;
    } 
    else if (nivelAcesso === 2) {
        // NÍVEL 2 (TÉCNICO): Vê o que está resolvendo OU o que ele abriu.
        scopeClause = `C.tecResponsavel_Cham = @usuarioId OR C.clienteId_Cham = @usuarioId`;
    }
    else if (nivelAcesso === 3) {
        // NÍVEL 3 (ADMINISTRADOR) - FOCO PESSOAL:
        // Vê APENAS os que ele está resolvendo (como tec) OU os que ele abriu (como cliente).
        scopeClause = `C.tecResponsavel_Cham = @usuarioId OR C.clienteId_Cham = @usuarioId`;
    }
    
    // Se a cláusula de escopo foi definida (para qualquer nível), aplicamos o filtro pessoal.
    if (scopeClause) {
         baseWhere += ` AND (${scopeClause})`;
    }
    
    return baseWhere;
}


// ====================================================================
// ROTA 1: /meus (TODOS OS NÍVEIS - FOCO PESSOAL)
// ====================================================================

router.get('/meus', async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    const nivelAcesso = req.session?.usuario?.nivel_acesso;

    if (!usuarioId) { 
        return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    
    // Garante que o nível de acesso é válido (1, 2, ou 3)
    if (nivelAcesso < 1 || nivelAcesso > 3) {
        return res.status(403).json({ error: 'Nível de acesso inválido para esta rota.' });
    }
    
    // --- PREPARAÇÃO DOS PARÂMETROS ---
    const page = parseInt(req.query.page) || 1; 
    const pageSize = parseInt(req.query.pageSize) || 6;
    const searchTerm = req.query.q || ''; 
    const statusFilter = req.query.status || ''; 

    const offset = (page - 1) * pageSize; 
    
    // Cláusula inicial (1=1 é obrigatória para o WHERE)
    let fullWhereClause = `1 = 1`; 
    
    if (statusFilter) fullWhereClause += ` AND C.status_Cham = @statusFilter`;
    if (searchTerm) fullWhereClause += ` AND (C.titulo_Cham LIKE @searchTerm OR C.descricao_Cham LIKE @searchTerm)`;

    // 🚨 APLICAÇÃO DO ESCOPO DE SEGURANÇA
    const scopedWhereClause = getDynamicWhereClause(nivelAcesso, fullWhereClause);
    
    try {
        const pool = await getPool(); 
        const request = pool.request()
            .input('usuarioId', sql.Int, usuarioId)
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .input('statusFilter', sql.NVarChar, statusFilter)
            .input('searchTerm', sql.NVarChar, `%${searchTerm}%`);
            
        // 🚨 Query unificada: 
        const querySQL = `
            SELECT C.*, U.nome_User, U.sobrenome_User 
            FROM Chamado AS C
            INNER JOIN Usuario AS U ON C.clienteId_Cham = U.id_User
            WHERE ${scopedWhereClause} 
            ORDER BY 
                CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 WHEN 'Fechado' THEN 3 ELSE 9 END ASC,
                C.dataAbertura_Cham DESC
            
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;

            SELECT COUNT(C.id_Cham) AS totalCount 
            FROM Chamado AS C
            WHERE ${scopedWhereClause};
        `;

        const result = await request.query(querySQL);

        res.json({
            chamados: result.recordsets[0],
            totalCount: result.recordsets[1][0].totalCount,
            page: page,
            pageSize: pageSize
        });

    } catch (error) {
        console.error('Erro ao buscar meus chamados:', error);
        res.status(500).json({ error: 'Erro interno ao buscar meus chamados.' });
    }
});

// ====================================================================
// ROTA 2: /tecnico (FILA GLOBAL DE CHAMADOS LIVRES)
// ====================================================================

router.get('/tecnico', async (req, res) => {
    const nivelAcesso = req.session?.usuario?.nivel_acesso;

    if (nivelAcesso < 2) { 
        return res.status(403).json({ error: 'Acesso negado. Necessário nível técnico.' });
    }
    
    // Parâmetros de Paginação
    const page = parseInt(req.query.page) || 1; 
    const pageSize = parseInt(req.query.pageSize) || 5; 
    const offset = (page - 1) * pageSize; 
    
    // Cláusula de filtro (estrita para chamados livres)
    const baseWhereClause = `tecResponsavel_Cham IS NULL AND status_Cham = 'Em andamento'`;

    const orderByClause = `ORDER BY dataAbertura_Cham DESC`;

    try {
        const pool = await getPool();
        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize);

        // 1. SELECT dos dados paginados
        const paginatedQuery = `
            SELECT id_Cham, status_Cham, dataAbertura_Cham, titulo_Cham, 
                   prioridade_Cham, categoria_Cham, descricao_Cham, tecResponsavel_Cham
            FROM Chamado
            WHERE ${baseWhereClause}
            ${orderByClause}
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;
        `;
        
        // 2. SELECT do total de registros
        const countQuery = `
            SELECT COUNT(id_Cham) AS totalCount 
            FROM Chamado
            WHERE ${baseWhereClause};
        `;

        const result = await request.query(paginatedQuery + countQuery);

        res.json({
            chamados: result.recordsets[0],
            totalCount: result.recordsets[1][0].totalCount,
            page: page,
            pageSize: pageSize
        });

    } catch (error) {
        console.error('Erro ao buscar chamados da fila técnica:', error);
        res.status(500).json({ error: 'Erro interno ao buscar chamados da fila técnica.' });
    }
});



// ====================================================================
// ROTA 3: / (TODOS OS CHAMADOS DO SISTEMA - ADMIN)
// ====================================================================

router.get('/', verificarAdm, async (req, res) => {
    // Parâmetros de Paginação e Filtro
    const page = parseInt(req.query.page) || 1; 
    const pageSize = parseInt(req.query.pageSize) || 5; // Usa 5 por padrão
    const searchTerm = req.query.q || ''; 
    const statusFilter = req.query.status || ''; 
    const offset = (page - 1) * pageSize; 

    // Cláusula de filtro
    let fullWhereClause = `1 = 1`; 
    if (statusFilter) fullWhereClause += ` AND C.status_Cham = @statusFilter`;
    if (searchTerm) fullWhereClause += ` AND (C.titulo_Cham LIKE @searchTerm OR C.descricao_Cham LIKE @searchTerm)`;

    const orderByClause = `
        ORDER BY 
            CASE C.status_Cham WHEN 'Em andamento' THEN 1 WHEN 'Aberto' THEN 2 WHEN 'Fechado' THEN 3 ELSE 9 END ASC,
            C.dataAbertura_Cham DESC
    `;

    try {
        const pool = await getPool();
        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .input('statusFilter', sql.NVarChar, statusFilter)
            .input('searchTerm', sql.NVarChar, `%${searchTerm}%`);

        // 1. SELECT dos dados paginados
        const paginatedQuery = `
            SELECT C.*, U_TECNICO.nome_User AS tecNome, U_TECNICO.sobrenome_User AS tecSobrenome
            FROM Chamado AS C
            LEFT JOIN Usuario AS U_TECNICO ON C.tecResponsavel_Cham = U_TECNICO.id_User
            WHERE ${fullWhereClause} 
            ${orderByClause}
            OFFSET @offset ROWS
            FETCH NEXT @pageSize ROWS ONLY;
        `;
        
        // 2. SELECT do total de registros
        const countQuery = `
            SELECT COUNT(C.id_Cham) AS totalCount 
            FROM Chamado AS C
            WHERE ${fullWhereClause};
        `;
        
        // Executa as duas queries juntas
        const result = await request.query(paginatedQuery + countQuery);

        res.json({
            chamados: result.recordsets[0],
            totalCount: result.recordsets[1][0].totalCount,
            page: page,
            pageSize: pageSize
        });
    } catch (error) {
        console.error('Erro ao buscar todos os chamados (Admin):', error);
        res.status(500).json({ error: 'Erro interno ao buscar todos os chamados.' });
    }
});

// GET para buscar chamados via ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const chamadoId = parseInt(id);

    if (isNaN(chamadoId)) {
        return res.status(400).json({ error: 'ID de chamado inválido. Deve ser um número.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('idChamado', sql.Int, chamadoId)
            .query(`
                SELECT
                    C.id_Cham,
                    C.status_Cham,
                    C.dataAbertura_Cham,
                    C.titulo_Cham,
                    C.dataFechamento_Cham,
                    C.prioridade_Cham,
                    C.categoria_Cham,
                    C.descricao_Cham,
                    C.solucaoIA_Cham,
                    C.solucaoTec_Cham,
                    C.solucaoFinal_Cham,
                    C.tecResponsavel_Cham,
                    C.clienteId_Cham,
                    
                    -- NOME DO CLIENTE QUE ABRIU
                    U_CLIENTE.nome_User AS clienteNome,
                    U_CLIENTE.sobrenome_User AS clienteSobrenome,
                    
                    -- 🛠️ NOVO: NOME DO TÉCNICO RESPONSÁVEL
                    U_TECNICO.nome_User AS tecNome,
                    U_TECNICO.sobrenome_User AS tecSobrenome
                    
                FROM Chamado AS C
                -- Junção 1: Cliente
                INNER JOIN Usuario AS U_CLIENTE ON C.clienteId_Cham = U_CLIENTE.id_User
                
                -- Junção 2: Técnico Responsável (USAMOS LEFT JOIN CASO SEJA NULL)
                LEFT JOIN Usuario AS U_TECNICO ON C.tecResponsavel_Cham = U_TECNICO.id_User
                
                WHERE C.id_Cham = @idChamado
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado.' });
        }

        res.json(result.recordset[0]);

    } catch (error) {
        console.error('Erro ao buscar chamado por ID:', error);
        res.status(500).json({ error: 'Erro interno ao buscar chamado.' });
    }
});


//POST para criar um chamado
router.post('/', async (req, res) => {
    try {
        const {
            titulo,
            categoria,
            descricao,
            status,
            impacto,
            usuarios,
            frequencia
        } = req.body;
        const pool = await getPool();
        const clienteId = req.session?.usuario?.id;
        const prioridadePadrao = 'B';
        const dataProblemaInput = req.body.dataProblema;
        const dataAbertura = new Date(req.body.dataAbertura); // A data de abertura deve ser válida

        // Se o usuário não preencheu a data do problema, use a data de abertura.
        const dataProblemaFormatada = dataProblemaInput ? new Date(dataProblemaInput) : dataAbertura;

        // Insere o novo chamado no banco de dados.
        const result = await pool.request()
            .input('clienteId', sql.Int, clienteId)
            .input('titulo', sql.VarChar(255), titulo)
            .input('categoria', sql.VarChar(50), categoria)
            .input('descricao', sql.VarChar(sql.MAX), descricao)
            .input('status', sql.VarChar(20), status || 'Aberto')
            .input('dataAbertura', sql.DateTime, new Date(dataAbertura))
            .input('dataProblema', sql.DateTime, dataProblemaFormatada) // ATENÇÃO: Use sql.DateTime se a coluna for DATETIME

            // NOVOS CAMPOS INCLUÍDOS
            .input('impacto', sql.VarChar(50), impacto || null)
            .input('usuarios', sql.VarChar(50), usuarios || null)
            .input('frequencia', sql.VarChar(50), frequencia || null)
            .input('prioridade', sql.Char(1), prioridadePadrao)

            .query(`
                INSERT INTO Chamado (
                    clienteId_Cham,titulo_Cham, status_Cham, dataAbertura_Cham, categoria_Cham, descricao_Cham,
                    dataProblema, impacto_Cham, usuarios_Cham, frequencia_Cham, prioridade_Cham
                )
                VALUES (
                    @clienteId, @titulo, @status, @dataAbertura, @categoria, @descricao,
                    @dataProblema, @impacto, @usuarios, @frequencia, @prioridade
                )
            `);

        const insertedChamado = await pool.request()
            .query(`
                SELECT TOP 1 
                    id_Cham, status_Cham, dataAbertura_Cham, titulo_Cham, prioridade_Cham, categoria_Cham
                    -- Você pode selecionar todas as colunas que precisa aqui
                FROM Chamado
                ORDER BY id_Cham DESC
            `);

        // VERIFICA SE O REGISTRO EXISTE ANTES DE TENTAR LER [0] (Correção do TypeError)
        if (insertedChamado.recordset && insertedChamado.recordset.length > 0) {
            return res.status(201).json(insertedChamado.recordset[0]);
        }

        // Se por algum motivo o INSERT funcionou mas o SELECT não encontrou nada (improvável)
        throw new Error("Chamado inserido, mas não pôde ser recuperado.");
    } catch (error) {
        console.error('Erro ao criar chamado:', error);
        res.status(500).json({ error: 'Erro ao criar chamado' });
    }
});


// PUT atualizar chamado (Rota corrigida para atribuição do técnico)

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            status_Cham, 
            dataFechamento_Cham, 
            tecResponsavel_Cham,
            // 🚨 CAMPOS DE SOLUÇÃO E DADOS DE FECHAMENTO ADICIONADOS
            solucaoTec_Cham, 
            solucaoFinal_Cham
        } = req.body; 

        const pool = await getPool();
        let query = 'UPDATE Chamado SET ';
        const inputs = [];
        let needsComma = false;

        // Função auxiliar para adicionar campos ao SQL
        const addField = (name, value, type) => {
            // Verifica se o valor é passado ou se é para ser explicitamente NULL (para tecResponsavel_Cham)
            if (typeof value !== 'undefined') {
                if (needsComma) query += ', ';
                query += `${name} = @${name}`;
                inputs.push({ name, value, type });
                needsComma = true;
            }
        };

        // 1. Atualizar STATUS
        addField('status_Cham', status_Cham, sql.VarChar(20));
        
        // 2. Atualizar TÉCNICO (usando lógica anterior)
        if (typeof tecResponsavel_Cham !== 'undefined') {
            const isNull = tecResponsavel_Cham === null || tecResponsavel_Cham === 'null';
            addField('tecResponsavel_Cham', isNull ? null : parseInt(tecResponsavel_Cham), sql.Int);
        }

        // 3. 🛠️ Adicionar SOLUÇÕES (Usado no "Salvar Rascunho" e "Finalizar")
        // O tipo VarChar(1000) deve corresponder ao seu esquema
        addField('solucaoTec_Cham', solucaoTec_Cham, sql.VarChar(1000));
        addField('solucaoFinal_Cham', solucaoFinal_Cham, sql.VarChar(1000));

        // 4. Adicionar DATA DE FECHAMENTO (Usado no "Finalizar")
        // Usamos sql.DateTime ou sql.Date dependendo do seu esquema (DateTime é mais comum)
        addField('dataFechamento_Cham', dataFechamento_Cham, sql.DateTime); 
        
        // Se nenhum campo válido foi enviado
        if (inputs.length === 0) {
             return res.status(400).json({ error: 'Nenhum campo de atualização válido fornecido.' });
        }

        // Finaliza a query
        query += ' WHERE id_Cham = @id';
        inputs.push({ name: 'id', value: parseInt(id), type: sql.Int });

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        await request.query(query);

        res.json({ success: true, message: 'Chamado atualizado com sucesso.' });
    } catch (error) {
        // 🚨 MUITO IMPORTANTE: Logar o erro REAL do SQL Server
        console.error('Erro ao executar UPDATE SQL:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao fechar o chamado.' });
    }
});

// ROTA PUT para ESCALAR o chamado para o técnico
router.put('/escalar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status_Cham, prioridade_Cham } = req.body; // Recebe o novo status e prioridade

        // Garante que o ID e o status estejam presentes
        if (!id || !status_Cham) {
            return res.status(400).json({ error: 'ID e novo status são obrigatórios.' });
        }

        const pool = await getPool();

        // Apenas atualiza o status, a prioridade, e remove o técnico responsável (se houver)
        const query = `
            UPDATE Chamado 
            SET 
                status_Cham = @status, 
                prioridade_Cham = @prioridade,
                tecResponsavel_Cham = NULL -- Remove o técnico responsável, pois está sendo reescalado
            WHERE id_Cham = @id
        `;

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('status', sql.VarChar(50), status_Cham)
            .input('prioridade', sql.Char(1), prioridade_Cham || 'M') // Usa 'M' (Média) se não for especificado
            .query(query);

        res.json({ success: true, message: 'Chamado escalado com sucesso.' });
    } catch (error) {
        console.error('Erro ao escalar chamado:', error);
        res.status(500).json({ error: 'Erro ao escalar chamado.' });
    }
});


// ====================================================================
// ROTA 4: PUT /fechar/:id (Ação do Cliente - Fecha o Chamado)
// ====================================================================

router.put('/fechar/:id', async (req, res) => {
    const { id } = req.params;
    const chamadoId = parseInt(id);
    const usuarioId = req.session?.usuario?.id;

    if (isNaN(chamadoId) || !usuarioId) {
        return res.status(400).json({ error: 'ID de chamado inválido ou usuário não identificado.' });
    }

    try {
        const pool = await getPool();
        
        // 1. Opcional: Verificar se o usuário é o cliente original
        const checkQuery = `SELECT clienteId_Cham, status_Cham FROM Chamado WHERE id_Cham = @id`;
        const checkResult = await pool.request().input('id', sql.Int, chamadoId).query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado.' });
        }
        
        const chamadoInfo = checkResult.recordset[0];
        
        if (chamadoInfo.clienteId_Cham !== usuarioId) {
            return res.status(403).json({ error: 'Acesso negado. Apenas o cliente pode fechar este chamado.' });
        }

        // 2. Atualiza o status para 'Fechado' e a data de fechamento para AGORA
        const query = `
            UPDATE Chamado 
            SET 
                status_Cham = 'Fechado', 
                dataFechamento_Cham = GETDATE(),
                solucaoFinal_Cham = 'Validado e fechado pelo cliente'
            WHERE id_Cham = @id
        `;

        await pool.request()
            .input('id', sql.Int, chamadoId)
            .query(query);

        res.json({ success: true, message: 'Chamado fechado pelo cliente com sucesso.' });
    } catch (error) {
        console.error('Erro ao fechar chamado pelo cliente:', error);
        res.status(500).json({ error: 'Erro interno ao fechar chamado.' });
    }
});

// ====================================================================
// ROTA 5: PUT /reabrir/:id (Ação do Cliente - Reabre o Chamado)
// ====================================================================

router.put('/reabrir/:id', async (req, res) => {
    const { id } = req.params;
    const chamadoId = parseInt(id);
    const usuarioId = req.session?.usuario?.id;
    
    // Status de reabertura (volta para o estado inicial para triagem)
    const STATUS_REABERTO = 'Em andamento'; 

    if (isNaN(chamadoId) || !usuarioId) {
        return res.status(400).json({ error: 'ID de chamado inválido ou usuário não identificado.' });
    }

    try {
        const pool = await getPool();
        
        // 1. Opcional: Verificar se o usuário é o cliente original e se o status é 'Fechado'
        const checkQuery = `SELECT clienteId_Cham, status_Cham FROM Chamado WHERE id_Cham = @id`;
        const checkResult = await pool.request().input('id', sql.Int, chamadoId).query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado.' });
        }
        
        const chamadoInfo = checkResult.recordset[0];
        
        if (chamadoInfo.clienteId_Cham !== usuarioId || chamadoInfo.status_Cham !== 'Fechado') {
             // Retorna erro ou ignora, dependendo da política. Aqui, retornamos 403.
             return res.status(403).json({ error: 'A reabertura só é permitida pelo cliente e apenas quando o status atual for Fechado.' });
        }
        
        // 2. Atualiza o status, remove o técnico e limpa a data de fechamento
        const query = `
            UPDATE Chamado 
            SET 
                status_Cham = @statusReaberto, 
                tecResponsavel_Cham = NULL, -- Remove qualquer técnico atribuído
                dataFechamento_Cham = NULL, -- Limpa a data de fechamento
                solucaoFinal_Cham = 'Reaberto pelo cliente' -- Registra a ação
            WHERE id_Cham = @id
        `;

        await pool.request()
            .input('id', sql.Int, chamadoId)
            .input('statusReaberto', sql.VarChar(20), STATUS_REABERTO)
            .query(query);

        res.json({ success: true, message: `Chamado reaberto com sucesso. Status atualizado para: ${STATUS_REABERTO}.` });
    } catch (error) {
        console.error('Erro ao reabrir chamado:', error);
        res.status(500).json({ error: 'Erro interno ao reabrir chamado.' });
    }
});

// ====================================================================
// ROTA 6: PUT /concordar/:id (Ação do Cliente - Apenas registra concordância)
// ====================================================================

router.put('/concordar/:id', async (req, res) => {
    const { id } = req.params;
    const chamadoId = parseInt(id);
    const usuarioId = req.session?.usuario?.id;

    if (isNaN(chamadoId) || !usuarioId) {
        return res.status(400).json({ error: 'ID de chamado inválido ou usuário não identificado.' });
    }
    
    try {
        const pool = await getPool();
        
        // Opcional: Verificar se o usuário é o cliente original e se o status é 'Fechado'
        const checkQuery = `SELECT clienteId_Cham, status_Cham FROM Chamado WHERE id_Cham = @id`;
        const checkResult = await pool.request().input('id', sql.Int, chamadoId).query(checkQuery);
        
        if (checkResult.recordset.length === 0 || checkResult.recordset[0].clienteId_Cham !== usuarioId) {
             return res.status(403).json({ error: 'Acesso negado ou chamado não encontrado.' });
        }
        
        // Apenas adiciona uma nota de registro ou atualiza um campo de metadado
        const query = `
            UPDATE Chamado 
            SET 
                solucaoFinal_Cham = 'Solução mantida. Cliente concordou com o fechamento final.'
                -- O status_Cham permanece 'Fechado'
            WHERE id_Cham = @id
        `;

        await pool.request()
            .input('id', sql.Int, chamadoId)
            .query(query);

        res.json({ success: true, message: 'Concordância registrada. Chamado permanece fechado.' });
    } catch (error) {
        console.error('Erro ao registrar concordância:', error);
        res.status(500).json({ error: 'Erro interno ao registrar concordância.' });
    }
});


module.exports = router;
