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
// ELEMENTOS DE LA PÁGINA Y MODALES
// ==================================================

const adminAlert = document.getElementById('admin-alert');
const adminLoading = document.getElementById('admin-loading');
const adminTitle = document.getElementById('admin-title');
const adminSubtitle = document.getElementById('admin-subtitle');

// Pestañas principales
const tabBtnCursos = document.getElementById('tab-btn-cursos');
const tabBtnRecursos = document.getElementById('tab-btn-recursos');
const tabBtnUsuarios = document.getElementById('tab-btn-usuarios');
const tabBtnCrm = document.getElementById('tab-btn-crm');
const tabBtnReportes = document.getElementById('tab-btn-reportes');

const sectionCursosManager = document.getElementById('section-cursos-manager');
const sectionRecursosManager = document.getElementById('section-recursos-manager');
const sectionUsuariosManager = document.getElementById('section-usuarios-manager');
const sectionCrmManager = document.getElementById('section-crm-manager');
const sectionReportesManager = document.getElementById('section-reportes-manager');

const viewCursos = document.getElementById('view-cursos');
const viewModulos = document.getElementById('view-modulos');
const viewLecciones = document.getElementById('view-lecciones');

const gridCursos = document.getElementById('grid-cursos');
const gridModulos = document.getElementById('grid-modulos');
const gridLecciones = document.getElementById('grid-lecciones');
const tableUsuariosBody = document.getElementById('table-usuarios-body');
const searchUser = document.getElementById('search-user');

const currentCourseTitle = document.getElementById('current-course-title');
const currentModuleTitle = document.getElementById('current-module-title');

const btnNuevoCurso = document.getElementById('btn-nuevo-curso');
const btnNuevoModulo = document.getElementById('btn-nuevo-modulo');
const btnNuevaLeccion = document.getElementById('btn-nueva-leccion');

const btnVolverCursos = document.getElementById('btn-volver-cursos');
const btnVolverModulos = document.getElementById('btn-volver-modulos');

// Elementos de Recursos por Curso
const selectCursoRecursos = document.getElementById('select-curso-recursos');
const formRecursosContainer = document.getElementById('form-recursos-container');
const recursosPlaceholder = document.getElementById('recursos-placeholder');
const recPantallas = document.getElementById('rec-pantallas');
const recMateriales = document.getElementById('rec-materiales');
const recHorarios = document.getElementById('rec-horarios');
const recCostos = document.getElementById('rec-costos');
const btnGuardarRecursos = document.getElementById('btn-guardar-recursos');
let cursoRecursoActivoId = null;

// Elementos de CRM y Reportes
const kanbanContainer = document.getElementById('kanban-container');
const crmContactSelect = document.getElementById('crm-contact-select');
const crmNotaInput = document.getElementById('crm-nota-input');
const btnGuardarNotaCrm = document.getElementById('btn-guardar-nota-crm');
const crmNotasList = document.getElementById('crm-notas-list');

const reportesKpis = document.getElementById('reportes-kpis');
const reportesChart = document.getElementById('reportes-chart');

// Elementos de Modales de Formulario
const modalForm = document.getElementById('modal-form');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const dynamicForm = document.getElementById('dynamic-form');
const formFieldsContainer = document.getElementById('form-fields-container');
const modalCloseBtn = document.getElementById('modal-close-btn');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Elementos de Modal de Progreso
const modalProgress = document.getElementById('modal-progress');
const progressUserName = document.getElementById('progress-user-name');
const progressUserEmail = document.getElementById('progress-user-email');
const progressCountBadge = document.getElementById('progress-count-badge');
const progressLessonsList = document.getElementById('progress-lessons-list');
const modalProgressClose = document.getElementById('modal-progress-close');
const btnCloseProgressModal = document.getElementById('btn-close-progress-modal');

// ==================================================
// ESTADO DEL PANEL
// ==================================================

let cursoSeleccionadoId = null;
let cursoSeleccionadoNombre = '';
let moduloSeleccionadoId = null;
let moduloSeleccionadoNombre = '';
let usuarioEsAdministrador = false;
let listaUsuariosCache = [];
let listaCursosCache = [];
let listaMatriculasCache = [];
let crmNotasCache = [];

// ==================================================
// MENSAJES Y UTILIDADES
// ==================================================

function mostrarAlerta(mensaje, tipo = 'error') {
    if (!adminAlert) return;
    adminAlert.textContent = mensaje;
    adminAlert.classList.remove('hidden', 'alert-success', 'alert-error');
    adminAlert.classList.add(tipo === 'exito' ? 'alert-success' : 'alert-error');
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
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caracter]);
}

function dinero(valor) {
    return '$' + Number(valor || 0).toLocaleString('es-CO');
}

function verificarAdministrador() {
    if (!usuarioEsAdministrador) {
        throw new Error('No tienes permisos de administrador.');
    }
}

// ==================================================
// MANEJO DE MODALES
// ==================================================

