
import { db, auth } from './firebase-config.js';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

import {
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

// ==================================================
// ELEMENTOS DE LA PÁGINA
// ==================================================

const adminAlert = document.getElementById('admin-alert');
const adminLoading = document.getElementById('admin-loading');
const adminTitle = document.getElementById('admin-title');
const adminSubtitle = document.getElementById('admin-subtitle');

const viewCursos = document.getElementById('view-cursos');
const viewModulos = document.getElementById('view-modulos');
const viewLecciones = document.getElementById('view-lecciones');

const gridCursos = document.getElementById('grid-cursos');
const gridModulos = document.getElementById('grid-modulos');
const gridLecciones = document.getElementById('grid-lecciones');

const currentCourseTitle = document.getElementById('current-course-title');
const currentModuleTitle = document.getElementById('current-module-title');

const btnNuevoCurso = document.getElementById('btn-nuevo-curso');
const btnNuevoModulo = document.getElementById('btn-nuevo-modulo');
const btnNuevaLeccion = document.getElementById('btn-nueva-leccion');

const btnVolverCursos = document.getElementById('btn-volver-cursos');
const btnVolverModulos = document.getElementById('btn-volver-modulos');

// ==================================================
// ESTADO DEL PANEL
// ==================================================

let cursoSeleccionadoId = null;
let cursoSeleccionadoNombre = '';

let moduloSeleccionadoId = null;
let moduloSeleccionadoNombre = '';

let usuarioEsAdministrador = false;

// ==================================================
// MENSAJES Y UTILIDADES
// ==================================================

function mostrarAlerta(mensaje, tipo = 'error') {
    if (!adminAlert) return;

    adminAlert.textContent = mensaje;

    adminAlert.classList.remove(
        'hidden',
        'bg-green-50',
        'border-green-200',
        'text-green-800',
        'bg-red-50',
        'border-red-200',
        'text-red-800'
    );

    if (tipo === 'exito') {
        adminAlert.classList.add(
            'bg-green-50',
            'border-green-200',
            'text-green-800'
        );
    } else {
        adminAlert.classList.add(
            'bg-red-50',
            'border-red-200',
            'text-red-800'
        );
    }
}

function ocultarAlerta() {
    if (!adminAlert) return;

    adminAlert.textContent = '';
    adminAlert.classList.add('hidden');
}

function mostrarCarga(mostrar) {
    if (!adminLoading) return;

    adminLoading.classList.toggle('hidden', !mostrar);
}

function escaparHTML(valor = '') {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function dinero(valor) {
    return Number(valor || 0).toLocaleString('es-CO');
}

function confirmar(mensaje) {
    return window.confirm(mensaje);
}

function verificarAdministrador() {
    if (!usuarioEsAdministrador) {
        throw new Error('No tienes permisos de administrador.');
    }
}

// ==================================================
// NAVEGACIÓN ENTRE LAS TRES VISTAS
// ==================================================

function mostrarVista(vista) {
    ocultarAlerta();

    viewCursos?.classList.add('hidden');
    viewModulos?.classList.add('hidden');
    viewLecciones?.classList.add('hidden');

    if (vista === 'cursos') {
        viewCursos?.classList.remove('hidden');

        if (adminTitle) {
            adminTitle.textContent = 'Gestión de Cursos';
        }

        if (adminSubtitle) {
            adminSubtitle.textContent =
                'Crea, edita y organiza los contenidos de tu academia.';
        }

        btnNuevoCurso?.classList.remove('hidden');

        cargarCursos();
    }

    if (vista === 'modulos') {
        viewModulos?.classList.remove('hidden');
        btnNuevoCurso?.classList.add('hidden');

        if (adminTitle) {
            adminTitle.textContent = 'Gestión de Módulos';
        }

        if (adminSubtitle) {
            adminSubtitle.textContent =
                'Organiza los módulos del curso seleccionado.';
        }

        cargarModulos(cursoSeleccionadoId);
    }

    if (vista === 'lecciones') {
        viewLecciones?.classList.remove('hidden');
        btnNuevoCurso?.classList.add('hidden');

        if (adminTitle) {
            adminTitle.textContent = 'Gestión de Lecciones';
        }

        if (adminSubtitle) {
            adminSubtitle.textContent =
                'Administra las lecciones de este módulo.';
        }

        cargarLecciones(
            cursoSeleccionadoId,
            moduloSeleccionadoId
        );
    }
}

// ==================================================
// IDENTIFICADORES AUTOMÁTICOS
// ==================================================

async function siguienteIdNumerico(ruta, prefijo) {
    const snapshot = await getDocs(ruta);

    let numeroMayor = 0;

    snapshot.forEach(documento => {
        const coincidencia = documento.id.match(
            new RegExp(`^${prefijo}-(\\d+)$`)
        );

        if (coincidencia) {
            numeroMayor = Math.max(
                numeroMayor,
                Number(coincidencia[1])
            );
        }
    });

    return `${prefijo}-${numeroMayor + 1}`;
}

// ==================================================
// 1. CURSOS
// ==================================================

async function cargarCursos() {
    verificarAdministrador();
    mostrarCarga(true);

    try {
        const snapshot = await getDocs(
            collection(db, 'courses')
        );

        gridCursos.innerHTML = '';

        if (snapshot.empty) {
            gridCursos.innerHTML = `
                <p class="text-sm text-gray-500 col-span-full text-center py-8">
                    Aún no hay cursos registrados.
                </p>
            `;
            return;
        }

        const cursos = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        cursos.sort((a, b) =>
            (Number(a.order) || 9999) -
            (Number(b.order) || 9999)
        );

        for (const curso of cursos) {
            const publicado = curso.published === true;

            const tarjeta = document.createElement('div');

            tarjeta.className =
                'bg-white rounded-3xl p-6 border border-wine-100 shadow-sm flex flex-col justify-between space-y-4';

            tarjeta.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="${
                            publicado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                        } text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                            ${publicado ? 'Publicado' : 'Borrador'}
                        </span>
                        <span class="text-xs text-gray-400">
                            Orden: ${Number(curso.order) || 1}
                        </span>
                    </div>

                    <h3 class="text-xl font-bold text-wine-900 serif-font mb-2">
                        ${escaparHTML(curso.title || 'Curso sin título')}
                    </h3>

                    <p class="text-xs text-gray-600 leading-relaxed mb-4">
                        ${escaparHTML(curso.description || 'Sin descripción')}
                    </p>

                    <p class="text-sm font-extrabold text-wine-700">
                        Precio: $${dinero(curso.price)} COP
                    </p>

                    <p class="text-xs text-gray-400 mt-2 break-all">
                        ID: ${escaparHTML(curso.id)}
                    </p>
                </div>

                <div class="pt-4 border-t border-wine-100 flex flex-wrap items-center gap-2">
                    <button
                        data-action="modulos"
                        class="flex-1 py-2 px-3 rounded-xl bg-wine-50 text-wine-700 hover:bg-wine-100 text-xs font-bold">
                        Ver módulos
                    </button>

                    <button
                        data-action="editar"
                        class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold">
                        Editar
                    </button>

                    <button
                        data-action="publicar"
                        class="py-2 px-3 rounded-xl ${
                            publicado
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-green-50 text-green-800'
                        } text-xs font-bold">
                        ${publicado ? 'Despublicar' : 'Publicar'}
                    </button>
                </div>
            `;

            tarjeta.querySelector('[data-action="modulos"]')
                .addEventListener('click', () => {
                    cursoSeleccionadoId = curso.id;
                    cursoSeleccionadoNombre = curso.title || 'Curso';

                    if (currentCourseTitle) {
                        currentCourseTitle.textContent =
                            cursoSeleccionadoNombre;
                    }

                    mostrarVista('modulos');
                });

            tarjeta.querySelector('[data-action="editar"]')
                .addEventListener('click', () => {
                    abrirFormularioCurso(curso.id, curso);
                });

            tarjeta.querySelector('[data-action="publicar"]')
                .addEventListener('click', () => {
                    cambiarPublicacion(
                        'courses',
                        curso.id,
                        publicado,
                        cargarCursos
                    );
                });

            gridCursos.appendChild(tarjeta);
        }
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        mostrarAlerta(
            'No se pudieron cargar los cursos. Revisa las reglas de Firebase.'
        );
    } finally {
        mostrarCarga(false);
    }
}

async function abrirFormularioCurso(id = null, datos = {}) {
    verificarAdministrador();

    const editando = id !== null;

    const titulo = prompt(
        'Título del curso:',
        datos.title || ''
    );

    if (titulo === null) return;

    if (!titulo.trim()) {
        mostrarAlerta('El título del curso es obligatorio.');
        return;
    }

    const descripcion = prompt(
        'Descripción del curso:',
        datos.description || ''
    );

    if (descripcion === null) return;

    const precioTexto = prompt(
        'Precio en pesos colombianos:',
        String(datos.price ?? 89000)
    );

    if (precioTexto === null) return;

    const precio = Number(precioTexto);

    if (!Number.isFinite(precio) || precio < 0) {
        mostrarAlerta('Escribe un precio válido.');
        return;
    }

    const ordenTexto = prompt(
        'Orden del curso:',
        String(datos.order ?? 1)
    );

    if (ordenTexto === null) return;

    const orden = Number(ordenTexto);

    if (!Number.isInteger(orden) || orden < 1) {
        mostrarAlerta('El orden debe ser un número entero mayor que cero.');
        return;
    }

    const publicado = confirmar(
        '¿Quieres que el curso esté publicado?\n\nAceptar: publicado\nCancelar: borrador'
    );

    mostrarCarga(true);

    try {
        const informacion = {
            title: titulo.trim(),
            description: descripcion.trim(),
            price: precio,
            order: orden,
            published: publicado
        };

        if (editando) {
            await updateDoc(
                doc(db, 'courses', id),
                informacion
            );
        } else {
            const referencia = doc(collection(db, 'courses'));

            await setDoc(referencia, {
                ...informacion,
                createdAt: serverTimestamp()
            });
        }

        mostrarAlerta(
            editando
                ? 'Curso actualizado correctamente.'
                : 'Curso creado correctamente.',
            'exito'
        );

        await cargarCursos();
    } catch (error) {
        console.error('Error al guardar curso:', error);
        mostrarAlerta(
            'No se pudo guardar el curso. Verifica las reglas de Firestore.'
        );
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// 2. MÓDULOS
// ==================================================

async function cargarModulos(courseId) {
    verificarAdministrador();

    if (!courseId) return;

    mostrarCarga(true);

    try {
        const referencia = collection(
            db, 'courses', courseId, 'modules'
        );

        const snapshot = await getDocs(referencia);

        gridModulos.innerHTML = '';

        if (snapshot.empty) {
            gridModulos.innerHTML = `
                <p class="text-sm text-gray-500 col-span-full text-center py-8">
                    Este curso todavía no tiene módulos.
                </p>
            `;
            return;
        }

        const modulos = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        modulos.sort((a, b) =>
            (Number(a.order) || 9999) -
            (Number(b.order) || 9999)
        );

        modulos.forEach(modulo => {
            const publicado = modulo.published === true;

            const tarjeta = document.createElement('div');

            tarjeta.className =
                'bg-white rounded-2xl p-6 border border-wine-100 shadow-sm flex flex-col justify-between space-y-4';

            tarjeta.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="bg-wine-100 text-wine-700 text-xs font-bold px-2.5 py-1 rounded-md">
                            Orden: ${Number(modulo.order) || 1}
                        </span>

                        <span class="${
                            publicado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                        } text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                            ${publicado ? 'Publicado' : 'Borrador'}
                        </span>
                    </div>

                    <h4 class="font-bold text-wine-900 text-base mb-1">
                        ${escaparHTML(modulo.title || 'Módulo sin título')}
                    </h4>

                    <p class="text-xs text-gray-600">
                        ${escaparHTML(modulo.description || 'Sin descripción')}
                    </p>
                </div>

                <div class="pt-4 border-t border-wine-100 flex flex-wrap items-center gap-2">
                    <button data-action="lecciones"
                        class="flex-1 py-2 px-3 rounded-xl bg-wine-50 text-wine-700 hover:bg-wine-100 text-xs font-bold">
                        Ver lecciones
                    </button>

                    <button data-action="editar"
                        class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                        Editar
                    </button>

                    <button data-action="publicar"
                        class="py-2 px-3 rounded-xl ${
                            publicado
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-green-50 text-green-800'
                        } text-xs font-bold">
                        ${publicado ? 'Despublicar' : 'Publicar'}
                    </button>

                    <button data-action="eliminar"
                        class="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">
                        Eliminar
                    </button>
                </div>
            `;

            tarjeta.querySelector('[data-action="lecciones"]')
                .addEventListener('click', () => {
                    moduloSeleccionadoId = modulo.id;
                    moduloSeleccionadoNombre = modulo.title || 'Módulo';

                    if (currentModuleTitle) {
                        currentModuleTitle.textContent =
                            moduloSeleccionadoNombre;
                    }

                    mostrarVista('lecciones');
                });

            tarjeta.querySelector('[data-action="editar"]')
                .addEventListener('click', () => {
                    abrirFormularioModulo(
                        courseId, modulo.id, modulo
                    );
                });

            tarjeta.querySelector('[data-action="publicar"]')
                .addEventListener('click', () => {
                    cambiarPublicacion(
                        `courses/${courseId}/modules`,
                        modulo.id,
                        publicado,
                        () => cargarModulos(courseId)
                    );
                });

            tarjeta.querySelector('[data-action="eliminar"]')
                .addEventListener('click', () => {
                    eliminarModulo(courseId, modulo.id);
                });

            gridModulos.appendChild(tarjeta);
        });
    } catch (error) {
        console.error('Error al cargar módulos:', error);
        mostrarAlerta('No se pudieron cargar los módulos.');
    } finally {
        mostrarCarga(false);
    }
}

