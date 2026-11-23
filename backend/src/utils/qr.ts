import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Genera un código interno único para una variante de producto (RF-29).
 * Formato: VAR-{timestamp_hex}-{random_hex}
 */
export function generateVariantCode(): string {
  const timeHex = Date.now().toString(36).toUpperCase();
  const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VAR-${timeHex}-${randHex}`;
}

/**
 * Genera una imagen Data URL en base64 de un código QR.
 */
export async function generateQrDataUrl(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Genera un Buffer PNG de un código QR para su uso en PDFs o almacenamiento.
 */
export async function generateQrBuffer(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
    type: 'png',
  });
}
