// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuramos el pool con las variables del archivo .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Probamos la conexión al iniciar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conexión a PostgreSQL exitosa:', res.rows[0].now);
  }
});

module.exports = pool;