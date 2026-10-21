export default async function handler(req, res) {
  // Configurar CORS para permitir peticiones desde GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://chelseamichelle67.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder inmediatamente a la petición de comprobación del navegador
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { producto, idToken } = req.body;

    if (!producto || !idToken) {
      return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const productos = {
      completo: { name: "Curso completo de automaquillaje", price: 89000 },
      piel: { name: "Módulo de Piel", price: 17800 },
      rostro: { name: "Módulo de Rostro", price: 17800 },
      ojos: { name: "Módulo de Ojos", price: 17800 },
      labios: { name: "Módulo de Labios", price: 17800 },
      ejercicios: { name: "Módulo de Ejercicios", price: 17800 }
    };

    const prodInfo = productos[producto];
    if (!prodInfo) {
      return res.status(400).json({ error: 'Producto no válido.' });
    }

    // Validar token de Firebase
    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
    const fbResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!fbResponse.ok) {
      return res.status(401).json({ error: 'No se pudo validar la sesión del usuario.' });
    }

    const siteUrl = "https://chelseamichelle67.github.io/Lms-Makeityourself/";
    const purchaseId = "purchase_" + Date.now();

    // Crear preferencia en Mercado Pago
  // Dentro de preferenceData en api/crear-pago.js:
    const preferenceData = {
      items: [{
        id: producto,
        title: prodInfo.name,
        quantity: 1,
        currency_id: "COP",
        unit_price: prodInfo.price
      }],
      external_reference: purchaseId,
      metadata: {
        user_id: userId,
        user_email: userEmail,
        product_key: producto,
        course_id: "SS777MOfOK3VVX17JLKn",
        module_id: prodInfo.moduleId || ""
      },
      back_urls: {
        success: `${siteUrl}comprar.html?resultado=exito&producto=${encodeURIComponent(producto)}`,
        pending: `${siteUrl}comprar.html?resultado=pendiente&producto=${encodeURIComponent(producto)}`,
        failure: `${siteUrl}comprar.html?resultado=fallido&producto=${encodeURIComponent(producto)}`
      },
      auto_return: "approved"
    };