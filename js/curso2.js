function toggleAcordeon(btn) {
    const item = btn.parentElement;
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.acordeon-item').forEach(el => el.classList.remove('active'));
    if (!wasActive) {
        item.classList.add('active');
    }
}

function realizarCompra() {
    alert('¡Redirigiendo a pasarela de pago segura para el módulo de Preparación de Piel!');
}

function suscribirNewsletter(event) {
    event.preventDefault();
    const nombre = document.getElementById('nombreInput').value;
    alert('¡Gracias ' + nombre + '! Te has suscripto exitosamente a nuestras novedades.');
    event.target.reset();
}