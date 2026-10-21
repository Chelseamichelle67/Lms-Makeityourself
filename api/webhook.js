export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const notification = req.body;

    // Mercado Pago envía notificaciones de tipo payment
    const paymentId = notification.data?.id || notification.id;
    
    if (!paymentId) {
      return res.status(200).json({ received: true, message: 'No es una notificación de pago directa.' });
    }

    const mpToken = process.env.PASARELA_TOKEN;

    // 1. Consultar el estado real del pago en la API de Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpToken}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error('No se pudo verificar el pago en la API de Mercado Pago.');
    }

    const paymentData = await mpResponse.json();
    
    // Validar si el pago realmente está aprobado
    if (paymentData.status !== 'approved') {
      return res.status(200).json({ status: paymentData.status, message: 'El pago aún no está aprobado.' });
    }

    // Extraer datos del comprador
    const payerEmail = paymentData.payer?.email || paymentData.metadata?.user_email;
    const externalReference = paymentData.external_reference; // Aquí viaja el ID de compra o producto
    const items = paymentData.additional_info?.items || paymentData.items || [];
    const productKey = items[0]?.id || externalReference;

    if (!payerEmail) {
      console.error("No se encontró el correo del pagador en el pago:", paymentId);
      return res.status(200).json({ error: 'Falta el correo del pagador.' });
    }

    // 2. Buscar el UID del usuario en Firebase Auth usando su correo electrónico
    const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
    const userLookupResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${firebaseApiKey}`, {
      // Como no podemos buscar por email directo fácilmente con la API básica de lookup sin localId, 
      // usaremos el método seguro de Firestore o asociamos el userId en el metadata de la preferencia.
    });

    // Para garantizar que se guarde perfecto, vamos a registrar el pago y la inscripción en Firestore
    // usando la API REST de Firestore: https://firestore.googleapis.com/v1/projects/TU_PROYECTO/databases/(default)/documents/...
    
    const projectId = process.env.FIREBASE_PROJECT_ID; // Debes agregar esta variable en Vercel
    
    // Si tienes configurado tu Project ID en las variables de entorno de Vercel, podemos hacer el POST directo a Firestore.
    if (projectId) {
      const enrollmentId = `enroll_${Date.now()}`;
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/enrollments?documentId=${enrollmentId}`;

      // Estructura del documento en Firestore
      const firestoreBody = {
        fields: {
          email: { stringValue: payerEmail },
          productKey: { stringValue: productKey || "completo" },
          status: { stringValue: "active" },
          createdAt: { timestampValue: new Date().toISOString() },
          paymentId: { stringValue: String(paymentId) }
        }
      };

      await fetch(firestoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreBody)
      });
    }

    return res.status(200).json({ success: true, message: 'Pago procesado e inscripción creada exitosamente.' });

  } catch (error) {
    console.error('Error procesando el webhook:', error);
    return res.status(500).json({ error: error.message || 'Error interno en el servidor.' });
  }
}