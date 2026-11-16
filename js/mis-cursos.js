import { db, auth } from './firebase-config.js';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    where
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    sendEmailVerification,
    updatePassword,
    updateProfile
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

function mostrarToast(mensaje) {
    const toast = elemento('toast');
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add('on');
    clearTimeout(mostrarToast._timer);
    mostrarToast._timer = setTimeout(() => toast.classList.remove('on'), 2800);
}

function porcentaje(completadas, total) {
    return total > 0
        ? Math.round((completadas / total) * 100)
        : 0;
}

// Anima un número desde 0 hasta su valor final
function animarNumero(el, hasta, formato) {
    if (!el) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducir || hasta === 0) {
        el.textContent = formato(hasta);
        return;
    }
    const duracion = 900;
    const inicio = performance.now();
    function paso(ahora) {
        const t = Math.min((ahora - inicio) / duracion, 1);
        const suave = 1 - Math.pow(1 - t, 3);
        el.textContent = formato(Math.round(hasta * suave));
        if (t < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
}

function actualizarResumen(cursos, completadas, total) {
    animarNumero(elemento('total-cursos'), cursos, n => String(n));
    animarNumero(elemento('total-lecciones'), completadas, n => `${n} / ${total}`);
    animarNumero(elemento('avance-general'), porcentaje(completadas, total), n => `${n}%`);
}

// Saludo según la hora del día
function saludoSegunHora() {
    const hora = new Date().getHours();
    if (hora < 12) return '¡Buenos días! Hoy es un gran día para practicar';
    if (hora < 19) return '¡Buenas tardes! Sigue avanzando con tu curso';
    return '¡Buenas noches! Un módulo más antes de descansar';
}

const saludo = elemento('greeting-text');
if (saludo) saludo.textContent = saludoSegunHora();

// Animaciones al dibujar los cursos: barras de progreso y aparición al hacer scroll
function animarContenido() {
    if (!contenedor) return;

    contenedor.querySelectorAll('.bar span').forEach(barra => {
        const destino = barra.style.width;
        barra.style.width = '0%';
        setTimeout(() => { barra.style.width = destino; }, 120);
    });

    const items = contenedor.querySelectorAll('.course, .mod');
    if (!('IntersectionObserver' in window)) return;

    const observador = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('in');
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12 });

    items.forEach((item, i) => {
        item.classList.add('reveal');
        item.style.transitionDelay = `${(i % 4) * 70}ms`;
        observador.observe(item);
    });
}

