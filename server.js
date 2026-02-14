const express = require('express');
const path = require('path');
const pool = require('./config/db');
require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rutas de autenticación
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Rutas de exámenes
const examenRoutes = require('./routes/examenRoutes');
app.use('/api/examenes', examenRoutes);

// Ruta de prueba de BD
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW(), current_database() as db_name');
    res.json({
      status: 'Conexión Exitosa ✅',
      db_time: result.rows[0].now,
      database: result.rows[0].db_name,
      message: 'El backend se comunica correctamente con PostgreSQL'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 'Error de Conexión ❌',
      error: err.message
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

