import { config } from '@/config';

const nf = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: config.priceDecimals,
  maximumFractionDigits: config.priceDecimals,
});

/** Formatea un precio con separador de miles es-AR y símbolo de moneda. */
export function formatPrecio(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${config.currencySymbol} ${nf.format(n)}`;
}

/**
 * Normaliza texto para búsqueda: descompone (NFD) y elimina todas las marcas
 * de combinación (acentos, tilde de la ñ, diéresis…), luego pasa a minúsculas.
 * Así "COTILLÓN", "cotillon" y "Cotillón" comparan igual. Se aplica por igual
 * a la consulta del usuario y a los datos, que es como la BD indexa (sin tildes).
 */
export function normalizar(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Parsea texto de un campo de edición a número (coma o punto = decimal). */
export function parsePrecio(text: string): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