async function abrirFormularioModulo(courseId, id = null, datos = {}) {
    verificarAdministrador();

    const editando = id !== null;

    const titulo = prompt(
        'Título del módulo:',
        datos.title || ''
    );

    if (titulo === null) return;

    if (!titulo.trim()) {
        mostrarAlerta('El título del módulo es obligatorio.');
        return;
    }

    const descripcion = prompt(
        'Descripción del módulo:',
        datos.description || ''
    );

    if (descripcion === null) return;

    const ordenTexto = prompt(
        'Número de orden:',
        String(datos.order ?? 1)
    );

    if (ordenTexto === null) return;

    const orden = Number(ordenTexto);

    if (!Number.isInteger(orden) || orden < 1) {
        mostrarAlerta('Escribe un orden válido.');
        return;
    }

    const publicado = confirmar(
        '¿Publicar este módulo?\n\nAceptar: publicado\nCancelar: borrador'
    );

    mostrarCarga(true);

    try {
        const informacion = {
            title: titulo.trim(),
            description: descripcion.trim(),
            order: orden,
            published: publicado
        };

        if (editando) {
            await updateDoc(
                doc(db, 'courses', courseId, 'modules', id),
                informacion
            );
        } else {
            const ruta = collection(
                db, 'courses', courseId, 'modules'
            );

            const nuevoId = await siguienteIdNumerico(
                ruta, 'modulo'
            );

            await setDoc(doc(ruta, nuevoId), informacion);
        }

        mostrarAlerta(
            editando
                ? 'Módulo actualizado correctamente.'
                : 'Módulo creado correctamente.',
            'exito'
        );

        await cargarModulos(courseId);
    } catch (error) {
        console.error('Error al guardar módulo:', error);
        mostrarAlerta('No se pudo guardar el módulo.');
    } finally {
        mostrarCarga(false);
    }
}

