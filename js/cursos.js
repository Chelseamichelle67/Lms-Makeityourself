const cursosData = [
    {
        id: 1,
        titulo: "Curso Completo de Automaquillaje",
        subtitulo: "+ Todos los Módulos Incluidos",
        categoria: "Cursos Completos con Certificado",
        nivel: "Más Vendido",
        descripcionPill: "Aprende desde la preparación de piel hasta acabados profesionales",
        detalles: [
            "5 a 6 Horas",
            "Módulos paso a paso",
            "Certificado Digital"
        ],
        precioRegular: "$129.000 COP",
        precioActual: "$89.000 COP",
        imagen: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        enlace: "curso-completo.html"
    },
    {
        id: 2,
        titulo: "Preparación de Piel",
        subtitulo: "+ Cómo Identificar tu Tipo de Piel",
        categoria: "Cuidado de Piel & Productos",
        nivel: "Principiante",
        descripcionPill: "Guía de Selección de Productos y Cuidado de la Piel",
        detalles: [
            "1 Hora",
            "Descuentos Especiales",
            "Certificado Digital"
        ],
        precioRegular: "$39.000 COP",
        precioActual: "$17.800 COP",
        imagen: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80",
        enlace: "modulo-piel.html"
    },
    {
        id: 3,
        titulo: "Rostro Impecable",
        subtitulo: "+ Elige el Tono Ideal Según tu Colorimetría",
        categoria: "Automaquillaje Básico",
        nivel: "Principiante",
        descripcionPill: "Aplicación Progresiva Paso a Paso de Bases y Correctores",
        detalles: [
            "1.5 Horas",
            "Descuentos Especiales",
            "Certificado Digital"
        ],
        precioRegular: "$49.000 COP",
        precioActual: "$17.800 COP",
        imagen: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
        enlace: "modulo-rostro.html"
    },
    {
        id: 4,
        titulo: "Técnicas de Ojos",
        subtitulo: "+ Delineados y Sombras para Eventos",
        categoria: "Técnicas Específicas (Ojos / Rostro)",
        nivel: "Intermedio",
        descripcionPill: "Aplicación de Sombras para el Día y la Noche",
        detalles: [
            "2 Horas",
            "Descuentos Especiales",
            "Certificado Digital"
        ],
        precioRegular: "$49.000 COP",
        precioActual: "$17.800 COP",
        imagen: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
        enlace: "modulo-ojos.html"
    },
    {
        id: 5,
        titulo: "Acabados & Labios",
        subtitulo: "+ Aplicación de Labiales y Sellado del Maquillaje",
        categoria: "Técnicas Específicas (Ojos / Rostro)",
        nivel: "Principiante",
        descripcionPill: "Elige tu Labial Ideal y Mantén tu Maquillaje Intacto",
        detalles: [
            "1 Hora",
            "Descuentos Especiales",
            "Certificado Digital"
        ],
        precioRegular: "$39.000 COP",
        precioActual: "$17.800 COP",
        imagen: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80",
        enlace: "modulo-labios.html"
    },
    {
        id: 6,
        titulo: "Ejercicios Prácticos",
        subtitulo: "+ Últimos Consejos para un Maquillaje Perfecto",
        categoria: "Automaquillaje Básico",
        nivel: "Todos",
        descripcionPill: "Prácticas guiadas para afianzar tus habilidades",
        detalles: [
            "1 Hora",
            "Descuentos Especiales",
            "Certificado Digital"
        ],
        precioRegular: "$29.000 COP",
        precioActual: "$17.800 COP",
        imagen: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80",
        enlace: "modulo-ejercicios.html"
    }
];

function renderCursos(categoriaFiltro = "todos") {
    const grid = document.getElementById("cursosGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    const filtrados = categoriaFiltro === "todos" 
        ? cursosData 
        : cursosData.filter(c => c.categoria === categoriaFiltro);
        
    filtrados.forEach(curso => {
        const card = document.createElement("article");
        card.className = "curso-card";
        
        card.innerHTML = `
            <div class="curso-img-wrap">
                <img src="${curso.imagen}" alt="${curso.titulo}" class="curso-img">
                <span class="curso-badge-nivel">${curso.nivel}</span>
            </div>
            
            <div class="curso-body">
                <div>
                    <h2 class="curso-titulo">${curso.titulo}</h2>
                    <p class="curso-subtitulo">${curso.subtitulo}</p>
                    <span class="curso-pill-desc">${curso.descripcionPill}</span>
                    <ul class="curso-lista">
                        ${curso.detalles.map(det => `<li>• ${det}</li>`).join("")}
                    </ul>
                </div>
                
                <div class="curso-footer-row">
                    <div class="curso-precios">
                        ${curso.precioRegular ? `<span class="precio-regular">Precio Regular: ${curso.precioRegular}</span>` : ''}
                        <span class="precio-actual">${curso.precioActual}</span>
                    </div>
                    <!-- Enlace directo a la página HTML independiente de cada módulo/curso -->
                    <a href="${curso.enlace}" class="btn-detalles-card">Detalles de curso</a>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderCursos("todos");
    
    const botonesFiltro = document.querySelectorAll(".filtro-pill");
    botonesFiltro.forEach(btn => {
        btn.addEventListener("click", () => {
            botonesFiltro.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const cat = btn.getAttribute("data-categoria");
            renderCursos(cat);
        });
    });
});