function abrirModalForm(tipo, id = null, datos = {}) {
    formFieldsContainer.innerHTML = '';
    document.getElementById('form-item-id').value = id || '';
    document.getElementById('form-item-type').value = tipo;

    if (tipo === 'curso') {
        modalTitle.textContent = id ? 'Editar Curso' : 'Crear Nuevo Curso';
        modalSubtitle.textContent = 'Ajusta la información principal del curso.';

        formFieldsContainer.innerHTML = `
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Título del Curso</label>
                <input type="text" id="f-title" value="${escaparHTML(datos.title || '')}" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Descripción</label>
                <textarea id="f-description" rows="3">${escaparHTML(datos.description || '')}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-wine-900 mb-1">Precio (COP)</label>
                    <input type="number" id="f-price" value="${datos.price ?? 89000}" required>
                </div>
                <div>
                    <label class="block text-xs font-bold text-wine-900 mb-1">Número de Orden</label>
                    <input type="number" id="f-order" value="${datos.order ?? 1}" required>
                </div>
            </div>
            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="f-published" ${datos.published ? 'checked' : ''} style="width:auto;">
                <label for="f-published" class="text-xs font-bold text-gray-700">Publicar inmediatamente</label>
            </div>
        `;
    } else if (tipo === 'modulo') {
        modalTitle.textContent = id ? 'Editar Módulo' : 'Crear Nuevo Módulo';
        modalSubtitle.textContent = 'Configura el módulo para este curso.';

        formFieldsContainer.innerHTML = `
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Título del Módulo</label>
                <input type="text" id="f-title" value="${escaparHTML(datos.title || '')}" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Descripción corta</label>
                <textarea id="f-description" rows="2">${escaparHTML(datos.description || '')}</textarea>
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Número de Orden</label>
                <input type="number" id="f-order" value="${datos.order ?? 1}" required>
            </div>
            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="f-published" ${datos.published ? 'checked' : ''} style="width:auto;">
                <label for="f-published" class="text-xs font-bold text-gray-700">Publicar módulo</label>
            </div>
        `;
    } else if (tipo === 'leccion') {
        modalTitle.textContent = id ? 'Editar Lección' : 'Crear Nueva Lección';
        modalSubtitle.textContent = 'Escribe el contenido y asigna el video de la lección.';

        formFieldsContainer.innerHTML = `
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Título de la Lección</label>
                <input type="text" id="f-title" value="${escaparHTML(datos.title || '')}" required>
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Contenido / Texto explicativo</label>
                <textarea id="f-content" rows="3">${escaparHTML(datos.content || '')}</textarea>
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">URL del Video (YouTube / Embed)</label>
                <input type="text" id="f-video" value="${escaparHTML(datos.videoUrl || '')}" placeholder="https://...">
            </div>
            <div>
                <label class="block text-xs font-bold text-wine-900 mb-1">Número de Orden</label>
                <input type="number" id="f-order" value="${datos.order ?? 1}" required>
            </div>
            <div class="flex items-center gap-2 pt-2">
                <input type="checkbox" id="f-published" ${datos.published ? 'checked' : ''} style="width:auto;">
                <label for="f-published" class="text-xs font-bold text-gray-700">Publicar lección</label>
            </div>
        `;
    }

    modalForm.classList.remove('hidden');
}

function cerrarModalForm() {
    modalForm.classList.add('hidden');
}

modalCloseBtn?.addEventListener('click', cerrarModalForm);
btnCancelModal?.addEventListener('click', cerrarModalForm);

dynamicForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    verificarAdministrador();

    const id = document.getElementById('form-item-id').value;
    const tipo = document.getElementById('form-item-type').value;

    const title = document.getElementById('f-title')?.value.trim();
    const published = document.getElementById('f-published')?.checked || false;
    const order = Number(document.getElementById('f-order')?.value || 1);

    mostrarCarga(true);
    cerrarModalForm();

    try {
        if (tipo === 'curso') {
            const description = document.getElementById('f-description')?.value.trim();
            const price = Number(document.getElementById('f-price')?.value || 0);
            const info = { title, description, price, order, published };

            if (id) {
                await updateDoc(doc(db, 'courses', id), info);
            } else {
                await setDoc(doc(collection(db, 'courses')), { ...info, createdAt: serverTimestamp() });
            }
            await cargarCursos();
        } else if (tipo === 'modulo') {
            const description = document.getElementById('f-description')?.value.trim();
            const info = { title, description, order, published };

            if (id) {
                await updateDoc(doc(db, 'courses', cursoSeleccionadoId, 'modules', id), info);
            } else {
                const ruta = collection(db, 'courses', cursoSeleccionadoId, 'modules');
                const nuevoId = await siguienteIdNumerico(ruta, 'modulo');
                await setDoc(doc(ruta, nuevoId), info);
            }
            await cargarModulos(cursoSeleccionadoId);
        } else if (tipo === 'leccion') {
            const content = document.getElementById('f-content')?.value.trim();
            const videoUrl = document.getElementById('f-video')?.value.trim();
            const info = { title, content, videoUrl, order, published };

            const ruta = collection(db, 'courses', cursoSeleccionadoId, 'modules', moduloSeleccionadoId, 'lessons');
            if (id) {
                await updateDoc(doc(ruta, id), info);
            } else {
                const nuevoId = await siguienteIdNumerico(ruta, 'leccion');
                await setDoc(doc(ruta, nuevoId), { ...info, createdAt: serverTimestamp() });
            }
            await cargarLecciones(cursoSeleccionadoId, moduloSeleccionadoId);
        }

        mostrarAlerta('Cambios guardados con éxito.', 'exito');
    } catch (err) {
        console.error(err);
        mostrarAlerta('Error al guardar la información.');
    } finally {
        mostrarCarga(false);
    }
});

