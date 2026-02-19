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

    // 4) Crear tabla pacientes
    await pool.query(`CREATE TABLE IF NOT EXISTS pacientes (
      id SERIAL PRIMARY KEY,
      dui VARCHAR(20) UNIQUE,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      fecha_nacimiento DATE,
      telefono VARCHAR(30),
      correo TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT now()
    )`);
    console.log('Tabla pacientes creada/confirmada');

    // 5) Crear tabla signos_vitales
    await pool.query(`CREATE TABLE IF NOT EXISTS signos_vitales (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
      presion_arterial TEXT,
      frecuencia_cardiaca INTEGER,
      temperatura NUMERIC,
      peso NUMERIC,
      altura NUMERIC,
      notas TEXT,
      registrado_por INTEGER REFERENCES usuarios(id),
      created_at TIMESTAMP DEFAULT now()
    )`);
    console.log('Tabla signos_vitales creada/confirmada');

    // 6) Crear catálogo de exámenes y resultados
    await pool.query(`CREATE TABLE IF NOT EXISTS catalogo_examenes (
      id SERIAL PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT
    )`);
    console.log('Tabla catalogo_examenes creada/confirmada');

    await pool.query(`CREATE TABLE IF NOT EXISTS resultados_examenes (
      id SERIAL PRIMARY KEY,
      paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
      examen_id INTEGER NOT NULL REFERENCES catalogo_examenes(id) ON DELETE CASCADE,
      resultados JSONB,
      registrado_por INTEGER REFERENCES usuarios(id),
      created_at TIMESTAMP DEFAULT now()
    )`);
    console.log('Tabla resultados_examenes creada/confirmada');

    // 7) Seed: algunos exámenes comunes si no existen
    const exams = [
      ['CBC','Hemograma completo','Recuento de células sanguíneas'],
      ['GLU','Glucosa en sangre','Glucosa plasmática en ayunas'],
      ['UO','Orina completa','Examen general de orina']
    ];
    for (const [codigo, nombre, descripcion] of exams) {
      await pool.query(`INSERT INTO catalogo_examenes (codigo,nombre,descripcion)
        SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM catalogo_examenes WHERE codigo=$1)`, [codigo,nombre,descripcion]);
    }
    console.log('Catálogo de exámenes seed completado');

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
