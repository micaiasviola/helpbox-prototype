const { getPool, sql } = require('./db.js');

async function getUsuarios() {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .query('SELECT id_User, nome_User, email_User, cargo_User, sobrenome_User FROM Usuario');

        return result.recordset;
    } catch (err) {
        console.error('Erro na consulta:', err);
        throw err;
    }
}

// Uso
getUsuarios()
    .then(usuarios => console.log(usuarios))
    .catch(err => console.error(err));