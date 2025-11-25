/**
 * @file routes/auth.js
 * @description Rotas de Autenticação (Login/Logout/Session).
 * * Este módulo é o "porteiro" do sistema. Ele lida com a verificação de credenciais,
 * criação de cookies de sessão e identificação do usuário logado.
 * @author [Micaías Viola - Full Stack Developer]
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getPool, sql } = require('../db.js');
const verificaSessao = require('../middlewares/verificarSessao.js');

/**
 * @function buscarUsuarioPorEmail
 * @description Consulta segura ao banco de dados para recuperar o hash da senha.
 * @param {string} email Email fornecido no login.
 */
async function buscarUsuarioPorEmail(email){
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar(255), email)
            .query(`
                SELECT 
                    id_User, 
                    email_User, 
                    senha_User, 
                    nivelAcesso_User,
                    nome_User,
                    sobrenome_User,
                    cargo_User,
                    departamento_User
                FROM Usuario 
                WHERE email_User = @email
            `);
        // Retorna o primeiro registro encontrado ou null
        return result.recordset[0] || null;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        throw error;
    }
}

/**
 * @route POST /auth/login
 * @description Processo de Login.
 * 1. Recebe credenciais.
 * 2. Busca usuário no banco.
 * 3. Compara a senha (hash) usando bcrypt.
 * 4. Cria a sessão no servidor (express-session).
 */
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const usuario = await buscarUsuarioPorEmail(email);

        if (!usuario) {
            console.log('DEBUG 1: Usuário NÃO encontrado para email:', email);
            return res.status(401).json({ error: "Credenciais inválidas." });
        }
        
        // --- SANITIZAÇÃO CRÍTICA DE DADOS ---
        // O SQL Server às vezes retorna campos VARCHAR com espaços em branco no final (padding).
        // O bcrypt considera espaços como parte da senha, então "senha123" !== "senha123   ".
        // O .trim() remove esses espaços invisíveis e evita falsos negativos no login.
        
        const senhaFormLimpa = senha.trim(); 
        const hashBDLimpo = usuario.senha_User.trim();
        
        // Logs de auditoria para desenvolvimento (remover em produção se necessário)
        console.log('DEBUG: Iniciando comparação de hash...'); 

        // Comparação criptográfica (lenta de propósito para evitar brute-force)
        const senhaCorreta = await bcrypt.compare(senhaFormLimpa, hashBDLimpo);

        if (!senhaCorreta) {
            console.log('DEBUG: Comparação de senha FALHOU.'); 
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        // --- AUTENTICAÇÃO BEM-SUCEDIDA! ---

        // Armazeno os dados essenciais do usuário na sessão (memória do servidor).
        // O navegador recebe apenas um ID de sessão (cookie), não os dados.
        req.session.usuario = {
            id: usuario.id_User,
            email: usuario.email_User,
            nome: usuario.nome_User,
            sobrenome: usuario.sobrenome_User,
            cargo: usuario.cargo_User,
            departamento: usuario.departamento_User,
            nivel_acesso: usuario.nivelAcesso_User 
        };

        res.json({ 
            mensagem: "Login realizado com sucesso.",
            nivel_acesso: usuario.nivelAcesso_User
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /auth/me
 * @description Rota de "Who am I?".
 * * O frontend chama essa rota ao carregar a página para saber se o usuário ainda está logado
 * e qual é o seu nome/permissão, sem precisar fazer login de novo.
 */
router.get('/me', verificaSessao, (req, res) => {
    // O middleware 'verificaSessao' garante que req.session.usuario existe.
    const usuario = req.session.usuario;

    res.json({
        id: usuario.id,
        nome: usuario.nome || 'Usuário',
        sobrenome: usuario.sobrenome || 'Não Definido',
        cargo: usuario.cargo || 'Não Definido',
        nivel_acesso: usuario.nivel_acesso,
        email: usuario.email,
        departamento: usuario.departamento || 'Não Definido'
    });
});

/**
 * @route POST /auth/logout
 * @description Encerramento de sessão.
 * Destrói a sessão no servidor e instrui o navegador a apagar o cookie.
 */
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            return res.status(500).json({ error: 'Erro ao fazer logout.' });
        }   

        res.clearCookie('connect.sid'); // Remove o cookie de identificação
        res.json({ mensagem: 'Logout realizado com sucesso.' });
    });
});

module.exports = router;