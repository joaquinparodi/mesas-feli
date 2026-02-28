import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Initialize MercadoPago client with access token
const mercadopagoClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

// Preference API for creating checkout preferences
export const preferenceApi = new Preference(mercadopagoClient);

// Payment API for querying payment status
export const paymentApi = new Payment(mercadopagoClient);

/**
 * Create a MercadoPago checkout preference for a table reservation.
 */
export async function createReservationPreference(params: {
  reservationId: string;
  title: string;
  description: string;
  amount: number;
  buyerEmail: string;
  buyerName: string;
  externalReference: string;
}): Promise<{ preferenceId: string; initPoint: string }> {
  const { reservationId, title, description, amount, buyerEmail, buyerName, externalReference } =
    params;

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const preference = await preferenceApi.create({
    body: {
      items: [
        {
          id: reservationId,
          title,
          description,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: buyerEmail,
        name: buyerName,
      },
      back_urls: {
        success: `${baseUrl}/reservations/${reservationId}/success`,
        failure: `${baseUrl}/reservations/${reservationId}/failure`,
        pending: `${baseUrl}/reservations/${reservationId}/pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'MesaVIP',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(
        Date.now() + 30 * 60 * 1000 // 30 minutes
      ).toISOString(),
    },
  });

  return {
    preferenceId: preference.id!,
    initPoint: preference.init_point!,
  };
}

/**
 * Get the status of a payment by its ID.
 */
export async function getPaymentStatus(paymentId: string): Promise<{
  id: number;
  status: string;
  statusDetail: string;
  amount: number;
  externalReference: string | null;
  paidAt: string | null;
}> {
  const payment = await paymentApi.get({ id: paymentId });

  return {
    id: payment.id!,
    status: payment.status!,
    statusDetail: payment.status_detail || '',
    amount: payment.transaction_amount!,
    externalReference: payment.external_reference || null,
    paidAt: payment.date_approved || null,
  };
}

/**
 * Validate a MercadoPago webhook signature.
 * Uses HMAC-SHA256 to verify the webhook payload authenticity.
 */
export async function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string
): Promise<boolean> {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('MERCADOPAGO_WEBHOOK_SECRET not configured, skipping signature validation');
    return true;
  }

  try {
    // Parse the x-signature header
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }

    if (!ts || !hash) {
      return false;
    }

    // Build the manifest string
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Create HMAC signature
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const computedHash = hmac.digest('hex');

    return computedHash === hash;
  } catch (error) {
    console.error('Error validating MercadoPago webhook signature:', error);
    return false;
  }
}

export default mercadopagoClient;
