 import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const form = document.getElementById('registro-form');
const alertBox = document.getElementById('error-alert');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');

function mostrarError(mensaje) {
    alertBox.textContent = mensaje;
    alertBox.classList.remove('hidden');
}

function ocultarError() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validaciones básicas de cliente
    if (!nombre || !email || !password || !confirmPassword) {
        mostrarError('Por favor completa todos los campos.');
        return;
    }

    if (password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    if (password !== confirmPassword) {
        mostrarError('Las contraseñas no coinciden.');
        return;
    }

    // Estado de carga
    btnSubmit.disabled = true;
    btnText.textContent = 'Creando cuenta...';
    btnSpinner.classList.remove('hidden');

    try {
        // 1. Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar perfil en la colección "users" usando el UID como ID de documento
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: nombre,
            email: email,
            role: "student", // Rol estrictamente asignado desde el backend/frontend seguro
            createdAt: serverTimestamp()
        });

        // 3. Redirección exitosa a mis-cursos.html (o fallback a index.html)
        window.location.href = 'mis-cursos.html';

    } catch (error) {
        console.error("Error en el registro:", error);
        let mensajeAmigable = 'Ocurrió un error al registrarse. Inténtalo de nuevo.';
        
        if (error.code === 'auth/email-already-in-use') {
            mensajeAmigable = 'Este correo electrónico ya está registrado.';
        } else if (error.code === 'auth/invalid-email') {
            mensajeAmigable = 'El formato del correo electrónico no es válido.';
        } else if (error.code === 'auth/weak-password') {
            mensajeAmigable = 'La contraseña es demasiado débil.';
        }

        mostrarError(mensajeAmigable);
        
        // Restaurar botón
        btnSubmit.disabled = false;
        btnText.textContent = 'Crear Cuenta';
        btnSpinner.classList.add('hidden');
    }
});