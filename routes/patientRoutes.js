const express = require('express');
const router = express.Router();
const { registrarPaciente, registrarSignosVitales, buscarCatalogoExamenes, añadirResultadoExamen, obtenerPacientePorId } = require('../controllers/controllers');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas de administración/doctor protegidas
router.post('/pacientes', verificarToken, esAdmin, registrarPaciente);
// nuevo endpoint para obtener datos de un paciente por su ID
router.get('/pacientes/:id', verificarToken, esAdmin, obtenerPacientePorId);

router.post('/signos', verificarToken, esAdmin, registrarSignosVitales);
router.get('/examenes', verificarToken, esAdmin, buscarCatalogoExamenes);
router.post('/examenes/resultados', verificarToken, esAdmin, añadirResultadoExamen);

module.exports = router;
