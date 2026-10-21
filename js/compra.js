
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

// URL de la aplicación web de Google Apps Script.
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwwNjIXMz90h57Lz_pfY-DraB_qC1idQQED9UI9lQQwUPEb-WSOvfHUS0K0BHjpIoEB/exec";
   
// Productos permitidos y precios.
const PRODUCTOS = {
  completo: {
    nombre: "Curso completo de automaquillaje",
    precio: 89000
  },
  piel: {
    nombre: "Módulo de Piel",
    precio: 17800
  },
  rostro: {
    nombre: "Módulo de Rostro",
    precio: 17800
  },
  ojos: {
    nombre: "Módulo de Ojos",
    precio: 17800
  },
  labios: {
    nombre: "Módulo de Labios",
    precio: 17800
  },
  ejercicios: {
    nombre: "Módulo de Ejercicios",
    precio: 17800
  }
};

let usuarioActual = null;
let metodoSeleccionado = "tarjeta";
let enviandoPago = false;

// Permite usar cambiarMetodo() desde los botones del HTML.
window.cambiarMetodo = function (metodo) {
  metodoSeleccionado = metodo;

  const metodos = {
    tarjeta: ["btnTabTarjeta", "seccionTarjeta"],
    pse: ["btnTabPse", "seccionPse"],
    nequi: ["btnTabNequi", "seccionNequi"]
  };

  Object.entries(metodos).forEach(([nombre, ids]) => {
    const boton = document.getElementById(ids[0]);
    const seccion = document.getElementById(ids[1]);

    if (!boton || !seccion) return;

    const seleccionado = nombre === metodo;

    boton.className = seleccionado
      ? "py-3 px-3 rounded-xl border-2 border-wine-500 bg-wine-50 text-wine-900 font-bold text-xs flex flex-col items-center gap-1 transition-all"
      : "py-3 px-3 rounded-xl border-2 border-gray-200 bg-white text-gray-600 font-bold text-xs flex flex-col items-center gap-1 transition-all";

    seccion.classList.toggle("hidden", !seleccionado);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const parametros = new URLSearchParams(window.location.search);
  const productoKey = parametros.get("producto") || parametros.get("id");
  const producto = PRODUCTOS[productoKey];

  const lblNombre = document.getElementById("lblNombreCurso");
  const lblPrecio = document.getElementById("lblPrecioTotal");
  const btnPagar = document.getElementById("btnPagar");
  const formulario = document.getElementById("formCheckout");

  if (lblNombre) {
    lblNombre.textContent = producto
      ? producto.nombre
      : "Producto no válido";
  }

  if (lblPrecio) {
    lblPrecio.textContent = producto
      ? `$${producto.precio.toLocaleString("es-CO")} COP`
      : "$0 COP";
  }

  function actualizarBoton() {
    if (!btnPagar) return;

    if (!producto) {
      btnPagar.disabled = true;
      btnPagar.textContent = "Producto no disponible";
    } else if (!usuarioActual || enviandoPago) {
      btnPagar.disabled = true;
      btnPagar.textContent = enviandoPago
        ? "Conectando con Mercado Pago..."
        : "Inicia sesión para continuar";
    } else {
      btnPagar.disabled = false;
      btnPagar.textContent =
        `Continuar al pago · $${producto.precio.toLocaleString("es-CO")} COP`;
    }
  }

  onAuthStateChanged(auth, (usuario) => {
    usuarioActual = usuario;
    actualizarBoton();
  });

  const inputTarjeta = document.getElementById("inputNumTarjeta");

  if (inputTarjeta) {
    inputTarjeta.addEventListener("input", (evento) => {
      const numeros = evento.target.value
        .replace(/\D/g, "")
        .slice(0, 19);

      evento.target.value = numeros
        .replace(/(.{4})/g, "$1 ")
        .trim();
    });
  }

  if (!formulario) {
    console.error("No se encontró el formulario #formCheckout.");
    return;
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (enviandoPago) return;

    if (!producto) {
      alert("El producto no es válido. Regresa al catálogo e inténtalo de nuevo.");
      return;
    }

    const nombre = document.getElementById("inputNombre")?.value.trim();
    const email = document.getElementById("inputEmail")?.value.trim();
    const telefono = document.getElementById("inputTelefono")?.value.trim();

    if (!nombre || !email || !telefono) {
      alert("Completa tu nombre, correo electrónico y teléfono.");
      return;
    }

    const usuario = auth.currentUser;

    if (!usuario) {
      alert("Debes iniciar sesión antes de realizar la compra.");
      return;
    }

    enviandoPago = true;
    actualizarBoton();

    try {
      const idToken = await usuario.getIdToken(true);

      // Enviar los parámetros que espera doPost() en Apps Script.
      const formularioPago = document.createElement("form");
      formularioPago.method = "POST";
      formularioPago.action = APPS_SCRIPT_URL;
      formularioPago.target = "_self";
      formularioPago.hidden = true;

      const datos = {
        action: "createPreference",
        producto: productoKey,
        idToken: idToken
      };

      Object.entries(datos).forEach(([nombreCampo, valor]) => {
        const campo = document.createElement("input");
        campo.type = "hidden";
        campo.name = nombreCampo;
        campo.value = valor;
        formularioPago.appendChild(campo);
      });

      document.body.appendChild(formularioPago);
      formularioPago.submit();

    } catch (error) {
      console.error("No se pudo iniciar el checkout:", error);

      enviandoPago = false;
      actualizarBoton();

      alert("No se pudo iniciar el pago. Inténtalo nuevamente.");
    }
  });

  actualizarBoton();
});
