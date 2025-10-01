const express = require('express');
const cors = require('cors');
const usuariosRoutes = require('./routes/usuarios');
const chamadosRoutes = require('./routes/chamados');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/usuarios', usuariosRoutes);
app.use('/chamados', chamadosRoutes);

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
