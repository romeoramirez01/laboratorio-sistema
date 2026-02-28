const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

// Email transporter (use env vars in production)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tu_email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'tu_contraseña_app'
  }
});

const enviarCodigoRecuperacion = async (email, nombreUsuario, codigoRecuperacion) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@laboratorio.com',
      to: email,
      subject: 'Código de Recuperación de Contraseña - Laboratorio',
      html: `
        <h2>Recuperación de Contraseña</h2>
        <p>Hola <strong>${nombreUsuario}</strong>,</p>
        <p>Has solicitado recuperar tu contraseña. Usa el siguiente código:</p>
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px; text-align: center;">
          <h1 style="color: #333; letter-spacing: 5px;">${codigoRecuperacion}</h1>
        </div>
        <p><strong>Nota:</strong> Este código expira en 30 minutos.</p>
        <p>Si no solicitaste esto, ignora este correo.</p>
        <hr>
        <p><small>© 2026 Laboratorio. Todos los derechos reservados.</small></p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Correo enviado:', info.response);
    return true;
  } catch (err) {
    console.error('✗ Error enviando correo:', err);
    return false;
  }
};

// -------------------- Auth Controller --------------------
const ALLOWED_ROLES = ['paciente', 'admin', 'doctor'];
const generarCodigoRecuperacion = () => Math.floor(100000 + Math.random() * 900000).toString();

const registrarUsuario = async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  try {
    if (!req.usuario || req.usuario.rol !== 'admin') return res.status(403).json({ message: 'Acceso prohibido. Solo administradores pueden crear usuarios.' });
    if (!nombre || !email || !password) return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, email o password.' });
    const roleToSet = rol && ALLOWED_ROLES.includes(rol) ? rol : 'paciente';
    const usuarioExiste = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (usuarioExiste.rows.length > 0) return res.status(400).json({ message: 'El correo ya está registrado' });
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const nuevoUsuario = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, hashedPassword, roleToSet]
    );
    res.status(201).json({ message: 'Usuario creado con éxito', user: nuevoUsuario.rows[0] });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Error en el servidor al registrar' });
  }
};

const loginUsuario = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    const usuario = userQuery.rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });
    const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login exitoso', token, user: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, email: usuario.email } });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
  }
};

const solicitarRecuperacion = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) return res.status(400).json({ message: 'El correo es requerido' });
    const userQuery = await pool.query('SELECT id, nombre, rol FROM usuarios WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    const usuario = userQuery.rows[0];
    if (usuario.rol !== 'paciente') return res.status(403).json({ message: 'Solo los pacientes pueden recuperar contraseña por email' });
    const codigoRecuperacion = generarCodigoRecuperacion();
    const saltRounds = 10;
    const codigoHasheado = await bcrypt.hash(codigoRecuperacion, saltRounds);
    await pool.query('UPDATE usuarios SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'30 minutes\' WHERE id = $2', [codigoHasheado, usuario.id]);
    const codigoEnviado = await enviarCodigoRecuperacion(email, usuario.nombre, codigoRecuperacion);
    if (codigoEnviado) res.json({ message: 'Código de recuperación enviado al correo', requiresCode: true });
    else res.status(500).json({ message: 'Error al enviar el correo. Intenta nuevamente.' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Error al solicitar recuperación' });
  }
};

const verificarCodigoRecuperacion = async (req, res) => {
  const { email, codigo } = req.body;
  try {
    if (!email || !codigo) return res.status(400).json({ message: 'Email y código son requeridos' });
    const userQuery = await pool.query('SELECT id, reset_token, reset_token_expires FROM usuarios WHERE email = $1', [email]);
    if (userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    const usuario = userQuery.rows[0];
    if (!usuario.reset_token_expires || new Date() > new Date(usuario.reset_token_expires)) return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
    const codigoValido = await bcrypt.compare(codigo, usuario.reset_token);
    if (!codigoValido) return res.status(401).json({ message: 'Código incorrecto' });
    const tokenTemporal = jwt.sign({ id: usuario.id, cambioPassword: true }, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.json({ message: 'Código verificado correctamente', tempToken: tokenTemporal });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Error al verificar código' });
  }
};

const cambiarContrasena = async (req, res) => {
  const { nuevaContrasena, confirmarContrasena } = req.body;
  const token = req.header('Authorization');
  try {
    if (!token) return res.status(401).json({ message: 'Token requerido' });
    if (!nuevaContrasena || !confirmarContrasena) return res.status(400).json({ message: 'Las contraseñas son requeridas' });
    if (nuevaContrasena !== confirmarContrasena) return res.status(400).json({ message: 'Las contraseñas no coinciden' });
    if (nuevaContrasena.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    const soloToken = token.split(" ")[1] || token;
    const datos = jwt.verify(soloToken, process.env.JWT_SECRET);
    if (!datos.cambioPassword) return res.status(403).json({ message: 'Token inválido para cambio de contraseña' });
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaContrasena, saltRounds);
    await pool.query('UPDATE usuarios SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hashedPassword, datos.id]);
    res.json({ message: 'Contraseña cambiada exitosamente' });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Error al cambiar contraseña' });
  }
};

// -------------------- Admin Controller --------------------
const obtenerUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY created_at DESC');
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

const eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) return res.status(400).json({ message: 'ID de usuario requerido' });
    const adminCount = await pool.query("SELECT COUNT(*) as count FROM usuarios WHERE rol='admin'");
    const usuarioAEliminar = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [id]);
    if (usuarioAEliminar.rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (usuarioAEliminar.rows[0].rol === 'admin' && adminCount.rows[0].count <= 1) return res.status(400).json({ message: 'No se puede eliminar el último administrador' });
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length > 0) res.json({ message: 'Usuario eliminado exitosamente' });
    else res.status(404).json({ message: 'Usuario no encontrado' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};

// -------------------- Patient Controller --------------------
const RANGOS_REFERENCIA = {
  presion_arterial: 'Normal: 90/60 - 120/80 mmHg',
  frecuencia_cardiaca: 'Adulto: 60 - 100 latidos/min',
  temperatura: 'Normal: 36.1 - 37.2 °C',
  peso: 'Varía por edad y talla',
  altura: 'Varía por edad y talla'
};

const registrarPaciente = async (req, res) => {
  const { dui, nombres, apellidos, fecha_nacimiento, telefono, correo } = req.body;
  try {
    if (!nombres || !apellidos) return res.status(400).json({ message: 'Faltan nombres o apellidos' });
    const exists = await pool.query('SELECT id FROM pacientes WHERE correo = $1 OR dui = $2', [correo, dui]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Paciente con mismo correo o DUI ya existe' });
    const ins = await pool.query('INSERT INTO pacientes (dui, nombres, apellidos, fecha_nacimiento, telefono, correo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [dui, nombres, apellidos, fecha_nacimiento || null, telefono, correo]);
    res.status(201).json({ message: 'Paciente registrado', paciente: ins.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al registrar paciente' });
  }
};

const registrarSignosVitales = async (req, res) => {
  const { paciente_id, presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas } = req.body;
  try {
    const p = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const ins = await pool.query(`INSERT INTO signos_vitales (paciente_id, presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas, registrado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [paciente_id, presion_arterial, frecuencia_cardiaca || null, temperatura || null, peso || null, altura || null, notas || null, req.usuario.id]);
    res.status(201).json({ message: 'Signos vitales registrados', signos: ins.rows[0], rangos: RANGOS_REFERENCIA });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al registrar signos vitales' });
  }
};

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

