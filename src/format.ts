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

/** Parsea texto de un campo de edición a número (coma o punto = decimal). */
export function parsePrecio(text: string): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
