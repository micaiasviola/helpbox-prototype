//rotas para chamado

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

const verificarAdm = require('../middlewares/verificarADM.js');

//GET PARA TODOS OS CHAMADOS
router.get('/meus', async (req, res) => {
    const clienteId = req.session?.usuario?.id;

    if (!clienteId) {
        return res.status(401).json({ error: 'ID do cliente não encontrado na sessão.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('clienteId', sql.Int, clienteId)
            .query(`
                SELECT
                    C.id_Cham,
                    C.status_Cham,
                    C.dataAbertura_Cham,
                    C.titulo_Cham,
                    C.prioridade_Cham,
                    C.categoria_Cham,
                    C.descricao_Cham,
                    C.tecResponsavel_Cham,
                    C.clienteId_Cham,  -- Mantém o ID do cliente
                    
                    -- 🚨 NOVO: JUNÇÃO PARA PEGAR O NOME E SOBRENOME DO CLIENTE
                    U.nome_User,
                    U.sobrenome_User
                FROM Chamado AS C
                -- FAZ O JOIN COM A TABELA USUARIO USANDO A FK
                INNER JOIN Usuario AS U ON C.clienteId_Cham = U.id_User
                
                WHERE C.clienteId_Cham = @clienteId 
                ORDER BY C.dataAbertura_Cham DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Erro ao buscar chamados do cliente:', error);
        res.status(500).json({ error: 'Erro interno ao buscar seus chamados.' });
    }
});
router.get('/', verificarAdm, async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
        SELECT
            id_Cham,
            status_Cham,
            dataAbertura_Cham,
            titulo_Cham,
            dataFechamento_Cham,
            prioridade_Cham,
            categoria_Cham,
            descricao_Cham,
            solucaoIA_Cham,
            solucaoTec_Cham,
            solucaoFinal_Cham,
            tecResponsavel_Cham
        FROM Chamado
        ORDER BY dataAbertura_Cham`
        );
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

// GET para buscar chamados via ID

router.get('/:id', async (req, res) => {
    // 1. Obter o ID do chamado a partir dos parâmetros da URL
    const { id } = req.params; 

    // O ID deve ser um número inteiro para a consulta ao banco de dados
    const chamadoId = parseInt(id);

    // Validação básica para garantir que o ID é um número
    if (isNaN(chamadoId)) {
        return res.status(400).json({ error: 'ID de chamado inválido. Deve ser um número.' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            // 2. Usar input para segurança contra SQL Injection
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
                    -- Junção para pegar o nome do cliente que abriu o chamado
                    U.nome_User AS clienteNome,
                    U.sobrenome_User AS clienteSobrenome
                FROM Chamado AS C
                INNER JOIN Usuario AS U ON C.clienteId_Cham = U.id_User
                WHERE C.id_Cham = @idChamado
            `);
        
        // 3. Verificar se o chamado foi encontrado
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Chamado não encontrado.' });
        }

        // 4. Retornar o primeiro (e único) registro encontrado
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


// PUT atualizar chamado
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status_Cham, dataFechamento_Cham } = req.body;

        const pool = await getPool();
        let query = 'UPDATE Chamado SET ';
        const inputs = [];

        if (status_Cham) {
            query += 'status_Cham = @status';
            inputs.push({ name: 'status', value: status_Cham, type: sql.VarChar(20) });
        }

        if (dataFechamento_Cham) {
            if (inputs.length > 0) query += ', ';
            query += 'dataFechamento_Cham = @dataFechamento';
            inputs.push({ name: 'dataFechamento', value: dataFechamento_Cham, type: sql.Date });
        }

        query += ' WHERE id_Cham = @id';
        inputs.push({ name: 'id', value: parseInt(id), type: sql.Int });

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        await request.query(query);

        res.json({ success: true });
    } catch (error) {
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
