
import { db } from './firebase-config.js';

import {
    collection,
    getDocs,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const cursosGrid = document.getElementById('cursosGrid');
const estadoCursos = document.getElementById('estadoCursos');

// Imágenes de las tarjetas.
const imagenesModulos = {
    1: 'https://i.pinimg.com/736x/0c/ca/ef/0ccaef8a34d24ecf4cb8e95c198fe3cf.jpg',
    2: 'https://i.pinimg.com/1200x/5d/7b/c6/5d7bc6405ebc0d2b3d83e5e3f54d0037.jpg',
    3: 'https://i.pinimg.com/1200x/10/f2/3e/10f23e1cfdf69aa2f2599b57670d3073.jpg',
    4: 'https://i.pinimg.com/736x/c0/31/6f/c0316f3f1df9d9d7f7968b0c113fd51d.jpg',
    5: 'https://i.pinimg.com/1200x/08/a2/00/08a20051645c8c8f801cb45ce3140ceb.jpg'
};

// Categorías para los filtros.
const categoriasModulos = {
    1: 'piel',
    2: 'rostro',
    3: 'ojos',
    4: 'labios',
    5: 'noche'
};

const nombresCategorias = {
    piel: 'Preparación de piel',
    rostro: 'Rostro',
    ojos: 'Ojos y mirada',
    labios: 'Acabados y labios',
    noche: 'Día a noche'
};

// Descripciones alternativas si el módulo todavía no tiene una.
const descripcionesModulos = {
    1: 'Descubre cómo preparar la piel antes del maquillaje y conseguir una base uniforme.',
    2: 'Aprende técnicas para aplicar productos y dar dimensión al rostro.',
    3: 'Explora técnicas de maquillaje para resaltar los ojos y crear diferentes miradas.',
    4: 'Conoce cómo trabajar los labios y conseguir acabados armoniosos.',
    5: 'Aprende a transformar un maquillaje de día en un look de noche.'
};

// Evita insertar texto de Firebase directamente como HTML.
function escaparHTML(valor = '') {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

// Obtiene el número del módulo a partir de su ID o de su orden.
function obtenerNumeroModulo(moduloId, orden) {
    const coincidencia = String(moduloId).match(/modulo-(\d+)/i);

    if (coincidencia) {
        return Number(coincidencia[1]);
    }

    return Number(orden) || 0;
}

// Obtiene la descripción sin consultar las lecciones.
function obtenerDescripcion(modulo, curso, numero) {
    return (
        modulo.description ||
        modulo.descripcion ||
        descripcionesModulos[numero] ||
        curso.description ||
        'Explora el contenido de este módulo y descubre lo que aprenderás.'
    );
}

// Crea una tarjeta para cada módulo publicado.
function crearTarjeta(cursoId, modulo, descripcion, numero) {
    const categoria = categoriasModulos[numero] || 'otros';

    const imagen = imagenesModulos[numero] ||
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=85';

    const titulo = modulo.title || `Módulo ${numero}`;

    const tarjeta = document.createElement('article');

    tarjeta.className =
        'curso-card bg-white rounded-3xl overflow-hidden border ' +
        'border-wine-100 shadow-sm hover:shadow-xl hover:border-wine-300 ' +
        'transition-all flex flex-col justify-between';

    tarjeta.dataset.categoria = categoria;

    const enlaceModulo =
        `curso.html?courseId=${encodeURIComponent(cursoId)}` +
        `&moduleId=${encodeURIComponent(modulo.id)}`;

    tarjeta.innerHTML = `
        <div>
            <div class="h-48 overflow-hidden relative">
                <img
                    src="${escaparHTML(imagen)}"
                    alt="${escaparHTML(titulo)}"
                    class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                >

                <span class="absolute top-4 left-4 bg-wine-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    Módulo ${String(numero).padStart(2, '0')}
                </span>
            </div>

            <div class="p-6">
                <span class="text-xs font-semibold text-wine-500 uppercase tracking-wider">
                    ${escaparHTML(nombresCategorias[categoria] || 'Automaquillaje')}
                </span>

                <h3 class="text-xl font-bold text-wine-900 mt-2 mb-2 serif-font">
                    ${escaparHTML(titulo)}
                </h3>

                <p class="text-gray-600 text-sm leading-relaxed">
                    ${escaparHTML(descripcion)}
                </p>
            </div>
        </div>

        <div class="p-6 pt-0 flex items-center justify-between gap-3">
            <a
                href="${enlaceModulo}"
                class="flex-1 text-center py-2.5 rounded-xl bg-wine-50 text-wine-700 hover:bg-wine-100 text-xs font-bold transition-colors"
            >
                Ver módulo
            </a>

            <a
                href="registro.html"
                class="flex-1 text-center py-2.5 rounded-xl custom-gradient text-white text-xs font-bold shadow-md hover:opacity-95 transition-all"
            >
                Inscribirme
            </a>
        </div>
    `;

    return tarjeta;
}

// Consulta los cursos y sus módulos publicados.
async function cargarModulos() {
    if (!cursosGrid || !estadoCursos) {
        console.error(
            'No se encontraron los elementos cursosGrid o estadoCursos en el HTML.'
        );
        return;
    }

    estadoCursos.classList.remove('hidden');
    estadoCursos.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin text-wine-700 text-3xl mb-4"></i>
        <p>Cargando módulos...</p>
    `;

    cursosGrid.innerHTML = '';

    try {
        const referenciaCursos = collection(db, 'courses');

        const consultaCursos = query(
            referenciaCursos,
            where('published', '==', true)
        );

        const resultadoCursos = await getDocs(consultaCursos);

        if (resultadoCursos.empty) {
            mostrarEstado('Todavía no hay cursos publicados en la plataforma.');
            return;
        }

        let cantidadModulos = 0;

        for (const documentoCurso of resultadoCursos.docs) {
            const cursoId = documentoCurso.id;
            const curso = documentoCurso.data();

            const referenciaModulos = collection(
                db,
                'courses',
                cursoId,
                'modules'
            );

            const consultaModulos = query(
                referenciaModulos,
                where('published', '==', true)
            );

            const resultadoModulos = await getDocs(consultaModulos);

            const modulos = resultadoModulos.docs
                .map(documento => ({
                    id: documento.id,
                    ...documento.data()
                }))
                .sort(
                    (a, b) =>
                        (Number(a.order) || 0) -
                        (Number(b.order) || 0)
                );

            for (const modulo of modulos) {
                const numero = obtenerNumeroModulo(
                    modulo.id,
                    modulo.order
                );

                // No consultamos la subcolección lessons.
                const descripcion = obtenerDescripcion(
                    modulo,
                    curso,
                    numero
                );

                const tarjeta = crearTarjeta(
                    cursoId,
                    modulo,
                    descripcion,
                    numero
                );

                cursosGrid.appendChild(tarjeta);
                cantidadModulos++;
            }
        }

        if (cantidadModulos === 0) {
            mostrarEstado('No hay módulos publicados para mostrar.');
            return;
        }

        estadoCursos.classList.add('hidden');
        filtrarCursos('todos');

    } catch (error) {
        console.error(
            'Error al cargar los módulos desde Firebase:',
            error
        );

        mostrarEstado(
            'No pudimos cargar los módulos. Comprueba la conexión y los permisos de Firestore.'
        );
    }
}

// Muestra un mensaje cuando no hay resultados o sucede un error.
function mostrarEstado(mensaje) {
    cursosGrid.innerHTML = '';
    estadoCursos.classList.remove('hidden');
    estadoCursos.textContent = mensaje;
}

// Filtros de categorías.
window.filtrarCursos = function(categoria, boton) {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove(
            'bg-wine-700',
            'text-white',
            'shadow-sm'
        );

        btn.classList.add('bg-wine-50', 'text-wine-700');
    });

    if (boton) {
        boton.classList.remove('bg-wine-50', 'text-wine-700');

        boton.classList.add(
            'bg-wine-700',
            'text-white',
            'shadow-sm'
        );
    } else {
        const botones = document.querySelectorAll('.filtro-btn');

        if (botones.length > 0) {
            botones[0].classList.remove(
                'bg-wine-50',
                'text-wine-700'
            );

            botones[0].classList.add(
                'bg-wine-700',
                'text-white',
                'shadow-sm'
            );
        }
    }

    document.querySelectorAll('.curso-card').forEach(tarjeta => {
        const coincide =
            categoria === 'todos' ||
            tarjeta.dataset.categoria === categoria;

        tarjeta.style.display = coincide ? 'flex' : 'none';
    });
};

// Inicia la carga del catálogo.
cargarModulos();
