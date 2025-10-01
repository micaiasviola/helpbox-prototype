const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'Helpbox',
    user: process.env.DB_USER || 'micaias.viola',
    password: process.env.DB_PASSWORD || 'Monteiro140',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: true // Para desenvolvimento
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolPromise;

const getPool = async () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then(pool => {
                console.log('Conectado ao SQL Server');
                return pool;
            })
            .catch(err => {
                console.error('Erro de conexão:', err);
                throw err;
            });
    }
    return poolPromise;
};

module.exports = {
    sql,
    getPool
};