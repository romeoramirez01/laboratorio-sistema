const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registrarUsuario = async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    try {
        // 1. Verificar si el usuario ya existe
        const usuarioExiste = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        // 2. Encriptar la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Guardar en la base de datos
        const nuevoUsuario = await pool.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hashedPassword, rol || 'paciente']
        );

        res.status(201).json({
            message: "Usuario creado con éxito",
            user: nuevoUsuario.rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor al registrar" });
    }
};

module.exports = { registrarUsuario };


const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar al usuario por email
        const userQuery = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const usuario = userQuery.rows[0];

        // 2. Comparar la contraseña enviada con la de la BD
        const validPassword = await bcrypt.compare(password, usuario.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: "Contraseña incorrecta" });
        }

        // 3. Crear el Token (Payload: id y rol)
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // El token expira en 8 horas
        );

        // 4. Responder con éxito y el Token
        res.json({
            message: "Login exitoso",
            token,
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor al iniciar sesión" });
    }
};

module.exports = { registrarUsuario, loginUsuario };