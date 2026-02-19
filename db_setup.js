const pool = require('./config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function main(){
  try {
    // 1) Crear tabla usuarios si no existe
    await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'paciente',
      created_at TIMESTAMP DEFAULT now()
    )`);
    console.log('Tabla usuarios creada/confirmada');

    // 2) Crear admin si no existe
    const adminEmail = 'admin@example.com';
    const adminPass = 'admin123';
    const q = await pool.query('SELECT id FROM usuarios WHERE email = $1', [adminEmail]);
    let adminId;
    if (q.rows.length === 0) {
      const hashed = await bcrypt.hash(adminPass, 10);
      const ins = await pool.query('INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING id', ['Admin', adminEmail, hashed, 'admin']);
      adminId = ins.rows[0].id;
      console.log('Admin creado:', adminEmail, 'password:', adminPass);
    } else {
      adminId = q.rows[0].id;
      console.log('Admin ya existe:', adminEmail);
    }

    // 3) Generar token admin
    const secret = process.env.JWT_SECRET || 'dev_jwt_secret_local';
    const token = jwt.sign({ id: adminId, rol: 'admin' }, secret, { expiresIn: '8h' });
    console.log('Token admin (úsalo como Bearer):', token);

  } catch(err){
    console.error(err && err.stack ? err.stack : err);
  } finally {
    await pool.end();
  }
}

main();
