// routes/usuarios.js
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db.js');

// GET todos os usuários
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                id_User,
                email_User,
                cargo_User,
                departamento_User,
                nivelAcesso_User,
                nome_User,
                sobrenome_User
            FROM Usuario 
            ORDER BY nome_User, sobrenome_User
        `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST criar usuário
router.post('/', async (req, res) => {
    try {
        const { nome_User, sobrenome_User, email_User, senha_User, cargo_User, departamento_User, nivelAcesso_User } = req.body || {};

        if (!nome_User || !email_User || !senha_User || !departamento_User) {
            return res.status(400).json({ error: "nome, email, senha e departamento são obrigatórios" });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('nome', sql.VarChar(255), nome_User)
            .input('sobrenome', sql.VarChar(255), sobrenome_User)
            .input('email', sql.VarChar(255), email_User)
            .input('senha', sql.VarChar(255), senha_User)
            .input('cargo', sql.VarChar(255), cargo_User)
            .input('departamento', sql.VarChar(255), departamento_User)
            .input('nivelAcesso', sql.Int, nivelAcesso_User)
            .query(`
        DECLARE @InsertedIds TABLE (id_User INT);

        INSERT INTO Usuario 
        (nome_User, sobrenome_User, email_User, senha_User, cargo_User, departamento_User, nivelAcesso_User)
        OUTPUT INSERTED.id_User INTO @InsertedIds
        VALUES (@nome, @sobrenome, @email, @senha, @cargo, @departamento, @nivelAcesso);

        SELECT id_User FROM @InsertedIds;
      `);

        res.status(201).json({ id: result.recordset[0].id_User });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT atualizar usuário
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_User, sobrenome_User, email_User, senha_User, cargo_User, departamento_User, nivelAcesso_User } = req.body;

        if (!nome_User || !email_User || !senha_User || !departamento_User) {
            return res.status(400).json({ error: "nome, email, senha e departamento são obrigatórios" });
        }

        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('nome', sql.VarChar(255), nome_User)
            .input('sobrenome', sql.VarChar(255), sobrenome_User)
            .input('email', sql.VarChar(255), email_User)
            .input('senha', sql.VarChar(255), senha_User)
            .input('cargo', sql.VarChar(255), cargo_User)
            .input('departamento', sql.VarChar(255), departamento_User)
            .input('nivelAcesso', sql.Int, nivelAcesso_User)
            .query(`
        UPDATE Usuario SET
          nome_User = @nome,
          sobrenome_User = @sobrenome,
          email_User = @email,
          senha_User = @senha,
          cargo_User = @cargo,
          departamento_User = @departamento,
          nivelAcesso_User = @nivelAcesso
        WHERE id_User = @id
      `);

        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE usuário seguro
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const pool = await getPool();

        // Deletar usuário e verificar quantas linhas foram afetadas
        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`
                BEGIN TRY
                    DELETE FROM Usuario WHERE id_User = @id;
                    SELECT @@ROWCOUNT AS affected;
                END TRY
                BEGIN CATCH
                    THROW;
                END CATCH
            `);

        const affected = result.recordset[0]?.affected || 0;

        if (affected === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ success: true, deletedId: userId });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
