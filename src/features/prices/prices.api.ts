import { list, update, http } from '@/api/client';
import { config } from '@/config';
import type { Articulo, Familia, Entidad } from '@/types';

/* ==========================================================================
 *  Estrategia para volúmenes grandes (decenas de miles de artículos):
 *  - El API de Velneo solo filtra por IGUALDAD (no "contiene"), pero sí
 *    pagina y ordena en servidor.
 *  - Filtros de Familia/Proveedor  → servidor (igualdad, instantáneo).
 *  - Búsqueda EXACTA por id/ref/código de barras → servidor (igualdad).
 *  - Búsqueda parcial de texto → en cliente, sobre el subconjunto cargado.
 * ========================================================================== */

const CAMPOS_BASE = ['id', 'name', 'dsc', 'fam', 'prv', 'pvp', 'por_dto', 'es_nue'];

export interface CamposArticulo {
  lista: string; // csv para el parámetro `fields`
  refField: string | null;
  barField: string | null;
}

let camposCache: CamposArticulo | null = null;

/** ¿Existe el campo en art_m? (pedir un campo inexistente rompe la query). */
async function campoExiste(field: string): Promise<boolean> {
  try {
    await http.get('/art_m', { params: { fields: `id,${field}`, 'page[size]': 1 } });
    return true;
  } catch {
    return false;
  }
}

/** Resuelve una sola vez qué campos opcionales (ref/barras) están disponibles. */
export async function resolverCampos(): Promise<CamposArticulo> {
  if (camposCache) return camposCache;
  const refCfg = config.fields.referencia.trim();
  const barCfg = config.fields.codigoBarras.trim();
  const [refOk, barOk] = await Promise.all([
    refCfg ? campoExiste(refCfg) : Promise.resolve(false),
    barCfg ? campoExiste(barCfg) : Promise.resolve(false),
  ]);
  const refField = refOk ? refCfg : null;
  const barField = barOk ? barCfg : null;
  const lista = [...CAMPOS_BASE, refField, barField].filter(Boolean).join(',');
  camposCache = { lista, refField, barField };
  return camposCache;
}

export interface PaginaParams {
  fam?: string;
  prv?: string;
  page: number;
  pageSize: number;
}

/** Una página de artículos: filtros de igualdad en servidor + orden por nombre. */
export async function fetchPagina(p: PaginaParams) {
  const { lista } = await resolverCampos();
  const filter: Record<string, string> = {};
  if (p.fam) filter.fam = p.fam;
  if (p.prv) filter.prv = p.prv;
  return list<Articulo>('art_m', {
    page: p.page,
    pageSize: p.pageSize,
    sort: 'name',
    fields: lista,
    filter: Object.keys(filter).length ? filter : undefined,
  });
}

/** Carga TODO un subconjunto filtrado (familia/proveedor), con tope de seguridad. */
export async function fetchTodoFiltrado(opts: {
  fam?: string;
  prv?: string;
  cap?: number;
  onProgress?: (cargados: number, total: number) => void;
}): Promise<{ items: Articulo[]; total: number; truncado: boolean }> {
  const cap = opts.cap ?? 5000;
  const pageSize = 500;
  const all: Articulo[] = [];
  let page = 1;
  let total = 0;
  for (;;) {
    const { items, total: t } = await fetchPagina({ fam: opts.fam, prv: opts.prv, page, pageSize });
    total = t;
    all.push(...items);
    opts.onProgress?.(all.length, total);
    if (items.length === 0 || all.length >= total || all.length >= cap) break;
    page += 1;
  }
  return { items: all, total, truncado: all.length < total };
}

/** Búsqueda EXACTA por id / referencia / código de barras (igualdad servidor). */
export async function buscarPorCodigo(texto: string): Promise<Articulo[]> {
  const { lista, refField, barField } = await resolverCampos();
  const q = texto.trim();
  if (!q) return [];

  const filtrarPor = (campo: string) =>
    list<Articulo>('art_m', { pageSize: 25, fields: lista, filter: { [campo]: q } })
      .then((r) => r.items)
      .catch(() => [] as Articulo[]);

  const consultas: Promise<Articulo[]>[] = [];
  if (/^\d+$/.test(q)) consultas.push(filtrarPor('id'));
  if (barField) consultas.push(filtrarPor(barField));
  if (refField) consultas.push(filtrarPor(refField));

  const res = await Promise.all(consultas);
  const map = new Map<number, Articulo>();
  res.flat().forEach((a) => map.set(a.id, a));
  return [...map.values()];
}

/** Todas las familias (fam_m) para el desplegable. */
export async function fetchFamilias(): Promise<Familia[]> {
  const { items } = await list<Familia>('fam_m', { pageSize: 500, fields: 'id,name' });
  return items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Proveedores (ent_m con es_clt = false) para el desplegable buscable. */
export async function fetchProveedores(): Promise<Entidad[]> {
  const { items } = await list<Entidad>('ent_m', {
    pageSize: 1000,
    fields: 'id,nom_com,nom_fis',
    filter: { es_clt: 'false' },
  });
  return items.sort((a, b) =>
    (a.nom_com || a.nom_fis || '').localeCompare(b.nom_com || b.nom_fis || '', 'es')
  );
}

/** Guarda el nuevo precio de un artículo (POST /art_m/{id}). */
export async function guardarPrecio(id: number, pvp: number): Promise<void> {
  await update<Articulo>('art_m', { id, pvp });
}