const añadirResultadoExamen = async (req, res) => {
  const { paciente_id, examen_id, resultados } = req.body;
  try {
    const p = await pool.query('SELECT id FROM pacientes WHERE id = $1', [paciente_id]);
    if (p.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const ex = await pool.query('SELECT id FROM catalogo_examenes WHERE id = $1', [examen_id]);
    if (ex.rows.length === 0) return res.status(404).json({ message: 'Examen no encontrado en catálogo' });
    const ins = await pool.query('INSERT INTO resultados_examenes (paciente_id, examen_id, resultados, registrado_por) VALUES ($1,$2,$3,$4) RETURNING *', [paciente_id, examen_id, resultados ? JSON.stringify(resultados) : null, req.usuario.id]);
    res.status(201).json({ message: 'Resultado de examen guardado', resultado: ins.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al guardar resultado de examen' });
  }
};

const obtenerPacientePorId = async (req, res) => {
  const { id } = req.params;
  try {
    let result = await pool.query('SELECT id, dui, nombres, apellidos, fecha_nacimiento, telefono, correo FROM pacientes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      result = await pool.query('SELECT id, dui, nombres, apellidos, fecha_nacimiento, telefono, correo FROM pacientes WHERE dui = $1', [id]);
    }
    if (result.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json({ paciente: result.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al buscar paciente' });
  }
};

// -------------------- Patient Client Controller --------------------
const obtenerPerfil = async (req, res) => {
  try {
    const paciente_id = req.usuario.id;
    const result = await pool.query('SELECT p.id, p.dui, p.nombres, p.apellidos, p.fecha_nacimiento, p.telefono, p.correo FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Perfil de paciente no encontrado' });
    res.json({ paciente: result.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

const obtenerSignosVitales = async (req, res) => {
  try {
    const paciente_id = req.usuario.id;
    const paciente = await pool.query('SELECT p.id FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (paciente.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const pId = paciente.rows[0].id;
    const result = await pool.query('SELECT id, presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas, created_at FROM signos_vitales WHERE paciente_id = $1 ORDER BY created_at DESC', [pId]);
    res.json({ signos_vitales: result.rows });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al obtener signos vitales' });
  }
};

const obtenerResultadosExamenes = async (req, res) => {
  try {
    const paciente_id = req.usuario.id;
    const paciente = await pool.query('SELECT p.id FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (paciente.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const pId = paciente.rows[0].id;
    const result = await pool.query(`SELECT re.id, ce.nombre, ce.codigo, ce.descripcion, re.resultados, re.created_at FROM resultados_examenes re INNER JOIN catalogo_examenes ce ON re.examen_id = ce.id WHERE re.paciente_id = $1 ORDER BY re.created_at DESC`, [pId]);
    res.json({ examenes: result.rows });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al obtener resultados de exámenes' });
  }
};

const exportarPDF = async (req, res) => {
  try {
    const paciente_id = req.usuario.id;
    const paciente = await pool.query('SELECT p.id, p.dui, p.nombres, p.apellidos, p.fecha_nacimiento, p.telefono, p.correo FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (paciente.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const pData = paciente.rows[0];
    const pId = pData.id;
    const signos = await pool.query('SELECT presion_arterial, frecuencia_cardiaca, temperatura, peso, altura, notas, created_at FROM signos_vitales WHERE paciente_id = $1 ORDER BY created_at DESC', [pId]);
    const examenes = await pool.query(`SELECT ce.nombre, ce.codigo, re.resultados, re.created_at FROM resultados_examenes re INNER JOIN catalogo_examenes ce ON re.examen_id = ce.id WHERE re.paciente_id = $1 ORDER BY re.created_at DESC`, [pId]);
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_medico.pdf"');
    doc.pipe(res);
    doc.fontSize(20).font('Helvetica-Bold').text('REPORTE MÉDICO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Datos Personales', { underline: true });
    doc.font('Helvetica').fontSize(10);
    doc.text(`Nombres: ${pData.nombres} ${pData.apellidos}`);
    doc.text(`DUI: ${pData.dui || 'N/A'}`);
    doc.text(`Fecha de Nacimiento: ${pData.fecha_nacimiento || 'N/A'}`);
    doc.text(`Teléfono: ${pData.telefono || 'N/A'}`);
    doc.text(`Correo: ${pData.correo || 'N/A'}`);
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Signos Vitales', { underline: true });
    doc.font('Helvetica').fontSize(10);
    if (signos.rows.length > 0) {
      signos.rows.forEach((s, idx) => {
        doc.text(`\nRegistro ${idx + 1} (${new Date(s.created_at).toLocaleDateString()})`);
        doc.text(`  Presión Arterial: ${s.presion_arterial || 'N/A'}`);
        doc.text(`  Frecuencia Cardiaca: ${s.frecuencia_cardiaca || 'N/A'} latidos/min`);
        doc.text(`  Temperatura: ${s.temperatura || 'N/A'} °C`);
        doc.text(`  Peso: ${s.peso || 'N/A'} kg`);
        doc.text(`  Altura: ${s.altura || 'N/A'} m`);
        if (s.notas) doc.text(`  Notas: ${s.notas}`);
      });
    } else {
      doc.text('Sin registros de signos vitales');
    }
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Resultados de Exámenes', { underline: true });
    doc.font('Helvetica').fontSize(10);
    if (examenes.rows.length > 0) {
      examenes.rows.forEach((e, idx) => {
        doc.text(`\nExamen ${idx + 1}: ${e.nombre} (${e.codigo})`);
        doc.text(`  Fecha: ${new Date(e.created_at).toLocaleDateString()}`);
        if (e.resultados) {
          doc.text(`  Resultados: ${JSON.stringify(e.resultados, null, 2)}`);
        }
      });
    } else {
      doc.text('Sin resultados de exámenes');
    }
    doc.moveDown();
    doc.fontSize(8).text(`Generado: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.end();
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al generar PDF' });
  }
};

const agendarCita = async (req, res) => {
  const { fecha_cita, hora_cita, motivo } = req.body;
  try {
    if (!fecha_cita || !hora_cita) return res.status(400).json({ message: 'Faltan fecha u hora de cita' });
    const paciente_id = req.usuario.id;
    const paciente = await pool.query('SELECT p.id FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (paciente.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const pId = paciente.rows[0].id;
    const result = await pool.query('INSERT INTO citas (paciente_id, fecha_cita, hora_cita, motivo) VALUES ($1, $2, $3, $4) RETURNING *', [pId, fecha_cita, hora_cita, motivo || null]);
    res.status(201).json({ message: 'Cita agendada exitosamente', cita: result.rows[0] });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al agendar cita' });
  }
};

const obtenerCitas = async (req, res) => {
  try {
    const paciente_id = req.usuario.id;
    const paciente = await pool.query('SELECT p.id FROM pacientes p INNER JOIN usuarios u ON p.correo = u.email WHERE u.id = $1', [paciente_id]);
    if (paciente.rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
    const pId = paciente.rows[0].id;
    const result = await pool.query('SELECT id, fecha_cita, hora_cita, motivo, estado, notas_doctor, created_at FROM citas WHERE paciente_id = $1 ORDER BY fecha_cita DESC', [pId]);
    res.json({ citas: result.rows });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Error al obtener citas' });
  }
};

module.exports = {
  // Auth
  registrarUsuario,
  loginUsuario,
  solicitarRecuperacion,
  verificarCodigoRecuperacion,
  cambiarContrasena,
  // Admin
  obtenerUsuarios,
  eliminarUsuario,
  // Patient (admin/doctor)
  registrarPaciente,
  registrarSignosVitales,
  buscarCatalogoExamenes,
  añadirResultadoExamen,
  obtenerPacientePorId,
  // Patient client
  obtenerPerfil,
  obtenerSignosVitales,
  obtenerResultadosExamenes,
  exportarPDF,
  agendarCita,
  obtenerCitas
};