// Buscador de módulos
function inicializarBuscador() {
    const fila = elemento('tools-row');
    const input = elemento('mod-search');
    const sinResultados = elemento('no-results');
    if (!fila || !input) return;

    fila.classList.add('on');

    input.addEventListener('input', () => {
        const texto = input.value.trim().toLowerCase();
        let visibles = 0;

        contenedor.querySelectorAll('.mod').forEach(mod => {
            const coincide = !texto || mod.textContent.toLowerCase().includes(texto);
            mod.classList.toggle('filtered-out', !coincide);
            if (coincide) visibles++;
        });

        sinResultados?.classList.toggle('on', texto !== '' && visibles === 0);
    });
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
        <article class="mod">
            <div>
                <div class="mod-top">
                    <span class="mod-num">Módulo ${String(modulo.order || 0).padStart(2, '0')}</span>
                    ${
                        total > 0 && completadas === total
                            ? `<span class="done-badge"><i class="fa-solid fa-circle-check"></i> Completado</span>`
                            : `<span class="mod-count">${completadas} / ${total} lecciones (${avance}%)</span>`
                    }
                </div>

                <h4>${escaparHTML(modulo.title || 'Módulo sin título')}</h4>

                <p>${escaparHTML(modulo.description || 'Continúa aprendiendo en este módulo.')}</p>

                <div class="bar" role="progressbar" aria-valuenow="${avance}" aria-valuemin="0" aria-valuemax="100">
                    <span style="width: ${avance}%"></span>
                </div>
            </div>

            <div>
                ${
                    enlace
                        ? `<a href="${escaparHTML(enlace)}" class="pill small block">
                            <i class="fa-solid fa-play"></i>
                            ${completadas > 0 ? 'Continuar módulo' : 'Ver lecciones'}
                        </a>`
                        : `<p class="note">Este módulo todavía no tiene lecciones publicadas.</p>`
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
        <article class="course">
            <div class="course-top">
                <div class="course-cover">
                    ${
                        imagenValida
                            ? `<img src="${escaparHTML(portada)}" alt="${escaparHTML(curso.title)}">`
                            : `<i class="fa-solid fa-book-open"></i>`
                    }
                </div>

                <div>
                    <span class="tag">Curso inscrito</span>

                    <h2>${escaparHTML(curso.title || 'Curso sin título')}</h2>

                    <p class="course-desc">${escaparHTML(curso.description || 'Continúa tu aprendizaje a tu propio ritmo.')}</p>

                    <div class="progress-row">
                        <span>Progreso del curso</span>
                        <b>${completadas} de ${total} lecciones (${avance}%)</b>
                    </div>

                    <div class="bar" role="progressbar" aria-valuenow="${avance}" aria-valuemin="0" aria-valuemax="100">
                        <span style="width: ${avance}%"></span>
                    </div>
                </div>
            </div>

            <div>
                <h3 class="modules-title">
                    <i class="fa-solid fa-layer-group"></i>
                    Módulos del curso
                </h3>

                ${
                    curso.modulos.length
                        ? `<div class="mod-grid">
                            ${curso.modulos.map(modulo =>
                                dibujarModulo(curso.id, modulo)
                            ).join('')}
                           </div>`
                        : `<p class="empty-note">Este curso todavía no tiene módulos publicados.</p>`
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
            animarContenido();
            inicializarBuscador();
        }

    } catch (error) {
        console.error('Error crítico al cargar Mis cursos:', error);

        if (contenedor) {
            contenedor.innerHTML = `
                <div class="load-error">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <h3>No pudimos cargar tus cursos</h3>
                    <p>
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
// PERSONALIZACIÓN DE PERFIL Y SEGURIDAD DEL USUARIO
// --------------------------------------------------

let usuarioActual = null;
let fotoPendienteDataUrl = '';

function renderizarAvatar(contenedorEl, fotoUrl, nombre) {
    if (!contenedorEl) return;
    const inicial = (nombre || 'E').trim().charAt(0).toUpperCase();

    if (fotoUrl && (/^https?:\/\//i.test(fotoUrl) || /^data:image\//i.test(fotoUrl))) {
        contenedorEl.innerHTML = `<img src="${escaparHTML(fotoUrl)}" alt="Foto de ${escaparHTML(nombre || 'perfil')}">`;
    } else {
        contenedorEl.textContent = inicial;
    }
}

function actualizarEstadoCorreoUI(usuario) {
    const badge = elemento('email-verified-badge');
    const btnVerificar = elemento('send-verify-email-btn');
    if (!badge || !btnVerificar) return;

    if (usuario.emailVerified) {
        badge.className = 'badge-status ok';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verificado';
        btnVerificar.textContent = 'Correo verificado';
        btnVerificar.disabled = true;
    } else {
        badge.className = 'badge-status pending';
        badge.innerHTML = '<i class="fa-solid fa-clock"></i> Pendiente de verificar';
        btnVerificar.textContent = 'Enviar correo de verificación';
        btnVerificar.disabled = false;
    }
}

async function sincronizarUIUsuario(usuario) {
    let nombre = usuario.displayName || '';
    let foto = usuario.photoURL || '';

    // Si hay datos extra guardados en Firestore (users/{uid}), los leemos
    try {
        const snap = await getDoc(doc(db, 'users', usuario.uid));
        if (snap.exists()) {
            const data = snap.data();
            if (!nombre && data.name) nombre = data.name;
            if (data.photoBase64) foto = data.photoBase64;
            else if (!foto && data.photoURL) foto = data.photoURL;
        }
    } catch (e) {
        console.warn('No se pudo leer perfil extendido en Firestore:', e);
    }

    const primerNombre = nombre ? nombre.split(' ')[0] : '';

    const headerName = elemento('header-user-name');
    const welcomeName = elemento('welcome-name');
    if (headerName) headerName.textContent = primerNombre || 'Mi Perfil';
    if (welcomeName) welcomeName.textContent = primerNombre ? `de ${primerNombre}` : 'inscritos';

    renderizarAvatar(elemento('header-avatar'), foto, nombre || usuario.email);
    renderizarAvatar(elemento('modal-avatar-preview'), foto, nombre || usuario.email);

    const inputNombre = elemento('profile-name-input');
    const inputFotoUrl = elemento('profile-photo-url');
    const inputEmail = elemento('profile-email-input');

    if (inputNombre) inputNombre.value = nombre;
    if (inputFotoUrl) inputFotoUrl.value = /^https?:\/\//i.test(foto) ? foto : '';
    if (inputEmail) inputEmail.value = usuario.email || '';

    actualizarEstadoCorreoUI(usuario);
}

// Redimensiona imagen local a avatar ligero (240x240 JPEG)
function procesarImagenLocal(archivo) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => {
            const img = new Image();
            img.onload = () => {
                const size = 240;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                const lado = Math.min(img.width, img.height);
                const sx = (img.width - lado) / 2;
                const sy = (img.height - lado) / 2;

                ctx.drawImage(img, sx, sy, lado, lado, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = reject;
            img.src = lector.result;
        };
        lector.onerror = reject;
        lector.readAsDataURL(archivo);
    });
}

function abrirModalPerfil() {
    if (!usuarioActual) {
        mostrarToast('Inicia sesión para personalizar tu perfil');
        return;
    }
    fotoPendienteDataUrl = '';
    elemento('profile-modal')?.classList.remove('hidden');
}

function cerrarModalPerfil() {
    elemento('profile-modal')?.classList.add('hidden');
}

function inicializarEventosPerfil() {
    const modal = elemento('profile-modal');

    elemento('open-profile-btn')?.addEventListener('click', abrirModalPerfil);
    elemento('hero-profile-btn')?.addEventListener('click', abrirModalPerfil);
    elemento('mobile-profile-btn')?.addEventListener('click', () => {
        elemento('mobile-menu')?.classList.add('hidden');
        abrirModalPerfil();
    });
    elemento('close-profile-btn')?.addEventListener('click', cerrarModalPerfil);

    modal?.addEventListener('click', e => {
        if (e.target === modal) cerrarModalPerfil();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            cerrarModalPerfil();
        }
    });

    // Subir archivo de foto
    const fileInput = elemento('avatar-file-input');
    elemento('pick-avatar-btn')?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async e => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        try {
            fotoPendienteDataUrl = await procesarImagenLocal(archivo);
            const nombreActual = elemento('profile-name-input')?.value || usuarioActual?.displayName;
            renderizarAvatar(elemento('modal-avatar-preview'), fotoPendienteDataUrl, nombreActual);
            if (elemento('profile-photo-url')) elemento('profile-photo-url').value = '';
            mostrarToast('Vista previa lista. Haz clic en Guardar.');
        } catch (err) {
            console.error(err);
            mostrarToast('No se pudo procesar la imagen');
        }
    });

    // Vista previa al pegar una URL de foto
    elemento('profile-photo-url')?.addEventListener('input', e => {
        const url = e.target.value.trim();
        if (/^https?:\/\//i.test(url)) {
            fotoPendienteDataUrl = '';
            const nombreActual = elemento('profile-name-input')?.value || usuarioActual?.displayName;
            renderizarAvatar(elemento('modal-avatar-preview'), url, nombreActual);
        }
    });

    // Guardar nombre y foto
    elemento('profile-identity-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!usuarioActual) return;

        const btn = elemento('save-identity-btn');
        const nuevoNombre = elemento('profile-name-input')?.value.trim() || '';
        const urlEscrita = elemento('profile-photo-url')?.value.trim() || '';

        if (!nuevoNombre) {
            mostrarToast('Por favor escribe tu nombre');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

        try {
            const datosAuth = { displayName: nuevoNombre };
            if (urlEscrita) {
                datosAuth.photoURL = urlEscrita;
            }

            await updateProfile(usuarioActual, datosAuth);

            const datosFirestore = {
                name: nuevoNombre,
                email: usuarioActual.email,
                updatedAt: new Date().toISOString()
            };

            if (fotoPendienteDataUrl) {
                datosFirestore.photoBase64 = fotoPendienteDataUrl;
                datosFirestore.photoURL = '';
            } else if (urlEscrita) {
                datosFirestore.photoURL = urlEscrita;
                datosFirestore.photoBase64 = '';
            }

            await setDoc(doc(db, 'users', usuarioActual.uid), datosFirestore, { merge: true });

            fotoPendienteDataUrl = '';
            await sincronizarUIUsuario(usuarioActual);
            mostrarToast('¡Perfil actualizado correctamente!');
        } catch (error) {
            console.error('Error al actualizar perfil:', error);
            mostrarToast('No se pudieron guardar los cambios: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar nombre y foto';
        }
    });

    // Enviar verificación de correo
    elemento('send-verify-email-btn')?.addEventListener('click', async () => {
        if (!usuarioActual) return;
        const btn = elemento('send-verify-email-btn');
        btn.disabled = true;

        try {
            await usuarioActual.reload();
            if (usuarioActual.emailVerified) {
                actualizarEstadoCorreoUI(usuarioActual);
                mostrarToast('¡Tu correo ya está verificado!');
                return;
            }

            await sendEmailVerification(usuarioActual);
            mostrarToast('Te enviamos un enlace de verificación a tu correo');
        } catch (error) {
            console.error('Error al enviar verificación:', error);
            if (error.code === 'auth/too-many-requests') {
                mostrarToast('Ya enviamos un correo hace poco. Revisa tu bandeja o spam.');
            } else {
                mostrarToast('No se pudo enviar el correo: ' + error.message);
            }
        } finally {
            if (!usuarioActual.emailVerified) btn.disabled = false;
        }
    });

    // Cambiar contraseña
    elemento('profile-password-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!usuarioActual || !usuarioActual.email) return;

        const actual = elemento('current-password-input')?.value || '';
        const nueva = elemento('new-password-input')?.value || '';
        const btn = elemento('save-password-btn');

        if (nueva.length < 6) {
            mostrarToast('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Actualizando...';

        try {
            const credencial = EmailAuthProvider.credential(usuarioActual.email, actual);
            await reauthenticateWithCredential(usuarioActual, credencial);
            await updatePassword(usuarioActual, nueva);

            elemento('profile-password-form').reset();
            mostrarToast('¡Contraseña actualizada con éxito!');
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                mostrarToast('La contraseña actual es incorrecta');
            } else {
                mostrarToast('Error al cambiar contraseña: ' + error.message);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-key"></i> Actualizar contraseña';
        }
    });
}

inicializarEventosPerfil();

// --------------------------------------------------
// INICIAR LA PÁGINA
// --------------------------------------------------

onAuthStateChanged(auth, usuario => {
    usuarioActual = usuario;

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

    sincronizarUIUsuario(usuario);
    cargarMisCursos(usuario);
});