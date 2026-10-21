export default async function handler(req, res) {
  // Permitir peticiones CORS desde tu sitio web en GitHub Pages
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { producto, idToken } = req.body;

    if (!producto || !idToken) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (producto o idToken).' });
    }

    // Definición de productos permitidos
    const productos = {
      completo: { name: "Curso completo de automaquillaje", price: 89000, type: "full_course", moduleId: "" },
      piel: { name: "Módulo de Piel", price: 17800, type: "module", moduleId: "modulo-1" },
      rostro: { name: "Módulo de Rostro", price: 17800, type: "module", moduleId: "modulo-2" },
      ojos: { name: "Módulo de Ojos", price: 17800, type: "module", moduleId: "modulo-3" },
      labios: { name: "Módulo de Labios", price: 17800, type: "module", moduleId: "modulo-4" },
      ejercicios: { name: "Módulo de Ejercicios", price: 17800, type: "module", moduleId: "modulo-5" }
    };

    const prodInfo = productos[producto];
    if (!prodInfo) {
      return res.status(400).json({ error: 'Producto no válido.' });
    }

    // Validar el token de Firebase del usuario usando la API REST de Google Identity Toolkit
    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
    const fbResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!fbResponse.ok) {
      return res.status(401).json({ error: 'No se pudo validar la sesión del usuario con Firebase.' });
    }

    const fbData = await fbResponse.json();
    const user = fbData.users && fbData.users[0];
    if (!user || user.disabled) {
      return res.status(401).json({ error: 'Cuenta no válida o deshabilitada.' });
    }

    const userId = user.localId;
    const userEmail = user.email || '';

    // URL base de tu sitio en GitHub Pages
    const siteUrl = "https://chelseamichelle67.github.io/Lms-Makeityourself/";
    const purchaseId = "purchase_" + Date.now() + "_" + Math.random().toString(36.substring(2, 7));

    // Crear preferencia en Mercado Pago
    const mpToken = process.env.PASARELA_TOKEN;
    const preferenceData = {
      items: [{
        id: producto,
        title: prodInfo.name,
        quantity: 1,
        currency_id: "COP",
        unit_price: prodInfo.price
      }],
      external_reference: purchaseId,
      back_urls: {
        success: `${siteUrl}comprar.html?resultado=exito&producto=${encodeURIComponent(producto)}`,
        pending: `${siteUrl}comprar.html?resultado=pendiente&producto=${encodeURIComponent(producto)}`,
        failure: `${siteUrl}comprar.html?resultado=fallido&producto=${encodeURIComponent(producto)}`
      },
      auto_return: "approved"
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("Error Mercado Pago:", errText);
      return res.status(500).json({ error: "Mercado Pago no pudo crear la preferencia de pago." });
    }

    const mpResult = await mpResponse.json();
    const sandboxInitPoint = mpResult.sandbox_init_point;

    if (!sandboxInitPoint) {
      return res.status(500).json({ error: "No se recibió el enlace de pago de prueba de Mercado Pago." });
    }

    // Opcional: Registrar la compra pendiente en Firestore usando la API REST de Firestore
    // (Asegúrate de configurar las variables de entorno de Firestore si deseas registrarlo aquí)

    return res.status(200).json({
      success: true,
      init_point: sandboxInitPoint,
      purchaseId: purchaseId
    });

  } catch (error) {
    console.error("Error en la Serverless Function:", error);
    return res.status(500).json({ error: error.message || "Error interno en el servidor." });
  }
}