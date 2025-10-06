const express = require('express');
const cors = require('cors');
const session = require('express-session');
const usuariosRoutes = require('./routes/usuarios');
const chamadosRoutes = require('./routes/chamados');
const authRoutes = require('./routes/auth.js');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors({
    // A origem do seu arquivo login_teste.html
    origin: 'http://127.0.0.1:5500', 
    credentials: true 
}));
app.use(express.json());

//COnfiguração da sessão
app.use(session({
    secret: 'SEGREDO_HELPBOX', // **MUDE ESTA CHAVE PARA ALGO SEGURO**
    resave: false, // Não salvar de volta se não foi modificado
    saveUninitialized: false, // Não criar sessão para requests não autenticados
    cookie: {
        secure: false, // Mude para true se usar HTTPS (PRODUÇÃO)
        maxAge: 1000 * 60 * 60 * 24 // Duração da sessão: 24 horas
    }
})); // Em produção, use true se estiver usando HTTPS
// Rotas
app.use('/auth', authRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/chamados', chamadosRoutes);

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
