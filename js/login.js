import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const form = document.getElementById('login-form');
const alertBox = document.getElementById('error-alert');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const btnGoogle = document.getElementById('btn-google');

function mostrarError(mensaje) {
    alertBox.textContent = mensaje;
    alertBox.classList.remove('hidden');
}

function ocultarError() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
}

// Inicio de sesión con Correo y Contraseña
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        mostrarError('Por favor ingresa tu correo y contraseña.');
        return;
    }

    btnSubmit.disabled = true;
    btnText.textContent = 'Iniciando sesión...';
    btnSpinner.classList.remove('hidden');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'mis-cursos.html';
    } catch (error) {
        console.error("Error en login:", error);
        let mensajeAmigable = 'Correo o contraseña incorrectos.';

        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            mensajeAmigable = 'Las credenciales ingresadas son incorrectas.';
        } else if (error.code === 'auth/too-many-requests') {
            mensajeAmigable = 'Demasiados intentos fallidos. Inténtalo más tarde.';
        }

        mostrarError(mensajeAmigable);

        btnSubmit.disabled = false;
        btnText.textContent = 'Ingresar';
        btnSpinner.classList.add('hidden');
    }
});

// Inicio de sesión con Google (Opcional habilitado)
btnGoogle.addEventListener('click', async () => {
    ocultarError();
    const provider = new GoogleAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Verificar si el usuario ya existe en Firestore, si no, crearlo con rol "student"
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName || 'Estudiante',
                email: user.email,
                role: "student",
                createdAt: serverTimestamp()
            });
        }

        window.location.href = 'mis-cursos.html';
    } catch (error) {
        console.error("Error con Google Auth:", error);
        mostrarError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    }
});