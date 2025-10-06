const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getPool, sql } = require('../db.js');
const verificaSessao = require('../middlewares/verificarSessao.js');

//Função para buscar usuario no bd
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
                      -- ADICIONE OS CAMPOS FALTANTES AQUI:
                      nome_User,
                      sobrenome_User,
                      cargo_User,
                      departamento_User
                FROM Usuario 
                WHERE email_User = @email
            `);
        // Retorna o primeiro registro que contém o id, email
        return result.recordset[0] || null;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        throw error;
    }

}

// ROTA POST: /auth/login
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
        
        // --- LOGS E CORREÇÃO CRÍTICA COM .trim() ---
        
        // 1. Limpa a senha enviada do frontend
        const senhaFormLimpa = senha.trim(); 
        
        // 2. Limpa o HASH que veio do BD (REMOVE CARACTERES INVISÍVEIS)
        const hashBDLimpo = usuario.senha_User.trim();
        
        console.log('DEBUG 2: Senha enviada (TRIM):', senhaFormLimpa); 
        console.log('DEBUG 3: Senha do BD (HASH LIDO + TRIM):', hashBDLimpo);
        console.log('DEBUG 4: Tamanho do HASH lido (TRIM):', hashBDLimpo.length); 
        console.log('HASH para comparação:', hashBDLimpo);
        // ------------------------------------------

        // 3. Compara as strings LIMPAS
        const senhaCorreta = await bcrypt.compare(senhaFormLimpa, hashBDLimpo);

        if (!senhaCorreta) {
            console.log('DEBUG 5: Comparação de senha FALHOU.'); 
            return res.status(401).json({ error: "Credenciais inválidas." });
        }

        // --- AUTENTICAÇÃO BEM-SUCEDIDA! ---

        // 4. Cria a Sessão
        req.session.usuario = {
            id: usuario.id_User,
            email: usuario.email_User,
            nome: usuario.nome_User,
            sobrenome: usuario.sobrenome_User,
            cargo: usuario.cargo_User,
            departamento: usuario.departamento_User,
            nivel_acesso: usuario.nivelAcesso_User 
        };

        // Resposta de sucesso
        res.json({ 
            mensagem: "Login realizado com sucesso.",
            nivel_acesso: usuario.nivelAcesso_User
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: error.message });
    }
});

//Função para retornar as informações do usuario logado

router.get('/me', verificaSessao, (req, res) => {
    //se sessão verificada, retorna os dados do usuario
    const usuario = req.session.usuario;

    res.json({
        nome: usuario.nome || 'Usuário',
        sobrenome: usuario.sobrenome || 'Não Definido',// Se você não armazenou o nome na sessão, pegue-o do BD!
        cargo: usuario.cargo || 'Não Definido', // Mesma observação
        nivel_acesso: usuario.nivel_acesso,
        email: usuario.email
    });
});

module.exports = router;