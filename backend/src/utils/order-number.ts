import crypto from 'crypto';

/**
 * Genera un número de operación visible único y legible para el cliente y vendedor (RF-21).
 * Formato: VTA-YYYYMMDD-XXXX
 */
export function generateOperationNumber(): string {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

  return `VTA-${year}${month}${day}-${randomSuffix}`;
}
