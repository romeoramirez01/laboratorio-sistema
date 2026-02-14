# 🏥 Sistema de Laboratorio Médico

Backend para el sistema de gestión de exámenes de laboratorio médico.

## 🚀 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/romeoramirez01/laboratorio-sistema.git
cd laboratorio-sistema
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones reales:
```env
DB_USER=tu_usuario_postgres
DB_HOST=localhost
DB_DATABASE=nombre_de_tu_base_de_datos
DB_PASSWORD=tu_contraseña_segura
DB_PORT=5432
PORT=3000
JWT_SECRET=tu_clave_jwt_super_secreta_aqui
```

4. Inicia el servidor:
```bash
npm start
# o para desarrollo
npm run dev
```

## 🔒 Seguridad

**IMPORTANTE:** Nunca subas el archivo `.env` al repositorio. Contiene información sensible como contraseñas de base de datos y claves secretas.

- El archivo `.env` está incluido en `.gitignore`
- Usa `.env.example` como plantilla para las variables de entorno
- Cambia las contraseñas por valores seguros y únicos

## 📋 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión

### Exámenes (requiere autenticación)
- `POST /api/examenes/subir-resultado` - Subir resultado (solo admin)
- `GET /api/examenes/mis-examenes` - Ver exámenes propios

## 🗄️ Base de Datos

El proyecto utiliza PostgreSQL. Asegúrate de tener una base de datos configurada con las siguientes tablas:

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'paciente'
);

-- Tabla de exámenes (ejemplo)
CREATE TABLE examenes (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES usuarios(id),
    tipo_examen VARCHAR(255),
    resultado TEXT,
    fecha DATE DEFAULT CURRENT_DATE
);
```

## 🛠️ Tecnologías

- Node.js + Express
- PostgreSQL
- JWT para autenticación
- bcrypt para encriptación de contraseñas

## 📝 Notas de Desarrollo

- El servidor corre en `http://localhost:3000`
- La interfaz web está en `/` (index.html)
- El dashboard está en `/dashboard.html`