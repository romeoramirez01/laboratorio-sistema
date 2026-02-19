require('dotenv').config();
const pool = require('./config/db');
const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch');

async function main(){
  try {
    // 1) Obtener admin
    const r = await pool.query("SELECT id, email FROM usuarios WHERE rol='admin' LIMIT 1");
    if (r.rows.length === 0) {
      console.error('No admin user found');
      return process.exit(1);
    }
    const admin = r.rows[0];

    const token = jwt.sign({ id: admin.id, rol: 'admin' }, process.env.JWT_SECRET || 'dev_jwt_secret_local', { expiresIn: '8h' });
    console.log('Admin id:', admin.id, 'email:', admin.email);

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // 2) Crear paciente
    const unique = Date.now();
    const pacienteData = { dui: 'DUI' + unique, nombres: 'TestN', apellidos: 'TestA', fecha_nacimiento: '1990-01-01', telefono: '555-1234', correo: `p${unique}@example.com` };
    let res = await fetch('http://localhost:3000/api/admin/pacientes', { method: 'POST', headers, body: JSON.stringify(pacienteData) });
    const pacienteBody = await res.text();
    console.log('\nCREATE PACIENTE ->', res.status, pacienteBody);

    let pacienteId = null;
    try { pacienteId = JSON.parse(pacienteBody).paciente.id; } catch(e){}

    // 3) Registrar signos vitales
    const signosData = { paciente_id: pacienteId || 1, presion_arterial: '120/80', frecuencia_cardiaca: 72, temperatura: 36.6, peso: 70, altura: 1.75, notas: 'Prueba' };
    res = await fetch('http://localhost:3000/api/admin/signos', { method: 'POST', headers, body: JSON.stringify(signosData) });
    const signosBody = await res.text();
    console.log('\nCREATE SIGNOS ->', res.status, signosBody);

    // 4) Buscar examenes (autocomplete)
    res = await fetch('http://localhost:3000/api/admin/examenes?q=GLU', { method: 'GET', headers });
    const examsBody = await res.text();
    console.log('\nSEARCH EXAMS ->', res.status, examsBody);

    let examenId = null;
    try { examenId = JSON.parse(examsBody).exams[0].id; } catch(e){}

    // 5) Añadir resultado de examen
    const resultadoData = { paciente_id: pacienteId || 1, examen_id: examenId || 1, resultados: { glucosa: '95 mg/dL', observaciones: 'Normal' } };
    res = await fetch('http://localhost:3000/api/admin/examenes/resultados', { method: 'POST', headers, body: JSON.stringify(resultadoData) });
    const resultadoBody = await res.text();
    console.log('\nADD EXAM RESULT ->', res.status, resultadoBody);

  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
  } finally {
    try { await pool.end(); } catch(e){}
  }
}

main();
