document.addEventListener("DOMContentLoaded", () => {
    // 1. Renderizado Dinámico de Módulos (para cursos.html y reutilización)
    const cursosContainer = document.getElementById("cursosContainer");
    if (cursosContainer) {
        const modulosData = [
            {
                num: "Módulo 1",
                title: "Preparación de piel y elección de productos",
                img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80",
                desc: "Aprende a identificar tu tipo de piel, hidratación adecuada y cómo elegir bases y correctores sin malgastar dinero."
            },
            {
                num: "Módulo 2",
                title: "Rostro impecable",
                img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
                desc: "Técnicas profesionales de aplicación de base, contornos naturales, iluminación y rubor para un acabado fresco."
            },
            {
                num: "Módulo 3",
                title: "Ojos y mirada",
                img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
                desc: "Domina el difuminado de sombras, delineado perfecto y realzado de cejas para destacar tu mirada en cualquier ocasión."
            },
            {
                num: "Módulo 4",
                title: "Acabados y labios",
                img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80",
                desc: "Fijación duradera del maquillaje, labiales de larga duración y retoques clave para mantenerte intacta todo el día."
            },
            {
                num: "Módulo 5",
                title: "Ejercicios prácticos",
                img: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=600&q=80",
                desc: "Casos reales de práctica paso a paso guiados por expertas para perfeccionar tu técnica desde casa."
            }
        ];

        cursosContainer.innerHTML = modulosData.map(mod => `
            <div class="modulo-card" style="max-width:100%;">
                <div class="modulo-img-wrap">
                    <img src="${mod.img}" alt="${mod.title}">
                </div>
                <div class="modulo-info">
                    <span class="modulo-num">${mod.num}</span>
                    <h4 style="margin-bottom:0.5rem;">${mod.title}</h4>
                    <p style="font-size:0.85rem; color:#6b4c58; margin-bottom:1rem; line-height:1.4;">${mod.desc}</p>
                    <a href="index.html#inscripcion" class="btn-primary" style="display:inline-block; padding: 0.4rem 1rem; font-size:0.8rem;">Ver Módulo</a>
                </div>
            </div>
        `).join('');
    }

    // 2. Renderizado Dinámico de Testimonios y Galería de Estudiantes (para index.html si aplica)
    const testimonialsGrid = document.getElementById("testimonialsGrid");
    if (testimonialsGrid) {
        testimonialsGrid.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                <div class="testimonial-bubble-left">
                    <div class="rating-stars">★★★★★</div>
                    <p class="student-name">Carla Mercado (29)</p>
                    <p class="student-comment">Por fin entendí cómo elegir mi base y corrector sin malgastar plata en productos que no me sirven.</p>
                </div>
                <div class="testimonial-bubble-left">
                    <div class="rating-stars">★★★★★</div>
                    <p class="student-name">Erika González (25)</p>
                    <p class="student-comment">Dejé de comprar productos equivocados. ¡Aprendí súper fácil desde mi celular!</p>
                </div>
            </div>
            <div class="student-gallery-visual">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" alt="Estudiante Maquillaje" class="student-img-main">
                <div class="student-grid-sub">
                    <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" alt="Detalle Ojos" class="student-img-sub">
                    <div class="student-collage-badge">
                        <img src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=400&q=80" alt="Kits" class="student-img-sub" style="filter: brightness(0.7);">
                        <div class="collage-overlay">+50</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. Renderizado Dinámico de Preguntas Frecuentes (FAQ)
    const faqContainer = document.getElementById("faqContainer");
    if (faqContainer) {
        const faqData = [
            {
                q: "¿Necesito tener experiencia previa en maquillaje?",
                a: "¡Para nada! El curso está diseñado 100% desde cero, explicándote paso a paso sin tecnicismos difíciles."
            },
            {
                q: "¿Cuánto tiempo tendré acceso al contenido?",
                a: "Tendrás acceso ilimitado de por vida para ver las lecciones a tu propio ritmo desde cualquier dispositivo móvil o computador."
            },
            {
                q: "¿Cómo funcionan las recomendaciones de ahorro en insumos?",
                a: "Te compartimos una guía detallada con tiendas locales y marcas económicas aliadas recomendadas por expertas para practicar sin gastar de más."
            }
        ];

        faqContainer.innerHTML = faqData.map(item => `
            <div class="faq-item">
                <div class="faq-question">
                    <span>${item.q}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="faq-answer">
                    <p>${item.a}</p>
                </div>
            </div>
        `).join('');
    }

    // 4. Manejo del Formulario "Quiero más información"
    const infoForm = document.getElementById("infoForm");
    const formSuccess = document.getElementById("formSuccess");
    if (infoForm) {
        infoForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const nombre = document.getElementById("nombreInput").value.trim();
            const email = document.getElementById("emailInput").value.trim();

            if (nombre && email) {
                infoForm.reset();
                formSuccess.classList.remove("hidden");
                setTimeout(() => {
                    formSuccess.classList.add("hidden");
                }, 5000);
            }
        });
    }
});