
import { db } from './firebase-config.js';

import {
    addDoc,
    collection,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

// URL de Google Apps Script
const URL_SCRIPT_GUIA = 'https://script.google.com/macros/s/AKfycbwUBve-ryL8i31db2OLJPSSXXWnIxV9uBxFDp43G9Qd7PVRrBFjO5lPTEcoGqcB-uRP/exec';

const form = document.getElementById('newsletter-form');
const emailInput = document.getElementById('newsletter-email');

if (form && emailInput) {

    let mensaje = document.getElementById('newsletter-message');

    if (!mensaje) {
        mensaje = document.createElement('p');
        mensaje.id = 'newsletter-message';
        mensaje.setAttribute('role', 'status');
        form.insertAdjacentElement('afterend', mensaje);
    }

    const boton = form.querySelector('button[type="submit"]');

    async function enviarGuia(email) {
        return fetch(URL_SCRIPT_GUIA, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                nombre: 'Makeup Lover',
                email: email
            })
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();

        // Validar correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            mensaje.textContent = 'Escribe un correo electrónico válido.';
            return;
        }

        const textoOriginal = boton ? boton.innerHTML : '';

        if (boton) {
            boton.disabled = true;
            boton.textContent = 'Preparando tu guía...';
        }

        mensaje.textContent = 'Estamos procesando tu solicitud. 💗';

        try {

            // 1. Guardar contacto en Firebase
            await addDoc(collection(db, 'leads'), {
                name: 'Makeup Lover',
                email: email,
                courseInterest: 'Guía de Compras Inteligentes',
                stage: 'nuevo',
                source: 'newsletter',
                consent: true,
                userId: null,
                createdAt: serverTimestamp()
            });

            // 2. Solicitar envío de la guía
            await enviarGuia(email);

            mensaje.textContent =
                '¡Gracias por suscribirte! 💗 Revisa tu correo y tu carpeta de spam.';

            form.reset();

        } catch (error) {

            console.error('Error al procesar la suscripción:', error);

            mensaje.textContent =
                'No pudimos procesar tu solicitud. Inténtalo nuevamente.';

        } finally {

            if (boton) {
                boton.disabled = false;
                boton.innerHTML = textoOriginal;
            }
        }
    });
}
