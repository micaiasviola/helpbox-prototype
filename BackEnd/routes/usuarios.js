/**
 * @file routes/usuarios.js
 * @description Rotas da API para gerenciamento de usuários.
 * * Eu construí este arquivo para centralizar todas as operações de banco de dados referentes
 * aos usuários do sistema. A segurança é a prioridade aqui: utilizo bcrypt para criptografia
 * e um middleware de verificação para garantir que apenas administradores acessem estas rotas.
 * @author [Micaías Viola - Full Stack Developer]
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getPool, sql } = require('../db.js');

// Middleware de segurança que bloqueia acesso de quem não é Admin (Nível 3).
const verificarADM = require('../middlewares/verificarADM.js');

// GET: Listar todos os usuários
// Optei por listar as colunas explicitamente no SELECT em vez de usar *.
// Isso é uma medida de segurança para garantir que o hash da senha nunca trafegue
// para o frontend, mesmo que alguém esqueça de filtrar depois.
router.get('/', verificarADM, async (req, res) => {
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

// POST: Criar novo usuário
// Aqui realizo a criptografia da senha antes de qualquer interação com o banco.
// Utilizo a cláusula OUTPUT do SQL Server para retornar o ID gerado imediatamente,
// evitando a necessidade de fazer um segundo SELECT para descobrir o ID do novo usuário.
router.post('/', verificarADM, async (req, res) => {
    try {
        // Extração segura de parâmetros para evitar undefined
        const { nome_User, sobrenome_User, email_User, senha_User, cargo_User, departamento_User, nivelAcesso_User } = req.body || {};

        // Validação básica de entrada
        if (!nome_User || !email_User || !senha_User || !departamento_User) {
            return res.status(400).json({ error: "nome, email, senha e departamento são obrigatórios" });
        }
        
        // Segurança: Gero o hash da senha com um custo de processamento (salt) de 10.
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha_User, saltRounds);

        const pool = await getPool();
        const result = await pool.request()
            .input('nome', sql.VarChar(255), nome_User)
            .input('sobrenome', sql.VarChar(255), sobrenome_User)
            .input('email', sql.VarChar(255), email_User)
            .input('senha', sql.VarChar(255), senhaHash) // Salvo apenas o hash
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

// PUT: Atualizar usuário existente
// Esta rota possui uma lógica condicional crítica: a atualização da senha.
// Se o administrador deixar o campo de senha vazio no frontend, eu entendo que ele
// deseja manter a senha antiga. Portanto, construo a query SQL dinamicamente para
// incluir ou excluir a coluna senha_User da atualização.
router.put('/:id', verificarADM, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_User, sobrenome_User, email_User, senha_User, cargo_User, departamento_User, nivelAcesso_User } = req.body;

        // Validação: Removi a obrigatoriedade da senha aqui, pois na edição ela é opcional.
        if (!nome_User || !email_User || !departamento_User) {
            return res.status(400).json({ error: "Nome, email e departamento são obrigatórios" });
        }
        
        let senhaParaBD = senha_User;
        
        // Lógica Condicional: Só criptografo se uma nova senha foi realmente enviada.
        if (senha_User && senha_User.trim().length > 0) { 
             const saltRounds = 10;
             senhaParaBD = await bcrypt.hash(senha_User, saltRounds);
        }

        const pool = await getPool();
        const request = pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('nome', sql.VarChar(255), nome_User)
            .input('sobrenome', sql.VarChar(255), sobrenome_User)
            .input('email', sql.VarChar(255), email_User)
            .input('cargo', sql.VarChar(255), cargo_User)
            .input('departamento', sql.VarChar(255), departamento_User)
            .input('nivelAcesso', sql.Int, nivelAcesso_User);

        // Se houver nova senha, adiciono o input correspondente.
        if (senha_User && senha_User.trim().length > 0) {
             request.input('senha', sql.VarChar(255), senhaParaBD);
        }

        // Construção dinâmica da Query SQL
        let updateQuery = `
            UPDATE Usuario SET
              nome_User = @nome,
              sobrenome_User = @sobrenome,
              email_User = @email,
              cargo_User = @cargo,
              departamento_User = @departamento,
              nivelAcesso_User = @nivelAcesso
        `;
        
        // Só adiciono a alteração de senha no comando SQL se necessário.
        if (senha_User && senha_User.trim().length > 0) {
            updateQuery += `, senha_User = @senha`;
        }

        updateQuery += ` WHERE id_User = @id`;
        
        await request.query(updateQuery);
        res.json({ success: true });

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Remover usuário
// Implementei um tratamento de erro específico para integridade referencial.
// Se tentarmos excluir um usuário que tem chamados vinculados, o SQL Server retorna o erro 547.
// Eu capturo esse erro e retorno uma mensagem amigável (409 Conflict) em vez de um erro genérico de servidor.
router.delete('/:id', verificarADM, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const pool = await getPool();

        // Utilizo TRY/CATCH dentro do SQL para verificar se o registro existia.
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

        // Tratamento de Restrição de Chave Estrangeira (Foreign Key)
        if (error.number === 547) {
            return res.status(409).json({ 
                error: 'Não é possível excluir este usuário pois ele possui chamados ou registros vinculados.' 
            });
        }

        res.status(500).json({ error: error.message });
    }
});

module.exports = router;