// ==================================================
// CAMBIO DE PESTAÑAS PRINCIPALES
// ==================================================

function cambiarSeccionAdmin(seccion) {
    ocultarAlerta();

    [tabBtnCursos, tabBtnRecursos, tabBtnUsuarios, tabBtnCrm, tabBtnReportes].forEach(btn => {
        if (btn) btn.className = 'tab-btn';
    });

    [sectionCursosManager, sectionRecursosManager, sectionUsuariosManager, sectionCrmManager, sectionReportesManager].forEach(sec => {
        if (sec) sec.classList.add('hidden');
    });

    if (seccion === 'cursos') {
        tabBtnCursos.className = 'tab-btn active';
        sectionCursosManager.classList.remove('hidden');
        if (adminTitle) adminTitle.textContent = 'Gestión de Contenidos';
        if (adminSubtitle) adminSubtitle.textContent = 'Administra cursos, módulos, lecciones de tu academia.';
        mostrarVistaCursosSub('cursos');
    } else if (seccion === 'recursos') {
        tabBtnRecursos.className = 'tab-btn active';
        sectionRecursosManager.classList.remove('hidden');
        if (adminTitle) adminTitle.textContent = 'Recursos y Costos';
        if (adminSubtitle) adminSubtitle.textContent = 'Gestión avanzada por curso para instructores y producción.';
        cargarSelectorCursosRecursos();
    } else if (seccion === 'usuarios') {
        tabBtnUsuarios.className = 'tab-btn active';
        sectionUsuariosManager.classList.remove('hidden');
        if (adminTitle) adminTitle.textContent = 'Control de Estudiantes';
        if (adminSubtitle) adminSubtitle.textContent = 'Supervisa todos los usuarios registrados y su actividad.';
        cargarUsuariosRegistrados();
    } else if (seccion === 'crm') {
        tabBtnCrm.className = 'tab-btn active';
        sectionCrmManager.classList.remove('hidden');
        if (adminTitle) adminTitle.textContent = 'CRM y Embudo de Ventas';
        if (adminSubtitle) adminSubtitle.textContent = 'Gestión de contactos basada en registros y matrículas reales.';
        inicializarCrm();
    } else if (seccion === 'reportes') {
        tabBtnReportes.className = 'tab-btn active';
        sectionReportesManager.classList.remove('hidden');
        if (adminTitle) adminTitle.textContent = 'Reportes y Rentabilidad';
        if (adminSubtitle) adminSubtitle.textContent = 'Resumen financiero de ventas contra costos de producción.';
        inicializarReportes();
    }
}

tabBtnCursos?.addEventListener('click', () => cambiarSeccionAdmin('cursos'));
tabBtnRecursos?.addEventListener('click', () => cambiarSeccionAdmin('recursos'));
tabBtnUsuarios?.addEventListener('click', () => cambiarSeccionAdmin('usuarios'));
tabBtnCrm?.addEventListener('click', () => cambiarSeccionAdmin('crm'));
tabBtnReportes?.addEventListener('click', () => cambiarSeccionAdmin('reportes'));

// ==================================================
// NAVEGACIÓN ENTRE VISTAS DE CURSOS
// ==================================================

function mostrarVistaCursosSub(vista) {
    viewCursos?.classList.add('hidden');
    viewModulos?.classList.add('hidden');
    viewLecciones?.classList.add('hidden');

    btnNuevoCurso?.classList.add('hidden');
    btnNuevoModulo?.classList.add('hidden');
    btnNuevaLeccion?.classList.add('hidden');

    if (vista === 'cursos') {
        viewCursos?.classList.remove('hidden');
        btnNuevoCurso?.classList.remove('hidden');
        cargarCursos();
    } else if (vista === 'modulos') {
        viewModulos?.classList.remove('hidden');
        btnNuevoModulo?.classList.remove('hidden');
        cargarModulos(cursoSeleccionadoId);
    } else if (vista === 'lecciones') {
        viewLecciones?.classList.remove('hidden');
        btnNuevaLeccion?.classList.remove('hidden');
        cargarLecciones(cursoSeleccionadoId, moduloSeleccionadoId);
    }
}

async function siguienteIdNumerico(ruta, prefijo) {
    const snapshot = await getDocs(ruta);
    let numeroMayor = 0;
    snapshot.forEach(documento => {
        const coincidencia = documento.id.match(new RegExp(`^${prefijo}-(\\d+)$`));
        if (coincidencia) numeroMayor = Math.max(numeroMayor, Number(coincidencia[1]));
    });
    return `${prefijo}-${numeroMayor + 1}`;
}

// ==================================================
// 1. GESTIÓN DE CURSOS
// ==================================================

