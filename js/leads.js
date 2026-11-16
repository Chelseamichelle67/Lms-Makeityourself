import { db } from './firebase-config.js';

import {
    addDoc,
    collection,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// Pega aquí la URL /exec de tu aplicación web de Google Apps Script (creada con makeupyourselfoficial@gmail.com)
const URL_SCRIPT_BIENVENIDA = 'https://script.google.com/macros/s/AKfycbxyzgiFW-B3o7sOaQevH5FB7b3y-GIx00Q7ezfd96ISAM-xvaav95MNF-lT6UYhLO4-/exec';

const form = document.getElementById('enrollment-form');
const successMsg = document.getElementById('success-msg');
const errorBox = document.getElementById('firebase-error');
const submitButton = form.querySelector('button[type="submit"]');

async function enviarCorreoBienvenida({ nombre, email, telefono }) {
    if (!URL_SCRIPT_BIENVENIDA || URL_SCRIPT_BIENVENIDA.includes('TU_ID_DEL_SCRIPT')) return;

    await fetch(URL_SCRIPT_BIENVENIDA, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
            nombre,
            email,
            telefono
        })
    });
}

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
        // 1. Guardar el contacto en Firestore
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

        // 2. Enviar correo de bienvenida desde makeupyourselfoficial@gmail.com
        try {
            await enviarCorreoBienvenida({ nombre, email, telefono });
        } catch (mailError) {
            // Si falla el envío de correo, no bloqueamos el registro ya guardado en Firebase
            console.warn('Lead guardado, pero hubo un error enviando el correo:', mailError);
        }

        // 3. Mostrar confirmación
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