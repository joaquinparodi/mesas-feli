import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

/**
 * QR code payload structure embedded in the JWT.
 */
export interface QRPayload {
  /** Unique QR identifier */
  qrId: string;
  /** Reservation ID this QR belongs to */
  reservationId: string;
  /** Event ID */
  eventId: string;
  /** User ID of the reservation owner */
  userId: string;
  /** Table ID */
  tableId: string;
  /** Issued at timestamp (added by JWT automatically) */
  iat?: number;
  /** Expiration timestamp (added by JWT automatically) */
  exp?: number;
}

/**
 * Generate a JWT-based QR code token for a reservation.
 * The token contains all necessary info to validate the reservation at the door.
 */
export function generateQRToken(params: {
  reservationId: string;
  eventId: string;
  userId: string;
  tableId: string;
  expiresIn?: string;
}): string {
  const { reservationId, eventId, userId, tableId, expiresIn = '30d' } = params;

  const payload: Omit<QRPayload, 'iat' | 'exp'> = {
    qrId: uuidv4(),
    reservationId,
    eventId,
    userId,
    tableId,
  };

  const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, {
    expiresIn: expiresIn as any,
    issuer: 'mesavip',
    subject: reservationId,
  });

  return token;
}

/**
 * Validate and decode a QR token.
 * Returns the decoded payload if valid, or null if invalid/expired.
 */
export function validateQRToken(token: string): QRPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mesavip',
    }) as QRPayload;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate a QR code image as a data URL (base64 PNG).
 * This is used for embedding in emails and displaying in the app.
 */
export async function generateQRDataUrl(token: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(token, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });

  return dataUrl;
}

/**
 * Generate a QR code as an SVG string.
 * Useful for rendering directly in the browser.
 */
export async function generateQRSvg(token: string): Promise<string> {
  const svg = await QRCode.toString(token, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });

  return svg;
}

/**
 * Generate a QR code as a Buffer (PNG).
 * Useful for saving to file or uploading to cloud storage.
 */
export async function generateQRBuffer(token: string): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(token, {
    errorCorrectionLevel: 'M',
    type: 'png',
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });

  return buffer;
}

/**
 * Complete flow: generate token + QR image for a reservation.
 * Returns both the token (to store in DB) and the QR data URL (for display/email).
 */
export async function createReservationQR(params: {
  reservationId: string;
  eventId: string;
  userId: string;
  tableId: string;
}): Promise<{ token: string; dataUrl: string }> {
  const token = generateQRToken(params);
  const dataUrl = await generateQRDataUrl(token);

  return { token, dataUrl };
}
