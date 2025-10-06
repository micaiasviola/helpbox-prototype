const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const verificaSessao = require('./middlewares/verificarSessao.js');
const usuariosRoutes = require('./routes/usuarios');
const chamadosRoutes = require('./routes/chamados');
const authRoutes = require('./routes/auth.js');

const app = express();
const PORT = 3000;

// Middlewares BÁSICOS e de SESSÃO (DEVE ESTAR NO TOPO)
app.use(express.json()); // 1. Processar JSON

// 2. CONFIGURAÇÃO DA SESSÃO: (CRÍTICO: Inicializa req.session)
app.use(session({
    secret: 'SEGREDO_HELPBOX', 
    resave: false, 
    saveUninitialized: false, 
    cookie: {
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 
    }
})); 

// 3. CONFIGURAÇÃO DO CORS: (Pode vir após a sessão)
app.use(cors({
    origin: 'http://localhost:3000', 
    credentials: true 
}));

// 4. ROTAS PERSONALIZADAS: (Usam req.session para redirecionar ou proteger)
// ROTA RAIZ PROTEGIDA: Acessar '/' exige sessão
app.get('/', verificaSessao, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'FrontEnd', 'index.html')); 
});

// 5. ARQUIVOS ESTÁTICOS: (Serve o frontend, deve vir depois da rota '/' personalizada)
app.use(express.static(path.join(__dirname, '..', 'FrontEnd')));


// 6. ROTAS DA API
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/chamados', chamadosRoutes);


// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});