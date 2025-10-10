//rotas para chamado

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

const verificarAdm = require('../middlewares/verificarADM.js');

// GET PARA MEUS CHAMADOS (UNIFICADO: Cliente Vê os Abertos, Técnico/Admin Vê os Atribuídos + Abertos)
router.get('/meus', async (req, res) => {
    const usuarioId = req.session?.usuario?.id;
    const nivelAcesso = req.session?.usuario?.nivel_acesso;

    if (!usuarioId) {
        return res.status(401).json({ error: 'ID do usuário não encontrado na sessão.' });
    }

    let whereClause;
    
    // Nível 1: Cliente vê chamados abertos por ele (clienteId_Cham)
    if (nivelAcesso === 1) {
        whereClause = `C.clienteId_Cham = @usuarioId`;
    } 
    // Nível 3: Administrador (vê o que abriu E o que está solucionando)
    else if (nivelAcesso === 3) {
        whereClause = `(C.tecResponsavel_Cham = @usuarioId OR C.clienteId_Cham = @usuarioId) AND C.status_Cham != 'Fechado'`;
    }
    // Nível 2: Técnico (vê apenas os que ele está solucionando)
    else if (nivelAcesso === 2) {
        whereClause = `C.tecResponsavel_Cham = @usuarioId AND C.status_Cham != 'Fechado'`;
    }
    else {
         // Caso o nível de acesso seja inválido, retorna erro
         return res.status(403).json({ error: 'Nível de acesso inválido para esta rota.' });
    }

    try {
        const pool = await getPool();
        const request = pool.request().input('usuarioId', sql.Int, usuarioId);

        const result = await request.query(`
            SELECT
                C.id_Cham, C.status_Cham, C.dataAbertura_Cham, C.titulo_Cham,
                C.prioridade_Cham, C.categoria_Cham, C.descricao_Cham, C.tecResponsavel_Cham,
                C.clienteId_Cham,
                
                U.nome_User, U.sobrenome_User 
            FROM Chamado AS C
            INNER JOIN Usuario AS U ON C.clienteId_Cham = U.id_User
            
            -- CLAUSULA DINÂMICA
            WHERE ${whereClause} 
            ORDER BY C.dataAbertura_Cham DESC
        `);
        
        res.json(result.recordset);
        
    } catch (error) {
        console.error('Erro ao buscar meus chamados:', error);
        res.status(500).json({ error: 'Erro interno ao buscar meus chamados.' });
    }
});

// ROTA GET PARA CHAMADOS DO TÉCNICO (Nível 2)
// ROTA GET PARA CHAMADOS DO TÉCNICO (Nível 2)
router.get('/tecnico', async (req, res) => {
    // Pega o ID e Nível do usuário da sessão
    const tecId = req.session?.usuario?.id;
    const nivelAcesso = req.session?.usuario?.nivel_acesso;

    // Garante que o usuário está logado e tem um nível mínimo para acessar esta rota
    if (!tecId || nivelAcesso < 2) { 
        return res.status(403).json({ error: 'Acesso negado. Necessário nível técnico.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('tecId', sql.Int, tecId)
            .query(`
                SELECT
                    id_Cham, status_Cham, dataAbertura_Cham, titulo_Cham, 
                    prioridade_Cham, categoria_Cham, descricao_Cham, tecResponsavel_Cham
                FROM Chamado
                WHERE tecResponsavel_Cham = @tecId -- 1. Chamados atribuídos ao técnico logado
                   OR (
                         tecResponsavel_Cham IS NULL 
                         AND status_Cham = 'Em andamento' -- 2. Chamados livres (encaminhados pelo cliente)
                      )
                ORDER BY dataAbertura_Cham DESC
            `);
        
        res.json(result.recordset);

    } catch (error) {
        console.error('Erro ao buscar chamados do técnico:', error);
        res.status(500).json({ error: 'Erro interno ao buscar chamados do técnico.' });
    }
});


router.get('/', verificarAdm, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
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
                
                -- 🛠️ NOVO: NOME DO TÉCNICO RESPONSÁVEL
                U_TECNICO.nome_User AS tecNome,
                U_TECNICO.sobrenome_User AS tecSobrenome
                
            FROM Chamado AS C
            -- Junção para o nome do Técnico (LEFT JOIN porque pode ser NULL)
            LEFT JOIN Usuario AS U_TECNICO ON C.tecResponsavel_Cham = U_TECNICO.id_User
            
            ORDER BY C.dataAbertura_Cham`
        );
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        // 🚨 CORREÇÃO: Extrair tecResponsavel_Cham do corpo da requisição
        const { status_Cham, dataFechamento_Cham, tecResponsavel_Cham } = req.body; 

        const pool = await getPool();
        let query = 'UPDATE Chamado SET ';
        const inputs = [];
        let needsComma = false;

        // 1. Atualizar STATUS
        if (status_Cham) {
            query += 'status_Cham = @status';
            inputs.push({ name: 'status', value: status_Cham, type: sql.VarChar(20) });
            needsComma = true;
        }

        // 2. Atualizar DATA DE FECHAMENTO
        if (dataFechamento_Cham) {
            if (needsComma) query += ', ';
            query += 'dataFechamento_Cham = @dataFechamento';
            inputs.push({ name: 'dataFechamento', value: dataFechamento_Cham, type: sql.Date });
            needsComma = true;
        }

        // 3. 🛠️ NOVO: Atualizar TÉCNICO RESPONSÁVEL (Para a ação 'take')
        // Este campo é crucial para a atribuição!
        if (typeof tecResponsavel_Cham !== 'undefined') {
            if (needsComma) query += ', ';
            
            // Se o valor for NULL, o tipo deve ser null
            const isNull = tecResponsavel_Cham === null || tecResponsavel_Cham === 'null';

            query += 'tecResponsavel_Cham = @tecResponsavel';
            
            inputs.push({ 
                name: 'tecResponsavel', 
                // Se for null, insere null, senão, insere o ID como Int
                value: isNull ? null : parseInt(tecResponsavel_Cham), 
                type: sql.Int 
            });
            needsComma = true;
        }
        
        // Se nenhum campo válido foi enviado, evita erro SQL
        if (inputs.length === 0) {
             return res.status(400).json({ error: 'Nenhum campo de atualização válido fornecido.' });
        }

        // Finaliza a query
        query += ' WHERE id_Cham = @id';
        inputs.push({ name: 'id', value: parseInt(id), type: sql.Int });

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        await request.query(query);

        res.json({ success: true, message: 'Chamado atualizado com sucesso (incluindo atribuição do técnico).' });
    } catch (error) {
        console.error('Erro ao atualizar chamado:', error);
        res.status(500).json({ error: error.message });
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

module.exports = router;
