// Dashboard initialization
const user = JSON.parse(localStorage.getItem('user'));
if (!user) window.location.href = '/index.html';

document.getElementById('welcomeTitle').innerText = `Bienvenido, ${user.nombre}`;
if (user.rol === 'admin') document.getElementById('adminPanelBtn').style.display = 'inline-block';

function irAlPanelAdmin() { window.location.href = '/admin.html'; }
function logout() {
  if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
    localStorage.clear();
    window.location.href = '/index.html';
  }
}

const getToken = () => localStorage.getItem('token');

const content = document.getElementById('content');

if (user.rol === 'admin') {
  // Admin panel HTML
  content.innerHTML = `
    <h3>📋 Panel de Administrador</h3>
    <p>Puedes gestionar los pacientes, signos vitales y resultados de exámenes.</p>
    
    <section class="card">
      <h4>Registrar Paciente</h4>
      <form id="patientForm" class="form">
        <input type="text" id="dui" placeholder="DUI" />
        <input type="text" id="nombres" placeholder="Nombres" required />
        <input type="text" id="apellidos" placeholder="Apellidos" required />
        <input type="date" id="fecha_nacimiento" />
        <input type="text" id="telefono" placeholder="Teléfono" />
        <input type="email" id="correo" placeholder="Correo" />
        <button type="submit">Registrar Paciente</button>
      </form>
      <div id="patientMessage" class="message"></div>
    </section>

    <section class="card">
      <h4>Registrar Signos Vitales</h4>
      <div class="search-box">
        <input type="number" id="paciente_id_signs" placeholder="ID Paciente" />
        <button type="button" id="buscarPacienteBtn">🔍 Buscar Paciente</button>
      </div>
      <div id="pacienteInfo" class="info"></div>
      <form id="signsForm" class="form">
        <input type="text" id="presion_arterial" placeholder="Presión arterial (ej. 120/80)" />
        <input type="number" id="frecuencia_cardiaca" placeholder="Frecuencia cardiaca" />
        <input type="number" step="0.1" id="temperatura" placeholder="Temperatura (°C)" />
        <input type="number" step="0.1" id="peso" placeholder="Peso (kg)" />
        <input type="number" step="0.01" id="altura" placeholder="Altura (m)" />
        <textarea id="notas" placeholder="Notas"></textarea>
        <button type="submit">Registrar Signos</button>
      </form>
      <div id="signsMessage" class="message"></div>
    </section>

    <section class="card">
      <h4>Agregar Resultado de Examen</h4>
      <input id="exSearch" placeholder="Buscar examen (nombre o código)" />
      <div id="exResults" class="search-results"></div>
      <form id="examResultForm" class="form">
        <input type="number" id="paciente_id_exam" placeholder="ID Paciente" required />
        <input type="hidden" id="examen_id" />
        <textarea id="resultados_json" placeholder='Resultados JSON, p.ej. {"glucosa":"95 mg/dL"}'></textarea>
        <button type="submit">Guardar Resultado</button>
      </form>
      <div id="examMessage" class="message"></div>
    </section>
  `;

  // Admin event listeners
  document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      dui: document.getElementById('dui').value || null,
      nombres: document.getElementById('nombres').value,
      apellidos: document.getElementById('apellidos').value,
      fecha_nacimiento: document.getElementById('fecha_nacimiento').value || null,
      telefono: document.getElementById('telefono').value || null,
      correo: document.getElementById('correo').value || null
    };
    try {
      const res = await fetch('/api/admin/pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      document.getElementById('patientMessage').innerText = body.message || JSON.stringify(body);
    } catch (err) {
      document.getElementById('patientMessage').innerText = 'Error de conexión';
    }
  });

  document.getElementById('signsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pacienteId = document.getElementById('paciente_id_signs').value.trim();
    if (!pacienteId) {
      document.getElementById('signsMessage').innerText = '❌ Por favor busca y selecciona un paciente primero';
      return;
    }
    const data = {
      paciente_id: Number(pacienteId),
      presion_arterial: document.getElementById('presion_arterial').value || null,
      frecuencia_cardiaca: Number(document.getElementById('frecuencia_cardiaca').value) || null,
      temperatura: Number(document.getElementById('temperatura').value) || null,
      peso: Number(document.getElementById('peso').value) || null,
      altura: Number(document.getElementById('altura').value) || null,
      notas: document.getElementById('notas').value || null
    };
    try {
      const res = await fetch('/api/admin/signos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      document.getElementById('signsMessage').innerText = body.message || JSON.stringify(body);
      if (res.ok) {
        document.getElementById('signsForm').reset();
        document.getElementById('paciente_id_signs').value = '';
        document.getElementById('pacienteInfo').innerText = '';
      }
    } catch (err) {
      document.getElementById('signsMessage').innerText = 'Error de conexión';
    }
  });

  // Buscar paciente por ID o DUI
  document.getElementById('buscarPacienteBtn').addEventListener('click', async () => {
    const id = document.getElementById('paciente_id_signs').value.trim();
    if (!id) {
      document.getElementById('pacienteInfo').innerText = '❌ Ingresa un ID o DUI de paciente';
      return;
    }
    document.getElementById('pacienteInfo').innerText = 'Buscando paciente...';
    try {
      const res = await fetch('/api/admin/pacientes/' + encodeURIComponent(id), {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      const body = await res.json();
      if (res.ok) {
        const p = body.paciente;
        document.getElementById('paciente_id_signs').value = p.id;
        document.getElementById('pacienteInfo').innerHTML = `<strong>✓ Paciente encontrado:</strong> ${p.nombres} ${p.apellidos} (DUI: ${p.dui || 'N/A'})`;
      } else {
        document.getElementById('pacienteInfo').innerText = '❌ ' + (body.message || 'Paciente no encontrado');
      }
    } catch(err) {
      document.getElementById('pacienteInfo').innerText = '❌ Error de conexión';
    }
  });

  document.getElementById('examResultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    let resultados = null;
    try { resultados = JSON.parse(document.getElementById('resultados_json').value); } catch(e) {}
    try {
      const res = await fetch('/api/admin/examenes/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({
          paciente_id: Number(document.getElementById('paciente_id_exam').value),
          examen_id: Number(document.getElementById('examen_id').value),
          resultados
        })
      });
      const body = await res.json();
      document.getElementById('examMessage').innerText = body.message || JSON.stringify(body);
    } catch (err) {
      document.getElementById('examMessage').innerText = 'Error de conexión';
    }
  });

} else {
  // Patient panel HTML
  content.innerHTML = `
    <h3>📊 Mi Panel de Paciente</h3>
    
    <section class="card">
      <h4>Mi Información Personal</h4>
      <div id="perfilInfo"><em>Cargando...</em></div>
    </section>

    <section class="card">
      <h4>Mis Signos Vitales</h4>
      <div id="signosInfo"><em>Cargando...</em></div>
    </section>

    <section class="card">
      <h4>Resultados de Mis Exámenes</h4>
      <div id="examenesInfo"><em>Cargando...</em></div>
    </section>

    <section class="card">
      <h4>Mis Citas Agendadas</h4>
      <div id="citasInfo"><em>Cargando...</em></div>
      <form id="agendarCitaForm" class="form">
        <h5>Agendar Nueva Cita</h5>
        <input type="date" id="fechaCita" required />
        <input type="time" id="horaCita" required />
        <textarea id="motivoCita" placeholder="Motivo de la cita"></textarea>
        <button type="submit">Agendar Cita</button>
      </form>
      <div id="citaMessage" class="message"></div>
    </section>

    <section class="card">
      <h4>Exportar Datos</h4>
      <button id="exportPDFBtn" class="btn-export">📥 Descargar Reporte PDF</button>
    </section>
  `;

  // Patient functions
  const cargarPerfil = async () => {
    try {
      const res = await fetch('/api/paciente/perfil', { headers: { 'Authorization': 'Bearer ' + getToken() } });
      const body = await res.json();
      if (res.ok) {
        const p = body.paciente;
        document.getElementById('perfilInfo').innerHTML = `
          <p><strong>Nombre:</strong> ${p.nombres} ${p.apellidos}</p>
          <p><strong>DUI:</strong> ${p.dui || 'N/A'}</p>
          <p><strong>Fecha de Nacimiento:</strong> ${p.fecha_nacimiento || 'N/A'}</p>
          <p><strong>Teléfono:</strong> ${p.telefono || 'N/A'}</p>
          <p><strong>Correo:</strong> ${p.correo || 'N/A'}</p>
        `;
      } else {
        document.getElementById('perfilInfo').innerText = '❌ ' + (body.message || 'Error al cargar');
      }
    } catch(err) {
      document.getElementById('perfilInfo').innerText = 'Error de conexión';
    }
  };

  const cargarSignosVitales = async () => {
    try {
      const res = await fetch('/api/paciente/signos-vitales', { headers: { 'Authorization': 'Bearer ' + getToken() } });
      const body = await res.json();
      if (res.ok && body.signos_vitales.length > 0) {
        let html = '';
        body.signos_vitales.forEach((s, idx) => {
          html += `<div class="record-item">
            <strong>Registro ${idx + 1}</strong> (${new Date(s.created_at).toLocaleDateString()})<br>
            Presión: ${s.presion_arterial || 'N/A'} | FC: ${s.frecuencia_cardiaca || 'N/A'} | Temp: ${s.temperatura || 'N/A'}°C<br>
            Peso: ${s.peso || 'N/A'} kg | Altura: ${s.altura || 'N/A'} m
            ${s.notas ? `<br>Notas: ${s.notas}` : ''}
          </div>`;
        });
        document.getElementById('signosInfo').innerHTML = html;
      } else {
        document.getElementById('signosInfo').innerText = 'Sin registros de signos vitales';
      }
    } catch(err) {
      document.getElementById('signosInfo').innerText = 'Error de conexión';
    }
  };

  const cargarExamenes = async () => {
    try {
      const res = await fetch('/api/paciente/resultados-examenes', { headers: { 'Authorization': 'Bearer ' + getToken() } });
      const body = await res.json();
      if (res.ok && body.examenes.length > 0) {
        let html = '';
        body.examenes.forEach((e, idx) => {
          html += `<div class="record-item">
            <strong>${e.nombre}</strong> (${e.codigo})<br>
            Fecha: ${new Date(e.created_at).toLocaleDateString()}<br>
            Resultados: ${e.resultados ? JSON.stringify(e.resultados) : 'N/A'}
          </div>`;
        });
        document.getElementById('examenesInfo').innerHTML = html;
      } else {
        document.getElementById('examenesInfo').innerText = 'Sin resultados de exámenes';
      }
    } catch(err) {
      document.getElementById('examenesInfo').innerText = 'Error de conexión';
    }
  };

  const cargarCitas = async () => {
    try {
      const res = await fetch('/api/paciente/citas', { headers: { 'Authorization': 'Bearer ' + getToken() } });
      const body = await res.json();
      if (res.ok && body.citas.length > 0) {
        let html = '';
        body.citas.forEach((c, idx) => {
          html += `<div class="record-item">
            <strong>Cita ${idx + 1}</strong><br>
            Fecha: ${c.fecha_cita} | Hora: ${c.hora_cita}<br>
            Motivo: ${c.motivo || 'N/A'}<br>
            Estado: <strong>${c.estado}</strong>
            ${c.notas_doctor ? `<br>Notas: ${c.notas_doctor}` : ''}
          </div>`;
        });
        document.getElementById('citasInfo').innerHTML = html;
      } else {
        document.getElementById('citasInfo').innerText = 'Sin citas agendadas';
      }
    } catch(err) {
      document.getElementById('citasInfo').innerText = 'Error de conexión';
    }
  };

  document.getElementById('agendarCitaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      fecha_cita: document.getElementById('fechaCita').value,
      hora_cita: document.getElementById('horaCita').value,
      motivo: document.getElementById('motivoCita').value || null
    };
    try {
      const res = await fetch('/api/paciente/agendar-cita', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify(data)
      });
      const body = await res.json();
      document.getElementById('citaMessage').innerText = body.message || JSON.stringify(body);
      if (res.ok) {
        document.getElementById('agendarCitaForm').reset();
        cargarCitas();
      }
    } catch (err) {
      document.getElementById('citaMessage').innerText = 'Error de conexión';
    }
  });

  document.getElementById('exportPDFBtn').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/paciente/exportar-pdf', { headers: { 'Authorization': 'Bearer ' + getToken() } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert('Error al generar PDF');
      }
    } catch(err) {
      alert('Error de conexión');
    }
  });

  // Load patient data
  cargarPerfil();
  cargarSignosVitales();
  cargarExamenes();
  cargarCitas();
}
