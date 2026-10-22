
import { auth, db } from './firebase-config.js';

import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const form = document.getElementById('login-form');
const alertBox = document.getElementById('error-alert');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const btnGoogle = document.getElementById('btn-google');

// Mostrar mensajes de error
function mostrarError(mensaje) {
    alertBox.textContent = mensaje;
    alertBox.classList.remove('hidden');
}

// Ocultar mensajes de error
function ocultarError() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
}

// Restaurar el botón de inicio de sesión
function restaurarBoton() {
    btnSubmit.disabled = false;
    btnText.textContent = 'Ingresar';
    btnSpinner.classList.add('hidden');
}

// Consultar el rol del usuario y enviarlo a la página correcta
async function redirigirSegunRol(user) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        throw new Error('NO_USER_PROFILE');
    }

    const datosUsuario = userDocSnap.data();

    if (datosUsuario.role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'index.html';
    }
}

// Inicio de sesión con correo y contraseña
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
        const resultado = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        await redirigirSegunRol(resultado.user);

    } catch (error) {
        console.error('Error en login:', error);

        if (error.message === 'NO_USER_PROFILE') {
            mostrarError(
                'No se encontró el perfil de este usuario. Contacta al administrador.'
            );

            try {
                await signOut(auth);
            } catch (signOutError) {
                console.error('Error al cerrar sesión:', signOutError);
            }
        } else if (
            error.code === 'auth/user-not-found' ||
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/invalid-credential'
        ) {
            mostrarError('Las credenciales ingresadas son incorrectas.');
        } else if (error.code === 'auth/too-many-requests') {
            mostrarError(
                'Demasiados intentos fallidos. Inténtalo más tarde.'
            );
        } else {
            mostrarError(
                'No se pudo iniciar sesión. Verifica tu conexión e inténtalo de nuevo.'
            );
        }

        restaurarBoton();
    }
});

// Inicio de sesión con Google
btnGoogle.addEventListener('click', async () => {
    ocultarError();

    const provider = new GoogleAuthProvider();

    try {
        const resultado = await signInWithPopup(auth, provider);
        const user = resultado.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        // Si es la primera vez que inicia sesión con Google,
        // crear su perfil como estudiante.
        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName || 'Estudiante',
                email: user.email,
                role: 'student',
                createdAt: serverTimestamp()
            });
        }

        // Consultar el rol y redirigir según corresponda.
        await redirigirSegunRol(user);

    } catch (error) {
        console.error('Error con Google Auth:', error);

        if (error.message === 'NO_USER_PROFILE') {
            mostrarError(
                'No se encontró el perfil de este usuario. Contacta al administrador.'
            );
        } else {
            mostrarError(
                'No se pudo iniciar sesión con Google. Inténtalo de nuevo.'
            );
        }
    }
});
