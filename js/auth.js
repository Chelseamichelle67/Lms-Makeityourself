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
const groupLegal = document.getElementById('group-legal');
const checkTerminos = document.getElementById('check-terminos');
const checkDatos = document.getElementById('check-datos');
const form = document.getElementById('auth-form');
const alertBox = document.getElementById('error-alert');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const btnGoogle = document.getElementById('btn-google');

let modoActual = 'login'; // 'login' o 'registro'

// ==================================================
// TEXTOS LEGALES COMPLETOS (NORMATIVA COLOMBIA)
// ==================================================

const DOCUMENTOS_LEGALES = {
    terminos: `
        <h3>Términos y Condiciones de Uso</h3>
        <p><strong>Última actualización:</strong> Noviembre de 2026 · <strong>Plataforma:</strong> Make It Yourself (Colombia).</p>

        <h4>1. Objeto y Naturaleza del Servicio</h4>
        <p>Al crear una cuenta y adquirir cualquiera de nuestros programas, el usuario obtiene una licencia personal, intransferible y no exclusiva para acceder a los contenidos digitales de automaquillaje alojados en la plataforma.</p>
        <p>Los cursos tienen fines estrictamente educativos y de uso personal; no constituyen titulación oficial ni certificación profesional habilitante.</p>

        <h4>2. Propiedad Intelectual y Prohibiciones</h4>
        <p>Todos los videos, guías descargables, fotografías, textos y diseños gráficos están protegidos por las normas de derechos de autor (Ley 23 de 1982 y Decisión Andina 351). Queda expresamente prohibido:</p>
        <ul>
            <li>Compartir usuario y contraseña con terceros.</li>
            <li>Descargar, grabar, reproducir, revender o distribuir el material audiovisual fuera de la plataforma.</li>
        </ul>

        <h4>3. Conducta y Seguridad de la Cuenta</h4>
        <p>El estudiante es responsable de mantener la confidencialidad de su contraseña y de proporcionar información veraz al momento del registro.</p>
    `,
    datos: `
        <h3>Política de Tratamiento de Datos Personales</h3>
        <p>En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong> de la República de Colombia, <strong>Make It Yourself</strong> informa:</p>

        <h4>1. Responsable del Tratamiento</h4>
        <p><strong>Make It Yourself</strong> · Correo de contacto y atención de consultas o reclamos: <strong>info@makeit.yourself</strong> · Teléfono: <strong>304 351 7678</strong>.</p>

        <h4>2. Datos Recolectados y Finalidad</h4>
        <p>Recolectamos tu nombre, correo electrónico, foto de perfil opcional e historial de progreso académico con las siguientes finalidades:</p>
        <ul>
            <li>Crear y administrar tu cuenta de estudiante y validar tu identidad.</li>
            <li>Habilitar el acceso a los cursos adquiridos y registrar tu avance en las lecciones.</li>
            <li>Enviar notificaciones relacionadas con tus matrículas, soporte técnico y comprobantes de pago.</li>
        </ul>
        <p>Tus datos personales nunca serán vendidos ni cedidos a terceros con fines comerciales.</p>

        <h4>3. Derechos del Titular (Habeas Data)</h4>
        <p>Como titular de los datos tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tu información, así como revocar esta autorización en cualquier momento enviando una solicitud a <strong>info@makeit.yourself</strong>.</p>
    `,
    reembolso: `
        <h3>Política de Reembolso y Derecho de Retracto</h3>
        <p>De conformidad con el artículo 47 de la <strong>Ley 1480 de 2011 (Estatuto del Consumidor en Colombia)</strong>:</p>

        <h4>1. Derecho de Retracto</h4>
        <p>El estudiante podrá ejercer su derecho de retracto dentro de los <strong>cinco (5) días hábiles</strong> siguientes a la compra del curso, siempre y cuando no haya consumido más del <strong>20% del contenido</strong> del programa ni haya descargado el material completo.</p>

        <h4>2. Procedimiento de Devolución</h4>
        <p>Para solicitar el reembolso debes escribir a <strong>info@makeit.yourself</strong> indicando el correo con el que te registraste y el comprobante de la transacción. Una vez verificadas las condiciones, el dinero será devuelto por el mismo medio de pago en un plazo máximo de <strong>10 a 15 días hábiles</strong>.</p>
    `
};

