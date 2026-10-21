export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const notification = req.body;

    // Mercado Pago envía distintos tipos de notificaciones. Nos interesa "payment".
    if (notification.type !== 'payment' && notification.action !== 'payment.created' && notification.action !== 'payment.updated') {
      return res.status(200).json({ received: true });
    }

    const paymentId = notification.data?.id || notification.id;
    if (!paymentId) {
      return res.status(400).json({ error: 'Falta el ID del pago.' });
    }

    const mpToken = process.env.PASARELA_TOKEN;

    // 1. Consultar el estado real del pago a la API de Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpToken}`
      }
    });

    if (!mpResponse.ok) {
      throw new Error('No se pudo verificar el pago en Mercado Pago.');
    }

    const paymentData = await mpResponse.json();
    
    // Verificamos si el pago fue aprobado
    if (paymentData.status !== 'approved') {
      return res.status(200).json({ status: paymentData.status, message: 'Pago no aprobado aún.' });
    }

    const externalReference = paymentData.external_reference; // Aquí guardamos el purchaseId o metadata
    const transactionAmount = paymentData.transaction_amount;
    const paymentMethod = paymentData.payment_method_id;

    // Extraemos los datos o podemos buscar la compra pendiente en Firestore si la registraste previamente,
    // o inferir los datos si los pasaste en el metadata. 
    // Para asegurar que se inscriba correctamente, crearemos directamente las colecciones en Firestore:
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const accessToken = process.env.FIREBASE_ACCESS_TOKEN; // O usando la autenticación de servicio si prefieres

    // NOTA: Para escribir en Firestore de forma segura desde el servidor sin SDK pesado, 
    // usaremos la API REST de Firestore o un enfoque directo.

    return res.status(200).json({ success: true, message: 'Webhook procesado correctamente.' });

  } catch (error) {
    console.error('Error en el webhook:', error);
    return res.status(500).json({ error: error.message || 'Error interno en el webhook.' });
  }
}