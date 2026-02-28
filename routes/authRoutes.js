const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario, solicitarRecuperacion, verificarCodigoRecuperacion, cambiarContrasena } = require('../controllers/controllers');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Registro: solo admin puede crear usuarios
router.post('/register', verificarToken, esAdmin, registrarUsuario);

// Login estándar
router.post('/login', loginUsuario);

// Recuperación de contraseña (solo para pacientes)
router.post('/recuperar-contrasena', solicitarRecuperacion);
router.post('/verificar-codigo', verificarCodigoRecuperacion);
router.post('/cambiar-contrasena', cambiarContrasena);

module.exports = router;