import { db, auth } from './firebase-config.js';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

import {
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

// --------------------------------------------------
// DATOS DE LA PÁGINA
// --------------------------------------------------

const parametros = new URLSearchParams(window.location.search);

const courseId = parametros.get('courseId');
const moduleId = parametros.get('moduleId');

let lessonId = parametros.get('lessonId');

let usuarioActual = null;
let cursoActual = null;
let moduloActual = null;
let lecciones = [];
let leccionActual = null;
let leccionesCompletadas = new Set();
let cargando = false;

const elemento = id => document.getElementById(id);

// --------------------------------------------------
// MENSAJES
// --------------------------------------------------

function mostrarEstado(mensaje) {
    const estado = elemento('estadoLeccion');

    if (estado) {
        estado.textContent = mensaje;
    }
}

function mostrarError(mensaje, error) {
    console.error(mensaje, error);
    console.error('DETALLE DEL ERROR:', error);

    if (error?.code === 'permission-denied') {
        mostrarEstado(
            'No tienes permiso para acceder a este contenido. ' +
            'Comprueba tu inscripción al curso y los permisos de Firebase.'
        );
        return;
    }

    if (error?.code === 'unavailable') {
        mostrarEstado(
            'No se pudo conectar con Firebase. Comprueba tu conexión a internet e inténtalo de nuevo.'
        );
        return;
    }

    mostrarEstado(
        'No pudimos cargar el contenido. Recarga la página y vuelve a intentarlo.'
    );
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

function obtenerNumero(valor) {
    return Number(valor) || 0;
}

function obtenerProgresoId(leccionId) {
    if (!usuarioActual) {
        return '';
    }

    return [
        usuarioActual.uid,
        courseId,
        moduleId,
        leccionId
    ].join('_');
}

// --------------------------------------------------
// VIDEO
// --------------------------------------------------

function obtenerVideoYouTube(url) {
    try {
        const direccion = new URL(url);
        let id = '';

        if (direccion.hostname === 'youtu.be') {
            id = direccion.pathname.slice(1);
        } else if (
            direccion.hostname === 'youtube.com' ||
            direccion.hostname.endsWith('.youtube.com')
        ) {
            if (direccion.pathname === '/watch') {
                id = direccion.searchParams.get('v') || '';
            } else if (
                direccion.pathname.startsWith('/embed/') ||
                direccion.pathname.startsWith('/shorts/')
            ) {
                id = direccion.pathname.split('/')[2] || '';
            }
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
            return null;
        }

        return `https://www.youtube-nocookie.com/embed/${id}`;
    } catch {
        return null;
    }
}

function mostrarVideo(url) {
    const contenedor = elemento('contenedorVideo');

    if (!contenedor) {
        return;
    }

    contenedor.replaceChildren();

    if (!url) {
        contenedor.innerHTML = `
            <div class="video-empty">
                <i class="fa-solid fa-video-slash"></i>
                <p class="t">Video próximamente</p>
                <p>
                    Esta lección todavía no tiene un video disponible.
                    Puedes continuar leyendo su contenido.
                </p>
            </div>
        `;
        return;
    }

    const videoYouTube = obtenerVideoYouTube(url);

    if (videoYouTube) {
        const iframe = document.createElement('iframe');

        iframe.src = videoYouTube;
        iframe.title = leccionActual?.title || 'Video de la lección';
        iframe.allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';

        contenedor.appendChild(iframe);
        return;
    }

    try {
        const direccion = new URL(url);

        if (
            direccion.protocol !== 'https:' &&
            direccion.protocol !== 'http:'
        ) {
            throw new Error('Dirección no válida');
        }

        const video = document.createElement('video');

        video.src = direccion.href;
        video.controls = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', 'Video de la lección');

        contenedor.appendChild(video);
    } catch {
        const aviso = document.createElement('p');
        aviso.textContent =
            'El enlace del video no es válido. Revisa la dirección en Firebase.';
        contenedor.appendChild(aviso);
    }
}

// --------------------------------------------------
// MATERIAL DESCARGABLE
// --------------------------------------------------

function mostrarMaterial(url) {
    const seccion = elemento('seccionMaterial');
    const enlace = elemento('enlaceMaterial');

    if (!seccion || !enlace) {
        return;
    }

    seccion.classList.add('hidden');
    enlace.removeAttribute('href');

    if (!url) {
        return;
    }

    try {
        const direccion = new URL(url);

        if (
            direccion.protocol !== 'https:' &&
            direccion.protocol !== 'http:'
        ) {
            return;
        }

        enlace.href = direccion.href;
        enlace.target = '_blank';
        enlace.rel = 'noopener noreferrer';

        seccion.classList.remove('hidden');
    } catch {
        console.warn('La dirección del material no es válida.');
    }
}

// --------------------------------------------------
// PROGRESO DEL ESTUDIANTE
// --------------------------------------------------

async function cargarProgreso() {
    leccionesCompletadas.clear();

    if (!usuarioActual || lecciones.length === 0) {
        return;
    }

    // Consultamos únicamente los registros del estudiante actual.
    // Esto evita intentar leer individualmente documentos de progreso
    // que todavía no existen.
    const consultaProgreso = query(
        collection(db, 'progress'),
        where('userId', '==', usuarioActual.uid),
        where('courseId', '==', courseId)
    );

    const resultado = await getDocs(consultaProgreso);

    const idsEsperados = new Set(
        lecciones.map(leccion => obtenerProgresoId(leccion.id))
    );

    resultado.forEach(documento => {
        if (idsEsperados.has(documento.id)) {
            leccionesCompletadas.add(documento.data().lessonId);
        }
    });
}

// --------------------------------------------------
// LISTA LATERAL DE LECCIONES
// --------------------------------------------------

function dibujarListaLecciones() {
    const lista = elemento('listaLecciones');

    if (!lista || !leccionActual) {
        return;
    }

    lista.innerHTML = '';

    let completadas = 0;

    lecciones.forEach((leccion, indice) => {
        const completada = leccionesCompletadas.has(leccion.id);

        if (completada) {
            completadas++;
        }

        const boton = document.createElement('button');

        boton.type = 'button';

        const seleccionada = leccion.id === leccionActual.id;

        boton.className = 'lesson-item' + (seleccionada ? ' active' : '');

        if (seleccionada) {
            boton.setAttribute('aria-current', 'true');
        }

        const icono = completada
            ? '<i class="fa-solid fa-circle-check"></i>'
            : '<i class="fa-regular fa-circle"></i>';

        boton.innerHTML = `
            <span class="ico${completada ? ' done' : ''}">${icono}</span>
            <span class="txt">
                <small>Lección ${indice + 1}</small>
                <b>${escaparHTML(leccion.title || `Lección ${indice + 1}`)}</b>
            </span>
        `;

        boton.addEventListener('click', () => {
            abrirLeccion(leccion.id);
        });

        lista.appendChild(boton);
    });

    const porcentaje = lecciones.length
        ? Math.round((completadas / lecciones.length) * 100)
        : 0;

    const textoPorcentaje = elemento('porcentajeProgreso');
    const barra = elemento('barraProgreso');

    if (textoPorcentaje) {
        textoPorcentaje.textContent = `${porcentaje}%`;
    }

    if (barra) {
        barra.style.width = `${porcentaje}%`;
    }
}

// --------------------------------------------------
// NAVEGACIÓN ENTRE LECCIONES
// --------------------------------------------------

function actualizarNavegacion() {
    if (!leccionActual) {
        return;
    }

    const botonAnterior = elemento('btnAnterior');
    const botonSiguiente = elemento('btnSiguiente');

    const textoAnterior = elemento('textoAnterior');
    const textoSiguiente = elemento('textoSiguiente');

    if (
        !botonAnterior ||
        !botonSiguiente ||
        !textoAnterior ||
        !textoSiguiente
    ) {
        return;
    }

    const indice = lecciones.findIndex(
        leccion => leccion.id === leccionActual.id
    );

    const anterior = indice > 0 ? lecciones[indice - 1] : null;

    const siguiente =
        indice >= 0 && indice < lecciones.length - 1
            ? lecciones[indice + 1]
            : null;

    botonAnterior.disabled = !anterior;
    botonSiguiente.disabled = !siguiente;

    textoAnterior.textContent =
        anterior?.title || 'Primera lección';

    textoSiguiente.textContent =
        siguiente?.title || 'Última lección';

    botonAnterior.onclick = () => {
        if (anterior) {
            abrirLeccion(anterior.id);
        }
    };

    botonSiguiente.onclick = () => {
        if (siguiente) {
            abrirLeccion(siguiente.id);
        }
    };
}

// --------------------------------------------------
// MOSTRAR LA LECCIÓN SELECCIONADA
// --------------------------------------------------

function mostrarLeccion() {
    if (!leccionActual || !cursoActual || !moduloActual) {
        return;
    }

    elemento('tituloLeccion').textContent =
        leccionActual.title || 'Lección sin título';

    elemento('nombreCurso').textContent =
        cursoActual.title || 'Curso';

    elemento('nombreModulo').textContent =
        moduloActual.title || 'Módulo';

    elemento('contenidoLeccion').textContent =
        leccionActual.content ||
        'El contenido de esta lección todavía no está disponible.';

    mostrarVideo(leccionActual.videoUrl || '');
    mostrarMaterial(leccionActual.materialUrl || '');

    const boton = elemento('btnCompletar');
    const completada = leccionesCompletadas.has(leccionActual.id);

    boton.disabled = !usuarioActual || completada;
    boton.classList.toggle('done', completada);

    boton.innerHTML = completada
        ? '<i class="fa-solid fa-circle-check"></i> Lección completada'
        : '<i class="fa-solid fa-check"></i> Marcar como completada';

    elemento('estadoProgreso').textContent = !usuarioActual
        ? 'Inicia sesión para guardar tu progreso.'
        : completada
            ? 'Tu progreso está guardado.'
            : '';

    actualizarNavegacion();
    dibujarListaLecciones();

    // Actualiza la URL sin recargar la página.
    const nuevaURL = new URL(window.location.href);

    nuevaURL.searchParams.set('courseId', courseId);
    nuevaURL.searchParams.set('moduleId', moduleId);
    nuevaURL.searchParams.set('lessonId', leccionActual.id);

    window.history.replaceState({}, '', nuevaURL);
}

// --------------------------------------------------
// ABRIR UNA LECCIÓN
// --------------------------------------------------

function abrirLeccion(id) {
    const encontrada = lecciones.find(leccion => leccion.id === id);

    if (!encontrada) {
        return;
    }

    leccionActual = encontrada;
    lessonId = encontrada.id;

    mostrarLeccion();

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// --------------------------------------------------
// MARCAR UNA LECCIÓN COMO COMPLETADA
// --------------------------------------------------

async function marcarCompletada() {
    if (!usuarioActual || !leccionActual) {
        elemento('estadoProgreso').textContent =
            'Debes iniciar sesión para guardar tu progreso.';
        return;
    }

    const boton = elemento('btnCompletar');
    const estado = elemento('estadoProgreso');

    boton.disabled = true;
    estado.textContent = 'Guardando tu progreso...';

    try {
        const progresoId = obtenerProgresoId(leccionActual.id);

        await setDoc(
            doc(db, 'progress', progresoId),
            {
                userId: usuarioActual.uid,
                courseId: courseId,
                moduleId: moduleId,
                lessonId: leccionActual.id,
                completedAt: serverTimestamp()
            },
            { merge: true }
        );

        leccionesCompletadas.add(leccionActual.id);

        mostrarLeccion();

        estado.textContent =
            '¡Muy bien! Tu progreso se guardó correctamente.';

    } catch (error) {
        mostrarError('Error al guardar el progreso:', error);

        estado.textContent =
            error?.code === 'permission-denied'
                ? 'No se pudo guardar el progreso. Comprueba la matrícula y los permisos de Firebase.'
                : 'No se pudo guardar tu progreso. Inténtalo de nuevo.';

        boton.disabled = false;
    }
}

// --------------------------------------------------
// CARGAR CURSO, MÓDULO Y LECCIONES
// --------------------------------------------------

async function iniciarPantalla() {
    if (cargando) {
        return;
    }

    if (!courseId || !moduleId) {
        mostrarEstado(
            'Faltan los datos del curso o del módulo en el enlace.'
        );

        elemento('tituloLeccion').textContent =
            'No se pudo abrir la lección';

        console.warn(
            'La URL debe incluir courseId y moduleId.',
            window.location.href
        );

        return;
    }

    cargando = true;
    mostrarEstado('Cargando curso y lecciones...');

    try {
        const referenciaCurso = doc(
            db,
            'courses',
            courseId
        );

        const referenciaModulo = doc(
            db,
            'courses',
            courseId,
            'modules',
            moduleId
        );

        const [resultadoCurso, resultadoModulo] = await Promise.all([
            getDoc(referenciaCurso),
            getDoc(referenciaModulo)
        ]);

        console.log('Curso encontrado:', resultadoCurso.exists());
        console.log('Módulo encontrado:', resultadoModulo.exists());

        if (!resultadoCurso.exists()) {
            mostrarEstado(
                'No encontramos este curso. Revisa el identificador del enlace.'
            );
            return;
        }

        if (!resultadoModulo.exists()) {
            mostrarEstado(
                'No encontramos este módulo dentro del curso seleccionado.'
            );
            return;
        }

        cursoActual = {
            id: resultadoCurso.id,
            ...resultadoCurso.data()
        };

        moduloActual = {
            id: resultadoModulo.id,
            ...resultadoModulo.data()
        };

        if (
            cursoActual.published !== true ||
            moduloActual.published !== true
        ) {
            mostrarEstado(
                'Este curso o módulo no está publicado.'
            );
            return;
        }

        const referenciaLecciones = collection(
            db,
            'courses',
            courseId,
            'modules',
            moduleId,
            'lessons'
        );

        const consultaLecciones = query(
            referenciaLecciones,
            where('published', '==', true)
        );

        const resultadoLecciones = await getDocs(consultaLecciones);

        lecciones = resultadoLecciones.docs
            .map(documento => ({
                id: documento.id,
                ...documento.data()
            }))
            .sort(
                (a, b) =>
                    obtenerNumero(a.order) - obtenerNumero(b.order)
            );

        console.log(
            'Lecciones publicadas encontradas:',
            lecciones.length
        );

        if (lecciones.length === 0) {
            mostrarEstado(
                'Este módulo todavía no tiene lecciones publicadas.'
            );

            elemento('tituloLeccion').textContent =
                moduloActual.title || 'Módulo sin título';

            return;
        }

        if (
            !lessonId ||
            !lecciones.some(leccion => leccion.id === lessonId)
        ) {
            lessonId = lecciones[0].id;
        }

        leccionActual = lecciones.find(
            leccion => leccion.id === lessonId
        );

        // Solo consultamos el progreso cuando existe una sesión iniciada.
        if (usuarioActual) {
            await cargarProgreso();
        } else {
            leccionesCompletadas.clear();
        }

        mostrarLeccion();
        mostrarEstado('');

    } catch (error) {
        mostrarError(
            'Error al cargar la pantalla de lección:',
            error
        );
    } finally {
        cargando = false;
    }
}

// --------------------------------------------------
// INICIALIZACIÓN
// --------------------------------------------------

elemento('btnCompletar').addEventListener(
    'click',
    marcarCompletada
);

onAuthStateChanged(auth, async usuario => {
    usuarioActual = usuario;
    await iniciarPantalla();
});