// URL de tu Apps Script publicada (terminada en /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx1Jjs_NJC7UuD9nUdBljjvISVtaV2fh0ofxh7ryjCfiUUkaTjtJpPAxzEs42fPxYzhOg/exec";

document.addEventListener("DOMContentLoaded", () => {
    // Leer los parámetros que vienen desde los botones de los módulos en la URL
    const params = new URLSearchParams(window.location.search);
    const cursoId = params.get('id') || 'modulo-general';
    const nombreCurso = params.get('curso') || 'Módulo de Automaquillaje';
    const precioCurso = Number(params.get('precio')) || 17800;

    // Renderizar los datos dinámicamente en el resumen de compra de la página
    const lblNombre = document.getElementById('lblNombreCurso');
    const lblPrecio = document.getElementById('lblPrecioTotal');

    if (lblNombre) lblNombre.textContent = decodeURIComponent(nombreCurso);
    if (lblPrecio) lblPrecio.textContent = `$${precioCurso.toLocaleString('es-CO')} COP`;

    // Manejar el evento submit del formulario para conectar con Apps Script
    const formCheckout = document.getElementById('formCheckout');
    if (formCheckout) {
        formCheckout.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('inputNombre').value;
            const email = document.getElementById('inputEmail').value;
            const telefono = document.getElementById('inputTelefono').value;
            const btnPagar = document.getElementById('btnPagar');

            if (!nombre || !email) {
                alert('Por favor completa tus datos personales.');
                return;
            }

            // Cambiar estado del botón para indicar carga
            if (btnPagar) {
                btnPagar.disabled = true;
                btnPagar.textContent = "Generando pago seguro...";
            }

            try {
                const respuesta = await fetch(APPS_SCRIPT_URL, {
                    method: "POST",
                    mode: "cors",
                    redirect: "follow", // Crucial para manejar el flujo de Apps Script sin bloqueos
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8" // Evita bloqueos de CORS con Apps Script
                    },
                    body: JSON.stringify({
                        action: "crearPago",
                        course: {
                            id: cursoId,
                            price: precioCurso,
                            title: nombreCurso
                        },
                        user: {
                            name: nombre,
                            email: email,
                            phone: telefono
                        }
                    })
                });

                const resultado = await respuesta.json();

                if (resultado.status === "success" && resultado.paymentUrl) {
                    // Redirigir al usuario al enlace de pago devuelto por la pasarela
                    window.location.href = resultado.paymentUrl;
                } else {
                    alert("Hubo un error al generar el pago: " + (resultado.message || "Intenta nuevamente."));
                    if (btnPagar) {
                        btnPagar.disabled = false;
                        btnPagar.textContent = "Proceder al Pago Seguro";
                    }
                }
            } catch (error) {
                console.error("Error al conectar con la pasarela:", error);
                alert("No se pudo iniciar el pago. Revisa la consola.");
                if (btnPagar) {
                    btnPagar.disabled = false;
                    btnPagar.textContent = "Proceder al Pago Seguro";
                }
            }
        });
    }
});