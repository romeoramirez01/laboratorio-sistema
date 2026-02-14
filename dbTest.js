const { Pool } = require('pg');
require('dotenv').config(); // carga .env

console.log('Working dir:', process.cwd());
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PORT:', process.env.DB_PORT);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

(async () => {
  try {
    console.log('Attempting query...');
    const res = await pool.query('SELECT NOW()');
    console.log('Conexión exitosa. Hora del servidor:', res.rows[0].now);
  } catch (err) {
    console.error('Error de conexión:', err && err.stack ? err.stack : err);
  } finally {
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
})();