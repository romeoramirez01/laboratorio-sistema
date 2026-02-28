const express = require('express');
const router = express.Router();
const { obtenerPerfil, obtenerSignosVitales, obtenerResultadosExamenes, exportarPDF, agendarCita, obtenerCitas } = require('../controllers/controllers');
const { verificarToken, esPaciente } = require('../middlewares/authMiddleware');

// Todas las rutas de paciente protegidas
router.get('/perfil', verificarToken, esPaciente, obtenerPerfil);
router.get('/signos-vitales', verificarToken, esPaciente, obtenerSignosVitales);
router.get('/resultados-examenes', verificarToken, esPaciente, obtenerResultadosExamenes);
router.get('/exportar-pdf', verificarToken, esPaciente, exportarPDF);
router.post('/agendar-cita', verificarToken, esPaciente, agendarCita);
router.get('/citas', verificarToken, esPaciente, obtenerCitas);

module.exports = router;
