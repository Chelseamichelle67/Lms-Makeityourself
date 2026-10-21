export default async function handler(req, res) {
  // Configuración indispensable de CORS para GitHub Pages
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://chelseamichelle67.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Responder de inmediato a la petición preflight del navegador
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
      return res.status(500).json({ error: "Mercado Pago no pudo crear la preferencia." });
    }

    const mpResult = await mpResponse.json();

    return res.status(200).json({
      success: true,
      init_point: mpResult.sandbox_init_point
    });

  } catch (error) {
    return res.status(500).json({ error: error.message || "Error interno." });
  }
}
