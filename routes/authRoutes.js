const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require('../controllers/authController');

// Ruta: POST /api/auth/register
router.post('/register', registrarUsuario);

// Ruta: POST /api/auth/login
router.post('/login', loginUsuario);

module.exports = router;