const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Obtener el token del encabezado (Authorization)
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. No hay token." });
    }

    try {
        // 2. Quitar la palabra "Bearer " si viene en el string
        const soloToken = token.split(" ")[1] || token;
        
        // 3. Verificar el token con nuestra llave secreta
        const cifrado = jwt.verify(soloToken, process.env.JWT_SECRET);
        
        // 4. Guardar los datos del usuario en la petición (req)
        req.usuario = cifrado; 
        
        next(); // Continuar a la siguiente función
    } catch (error) {
        res.status(400).json({ message: "Token no válido" });
    }
};

// Middleware para restringir solo a Administradores (Doctores)
const esAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ message: "Acceso prohibido. Se requiere rol de Administrador." });
    }
    next();
};

module.exports = { verificarToken, esAdmin };