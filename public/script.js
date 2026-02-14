// public/script.js
const loginForm = document.getElementById('loginForm');
const message = document.getElementById('message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        message.innerText = "Validando credenciales...";
        message.style.color = "#007bff";

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardamos el token y datos en localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            message.innerText = "✅ ¡Éxito! Redirigiendo...";
            message.style.color = "#27ae60";
            
            // Redirigir al dashboard después de 1 segundo
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
        } else {
            message.innerText = "❌ " + (data.message || "Error al iniciar sesión");
            message.style.color = "#e74c3c";
        }
    } catch (error) {
        console.error('Error:', error);
        message.innerText = "❌ Error de conexión con el servidor";
        message.style.color = "#e74c3c";
    }
});