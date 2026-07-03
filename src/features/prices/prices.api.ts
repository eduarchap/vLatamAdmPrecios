import { list, update, http, getOne } from '@/api/client';
import { config } from '@/config';
import type { Articulo, Familia, Entidad, RelArtPrv, Proveedor } from '@/types';

/* ==========================================================================
 *  Estrategia para volúmenes grandes (decenas de miles de artículos):
 *  - El API de Velneo solo filtra por IGUALDAD (no "contiene"), pero sí
 *    pagina y ordena en servidor.
 *  - Filtros de Familia/Proveedor  → servidor (igualdad, instantáneo).
 *  - Búsqueda EXACTA por id/ref/código de barras → servidor (igualdad).
 *  - Búsqueda parcial de texto → en cliente, sobre el subconjunto cargado.
 * ========================================================================== */

// Esenciales: presentes en cualquier cliente (app de precios).
const ESENCIALES = ['id', 'name', 'pvp'];
// Opcionales fijos: se usan si existen (varían entre clientes/proyectos).
const OPCIONALES = ['dsc', 'fam', 'prv'];

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

/**
 * Resuelve una sola vez qué campos existen en art_m para ESTE cliente.
 * Así la app se adapta a esquemas distintos sin romper la query pidiendo
 * campos inexistentes (p.ej. Karibe tiene por_dto/es_nue e Ibiza no).
 */
export async function resolverCampos(): Promise<CamposArticulo> {
  if (camposCache) return camposCache;
  const refCfg = config.fields.referencia.trim();
  const barCfg = config.fields.codigoBarras.trim();
  const candidatos = [...OPCIONALES, refCfg, barCfg].filter(Boolean);

  const checks = await Promise.all(
    candidatos.map(async (f) => [f, await campoExiste(f)] as const)
  );
  const presentes = checks.filter(([, ok]) => ok).map(([f]) => f);

  const refField = refCfg && presentes.includes(refCfg) ? refCfg : null;
  const barField = barCfg && presentes.includes(barCfg) ? barCfg : null;
  const lista = [...ESENCIALES, ...presentes].join(',');
  camposCache = { lista, refField, barField };
  return camposCache;
}

// Paginación optimizada: páginas grandes + descarga en paralelo.
const PAGE = 2000; // el API no impone tope; 2000 equilibra nº de peticiones y tamaño
const CONC = 5; // descargas simultáneas

type Progreso = (cargados: number, total: number) => void;

interface FetchAllOpts {
  fields?: string;
  filter?: Record<string, string>;
  sort?: string;
  onProgress?: Progreso;
}

/** Ejecuta `worker` sobre `items` con concurrencia limitada. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

/**
 * Lee TODOS los registros de una tabla:
 * 1ª página (para conocer total_count) y el resto en paralelo, respetando orden.
 */
async function fetchAll<T>(table: string, opts: FetchAllOpts = {}): Promise<T[]> {
  const { fields, filter, sort, onProgress } = opts;
  const first = await list<T>(table, { page: 1, pageSize: PAGE, fields, filter, sort });
  const total = first.total;
  let cargados = first.items.length;
  onProgress?.(cargados, total);
  if (cargados >= total || first.items.length === 0) return first.items;

  const totalPags = Math.ceil(total / PAGE);
  const buckets: T[][] = new Array(totalPags + 1);
  buckets[1] = first.items;

  const restantes: number[] = [];
  for (let p = 2; p <= totalPags; p++) restantes.push(p);

  await pool(restantes, CONC, async (p) => {
    const r = await list<T>(table, { page: p, pageSize: PAGE, fields, filter, sort });
    buckets[p] = r.items;
    cargados += r.items.length;
    onProgress?.(cargados, total);
  });

  const out: T[] = [];
  for (let p = 1; p <= totalPags; p++) if (buckets[p]) out.push(...buckets[p]);
  return out;
}

/** Lee TODOS los artículos (con los campos disponibles), ordenados por nombre. */
export async function fetchTodosArticulos(onProgress?: Progreso): Promise<Articulo[]> {
  const { lista } = await resolverCampos();
  return fetchAll<Articulo>('art_m', { fields: lista, sort: 'name', onProgress });
}

/** Todas las familias (fam_m). */
export async function fetchFamilias(): Promise<Familia[]> {
  const items = await fetchAll<Familia>('fam_m', { fields: 'id,name' });
  return items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Todas las relaciones artículo↔proveedor (art_prv_g). */
export async function fetchRelacionesArtPrv(): Promise<RelArtPrv[]> {
  return fetchAll<RelArtPrv>('art_prv_g', { fields: 'art,prv' }).catch(
    () => [] as RelArtPrv[]
  );
}

/**
 * Resuelve los proveedores (ent_m) sólo para los ids indicados — normalmente
 * los que aparecen en art_prv_g — para no cargar toda la tabla de contactos.
 */
export async function fetchProveedoresPorIds(ids: number[]): Promise<Proveedor[]> {
  const unicos = [...new Set(ids.filter((id) => id > 0))];
  const out: Proveedor[] = [];
  await pool(unicos, CONC, async (id) => {
    const e = await getOne<Entidad>('ent_m', id, 'id,nom_com,nom_fis').catch(() => null);
    if (e) out.push({ id, nombre: e.nom_com || e.nom_fis || `Proveedor ${id}` });
    else out.push({ id, nombre: `Proveedor ${id}` });
  });
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Guarda el nuevo precio de un artículo (POST /art_m/{id}). */
export async function guardarPrecio(id: number, pvp: number): Promise<void> {
  await update<Articulo>('art_m', { id, pvp });
}
