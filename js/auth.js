import { auth, db } from './firebase-config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
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

// Elementos de la interfaz
const tabLogin = document.getElementById('tab-login');
const tabRegistro = document.getElementById('tab-registro');
const groupNombre = document.getElementById('group-nombre');
const groupConfirm = document.getElementById('group-confirm');
const form = document.getElementById('auth-form');
const alertBox = document.getElementById('error-alert');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const btnGoogle = document.getElementById('btn-google');

let modoActual = 'login'; // 'login' o 'registro'

// Cambiar entre pestañas de Login y Registro
tabLogin.addEventListener('click', () => {
    modoActual = 'login';
    tabLogin.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all bg-white text-wine-900 shadow-sm";
    tabRegistro.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-gray-500 hover:text-wine-900";
    groupNombre.classList.add('hidden');
    groupConfirm.classList.add('hidden');
    btnText.textContent = 'Ingresar';
    ocultarError();
});

tabRegistro.addEventListener('click', () => {
    modoActual = 'registro';
    tabRegistro.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all bg-white text-wine-900 shadow-sm";
    tabLogin.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-gray-500 hover:text-wine-900";
    groupNombre.classList.remove('hidden');
    groupConfirm.classList.remove('hidden');
    btnText.textContent = 'Crear Cuenta';
    ocultarError();
});

function mostrarError(mensaje) {
    alertBox.textContent = mensaje;
    alertBox.classList.remove('hidden');
}

function ocultarError() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
}

function restaurarBoton() {
    btnSubmit.disabled = false;
    btnText.textContent = modoActual === 'login' ? 'Ingresar' : 'Crear Cuenta';
    btnSpinner.classList.add('hidden');
}

// Redirección inteligente por rol hacia index.html o admin.html
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
        window.location.href = 'index.html'; // Redirige correctamente al index
    }
}

// Manejo del formulario único (Login o Registro)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        mostrarError('Por favor completa todos los campos obligatorios.');
        return;
    }

    btnSubmit.disabled = true;
    btnText.textContent = modoActual === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...';
    btnSpinner.classList.remove('hidden');

    try {
        if (modoActual === 'login') {
            // Lógica de Inicio de Sesión
            const resultado = await signInWithEmailAndPassword(auth, email, password);
            await redirigirSegunRol(resultado.user);
        } else {
            // Lógica de Registro
            const nombre = document.getElementById('nombre').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!nombre) {
                throw new Error('Por favor ingresa tu nombre completo.');
            }
            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres.');
            }
            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden.');
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: nombre,
                email: email,
                role: "student",
                createdAt: serverTimestamp()
            });

            window.location.href = 'index.html'; // Redirige correctamente al index tras registro
        }

    } catch (error) {
        console.error('Error en autenticación:', error);
        let mensajeAmigable = error.message;

        if (error.message === 'NO_USER_PROFILE') {
            mensajeAmigable = 'No se encontró el perfil de este usuario. Contacta al administrador.';
            try { await signOut(auth); } catch(err) {}
        } else if (error.code === 'auth/email-already-in-use') {
            mensajeAmigable = 'Este correo electrónico ya está registrado.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            mensajeAmigable = 'Las credenciales ingresadas son incorrectas.';
        } else if (error.code === 'auth/weak-password') {
            mensajeAmigable = 'La contraseña es demasiado débil.';
        } else if (error.code === 'auth/invalid-email') {
            mensajeAmigable = 'El formato del correo electrónico no es válido.';
        }

        mostrarError(mensajeAmigable);
        restaurarBoton();
    }
});

// Autenticación con Google
btnGoogle.addEventListener('click', async () => {
    ocultarError();
    const provider = new GoogleAuthProvider();

    try {
        const resultado = await signInWithPopup(auth, provider);
        const user = resultado.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                name: user.displayName || 'Estudiante',
                email: user.email,
                role: 'student',
                createdAt: serverTimestamp()
            });
        }

        await redirigirSegunRol(user);

    } catch (error) {
        console.error('Error con Google Auth:', error);
        mostrarError('No se pudo completar el acceso con Google. Inténtalo de nuevo.');
    }
});