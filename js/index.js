/* ==========================================
   DATOS DE EJEMPLO Y LÓGICA DE LA LANDING PAGE
   ========================================== */

const modulosData = [
    {
        id: 1,
        titulo: "Módulo 1",
        descripcion: "Preparación de piel y elección de productos",
        imagen: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=300"
    },
    {
        id: 2,
        titulo: "Módulo 2",
        descripcion: "Rostro impecable",
        imagen: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=300"
    },
    {
        id: 3,
        titulo: "Módulo 3",
        descripcion: "Ojos y mirada",
        imagen: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&q=80&w=300"
    },
    {
        id: 4,
        titulo: "Módulo 4",
        descripcion: "Acabados y labios",
        imagen: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&q=80&w=300"
    },
    {
        id: 5,
        titulo: "Módulo 5",
        descripcion: "Ejercicios prácticos",
        imagen: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=300"
    }
];

const testimoniosData = [
    {
        nombre: "Carla Mercado (29)",
        estrellas: "★★★★★",
        comentario: "Por fin entendí cómo elegir mi base y corrector sin malgastar plata en productos que no me sirven.",
        imagen: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600"
    },
    {
        nombre: "Erika González (25)",
        estrellas: "★★★★★",
        comentario: "Dejé de comprar productos equivocados. ¡Aprendí súper fácil desde mi celular!",
        imagen: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=600"
    },
    {
        nombre: "Luisa Fernanda Uribe (18)",
        estrellas: "★★★★★",
        comentario: "Empecé desde cero y gané descuentos en tiendas de maquillaje aliadas.",
        imagen: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=600"
    }
];

const faqData = [
    {
        pregunta: "¿Necesito experiencia previa en maquillaje?",
        respuesta: "¡Ninguna! El curso está diseñado paso a paso para personas que empiezan desde cero absoluto."
    },
    {
        pregunta: "¿Por cuánto tiempo tendré acceso al curso?",
        respuesta: "Tendrás acceso ilimitado de por vida para ver las lecciones cuantas veces quieras y a tu propio ritmo."
    },
    {
        pregunta: "¿Cómo funcionan los descuentos en tiendas aliadas?",
        respuesta: "Al inscribirte, obtendrás una membresía estudiantil digital con códigos exclusivos para ahorrar en insumos recomendados."
    }
];

document.addEventListener("DOMContentLoaded", () => {
    renderModulos();
    renderTestimonios();
    renderFAQ();
    initFormHandler();
});

function renderModulos() {
    const grid = document.getElementById("modulesGrid");
    if (!grid) return;
    
    grid.innerHTML = modulosData.map(mod => `
        <div class="module-card">
            <img src="${mod.imagen}" alt="${mod.titulo}" class="module-img">
            <h3 class="module-title">${mod.titulo}</h3>
            <p class="module-desc">${mod.descripcion}</p>
        </div>
    `).join("");
}

function renderTestimonios() {
    const grid = document.getElementById("testimonialsGrid");
    if (!grid) return;

    grid.innerHTML = testimoniosData.map(t => `
        <div class="testimonial-card-item">
            <img src="${t.imagen}" alt="${t.nombre}" class="testimonial-img">
            <div class="testimonial-bubble">
                <div class="testimonial-header">
                    <span>${t.nombre}</span>
                    <span class="stars">${t.estrellas}</span>
                </div>
                <p>${t.comentario}</p>
            </div>
        </div>
    `).join("");
}

function renderFAQ() {
    const container = document.getElementById("faqContainer");
    if (!container) return;

    container.innerHTML = faqData.map((item, index) => `
        <div class="faq-item" id="faq-${index}">
            <button class="faq-question" onclick="toggleFAQ(${index})">
                <span>${item.pregunta}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="faq-answer">
                <p>${item.respuesta}</li>
            </div>
        </div>
    `).join("");
}

window.toggleFAQ = function(index) {
    const item = document.getElementById(`faq-${index}`);
    if (item) {
        item.classList.toggle("active");
    }
};

function initFormHandler() {
    const form = document.getElementById("infoForm");
    const successMsg = document.getElementById("formSuccess");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const nombre = document.getElementById("nombreInput").value;
            const email = document.getElementById("emailInput").value;

            console.log("Datos de registro de información:", { nombre, email });

            form.reset();
            successMsg.classList.remove("hidden");

            setTimeout(() => {
                successMsg.classList.add("hidden");
            }, 5000);
        });
    }
}