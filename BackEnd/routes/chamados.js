//rotas para chamado

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

const verificarAdm = require('../middlewares/verificarADM.js');

//GET PARA TODOS OS CHAMADOS

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

//POST para criar um chamado
router.post('/', async (req, res) => {
    try {
        const {
            titulo,
            categoria,
            descricao,
            status,
            
            dataProblema,
            impacto,
            usuarios,
            frequencia
        } = req.body;
        const pool = await getPool();

        const prioridadePadrao = 'B';
        const dataProblemaInput = req.body.dataProblema;
        const dataAbertura = new Date(req.body.dataAbertura); // A data de abertura deve ser válida

        // Se o usuário não preencheu a data do problema, use a data de abertura.
        const dataProblemaFormatada = dataProblemaInput ? new Date(dataProblemaInput) : dataAbertura;

        // Insere o novo chamado no banco de dados.
        const result = await pool.request()
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
                    titulo_Cham, status_Cham, dataAbertura_Cham, categoria_Cham, descricao_Cham,
                    dataProblema, impacto_Cham, usuarios_Cham, frequencia_Cham, prioridade_Cham
                )
                VALUES (
                    @titulo, @status, @dataAbertura, @categoria, @descricao,
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

module.exports = router;
