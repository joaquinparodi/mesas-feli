import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'MesaVIP <noreply@mesavip.com>';

/**
 * Send a reservation confirmation email.
 */
export async function sendReservationConfirmation(params: {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  tableLabel: string;
  amount: number;
  qrCodeDataUrl: string;
  reservationId: string;
}): Promise<{ id: string }> {
  const { to, userName, eventTitle, eventDate, tableLabel, amount, qrCodeDataUrl, reservationId } =
    params;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reserva confirmada - ${eventTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva Confirmada</title>
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">MesaVIP</h1>
                    <p style="color:#e0e0ff;margin:8px 0 0;font-size:14px;">Tu reserva ha sido confirmada</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#ffffff;font-size:18px;margin:0 0 24px;">Hola <strong>${userName}</strong>,</p>
                    <p style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Tu reserva para <strong style="color:#ffffff;">${eventTitle}</strong> ha sido confirmada exitosamente.
                    </p>
                    <!-- Details Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#16162a;border-radius:12px;margin:0 0 24px;">
                      <tr>
                        <td style="padding:24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color:#a0a0b0;font-size:13px;padding:8px 0;">Evento</td>
                              <td style="color:#ffffff;font-size:13px;padding:8px 0;text-align:right;font-weight:600;">${eventTitle}</td>
                            </tr>
                            <tr>
                              <td style="color:#a0a0b0;font-size:13px;padding:8px 0;border-top:1px solid #2a2a3e;">Fecha</td>
                              <td style="color:#ffffff;font-size:13px;padding:8px 0;border-top:1px solid #2a2a3e;text-align:right;font-weight:600;">${eventDate}</td>
                            </tr>
                            <tr>
                              <td style="color:#a0a0b0;font-size:13px;padding:8px 0;border-top:1px solid #2a2a3e;">Mesa</td>
                              <td style="color:#ffffff;font-size:13px;padding:8px 0;border-top:1px solid #2a2a3e;text-align:right;font-weight:600;">${tableLabel}</td>
                            </tr>
                            <tr>
                              <td style="color:#a0a0b0;font-size:13px;padding:8px 0;border-top:1px solid #2a2a3e;">Total</td>
                              <td style="color:#6366f1;font-size:16px;padding:8px 0;border-top:1px solid #2a2a3e;text-align:right;font-weight:700;">$${amount.toLocaleString('es-AR')}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!-- QR Code -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                      <tr>
                        <td align="center">
                          <p style="color:#a0a0b0;font-size:13px;margin:0 0 16px;">Presenta este codigo QR en la entrada:</p>
                          <img src="${qrCodeDataUrl}" alt="QR Code" width="200" height="200" style="border-radius:8px;background:#ffffff;padding:8px;">
                        </td>
                      </tr>
                    </table>
                    <p style="color:#a0a0b0;font-size:13px;text-align:center;margin:0;">
                      ID de reserva: <strong style="color:#ffffff;">${reservationId}</strong>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:24px 32px;border-top:1px solid #2a2a3e;text-align:center;">
                    <p style="color:#666680;font-size:12px;margin:0;">
                      Este email fue enviado por MesaVIP. Si no realizaste esta reserva, contactanos inmediatamente.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send reservation confirmation email: ${error.message}`);
  }

  return { id: data!.id };
}

/**
 * Send a payment received notification email.
 */
export async function sendPaymentNotification(params: {
  to: string;
  userName: string;
  amount: number;
  eventTitle: string;
  paymentId: string;
}): Promise<{ id: string }> {
  const { to, userName, amount, eventTitle, paymentId } = params;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Pago recibido - $${amount.toLocaleString('es-AR')}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;">Pago Recibido</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#ffffff;font-size:18px;margin:0 0 16px;">Hola ${userName},</p>
                    <p style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Hemos recibido tu pago de <strong style="color:#10b981;">$${amount.toLocaleString('es-AR')}</strong> para el evento <strong style="color:#ffffff;">${eventTitle}</strong>.
                    </p>
                    <p style="color:#666680;font-size:13px;margin:0;">ID de pago: ${paymentId}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send payment notification email: ${error.message}`);
  }

  return { id: data!.id };
}

/**
 * Send an event reminder email.
 */
export async function sendEventReminder(params: {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  venueAddress: string;
}): Promise<{ id: string }> {
  const { to, userName, eventTitle, eventDate, venueName, venueAddress } = params;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Recordatorio: ${eventTitle} es pronto!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;">Recordatorio de Evento</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#ffffff;font-size:18px;margin:0 0 16px;">Hola ${userName},</p>
                    <p style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Te recordamos que <strong style="color:#ffffff;">${eventTitle}</strong> es pronto. No te lo pierdas!
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#16162a;border-radius:12px;">
                      <tr>
                        <td style="padding:24px;">
                          <p style="color:#a0a0b0;font-size:13px;margin:0 0 8px;">Fecha: <strong style="color:#ffffff;">${eventDate}</strong></p>
                          <p style="color:#a0a0b0;font-size:13px;margin:0 0 8px;">Lugar: <strong style="color:#ffffff;">${venueName}</strong></p>
                          <p style="color:#a0a0b0;font-size:13px;margin:0;">Direccion: <strong style="color:#ffffff;">${venueAddress}</strong></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send event reminder email: ${error.message}`);
  }

  return { id: data!.id };
}

/**
 * Send a commission earned notification to a promoter.
 */
export async function sendCommissionNotification(params: {
  to: string;
  promoterName: string;
  commission: number;
  eventTitle: string;
  tableLabel: string;
}): Promise<{ id: string }> {
  const { to, promoterName, commission, eventTitle, tableLabel } = params;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Comision ganada - $${commission.toLocaleString('es-AR')}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;">Comision Ganada</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <p style="color:#ffffff;font-size:18px;margin:0 0 16px;">Hola ${promoterName},</p>
                    <p style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Has ganado una comision de <strong style="color:#10b981;">$${commission.toLocaleString('es-AR')}</strong> por la venta de la mesa <strong style="color:#ffffff;">${tableLabel}</strong> en <strong style="color:#ffffff;">${eventTitle}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(`Failed to send commission notification email: ${error.message}`);
  }

  return { id: data!.id };
}

export default resend;