async function cargarCursos() {
    verificarAdministrador();
    mostrarCarga(true);

    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        gridCursos.innerHTML = '';
        listaCursosCache = [];

        if (snapshot.empty) {
            gridCursos.innerHTML = `<p class="text-sm text-gray-500 col-span-full text-center py-8">Aún no hay cursos registrados.</p>`;
            return;
        }

        snapshot.forEach(docSnap => {
            listaCursosCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        listaCursosCache.sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));

        for (const curso of listaCursosCache) {
            const publicado = curso.published === true;
            const tarjeta = document.createElement('div');
            tarjeta.className = 'card flex flex-col justify-between space-y-4';

            tarjeta.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="${publicado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                            ${publicado ? 'Publicado' : 'Borrador'}
                        </span>
                        <span class="text-xs text-gray-400">Orden: ${Number(curso.order) || 1}</span>
                    </div>

                    <h3 class="text-xl font-bold text-wine-900 mb-2">${escaparHTML(curso.title || 'Curso sin título')}</h3>
                    <p class="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-2">${escaparHTML(curso.description || 'Sin descripción')}</p>
                    <p class="text-sm font-extrabold text-wine-700">Precio: ${dinero(curso.price)} COP</p>
                </div>

                <div class="pt-4 border-t border-wine-100 flex flex-wrap items-center gap-2">
                    <button data-action="modulos" class="flex-1 py-2 px-3 rounded-xl bg-wine-50 text-wine-700 hover:bg-wine-100 text-xs font-bold transition-colors">Módulos</button>
                    <button data-action="editar" class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold transition-colors">Editar</button>
                </div>
            `;

            tarjeta.querySelector('[data-action="modulos"]').addEventListener('click', () => {
                cursoSeleccionadoId = curso.id;
                cursoSeleccionadoNombre = curso.title || 'Curso';
                if (currentCourseTitle) currentCourseTitle.textContent = cursoSeleccionadoNombre;
                mostrarVistaCursosSub('modulos');
            });

            tarjeta.querySelector('[data-action="editar"]').addEventListener('click', () => {
                abrirModalForm('curso', curso.id, curso);
            });

            gridCursos.appendChild(tarjeta);
        }
    } catch (error) {
        console.error('Error al cargar cursos:', error);
        mostrarAlerta('No se pudieron cargar los cursos.');
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// 2. GESTIÓN DE MÓDULOS Y LECCIONES
// ==================================================

async function cargarModulos(courseId) {
    verificarAdministrador();
    if (!courseId) return;
    mostrarCarga(true);

    try {
        const snapshot = await getDocs(collection(db, 'courses', courseId, 'modules'));
        gridModulos.innerHTML = '';

        if (snapshot.empty) {
            gridModulos.innerHTML = `<p class="text-sm text-gray-500 col-span-full text-center py-8">Este curso no tiene módulos.</p>`;
            return;
        }

        const modulos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        modulos.sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));

        modulos.forEach(modulo => {
            const publicado = modulo.published === true;
            const tarjeta = document.createElement('div');
            tarjeta.className = 'card flex flex-col justify-between space-y-4';

            tarjeta.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <span class="bg-wine-100 text-wine-700 text-xs font-bold px-2.5 py-1 rounded-md">Orden: ${Number(modulo.order) || 1}</span>
                        <span class="${publicado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                            ${publicado ? 'Publicado' : 'Borrador'}
                        </span>
                    </div>
                    <h4 class="font-bold text-wine-900 text-base mb-1">${escaparHTML(modulo.title)}</h4>
                    <p class="text-xs text-gray-600">${escaparHTML(modulo.description || 'Sin descripción')}</p>
                </div>
                <div class="pt-4 border-t border-wine-100 flex flex-wrap items-center gap-2">
                    <button data-action="lecciones" class="flex-1 py-2 px-3 rounded-xl bg-wine-50 text-wine-700 hover:bg-wine-100 text-xs font-bold transition-colors">Lecciones</button>
                    <button data-action="editar" class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold transition-colors">Editar</button>
                    <button data-action="eliminar" class="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold transition-colors">Eliminar</button>
                </div>
            `;

            tarjeta.querySelector('[data-action="lecciones"]').addEventListener('click', () => {
                moduloSeleccionadoId = modulo.id;
                moduloSeleccionadoNombre = modulo.title || 'Módulo';
                if (currentModuleTitle) currentModuleTitle.textContent = moduloSeleccionadoNombre;
                mostrarVistaCursosSub('lecciones');
            });

            tarjeta.querySelector('[data-action="editar"]').addEventListener('click', () => {
                abrirModalForm('modulo', modulo.id, modulo);
            });

            tarjeta.querySelector('[data-action="eliminar"]').addEventListener('click', () => {
                eliminarModulo(courseId, modulo.id);
            });

            gridModulos.appendChild(tarjeta);
        });
    } catch (error) {
        mostrarAlerta('No se pudieron cargar los módulos.');
    } finally {
        mostrarCarga(false);
    }
}

async function eliminarModulo(courseId, moduleId) {
    if (!confirm('¿Eliminar módulo y sus lecciones?')) return;
    mostrarCarga(true);
    try {
        await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId));
        await cargarModulos(courseId);
        mostrarAlerta('Módulo eliminado.', 'exito');
    } catch (error) {
        mostrarAlerta('Error al eliminar.');
    } finally {
        mostrarCarga(false);
    }
}