// ==================================================
// CONTROL DEL MODAL LEGAL
// ==================================================

const legalModal = document.getElementById('legal-modal');
const legalContent = document.getElementById('legal-modal-content');
const legalTabs = document.querySelectorAll('[data-legal-tab]');

function mostrarDocumentoLegal(clave = 'terminos') {
    if (!legalModal || !legalContent) return;

    legalContent.innerHTML = DOCUMENTOS_LEGALES[clave] || DOCUMENTOS_LEGALES.terminos;

    legalTabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.legalTab === clave);
    });

    legalModal.classList.remove('hidden');
}

function cerrarModalLegal() {
    legalModal?.classList.add('hidden');
}

document.querySelectorAll('[data-open-legal]').forEach(enlace => {
    enlace.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarDocumentoLegal(enlace.dataset.openLegal);
    });
});

legalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        mostrarDocumentoLegal(tab.dataset.legalTab);
    });
});

document.getElementById('accept-all-legal-btn')?.addEventListener('click', () => {
    if (checkTerminos) checkTerminos.checked = true;
    if (checkDatos) checkDatos.checked = true;
    cerrarModalLegal();
    ocultarError();
});

document.getElementById('close-legal-modal')?.addEventListener('click', cerrarModalLegal);
legalModal?.addEventListener('click', (e) => {
    if (e.target === legalModal) cerrarModalLegal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && legalModal && !legalModal.classList.contains('hidden')) {
        cerrarModalLegal();
    }
});

// ==================================================
// CAMBIO ENTRE PESTAÑAS DE LOGIN Y REGISTRO
// ==================================================

tabLogin.addEventListener('click', () => {
    modoActual = 'login';
    tabLogin.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all bg-white text-wine-900 shadow-sm";
    tabRegistro.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-gray-500 hover:text-wine-900";
    groupNombre.classList.add('hidden');
    groupConfirm.classList.add('hidden');
    groupLegal?.classList.add('hidden');
    btnText.textContent = 'Ingresar';
    ocultarError();
});

tabRegistro.addEventListener('click', () => {
    modoActual = 'registro';
    tabRegistro.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all bg-white text-wine-900 shadow-sm";
    tabLogin.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-gray-500 hover:text-wine-900";
    groupNombre.classList.remove('hidden');
    groupConfirm.classList.remove('hidden');
    groupLegal?.classList.remove('hidden');
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
        window.location.href = 'index.html';
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
            const resultado = await signInWithEmailAndPassword(auth, email, password);
            await redirigirSegunRol(resultado.user);
        } else {
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
            if (!checkTerminos?.checked || !checkDatos?.checked) {
                throw new Error('Debes leer y aceptar los Términos y Condiciones y la Política de Privacidad para crear tu cuenta.');
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: nombre,
                email: email,
                role: "student",
                acceptedTerms: true,
                acceptedPrivacyPolicy: true,
                legalConsentDate: new Date().toISOString(),
                createdAt: serverTimestamp()
            });

            window.location.href = 'index.html';
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

    // Si está en la pestaña de registro con Google, también verificamos consentimiento
    if (modoActual === 'registro' && (!checkTerminos?.checked || !checkDatos?.checked)) {
        mostrarError('Por favor acepta los Términos y Condiciones y la Política de Privacidad antes de registrarte.');
        return;
    }

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
                acceptedTerms: true,
                acceptedPrivacyPolicy: true,
                legalConsentDate: new Date().toISOString(),
                createdAt: serverTimestamp()
            });
        }

        await redirigirSegunRol(user);

    } catch (error) {
        console.error('Error con Google Auth:', error);
        mostrarError('No se pudo completar el acceso con Google. Inténtalo de nuevo.');
    }
});