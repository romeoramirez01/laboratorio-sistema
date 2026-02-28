const express = require('express');
const router = express.Router();
const { obtenerUsuarios, eliminarUsuario } = require('../controllers/controllers');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Rutas protegidas solo para admin
router.get('/usuarios', verificarToken, esAdmin, obtenerUsuarios);
router.delete('/usuarios/:id', verificarToken, esAdmin, eliminarUsuario);

module.exports = router;
