/**
 * Parsea una entrada de texto que puede contener formato de moneda argentina (ARS)
 * Admite: 67.999, 68.000, 67999, 67.999,50, etc.
 */
export function parseCurrencyAr(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  let clean = val.toString().trim().replace(/[^0-9.,]/g, '');
  if (!clean) return 0;

  // Caso 1: Tiene punto y coma (ej: 67.999,50) -> punto es miles, coma es decimal
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  // Caso 2: Solo tiene puntos (ej: 67.999 o 1.500.000 o 68.000)
  else if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.');
    // Si tiene múltiples puntos (1.500.000) o termina en 3 dígitos (67.999), son miles
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '');
    }
  }
  // Caso 3: Solo tiene coma (ej: 67999,50 o 68,000)
  else if (clean.includes(',') && !clean.includes('.')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0], 10) > 0) {
      clean = clean.replace(',', '');
    } else {
      clean = clean.replace(',', '.');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formatea un número en formato moneda argentina sin decimales o con 2 decimales según corresponda
 */
export function formatCurrencyAr(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