async function cargarLecciones(courseId, moduleId) {
    verificarAdministrador();
    if (!courseId || !moduleId) return;
    mostrarCarga(true);

    try {
        const snapshot = await getDocs(collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'));
        gridLecciones.innerHTML = '';

        if (snapshot.empty) {
            gridLecciones.innerHTML = `<p class="text-sm text-gray-500 text-center py-8">Este módulo no tiene lecciones.</p>`;
            return;
        }

        const lecciones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        lecciones.sort((a, b) => (Number(a.order) || 9999) - (Number(b.order) || 9999));

        lecciones.forEach(leccion => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'card flex items-center justify-between gap-4 py-4 px-6';

            tarjeta.innerHTML = `
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <span class="bg-wine-100 text-wine-700 text-xs font-bold px-2 py-0.5 rounded">Orden: ${Number(leccion.order) || 1}</span>
                        <h4 class="font-bold text-wine-900 text-base">${escaparHTML(leccion.title)}</h4>
                    </div>
                    <p class="text-xs text-gray-600 line-clamp-1">${escaparHTML(leccion.content || 'Sin contenido')}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button data-action="editar" class="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold transition-colors">Editar</button>
                    <button data-action="eliminar" class="py-2 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold transition-colors">Eliminar</button>
                </div>
            `;

            tarjeta.querySelector('[data-action="editar"]').addEventListener('click', () => {
                abrirModalForm('leccion', leccion.id, leccion);
            });

            tarjeta.querySelector('[data-action="eliminar"]').addEventListener('click', () => {
                eliminarLeccion(courseId, moduleId, leccion.id);
            });

            gridLecciones.appendChild(tarjeta);
        });
    } catch (error) {
        mostrarAlerta('No se pudieron cargar las lecciones.');
    } finally {
        mostrarCarga(false);
    }
}

async function eliminarLeccion(courseId, moduleId, lessonId) {
    if (!confirm('¿Eliminar esta lección?')) return;
    mostrarCarga(true);
    try {
        await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId));
        await cargarLecciones(courseId, moduleId);
        mostrarAlerta('Lección eliminada.', 'exito');
    } catch (error) {
        mostrarAlerta('No se pudo eliminar.');
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// 3. RECURSOS Y COSTOS POR CURSO
// ==================================================

async function cargarSelectorCursosRecursos() {
    try {
        const snapshot = await getDocs(collection(db, 'courses'));
        selectCursoRecursos.innerHTML = '<option value="">Selecciona un curso...</option>';
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const option = document.createElement('option');
            option.value = docSnap.id;
            option.textContent = data.title || 'Curso sin título';
            selectCursoRecursos.appendChild(option);
        });
    } catch (e) {
        console.error('Error al poblar selector de cursos:', e);
    }
}

selectCursoRecursos?.addEventListener('change', async (e) => {
    cursoRecursoActivoId = e.target.value;
    if (!cursoRecursoActivoId) {
        formRecursosContainer.classList.add('hidden');
        recursosPlaceholder.classList.remove('hidden');
        return;
    }

    mostrarCarga(true);
    try {
        const docRef = doc(db, 'courses', cursoRecursoActivoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            recPantallas.value = data.instructorScreens || '';
            recMateriales.value = data.courseMaterials || '';
            recHorarios.value = data.courseSchedule || '';
            recCostos.value = data.productionCost || '';

            recursosPlaceholder.classList.add('hidden');
            formRecursosContainer.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        mostrarAlerta('No se pudieron cargar los recursos del curso.');
    } finally {
        mostrarCarga(false);
    }
});

btnGuardarRecursos?.addEventListener('click', async () => {
    if (!cursoRecursoActivoId) return;

    mostrarCarga(true);
    try {
        const docRef = doc(db, 'courses', cursoRecursoActivoId);
        await updateDoc(docRef, {
            instructorScreens: recPantallas.value.trim(),
            courseMaterials: recMateriales.value.trim(),
            courseSchedule: recHorarios.value.trim(),
            productionCost: Number(recCostos.value) || 0
        });

        mostrarAlerta('Recursos y costos de producción actualizados correctamente.', 'exito');
    } catch (err) {
        console.error(err);
        mostrarAlerta('Error al guardar los recursos.');
    } finally {
        mostrarCarga(false);
    }
});

// ==================================================
// 4. LISTADO DE USUARIOS Y AVANCES
// ==================================================

async function cargarUsuariosRegistrados() {
    verificarAdministrador();
    mostrarCarga(true);

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        tableUsuariosBody.innerHTML = '';
        listaUsuariosCache = [];

        if (snapshot.empty) {
            tableUsuariosBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-500">No hay usuarios registrados en Firestore.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            listaUsuariosCache.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarTablaUsuarios(listaUsuariosCache);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        mostrarAlerta('No se pudo obtener el listado de usuarios.');
    } finally {
        mostrarCarga(false);
    }
}

function renderizarTablaUsuarios(usuarios) {
    tableUsuariosBody.innerHTML = '';

    if (usuarios.length === 0) {
        tableUsuariosBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-500">No se encontraron coincidencias.</td></tr>`;
        return;
    }

    usuarios.forEach(usuario => {
        const fila = document.createElement('tr');
        fila.className = 'hover:bg-wine-50/40 transition-colors';

        let fechaStr = 'Fecha desconocida';
        if (usuario.createdAt?.toDate) {
            fechaStr = usuario.createdAt.toDate().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        }

        const esAdmin = usuario.role === 'admin';

        fila.innerHTML = `
            <td class="py-3 px-4 font-bold text-wine-900 flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-wine-100 text-wine-700 flex items-center justify-center font-bold text-xs">
                    <i class="fa-solid fa-user"></i>
                </div>
                ${escaparHTML(usuario.name || 'Sin Nombre')}
            </td>
            <td class="py-3 px-4 text-gray-600">${escaparHTML(usuario.email || 'Sin correo')}</td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${esAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                    ${esAdmin ? 'Administrador' : 'Estudiante'}
                </span>
            </td>
            <td class="py-3 px-4 text-gray-500">${fechaStr}</td>
            <td class="py-3 px-4 text-center">
                <button data-userid="${usuario.id}" class="btn-ver-progreso px-3 py-1.5 rounded-lg bg-wine-50 text-wine-700 hover:bg-wine-100 font-bold text-xs transition-colors">
                    <i class="fa-solid fa-chart-line mr-1"></i> Ver Avances
                </button>
            </td>
        `;

        fila.querySelector('.btn-ver-progreso').addEventListener('click', () => {
            inspeccionarAvanceUsuarioModal(usuario);
        });

        tableUsuariosBody.appendChild(fila);
    });
}

searchUser?.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    const filtrados = listaUsuariosCache.filter(u => 
        (u.name && u.name.toLowerCase().includes(texto)) || 
        (u.email && u.email.toLowerCase().includes(texto))
    );
    renderizarTablaUsuarios(filtrados);
});

