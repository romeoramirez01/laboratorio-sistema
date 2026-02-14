const express = require('express');
const router = express.Router();
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Esta ruta está doblemente protegida:
// 1. Debe tener un token válido.
// 2. El rol en el token debe ser 'admin'.
router.post('/subir-resultado', verificarToken, esAdmin, (req, res) => {
    res.json({
        message: "Bienvenido Doctor. Aquí puede subir los exámenes.",
        doctor_id: req.usuario.id
    });
});

// Ruta que un Paciente SI puede ver (solo protegida por token)
router.get('/mis-examenes', verificarToken, (req, res) => {
    res.json({
        message: "Hola Paciente. Aquí están tus resultados.",
        paciente_id: req.usuario.id
    });
});

module.exports = router;