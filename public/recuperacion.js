// Variables globales para recuperación
let emailRecuperacionGlobal = '';
let tokenTemporalGlobal = '';

// Mostrar sección de recuperación
function mostrarRecuperacion() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('recuperacionSection').style.display = 'block';
    document.getElementById('paso1').style.display = 'block';
    document.getElementById('paso2').style.display = 'none';
    document.getElementById('paso3').style.display = 'none';
    limpiarMensajes();
}

// Volver a login
function volverLogin() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('recuperacionSection').style.display = 'none';
    limpiarMensajes();
    document.getElementById('loginForm').reset();
}

// Limpiar mensajes
function limpiarMensajes() {
    document.getElementById('paso1Message').innerText = '';
    document.getElementById('paso2Message').innerText = '';
    document.getElementById('paso3Message').innerText = '';
}

// PASO 1: Solicitar código de recuperación
document.getElementById('solicitudRecuperacionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('emailRecuperacion').value;
    const messageEl = document.getElementById('paso1Message');
    
    try {
        messageEl.innerText = 'Enviando código...';
        messageEl.style.color = '#007bff';
        
        const response = await fetch('/api/auth/recuperar-contrasena', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageEl.innerText = '✓ Código enviado a tu correo. Revisa tu bandeja de entrada.';
            messageEl.style.color = '#27ae60';
            
            emailRecuperacionGlobal = email;
            
            // Mostrar paso 2 después de 2 segundos
            setTimeout(() => {
                document.getElementById('paso1').style.display = 'none';
                document.getElementById('paso2').style.display = 'block';
            }, 2000);
        } else {
            messageEl.innerText = '✗ ' + (data.message || 'Error al enviar código');
            messageEl.style.color = '#e74c3c';
        }
    } catch (error) {
        messageEl.innerText = '✗ Error de conexión';
        messageEl.style.color = '#e74c3c';
    }
});

// PASO 2: Verificar código
document.getElementById('verificarCodigoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const codigo = document.getElementById('codigoRecuperacion').value;
    const messageEl = document.getElementById('paso2Message');
    
    try {
        messageEl.innerText = 'Verificando código...';
        messageEl.style.color = '#007bff';
        
        const response = await fetch('/api/auth/verificar-codigo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailRecuperacionGlobal, codigo })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageEl.innerText = '✓ Código verificado. Ahora crea tu nueva contraseña.';
            messageEl.style.color = '#27ae60';
            
            tokenTemporalGlobal = data.tempToken;
            
            // Mostrar paso 3 después de 2 segundos
            setTimeout(() => {
                document.getElementById('paso2').style.display = 'none';
                document.getElementById('paso3').style.display = 'block';
            }, 2000);
        } else {
            messageEl.innerText = '✗ ' + (data.message || 'Error al verificar código');
            messageEl.style.color = '#e74c3c';
        }
    } catch (error) {
        messageEl.innerText = '✗ Error de conexión';
        messageEl.style.color = '#e74c3c';
    }
});

// PASO 3: Cambiar contraseña
document.getElementById('cambiarContrasenaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevaContrasena = document.getElementById('nuevaContrasena').value;
    const confirmarContrasena = document.getElementById('confirmarContrasena').value;
    const messageEl = document.getElementById('paso3Message');
    
    if (nuevaContrasena !== confirmarContrasena) {
        messageEl.innerText = '✗ Las contraseñas no coinciden';
        messageEl.style.color = '#e74c3c';
        return;
    }
    
    try {
        messageEl.innerText = 'Cambiando contraseña...';
        messageEl.style.color = '#007bff';
        
        const response = await fetch('/api/auth/cambiar-contrasena', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + tokenTemporalGlobal
            },
            body: JSON.stringify({ nuevaContrasena, confirmarContrasena })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageEl.innerText = '✓ Contraseña cambiada exitosamente. Redirigiendo...';
            messageEl.style.color = '#27ae60';
            
            // Limpiar variables
            emailRecuperacionGlobal = '';
            tokenTemporalGlobal = '';
            
            // Volver a login después de 2 segundos
            setTimeout(() => {
                volverLogin();
                document.getElementById('emailRecuperacion').value = '';
                document.getElementById('codigoRecuperacion').value = '';
                document.getElementById('nuevaContrasena').value = '';
                document.getElementById('confirmarContrasena').value = '';
            }, 2000);
        } else {
            messageEl.innerText = '✗ ' + (data.message || 'Error al cambiar contraseña');
            messageEl.style.color = '#e74c3c';
        }
    } catch (error) {
        messageEl.innerText = '✗ Error de conexión';
        messageEl.style.color = '#e74c3c';
    }
});