async function inspeccionarAvanceUsuarioModal(usuario) {
    mostrarCarga(true);
    try {
        const snapshotProgreso = await getDocs(collection(db, 'progress'));
        let leccionesCompletadas = [];

        snapshotProgreso.forEach(docSnap => {
            const data = docSnap.data();
            if (data.userId === usuario.id || docSnap.id.includes(usuario.id)) {
                leccionesCompletadas.push(data);
            }
        });

        progressUserName.textContent = usuario.name || 'Sin nombre';
        progressUserEmail.textContent = usuario.email || 'Sin correo';
        progressCountBadge.textContent = `${leccionesCompletadas.length} lección(es) completada(s)`;

        progressLessonsList.innerHTML = '';

        if (leccionesCompletadas.length === 0) {
            progressLessonsList.innerHTML = `
                <div class="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                    Este estudiante aún no registra lecciones marcadas como completadas.
                </div>
            `;
        } else {
            leccionesCompletadas.forEach((lec) => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-3 rounded-xl bg-wine-50/60 border border-wine-100 text-xs';
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                        <div>
                            <p class="font-bold text-wine-900">Módulo: ${escaparHTML(lec.moduleId || 'N/A')} - Lección: ${escaparHTML(lec.lessonId || 'N/A')}</p>
                            <p class="text-[10px] text-gray-500">Curso: ${escaparHTML(lec.courseId || 'N/A')}</p>
                        </div>
                    </div>
                `;
                progressLessonsList.appendChild(item);
            });
        }

        modalProgress.classList.remove('hidden');
    } catch (e) {
        console.error('Error al inspeccionar progreso:', e);
        mostrarAlerta('No se pudieron obtener los avances del estudiante.');
    } finally {
        mostrarCarga(false);
    }
}

modalProgressClose?.addEventListener('click', () => modalProgress.classList.add('hidden'));
btnCloseProgressModal?.addEventListener('click', () => modalProgress.classList.add('hidden'));

// ==================================================
// 5. CRM / LEADS Y EMBUDO DE VENTAS
// ==================================================

const STAGES = ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Perdido'];

async function inicializarCrm() {
    mostrarCarga(true);
    try {
        // Obtenemos usuarios e inscripciones activas para mapear clientes reales
        const snapUsers = await getDocs(collection(db, 'users'));
        const snapEnroll = await getDocs(collection(db, 'enrollments'));
        
        listaUsuariosCache = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));
        listaMatriculasCache = snapEnroll.docs.map(d => ({ id: d.id, ...d.data() }));

        // Cargar notas de CRM guardadas localmente o en Firestore si existe colección
        renderizarKanbanCrm();
        poblarSelectorCrm();
    } catch (err) {
        console.error('Error al inicializar CRM:', err);
        mostrarAlerta('No se pudo cargar el CRM.');
    } finally {
        mostrarCarga(false);
    }
}

function renderizarKanbanCrm() {
    if (!kanbanContainer) return;
    kanbanContainer.innerHTML = '';

    STAGES.forEach((stageName, stageIndex) => {
        // Clasificamos estudiantes según matrículas (si tienen matrícula activa = Cliente etapa 3, sino etapa 0 o 1)
        const leadsEnEtapa = listaUsuariosCache.filter(user => {
            const tieneMatricula = listaMatriculasCache.some(m => m.userId === user.id && m.status === 'active');
            const etapaAsignada = user.crmStage ?? (tieneMatricula ? 3 : 0);
            return etapaAsignada === stageIndex;
        });

        const col = document.createElement('div');
        col.className = 'kanban-col';
        col.innerHTML = `
            <h3><span>${stageName}</span> <span class="tag">${leadsEnEtapa.length}</span></h3>
            <div style="display:flex; flex-direction:column; gap:8px;" id="col-leads-${stageIndex}"></div>
        `;

        const leadsContainer = col.querySelector(`#col-leads-${stageIndex}`);

        if (leadsEnEtapa.length === 0) {
            leadsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Sin contactos</p>`;
        } else {
            leadsEnEtapa.forEach(lead => {
                const card = document.createElement('div');
                card.className = 'lead-card';
                card.innerHTML = `
                    <b>${escaparHTML(lead.name || 'Sin nombre')}</b>
                    <small>${escaparHTML(lead.email || '')}</small>
                    <div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">
                        ${stageIndex < 4 ? `<button data-action="avanzar" data-id="${lead.id}">Avanzar ›</button>` : ''}
                        ${stageIndex < 3 ? `<button data-action="perder" data-id="${lead.id}" style="background:#fde8e8; color:var(--error);">Perdido</button>` : ''}
                    </div>
                `;

                card.querySelector('[data-action="avanzar"]')?.addEventListener('click', async () => {
                    await cambiarEtapaCrm(lead.id, stageIndex + 1);
                });

                card.querySelector('[data-action="perder"]')?.addEventListener('click', async () => {
                    await cambiarEtapaCrm(lead.id, 4);
                });

                leadsContainer.appendChild(card);
            });
        }

        kanbanContainer.appendChild(col);
    });
}

async function cambiarEtapaCrm(userId, nuevaEtapa) {
    mostrarCarga(true);
    try {
        await updateDoc(doc(db, 'users', userId), { crmStage: nuevaEtapa });
        const userObj = listaUsuariosCache.find(u => u.id === userId);
        if (userObj) userObj.crmStage = nuevaEtapa;
        renderizarKanbanCrm();
        mostrarAlerta('Etapa de contacto actualizada.', 'exito');
    } catch (e) {
        console.error(e);
        mostrarAlerta('No se pudo actualizar el estado del lead.');
    } finally {
        mostrarCarga(false);
    }
}

function poblarSelectorCrm() {
    if (!crmContactSelect) return;
    crmContactSelect.innerHTML = '<option value="">Selecciona un estudiante...</option>';
    listaUsuariosCache.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name || 'Sin nombre'} (${u.email || ''})`;
        crmContactSelect.appendChild(opt);
    });
    renderizarNotasCrm();
}

crmContactSelect?.addEventListener('change', renderizarNotasCrm);

btnGuardarNotaCrm?.addEventListener('click', () => {
    const userId = crmContactSelect.value;
    const texto = crmNotaInput.value.trim();

    if (!userId) {
        mostrarAlerta('Selecciona un contacto primero.');
        return;
    }
    if (!texto) {
        mostrarAlerta('Escribe una nota.');
        return;
    }

    crmNotasCache.push({ userId, text: texto, date: new Date().toLocaleDateString('es-CO') });
    crmNotaInput.value = '';
    renderizarNotasCrm();
    mostrarAlerta('Nota guardada con éxito.', 'exito');
});

function renderizarNotasCrm() {
    if (!crmNotasList) return;
    const userId = crmContactSelect?.value;
    const notasFiltradas = crmNotasCache.filter(n => n.userId === userId);

    crmNotasList.innerHTML = '';
    if (notasFiltradas.length === 0) {
        crmNotasList.innerHTML = `<li style="color:var(--muted); font-size:13px;">Aún no hay notas registradas para este contacto.</li>`;
        return;
    }

    notasFiltradas.forEach(n => {
        const li = document.createElement('li');
        li.innerHTML = `<b>[${n.date}]:</b> ${escaparHTML(n.text)}`;
        crmNotasList.appendChild(li);
    });
}

// ==================================================
// 6. REPORTES DE VENTAS Y RENTABILIDAD
// ==================================================

async function inicializarReportes() {
    mostrarCarga(true);
    try {
        const snapCourses = await getDocs(collection(db, 'courses'));
        const snapEnroll = await getDocs(collection(db, 'enrollments'));
        const snapUsers = await getDocs(collection(db, 'users'));

        const cursos = snapCourses.docs.map(d => ({ id: d.id, ...d.data() }));
        const matriculas = snapEnroll.docs.map(d => d.data()).filter(m => m.status === 'active');
        const usuarios = snapUsers.docs.map(d => d.data());

        // Calcular métricas financieras reales
        let ventasTotales = 0;
        let costosTotales = 0;

        cursos.forEach(curso => {
            const inscritosCurso = matriculas.filter(m => m.courseId === curso.id).length;
            ventasTotales += inscritosCurso * (Number(curso.price) || 0);
            costosTotales += Number(curso.productionCost) || 0;
        });

        const totalInscritos = matriculas.length;
        const tasaConversion = usuarios.length > 0 ? Math.round((totalInscritos / usuarios.length) * 100) : 0;
        
        // Renderizar KPIs
        if (reportesKpis) {
            reportesKpis.innerHTML = `
                <div class="card" style="background:var(--wine); color:white;">
                    <small style="color:var(--rose); font-weight:600; text-transform:uppercase; font-size:11px;">Ventas Totales</small>
                    <b style="font-size:2rem; font-family:'Playfair Display',serif; display:block; margin-top:4px;">${dinero(ventasTotales)}</b>
                </div>
                <div class="card" style="background:var(--wine); color:white;">
                    <small style="color:var(--rose); font-weight:600; text-transform:uppercase; font-size:11px;">Inscripciones Activas</small>
                    <b style="font-size:2rem; font-family:'Playfair Display',serif; display:block; margin-top:4px;">${totalInscritos}</b>
                </div>
                <div class="card" style="background:var(--wine); color:white;">
                    <small style="color:var(--rose); font-weight:600; text-transform:uppercase; font-size:11px;">Tasa de Conversión</small>
                    <b style="font-size:2rem; font-family:'Playfair Display',serif; display:block; margin-top:4px;">${tasaConversion}%</b>
                </div>
            `;
        }

        // Renderizar Gráfico de Barras Ingresos vs Costos
        if (reportesChart) {
            reportesChart.innerHTML = '';
            const maxValor = Math.max(...cursos.map(c => Math.max(matriculas.filter(m => m.courseId === c.id).length * (c.price || 0), c.productionCost || 0)), 100000);

            cursos.forEach(curso => {
                const inscritos = matriculas.filter(m => m.courseId === curso.id).length;
                const ingresoCurso = inscritos * (Number(curso.price) || 0);
                const costoCurso = Number(curso.productionCost) || 0;

                const alturaIngreso = Math.max(Math.round((ingresoCurso / maxValor) * 100), 4);
                const alturaCosto = Math.max(Math.round((costoCurso / maxValor) * 100), 4);

                const grupo = document.createElement('div');
                grupo.className = 'bar-group';
                grupo.innerHTML = `
                    <div class="bar-wrapper">
                        <div class="bar-col" style="height: ${alturaIngreso}%;" title="Ingresos: ${dinero(ingresoCurso)}"></div>
                        <div class="bar-col cost" style="height: ${alturaCosto}%;" title="Costo: ${dinero(costoCurso)}"></div>
                    </div>
                    <span style="margin-top:8px; font-weight:600; color:var(--muted);">${escaparHTML(curso.title.split(' ')[0])}</span>
                `;
                reportesChart.appendChild(grupo);
            });
        }
    } catch (e) {
        console.error('Error al generar reportes:', e);
        mostrarAlerta('No se pudieron generar los reportes de ventas.');
    } finally {
        mostrarCarga(false);
    }
}

// ==================================================
// LISTENERS PRINCIPALES
// ==================================================

btnNuevoCurso?.addEventListener('click', () => abrirModalForm('curso'));
btnNuevoModulo?.addEventListener('click', () => { if (cursoSeleccionadoId) abrirModalForm('modulo'); });
btnNuevaLeccion?.addEventListener('click', () => { if (cursoSeleccionadoId && moduloSeleccionadoId) abrirModalForm('leccion'); });

btnVolverCursos?.addEventListener('click', () => {
    btnNuevoModulo.classList.add('hidden');
    btnNuevoCurso.classList.remove('hidden');
    mostrarVistaCursosSub('cursos');
});

btnVolverModulos?.addEventListener('click', () => {
    btnNuevaLeccion.classList.add('hidden');
    btnNuevoModulo.classList.remove('hidden');
    mostrarVistaCursosSub('modulos');
});

document.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.action === 'modulos') {
        btnNuevoCurso.classList.add('hidden');
        btnNuevoModulo.classList.remove('hidden');
    }
    if (e.target.dataset && e.target.dataset.action === 'lecciones') {
        btnNuevoModulo.classList.add('hidden');
        btnNuevaLeccion.classList.remove('hidden');
    }
});

// ==================================================
// VERIFICACIÓN DE SEGURIDAD
// ==================================================

onAuthStateChanged(auth, async usuario => {
    usuarioEsAdministrador = false;

    if (!usuario) {
        window.location.href = 'auth.html';
        return;
    }

    mostrarCarga(true);
    try {
        const documentoUsuario = await getDoc(doc(db, 'users', usuario.uid));

        if (!documentoUsuario.exists() || documentoUsuario.data().role !== 'admin') {
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center p-6 bg-cream">
                    <div class="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-red-200">
                        <h2 class="text-2xl font-bold text-wine-900 mb-4" style="font-family:'Playfair Display',serif;">Acceso denegado</h2>
                        <p class="text-sm text-gray-600 mb-6">Esta sección es exclusiva para administradores.</p>
                        <a href="index.html" class="inline-block w-full py-3 rounded-xl text-white font-bold text-sm" style="background:var(--wine);">
                            Volver al inicio
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        usuarioEsAdministrador = true;
        mostrarVistaCursosSub('cursos');

    } catch (error) {
        console.error('Error al verificar administrador:', error);
        mostrarAlerta('No se pudo verificar tu cuenta de administrador.');
    } finally {
        mostrarCarga(false);
    }
});