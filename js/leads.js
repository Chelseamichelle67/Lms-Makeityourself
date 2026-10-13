
import { db } from './firebase-config.js';

import {
    addDoc,
    collection,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const form = document.getElementById('enrollment-form');
const successMsg = document.getElementById('success-msg');
const errorBox = document.getElementById('firebase-error');
const submitButton = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorBox.textContent = '';
    errorBox.classList.add('hidden');

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const consent = document.getElementById('consent').checked;

    // Validar los datos
    if (!nombre || !email || !telefono) {
        errorBox.textContent = 'Completa todos los campos.';
        errorBox.classList.remove('hidden');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        errorBox.textContent = 'Escribe un correo electrónico válido.';
        errorBox.classList.remove('hidden');
        return;
    }

    if (telefono.length < 7) {
        errorBox.textContent = 'Escribe un teléfono válido.';
        errorBox.classList.remove('hidden');
        return;
    }

    if (!consent) {
        errorBox.textContent =
            'Debes autorizar el uso de tus datos para continuar.';
        errorBox.classList.remove('hidden');
        return;
    }

    // Evitar envíos repetidos mientras se guarda
    submitButton.disabled = true;
    submitButton.textContent = 'Guardando tus datos...';

    try {
        // Guardar el contacto en Firestore
        await addDoc(collection(db, 'leads'), {
            name: nombre,
            email: email,
            phone: telefono,
            courseInterest: 'Curso de Automaquillaje',
            stage: 'nuevo',
            source: 'landing',
            consent: true,
            userId: null,
            createdAt: serverTimestamp()
        });

        // Mostrar confirmación solo si se guardó correctamente
        form.classList.add('hidden');
        successMsg.classList.remove('hidden');

    } catch (error) {
        console.error('Error al guardar el contacto:', error);

        errorBox.textContent =
            'No pudimos guardar tus datos. Inténtalo de nuevo.';

        errorBox.classList.remove('hidden');

        submitButton.disabled = false;
        submitButton.textContent =
            '¡Quiero recibir más información!';
    }
});
