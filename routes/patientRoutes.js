const express = require('express');
const router = express.Router();
const { registrarPaciente, registrarSignosVitales, buscarCatalogoExamenes, añadirResultadoExamen } = require('../controllers/patientController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de administración/doctor protegidas
router.post('/pacientes', verificarToken, esAdmin, registrarPaciente);
router.post('/signos', verificarToken, esAdmin, registrarSignosVitales);
router.get('/examenes', verificarToken, esAdmin, buscarCatalogoExamenes);
router.post('/examenes/resultados', verificarToken, esAdmin, añadirResultadoExamen);

module.exports = router;
