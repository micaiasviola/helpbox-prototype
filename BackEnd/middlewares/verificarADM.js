const NIVEL_ADMIN = 3; 

function verificarADM(req, res, next) {
    // Busca o objeto de usuário armazenado na sessão
   console.log('Sessão recebida no ADM Middleware:', req.session.usuario); 
    const usuarioLogado = req.session.usuario; 
    
    if (!usuarioLogado) {
        // 401: Não Autenticado
        return res.status(401).json({ erro: "Acesso negado. Por favor, faça login." });
    }

    // Verifica se o nível de acesso é 3 (ADM)
    if (usuarioLogado.nivel_acesso === NIVEL_ADMIN) {
        next(); // Permite que a requisição prossiga
    } else {
        // 403: Proibido
        return res.status(403).json({ erro: "Acesso proibido. Você não tem permissão de Administrador (Nível 3)." });
    }
}

module.exports = verificarADM;