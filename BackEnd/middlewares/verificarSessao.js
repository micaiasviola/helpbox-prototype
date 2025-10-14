// middlewares/verificaSessao.js

function verificaSessao(req, res, next) {
    
    if (req.session.usuario) {
        next(); 
    } else {
        res.redirect('/login/tela_login.html'); 
    }
}

// ** ESTA LINHA É CRÍTICA! **
module.exports = verificaSessao;