// middlewares/verificaSessao.js

function verificaSessao(req, res, next) {
    // ... sua lógica de sessão ...
    if (req.session.usuario) {
        next(); 
    } else {
        res.redirect('/login/login_teste.html'); 
    }
}

// ** ESTA LINHA É CRÍTICA! **
module.exports = verificaSessao;