import axios, { AxiosError } from 'axios';
import { config } from '@/config';

/**
 * Cliente HTTP para el API REST de Velneo.
 * - Autenticación por query param `api_key` (nunca cabecera).
 * - Velneo envuelve las colecciones bajo una clave con el nombre de la tabla:
 *     { count, total_count, ..., "art_m": [ ... ] }
 * - Puede devolver HTTP 200 con errores en el cuerpo.
 */
export const http = axios.create({
  baseURL: config.apiUrl,
  params: { api_key: config.apiKey },
  timeout: 30000,
});

/** Normaliza errores de Velneo (body con `errors` o `error`). */
http.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object') {
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        const msg = body.errors
          .map((e: { detail?: string; title?: string }) => e.detail || e.title)
          .join('; ');
        return Promise.reject(new Error(msg));
      }
      if (typeof body.error === 'string' && body.error) {
        return Promise.reject(new Error(body.error));
      }
    }
    return response;
  },
  (error: AxiosError) => {
    const data = error.response?.data as { error?: string; errors?: { detail?: string }[] } | undefined;
    const detail =
      data?.error ||
      data?.errors?.map((e) => e.detail).join('; ') ||
      error.message;
    return Promise.reject(new Error(detail || 'Error de red'));
  }
);

export interface ListParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  fields?: string;
  filter?: Record<string, string>;
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

/** GET de una colección. Extrae el array bajo la clave `table`. */
export async function list<T>(table: string, params: ListParams = {}): Promise<ListResult<T>> {
  const { data } = await http.get(`/${table}`, {
    params: {
      'page[number]': params.page ?? 1,
      'page[size]': params.pageSize ?? 100,
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.fields ? { fields: params.fields } : {}),
      ...(params.filter
        ? Object.fromEntries(
            Object.entries(params.filter).map(([k, v]) => [`filter[${k}]`, v])
          )
        : {}),
    },
  });
  return {
    items: (data?.[table] as T[]) ?? [],
    total: typeof data?.total_count === 'number' ? data.total_count : (data?.[table]?.length ?? 0),
  };
}

/** GET de un registro por id. */
export async function getOne<T>(table: string, id: string | number, fields?: string): Promise<T | null> {
  const { data } = await http.get(`/${table}/${id}`, {
    params: fields ? { fields } : {},
  });
  const arr = data?.[table] as T[] | undefined;
  if (Array.isArray(arr)) return arr[0] ?? null;
  return (data?.[table] as T) ?? null;
}

/** Modifica un registro: POST /tabla/{id} con el objeto a actualizar. */
export async function update<T extends { id: string | number }>(
  table: string,
  body: Partial<T> & { id: string | number }
): Promise<void> {
  await http.post(`/${table}/${body.id}`, body);
}
