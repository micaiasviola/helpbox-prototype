//rotas para chamado

const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

//GET PARA TODOS OS CHAMADOS

router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
        SELECT
            id_Cham,
            status_Cham,
            dataAbertura_Cham,
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