async function eliminarModulo(courseId, moduleId) {
    verificarAdministrador();

    if (!confirmar(
        '¿Eliminar este módulo y todas sus lecciones? Esta acción no se puede deshacer.'
    )) return;

    mostrarCarga(true);

    try {
        const rutaLecciones = collection(
            db, 'courses', courseId, 'modules',
            moduleId, 'lessons'
        );

        const lecciones = await getDocs(rutaLecciones);

        for (const leccion of lecciones.docs) {
            await deleteDoc(leccion.ref);
        }

        await deleteDoc(
            doc(db, 'courses', courseId, 'modules', moduleId)
        );

        mostrarAlerta(
            'Módulo y sus lecciones eliminados.',
            'exito'
        );

        await cargarModulos(courseId);
    } catch (error) {
        console.error('Error al eliminar módulo:', error);
        mostrarAlerta('No se pudo eliminar el módulo.');
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// 3. LECCIONES
// ==================================================

async function cargarLecciones(courseId, moduleId) {
    verificarAdministrador();

    if (!courseId || !moduleId) return;

    mostrarCarga(true);

    try {
        const referencia = collection(
            db, 'courses', courseId, 'modules',
            moduleId, 'lessons'
        );

        const snapshot = await getDocs(referencia);

        gridLecciones.innerHTML = '';

        if (snapshot.empty) {
            gridLecciones.innerHTML = `
                <p class="text-sm text-gray-500 text-center py-8">
                    Este módulo todavía no tiene lecciones.
                </p>
            `;
            return;
        }

        const lecciones = snapshot.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        lecciones.sort((a, b) =>
            (Number(a.order) || 9999) -
            (Number(b.order) || 9999)
        );

        lecciones.forEach(leccion => {
            const publicado = leccion.published === true;

            const tarjeta = document.createElement('div');

            tarjeta.className =
                'bg-white rounded-2xl p-6 border border-wine-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';

            tarjeta.innerHTML = `
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="bg-wine-100 text-wine-700 text-xs font-bold px-2 py-1 rounded">
                            Orden: ${Number(leccion.order) || 1}
                        </span>

                        <span class="${
                            publicado
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                        } text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                            ${publicado ? 'Publicada' : 'Borrador'}
                        </span>
                    </div>

                    <h4 class="font-bold text-wine-900 text-base mb-1">
                        ${escaparHTML(leccion.title || 'Lección sin título')}
                    </h4>

                    <p class="text-xs text-gray-600 line-clamp-2">
                        ${escaparHTML(leccion.content || leccion.description || 'Sin descripción')}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button data-action="editar"
                        class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                        Editar
                    </button>

                    <button data-action="publicar"
                        class="py-2 px-3 rounded-xl ${
                            publicado
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-green-50 text-green-800'
                        } text-xs font-bold">
                        ${publicado ? 'Despublicar' : 'Publicar'}
                    </button>

                    <button data-action="eliminar"
                        class="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">
                        Eliminar
                    </button>
                </div>
            `;

            tarjeta.querySelector('[data-action="editar"]')
                .addEventListener('click', () => {
                    abrirFormularioLeccion(
                        courseId, moduleId, leccion.id, leccion
                    );
                });

            tarjeta.querySelector('[data-action="publicar"]')
                .addEventListener('click', () => {
                    cambiarPublicacion(
                        `courses/${courseId}/modules/${moduleId}/lessons`,
                        leccion.id,
                        publicado,
                        () => cargarLecciones(courseId, moduleId)
                    );
                });

            tarjeta.querySelector('[data-action="eliminar"]')
                .addEventListener('click', () => {
                    eliminarLeccion(
                        courseId, moduleId, leccion.id
                    );
                });

            gridLecciones.appendChild(tarjeta);
        });
    } catch (error) {
        console.error('Error al cargar lecciones:', error);
        mostrarAlerta('No se pudieron cargar las lecciones.');
    } finally {
        mostrarCarga(false);
    }
}

async function abrirFormularioLeccion(
    courseId,
    moduleId,
    id = null,
    datos = {}
) {
    verificarAdministrador();

    const editando = id !== null;

    const titulo = prompt(
        'Título de la lección:',
        datos.title || ''
    );

    if (titulo === null) return;

    if (!titulo.trim()) {
        mostrarAlerta('El título de la lección es obligatorio.');
        return;
    }

    const contenido = prompt(
        'Contenido de texto de la lección:',
        datos.content || ''
    );

    if (contenido === null) return;

    const videoUrl = prompt(
        'URL del video (si no tiene, deja vacío):',
        datos.videoUrl || ''
    );

    if (videoUrl === null) return;

    const materialUrl = prompt(
        'URL del material descargable (opcional):',
        datos.materialUrl || ''
    );

    if (materialUrl === null) return;

    const ordenTexto = prompt(
        'Número de orden:',
        String(datos.order ?? 1)
    );

    if (ordenTexto === null) return;

    const orden = Number(ordenTexto);

    if (!Number.isInteger(orden) || orden < 1) {
        mostrarAlerta('Escribe un orden válido.');
        return;
    }

    const publicado = confirmar(
        '¿Publicar esta lección?\n\nAceptar: publicada\nCancelar: borrador'
    );

    mostrarCarga(true);

    try {
        const informacion = {
            title: titulo.trim(),
            content: contenido,
            videoUrl: videoUrl.trim(),
            materialUrl: materialUrl.trim(),
            order: orden,
            published: publicado
        };

        const ruta = collection(
            db, 'courses', courseId, 'modules',
            moduleId, 'lessons'
        );

        if (editando) {
            await updateDoc(
                doc(ruta, id),
                informacion
            );
        } else {
            const nuevoId = await siguienteIdNumerico(
                ruta, 'leccion'
            );

            await setDoc(doc(ruta, nuevoId), {
                ...informacion,
                createdAt: serverTimestamp()
            });
        }

        mostrarAlerta(
            editando
                ? 'Lección actualizada correctamente.'
                : 'Lección creada correctamente.',
            'exito'
        );

        await cargarLecciones(courseId, moduleId);
    } catch (error) {
        console.error('Error al guardar lección:', error);
        mostrarAlerta('No se pudo guardar la lección.');
    } finally {
        mostrarCarga(false);
    }
}

async function eliminarLeccion(courseId, moduleId, lessonId) {
    verificarAdministrador();

    if (!confirmar('¿Eliminar esta lección? Esta acción no se puede deshacer.')) {
        return;
    }

    mostrarCarga(true);

    try {
        await deleteDoc(
            doc(
                db, 'courses', courseId, 'modules',
                moduleId, 'lessons', lessonId
            )
        );

        mostrarAlerta('Lección eliminada correctamente.', 'exito');

        await cargarLecciones(courseId, moduleId);
    } catch (error) {
        console.error('Error al eliminar lección:', error);
        mostrarAlerta('No se pudo eliminar la lección.');
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// PUBLICAR Y DESPUBLICAR
// ==================================================

async function cambiarPublicacion(
    ruta,
    id,
    estabaPublicado,
    recargar
) {
    verificarAdministrador();

    const nuevoEstado = !estabaPublicado;

    if (!confirmar(
        nuevoEstado
            ? '¿Quieres publicar este contenido?'
            : '¿Quieres dejar este contenido como borrador?'
    )) return;

    mostrarCarga(true);

    try {
        await updateDoc(
            doc(db, ruta, id),
            { published: nuevoEstado }
        );

        mostrarAlerta(
            nuevoEstado
                ? 'Contenido publicado correctamente.'
                : 'Contenido despublicado correctamente.',
            'exito'
        );

        await recargar();
    } catch (error) {
        console.error('Error al cambiar publicación:', error);
        mostrarAlerta(
            'No se pudo cambiar el estado. Comprueba las reglas de Firebase.'
        );
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// BOTONES PRINCIPALES
// ==================================================

btnNuevoCurso?.addEventListener('click', () => {
    abrirFormularioCurso();
});

btnNuevoModulo?.addEventListener('click', () => {
    if (cursoSeleccionadoId) {
        abrirFormularioModulo(cursoSeleccionadoId);
    }
});

btnNuevaLeccion?.addEventListener('click', () => {
    if (cursoSeleccionadoId && moduloSeleccionadoId) {
        abrirFormularioLeccion(
            cursoSeleccionadoId,
            moduloSeleccionadoId
        );
    }
});

btnVolverCursos?.addEventListener('click', () => {
    mostrarVista('cursos');
});

btnVolverModulos?.addEventListener('click', () => {
    mostrarVista('modulos');
});

// ==================================================
// VERIFICACIÓN DE AUTENTICACIÓN Y ROL
// ==================================================

onAuthStateChanged(auth, async usuario => {
    usuarioEsAdministrador = false;

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    mostrarCarga(true);

    try {
        const referenciaUsuario = doc(
            db, 'users', usuario.uid
        );

        const documentoUsuario = await getDoc(referenciaUsuario);

        if (
            !documentoUsuario.exists() ||
            documentoUsuario.data().role !== 'admin'
        ) {
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center p-6 bg-wine-50">
                    <div class="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-red-200">
                        <h2 class="text-2xl font-bold text-wine-900 mb-4">
                            Acceso denegado
                        </h2>
                        <p class="text-sm text-gray-600 mb-6">
                            Esta sección es exclusiva para administradores.
                        </p>
                        <a href="index.html"
                           class="inline-block w-full py-3 rounded-xl text-white font-bold text-sm custom-gradient">
                            Volver al inicio
                        </a>
                    </div>
                </div>
            `;

            return;
        }

        usuarioEsAdministrador = true;

        mostrarVista('cursos');

    } catch (error) {
        console.error('Error al verificar administrador:', error);

        mostrarAlerta(
            'No se pudo verificar tu cuenta. Revisa la conexión y las reglas de Firebase.'
        );
    } finally {
        mostrarCarga(false);
    }
});
