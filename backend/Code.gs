
/**
 * MAKE IT YOURSELF
 * Backend de pagos: Google Apps Script + Mercado Pago + Firestore.
 *
 * Propiedades del script:
 * PASARELA_TOKEN
 * FIREBASE_PROJECT_ID
 * FIREBASE_WEB_API_KEY
 */

const CONFIG = {
  SITE_URL: "https://chelseamichelle67.github.io/Lms-Makeityourself/",
  COURSE_ID: "SS777MOfOK3VVX17JLKn",
  CURRENCY: "COP",

  PRODUCTS: {
    completo: {
      name: "Curso completo de automaquillaje",
      price: 89000,
      type: "full_course",
      moduleId: ""
    },
    piel: {
      name: "Módulo de Piel",
      price: 17800,
      type: "module",
      moduleId: "modulo-1"
    },
    rostro: {
      name: "Módulo de Rostro",
      price: 17800,
      type: "module",
      moduleId: "modulo-2"
    },
    ojos: {
      name: "Módulo de Ojos",
      price: 17800,
      type: "module",
      moduleId: "modulo-3"
    },
    labios: {
      name: "Módulo de Labios",
      price: 17800,
      type: "module",
      moduleId: "modulo-4"
    },
    ejercicios: {
      name: "Módulo de Ejercicios",
      price: 17800,
      type: "module",
      moduleId: "modulo-5"
    }
  }
};

/**
 * GET: comprobación del backend.
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      backend: "Make It Yourself",
      message: "Backend disponible"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST: inicia una compra.
 * El webhook se implementará y verificará en el paso 5.
 */
function doPost(e) {
  const params = (e && e.parameter) || {};

  if (params.action !== "createPreference") {
    return HtmlService.createHtmlOutput(
      "<h2>Solicitud no reconocida</h2>" +
      "<p>La solicitud no corresponde a la creación de un pago.</p>"
    );
  }

  try {
    return crearPago(params);
  } catch (error) {
    console.error(
      error && error.stack ? error.stack : String(error)
    );

    return mostrarMensaje(
      "No se pudo iniciar el pago",
      "Comprueba tu sesión e inténtalo de nuevo. " +
      "Si el problema continúa, revisaremos los registros del backend."
    );
  }
}

/**
 * Crea una compra pendiente y devuelve Checkout Pro.
 */
function crearPago(params) {
  const productKey = String(params.producto || "");
  const idToken = String(params.idToken || "");

  if (!idToken) {
    return mostrarMensaje(
      "Inicia sesión",
      "Debes iniciar sesión antes de comprar."
    );
  }

  const product = CONFIG.PRODUCTS[productKey];

  if (!product) {
    return mostrarMensaje(
      "Producto no válido",
      "Regresa al catálogo y selecciona un producto válido."
    );
  }

  // Obtener el UID desde Firebase, nunca del navegador.
  const user = verificarUsuarioFirebase(idToken);

  const purchaseId = Utilities.getUuid();
  const now = new Date().toISOString();

  const purchase = {
    purchaseId: purchaseId,
    userId: user.uid,
    email: user.email,
    productKey: productKey,
    productName: product.name,
    purchaseType: product.type,
    courseId: CONFIG.COURSE_ID,
    moduleId: product.moduleId,
    amount: product.price,
    currency: CONFIG.CURRENCY,
    status: "pending",
    createdAt: now
  };

  // Registrar primero la compra pendiente.
  crearDocumentoFirestore(
    "pendingPurchases",
    purchaseId,
    purchase
  );

  const preference = {
    items: [{
      id: productKey,
      title: product.name,
      quantity: 1,
      currency_id: CONFIG.CURRENCY,
      unit_price: product.price
    }],

    external_reference: purchaseId,

    back_urls: {
      success: CONFIG.SITE_URL +
        "comprar.html?resultado=exito&producto=" +
        encodeURIComponent(productKey),

      pending: CONFIG.SITE_URL +
        "comprar.html?resultado=pendiente&producto=" +
        encodeURIComponent(productKey),

      failure: CONFIG.SITE_URL +
        "comprar.html?resultado=fallido&producto=" +
        encodeURIComponent(productKey)
    },

    auto_return: "approved"
  };

  const token = propiedadObligatoria("PASARELA_TOKEN");

  const response = UrlFetchApp.fetch(
    "https://api.mercadopago.com/checkout/preferences",
    {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + token
      },
      payload: JSON.stringify(preference),
      muteHttpExceptions: true
    }
  );

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    // No registrar el token ni mostrar credenciales al usuario.
    console.error(
      "Error al crear preferencia. HTTP " + status +
      ". Respuesta: " + body.substring(0, 1000)
    );

    throw new Error(
      "Mercado Pago no pudo crear la preferencia."
    );
  }

  const result = JSON.parse(body);

  // Durante este paso exigimos el enlace de pruebas.
