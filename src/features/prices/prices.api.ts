import { list, getOne, update } from '@/api/client';
import type { Articulo, Familia, Entidad } from '@/types';

/** Carga TODOS los artículos (sin imagen, para que sea ligero y rápido). */
export async function fetchArticulos(): Promise<Articulo[]> {
  const all: Articulo[] = [];
  const pageSize = 500;
  let page = 1;
  // Paginado defensivo por si hay más registros que el tamaño de página.
  for (;;) {
    const { items, total } = await list<Articulo>('art_m', {
      page,
      pageSize,
      fields: 'id,name,dsc,fam,prv,pvp,es_nue,por_dto',
      sort: 'name',
    });
    all.push(...items);
    if (all.length >= total || items.length === 0) break;
    page += 1;
  }
  return all;
}

/** Carga todas las familias (fam_m). */
export async function fetchFamilias(): Promise<Familia[]> {
  const { items } = await list<Familia>('fam_m', { pageSize: 500, fields: 'id,name' });
  return items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Resuelve los nombres de los proveedores realmente usados en los artículos.
 * ent_m tiene miles de registros, así que solo pedimos los ids presentes.
 */
export async function fetchProveedores(ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const unique = [...new Set(ids.filter((id) => id && id > 0))];
  const results = await Promise.all(
    unique.map((id) =>
      getOne<Entidad>('ent_m', id, 'id,nom_com,nom_fis').catch(() => null)
    )
  );
  results.forEach((ent) => {
    if (ent) map.set(ent.id, ent.nom_com || ent.nom_fis || `Proveedor ${ent.id}`);
  });
  return map;
}

/** Guarda el nuevo precio de un artículo (POST /art_m/{id}). */
export async function guardarPrecio(id: number, pvp: number): Promise<void> {
  await update<Articulo>('art_m', { id, pvp });
}
