import { db, auth } from './firebase-config.js';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

import {
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

// --------------------------------------------------
// ELEMENTOS DE LA PÁGINA
// --------------------------------------------------

const elemento = id => document.getElementById(id);

const contenedor = elemento('cursos-container');
const estadoCarga = elemento('loading-state');
const estadoVacio = elemento('empty-state');

function escaparHTML(valor = '') {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function porcentaje(completadas, total) {
    return total > 0
        ? Math.round((completadas / total) * 100)
        : 0;
}

function actualizarResumen(cursos, completadas, total) {
    const elTotalCursos = elemento('total-cursos');
    const elTotalLecciones = elemento('total-lecciones');
    const elAvanceGeneral = elemento('avance-general');

    if (elTotalCursos) elTotalCursos.textContent = cursos;
    if (elTotalLecciones) elTotalLecciones.textContent = `${completadas} / ${total}`;
    if (elAvanceGeneral) elAvanceGeneral.textContent = `${porcentaje(completadas, total)}%`;
}

function mostrarCarga(visible) {
    estadoCarga?.classList.toggle('hidden', !visible);
}

function mostrarVacio(titulo, descripcion) {
    if (!estadoVacio) return;

    const h3 = estadoVacio.querySelector('h3');
    const p = estadoVacio.querySelector('p');
    
    if (h3) h3.textContent = titulo;
    if (p) p.textContent = descripcion;
    estadoVacio.classList.remove('hidden');
}

function ocultarVacio() {
    estadoVacio?.classList.add('hidden');
}

// --------------------------------------------------
// ENLACE A LA PÁGINA DE LECCIONES
// --------------------------------------------------

function crearEnlaceLeccion(courseId, moduleId, lessonId = '') {
    const url = new URL('leccion.html', window.location.href);

    url.searchParams.set('courseId', courseId);
    url.searchParams.set('moduleId', moduleId);

    if (lessonId) {
        url.searchParams.set('lessonId', lessonId);
    }

    return url.href;
}

// --------------------------------------------------
// TARJETA DE CADA MÓDULO
// --------------------------------------------------

function dibujarModulo(cursoId, modulo) {
    const total = modulo.lecciones.length;
    const completadas = modulo.completadas;
    const avance = porcentaje(completadas, total);

    const primeraLeccion = modulo.lecciones[0];
    const enlace = primeraLeccion
        ? crearEnlaceLeccion(cursoId, modulo.id, primeraLeccion.id)
        : '';

    return `
        <article class="bg-wine-50/50 rounded-2xl p-6 border
            border-wine-100 flex flex-col justify-between gap-4">

            <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="text-xs font-bold text-wine-700
                        bg-white px-2.5 py-1 rounded-md border border-wine-100">
                        Módulo ${String(modulo.order || 0).padStart(2, '0')}
                    </span>

                    <span class="text-xs text-gray-500 font-medium">
                        ${completadas} / ${total} lecciones (${avance}%)
                    </span>
                </div>

                <h4 class="font-bold text-wine-900 text-base mb-2">
                    ${escaparHTML(modulo.title || 'Módulo sin título')}
                </h4>

                <p class="text-xs text-gray-600 leading-relaxed">
                    ${escaparHTML(modulo.description || 'Continúa aprendiendo en este módulo.')}
                </p>

                <div class="w-full bg-white h-2 rounded-full overflow-hidden
                    border border-wine-200 mt-4">
                    <div
                        class="bg-wine-700 h-full rounded-full transition-all duration-500"
                        style="width: ${avance}%">
                    </div>
                </div>
            </div>

            <div class="pt-2">
                ${
                    enlace
                        ? `<a href="${escaparHTML(enlace)}"
                            class="block w-full text-center py-2.5 px-4
                            rounded-xl custom-gradient text-white text-xs
                            font-bold shadow-md hover:opacity-95 transition-all">
                            <i class="fa-solid fa-play mr-1"></i>
                            ${completadas > 0 ? 'Continuar módulo' : 'Ver lecciones'}
                        </a>`
                        : `<p class="text-xs text-gray-500">
                            Este módulo todavía no tiene lecciones publicadas.
                           </p>`
                }
            </div>
        </article>
    `;
}

// --------------------------------------------------
// TARJETA DE CADA CURSO
// --------------------------------------------------

function dibujarCurso(curso) {
    const total = curso.modulos.reduce(
        (suma, modulo) => suma + modulo.lecciones.length,
        0
    );

    const completadas = curso.modulos.reduce(
        (suma, modulo) => suma + modulo.completadas,
        0
    );

    const avance = porcentaje(completadas, total);

    const portada =
        curso.imageUrl ||
        curso.coverImage ||
        curso.thumbnail ||
        curso.image ||
        curso.portada ||
        '';

    const imagenValida = /^https?:\/\//i.test(portada);

    return `
        <article class="bg-white rounded-3xl border border-wine-100
            shadow-sm overflow-hidden p-6 sm:p-8">

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6
                items-center pb-8 border-b border-wine-100">

                <div class="lg:col-span-4 rounded-2xl overflow-hidden
                    h-48 bg-wine-50 flex items-center justify-center">

                    ${
                        imagenValida
                            ? `<img src="${escaparHTML(portada)}"
                                alt="${escaparHTML(curso.title)}"
                                class="w-full h-full object-cover">`
                            : `<i class="fa-solid fa-book-open text-5xl text-wine-300"></i>`
                    }
                </div>

                <div class="lg:col-span-8 space-y-3">
                    <span class="bg-wine-100 text-wine-700 text-xs
                        font-bold uppercase px-3 py-1 rounded-full">
                        Curso inscrito
                    </span>

                    <h2 class="text-2xl font-bold text-wine-900 serif-font">
                        ${escaparHTML(curso.title || 'Curso sin título')}
                    </h2>

                    <p class="text-sm text-gray-600 leading-relaxed">
                        ${escaparHTML(curso.description || 'Continúa tu aprendizaje a tu propio ritmo.')}
                    </p>

                    <div class="space-y-1.5 pt-2">
                        <div class="flex justify-between gap-3 text-xs
                            font-semibold text-gray-700">
                            <span>Progreso del curso</span>
                            <span class="text-wine-700">
                                ${completadas} de ${total} lecciones (${avance}%)
                            </span>
                        </div>

                        <div class="w-full bg-wine-50 h-3 rounded-full
                            overflow-hidden border border-wine-100">
                            <div class="bg-wine-700 h-full rounded-full
                                transition-all duration-500"
                                style="width: ${avance}%">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="pt-8">
                <h3 class="text-lg font-bold text-wine-900 serif-font
                    mb-6 flex items-center gap-2">
                    <i class="fa-solid fa-layer-group text-wine-500"></i>
                    Módulos del curso
                </h3>

                ${
                    curso.modulos.length
                        ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${curso.modulos.map(modulo =>
                                dibujarModulo(curso.id, modulo)
                            ).join('')}
                           </div>`
                        : `<p class="text-sm text-gray-500">
                            Este curso todavía no tiene módulos publicados.
                           </p>`
                }
            </div>
        </article>
    `;
}

// --------------------------------------------------
// CARGAR LOS DATOS REALES DE FIREBASE
// --------------------------------------------------

async function cargarMisCursos(usuario) {
    mostrarCarga(true);
    ocultarVacio();

    if (contenedor) contenedor.innerHTML = '';
    actualizarResumen(0, 0, 0);

    try {
        // 1. Consultamos las matrículas del estudiante actual.
        const consultaMatriculas = query(
            collection(db, 'enrollments'),
            where('userId', '==', usuario.uid)
        );

        const resultadoMatriculas = await getDocs(consultaMatriculas);

        const matriculas = resultadoMatriculas.docs
            .map(documento => documento.data())
            .filter(matricula => matricula.status === 'active');

        if (matriculas.length === 0) {
            mostrarVacio(
                'Aún no estás inscrito en ningún curso',
                'Cuando tengas una matrícula activa, tus cursos aparecerán aquí.'
            );
            return;
        }

        // 2. Cargamos cursos, módulos y lecciones de forma segura
        const cursosCargados = await Promise.all(
            matriculas.map(async matricula => {
                try {
                    const courseId = matricula.courseId;
                    if (!courseId) return null;

                    const referenciaCurso = doc(db, 'courses', courseId);
                    const resultadoCurso = await getDoc(referenciaCurso);

                    if (!resultadoCurso.exists()) return null;

                    const datosCurso = resultadoCurso.data();
                    if (datosCurso.published !== true) return null;

                    const consultaModulos = query(
                        collection(db, 'courses', courseId, 'modules'),
                        where('published', '==', true)
                    );

                    const resultadoModulos = await getDocs(consultaModulos);

                    const modulos = await Promise.all(
                        resultadoModulos.docs.map(async documentoModulo => {
                            try {
                                const moduloId = documentoModulo.id;
                                const datosModulo = documentoModulo.data();

                                const consultaLecciones = query(
                                    collection(
                                        db,
                                        'courses',
                                        courseId,
                                        'modules',
                                        moduloId,
                                        'lessons'
                                    ),
                                    where('published', '==', true)
                                );

                                const resultadoLecciones = await getDocs(consultaLecciones);

                                const lecciones = resultadoLecciones.docs
                                    .map(documento => ({
                                        id: documento.id,
                                        ...documento.data()
                                    }))
                                    .sort((a, b) =>
                                        (Number(a.order) || 0) -
                                        (Number(b.order) || 0)
                                    );

                                return {
                                    id: moduloId,
                                    ...datosModulo,
                                    lecciones,
                                    completadas: 0
                                };
                            } catch (err) {
                                console.warn(`Error al cargar módulo del curso ${courseId}:`, err);
                                return null;
                            }
                        })
                    );

                    const modulosValidos = modulos.filter(Boolean);
                    modulosValidos.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

                    return {
                        id: courseId,
                        ...datosCurso,
                        modulos: modulosValidos
                    };
                } catch (err) {
                    console.warn(`Error al procesar curso para matrícula:`, err);
                    return null;
                }
            })
        );

        const cursos = cursosCargados.filter(Boolean);

        if (cursos.length === 0) {
            mostrarVacio(
                'Tus cursos todavía no están disponibles',
                'No encontramos cursos publicados asociados a tus matrículas activas.'
            );
            return;
        }

        // 3. Consultamos el progreso del estudiante autenticado.
        let resultadoProgreso;
        try {
            const consultaProgreso = query(
                collection(db, 'progress'),
                where('userId', '==', usuario.uid)
            );
            resultadoProgreso = await getDocs(consultaProgreso);
        } catch (err) {
            console.warn('No se pudo cargar el progreso (posible falta de permisos o colección vacía):', err);
            resultadoProgreso = { docs: [] };
        }

        const progresoGuardado = new Set();

        resultadoProgreso.forEach(documento => {
            const dato = documento.data();

            if (dato.courseId && dato.moduleId && dato.lessonId) {
                progresoGuardado.add(
                    `${dato.courseId}_${dato.moduleId}_${dato.lessonId}`
                );
            } else {
                progresoGuardado.add(documento.id);
            }
        });

        let totalLecciones = 0;
        let totalCompletadas = 0;

        cursos.forEach(curso => {
            curso.modulos.forEach(modulo => {
                modulo.lecciones.forEach(leccion => {
                    totalLecciones++;

                    const clave = `${curso.id}_${modulo.id}_${leccion.id}`;
                    const idAntiguo = [
                        usuario.uid,
                        curso.id,
                        modulo.id,
                        leccion.id
                    ].join('_');

                    if (
                        progresoGuardado.has(clave) ||
                        progresoGuardado.has(idAntiguo)
                    ) {
                        modulo.completadas++;
                        totalCompletadas++;
                    }
                });
            });
        });

        actualizarResumen(
            cursos.length,
            totalCompletadas,
            totalLecciones
        );

        if (contenedor) {
            contenedor.innerHTML = cursos.map(dibujarCurso).join('');
        }

    } catch (error) {
        console.error('Error crítico al cargar Mis cursos:', error);

        if (contenedor) {
            contenedor.innerHTML = `
                <div class="bg-white rounded-2xl border border-wine-100
                    p-6 text-center">
                    <i class="fa-solid fa-circle-exclamation
                        text-3xl text-wine-500 mb-3"></i>
                    <p class="font-bold text-wine-900 mb-2">
                        No pudimos cargar tus cursos
                    </p>
                    <p class="text-sm text-gray-600">
                        Comprueba tu conexión y vuelve a intentarlo.
                        Detalle del error: ${escaparHTML(error.message)}
                    </p>
                </div>
            `;
        }
    } finally {
        mostrarCarga(false);
    }
}

// --------------------------------------------------
// INICIAR LA PÁGINA
// --------------------------------------------------

onAuthStateChanged(auth, usuario => {
    if (!usuario) {
        mostrarCarga(false);
        if (contenedor) contenedor.innerHTML = '';

        actualizarResumen(0, 0, 0);

        mostrarVacio(
            'Inicia sesión para ver tus cursos',
            'Necesitas acceder a tu cuenta para consultar tus matrículas y tu progreso.'
        );

        return;
    }

    cargarMisCursos(usuario);
});