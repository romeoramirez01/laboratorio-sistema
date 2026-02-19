const pool = require('../config/db');

// Rangos de referencia para mostrar en el formulario (ejemplos)
const RANGOS_REFERENCIA = {
  presion_arterial: 'Normal: 90/60 - 120/80 mmHg',
  frecuencia_cardiaca: 'Adulto: 60 - 100 latidos/min',
  temperatura: 'Normal: 36.1 - 37.2 °C',
  peso: 'Varía por edad y talla',
  altura: 'Varía por edad y talla'
};

// Registrar paciente (solo admin/doctor)
const registrarPaciente = async (req, res) => {
  const { dui, nombres, apellidos, fecha_nacimiento, telefono, correo } = req.body;
  try {
    if (!nombres || !apellidos) return res.status(400).json({ message: 'Faltan nombres o apellidos' });

    const exists = await pool.query('SELECT id FROM pacientes WHERE correo = $1 OR dui = $2', [correo, dui]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Paciente con mismo correo o DUI ya existe' });

    const ins = await pool.query(
      'INSERT INTO pacientes (dui, nombres, apellidos, fecha_nacimiento, telefono, correo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [dui, nombres, apellidos, fecha_nacimiento || null, telefono, correo]
    );

    res.status(201).json({ message: 'Paciente registrado', paciente: ins.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al registrar paciente' });
  }
};

// Registrar signos vitales para un paciente
const registrarSignosVitales = async (req, res) => {
  const { paciente_id, presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas } = req.body;
  try {
    // Verificar paciente
    const p = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });

    const ins = await pool.query(
      `INSERT INTO signos_vitales (paciente_id, presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [paciente_id, presion_arterial, frecuencia_cardiaca || null, temperatura || null, peso || null, altura || null, notas || null, req.usuario.id]
    );

    res.status(201).json({ message: 'Signos vitales registrados', signos: ins.rows[0], rangos: RANGOS_REFERENCIA });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al registrar signos vitales' });
  }
};

// Listar catálogo de exámenes (para búsqueda/autocomplete)
const buscarCatalogoExamenes = async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    const result = await pool.query('SELECT id, codigo, nombre, descripcion FROM catalogo_examenes WHERE nombre ILIKE $1 OR codigo ILIKE $1 LIMIT 20', [`%${q}%`]);
    res.json({ exams: result.rows });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al buscar exámenes' });
  }
};

// Añadir resultado de examen para un paciente
const añadirResultadoExamen = async (req, res) => {
  const { paciente_id, examen_id, resultados } = req.body; // resultados: objeto con campos del examen
  try {
    const p = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });

    // Opcional: validar examen existe
    const ex = await pool.query('SELECT id FROM catalogo_examenes WHERE id = $1', [examen_id]);
    if (ex.rows.length === 0) return res.status(404).json({ message: 'Examen no encontrado en catálogo' });

    const ins = await pool.query('INSERT INTO resultados_examenes (paciente_id, examen_id, resultados, registrado_por) VALUES ($1,$2,$3,$4) RETURNING *', [paciente_id, examen_id, resultados ? JSON.stringify(resultados) : null, req.usuario.id]);
    res.status(201).json({ message: 'Resultado de examen guardado', resultado: ins.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al guardar resultado de examen' });
  }
};

module.exports = { registrarPaciente, registrarSignosVitales, buscarCatalogoExamenes, añadirResultadoExamen };