// Usar el enlace de prueba durante las pruebas.
const checkoutUrl = result.sandbox_init_point;

if (!checkoutUrl) {
  console.error(
    "Mercado Pago no devolvió sandbox_init_point. " +
    "ID de preferencia: " + (result.id || "no disponible")
  );

  throw new Error(
    "No se recibió el enlace de pago de prueba."
  );
}

return redirigirAUrl(checkoutUrl);
}

/**
 * Verifica el ID token con Firebase Authentication.
 */
function verificarUsuarioFirebase(idToken) {
  const apiKey = propiedadObligatoria("FIREBASE_WEB_API_KEY");

  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" +
      encodeURIComponent(apiKey),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        idToken: idToken
      }),
      muteHttpExceptions: true
    }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error(
      "Firebase no pudo validar la sesión del usuario."
    );
  }

  const data = JSON.parse(response.getContentText());
  const user = data.users && data.users[0];

  if (!user || user.disabled) {
    throw new Error("La cuenta no es válida o está deshabilitada.");
  }

  return {
    uid: user.localId,
    email: user.email || ""
  };
}

/**
 * Crea un documento en Firestore mediante su API REST.
 * La cuenta que ejecuta Apps Script debe tener permisos adecuados.
 */
function crearDocumentoFirestore(collection, documentId, data) {
  const projectId = propiedadObligatoria("FIREBASE_PROJECT_ID");

  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(projectId) +
    "/databases/(default)/documents/" +
    encodeURIComponent(collection) +
    "?documentId=" + encodeURIComponent(documentId);

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify({
      fields: convertirCamposFirestore(data)
    }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();

  if (status < 200 || status >= 300) {
    console.error(
      "Error Firestore HTTP " + status + ": " +
      response.getContentText().substring(0, 1000)
    );

    throw new Error(
      "No se pudo registrar la compra pendiente en Firestore."
    );
  }
}

/**
 * Convierte tipos de JavaScript al formato Firestore REST.
 */
function convertirCamposFirestore(data) {
  const fields = {};

  Object.keys(data).forEach(function(key) {
    const value = data[key];

    if (value === null || value === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (typeof value === "number") {
      fields[key] = Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    } else {
      fields[key] = { stringValue: String(value) };
    }
  });

  return fields;
}

/**
 * Obtiene una propiedad secreta o falla si no existe.
 */
function propiedadObligatoria(name) {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(name);

  if (!value) {
    throw new Error(
      "Falta configurar la propiedad del script: " + name
    );
  }

  return value;
}

/**
 * Redirige a una URL HTTPS.
 */
function redirigirAUrl(url) {
  const safeUrl = JSON.stringify(url);

  return HtmlService.createHtmlOutput(
    "<!doctype html><html lang='es'><head>" +
    "<meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<title>Abriendo Mercado Pago</title></head><body>" +
    "<p>Conectando con Mercado Pago...</p>" +
    "<script>window.top.location.href = " + safeUrl + ";</script>" +
    "</body></html>"
  );
}

/**
 * Muestra mensajes de error sin interpretar el texto como HTML.
 */
function mostrarMensaje(title, message) {
  return HtmlService.createHtmlOutput(
    "<!doctype html><html lang='es'><head>" +
    "<meta charset='utf-8'><meta name='viewport' " +
    "content='width=device-width,initial-scale=1'>" +
    "<title>" + escaparHtml(title) + "</title></head>" +
    "<body style='font-family:Arial,sans-serif;padding:32px'>" +
    "<h2>" + escaparHtml(title) + "</h2>" +
    "<p>" + escaparHtml(message) + "</p>" +
    "<a href='" + CONFIG.SITE_URL + "cursos.html'>" +
    "Volver a los cursos</a></body></html>"
  );
}

function escaparHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
