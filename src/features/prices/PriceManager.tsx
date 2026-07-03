import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Autocomplete, Box, Button, Container, FormControl, InputAdornment,
  InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar } from 'notistack';
import type { Articulo, Familia, Proveedor, RelArtPrv } from '@/types';
import { config } from '@/config';
import {
  fetchTodosArticulos, fetchFamilias, fetchRelacionesArtPrv, fetchProveedoresPorIds, guardarPrecio,
} from './prices.api';
import { ArticuloRow } from './ArticuloRow';
import { normalizar } from '@/format';

const TODOS = '';
const MAX_RENDER = 300; // filas pintadas a la vez (la búsqueda recorre TODO)

export function PriceManager() {
  const { enqueueSnackbar } = useSnackbar();

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [relaciones, setRelaciones] = useState<RelArtPrv[]>([]);

  const [loading, setLoading] = useState(true);
  const [progreso, setProgreso] = useState<{ n: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [famId, setFamId] = useState<string>(TODOS);
  const [prvId, setPrvId] = useState<string>(TODOS);
  const [query, setQuery] = useState('');
  const [queryDeb, setQueryDeb] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgreso(null);
    try {
      const fams = await fetchFamilias().catch(() => [] as Familia[]);
      setFamilias(fams);
      const [arts, rels] = await Promise.all([
        fetchTodosArticulos((n, total) => setProgreso({ n, total })),
        fetchRelacionesArtPrv(),
      ]);
      setArticulos(arts);
      setRelaciones(rels);
      const prvIds = [...new Set(rels.map((r) => r.prv))];
      setProveedores(await fetchProveedoresPorIds(prvIds));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando artículos');
    } finally {
      setLoading(false);
      setProgreso(null);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const t = setTimeout(() => setQueryDeb(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const handleSave = useCallback(
    async (id: number, pvp: number) => {
      try {
        await guardarPrecio(id, pvp);
        setArticulos((prev) => prev.map((a) => (a.id === id ? { ...a, pvp } : a)));
        enqueueSnackbar('Precio actualizado', { variant: 'success' });
      } catch (e) {
        enqueueSnackbar(e instanceof Error ? e.message : 'No se pudo guardar', { variant: 'error' });
        throw e;
      }
    },
    [enqueueSnackbar]
  );

  const provNombre = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.nombre] as const)),
    [proveedores]
  );
  const famNombre = useCallback((id?: string) => familias.find((f) => f.id === id)?.name, [familias]);

  // Mapas artículo↔proveedor a partir de art_prv_g
  const { prvToArts, artToPrv } = useMemo(() => {
    const p2a = new Map<number, Set<number>>();
    const a2p = new Map<number, number[]>();
    for (const r of relaciones) {
      if (!p2a.has(r.prv)) p2a.set(r.prv, new Set());
      p2a.get(r.prv)!.add(r.art);
      if (!a2p.has(r.art)) a2p.set(r.art, []);
      a2p.get(r.art)!.push(r.prv);
    }
    return { prvToArts: p2a, artToPrv: a2p };
  }, [relaciones]);

  // Blob de búsqueda normalizado por artículo (precomputado = rápido en 40k)
  const buscables = useMemo(() => {
    const refF = config.fields.referencia;
    const barF = config.fields.codigoBarras;
    return articulos.map((a) => ({
      a,
      blob: normalizar(
        [a.name, a.dsc, refF ? a[refF] : '', barF ? a[barF] : '', a.id]
          .filter(Boolean)
          .join(' ')
      ),
    }));
  }, [articulos]);

  const filtrados = useMemo(() => {
    const q = normalizar(queryDeb);
    const arts = prvId ? prvToArts.get(Number(prvId)) : null;
    const out: Articulo[] = [];
    for (const { a, blob } of buscables) {
      if (famId && a.fam !== famId) continue;
      if (prvId && !(arts && arts.has(a.id))) continue;
      if (q && !blob.includes(q)) continue;
      out.push(a);
    }
    return out;
  }, [buscables, famId, prvId, queryDeb, prvToArts]);

  const visibles = filtrados.slice(0, MAX_RENDER);
  const proveedorSel = proveedores.find((p) => String(p.id) === prvId) ?? null;

  return (
    <Container maxWidth="md" sx={{ py: 2, px: { xs: 1.5, sm: 3 } }}>
      {/* Filtros */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, referencia, código de barras…"
          fullWidth
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Familia</InputLabel>
            <Select label="Familia" value={famId} onChange={(e) => setFamId(e.target.value)}>
              <MenuItem value={TODOS}>Todas las familias</MenuItem>
              {familias.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            fullWidth
            size="small"
            options={proveedores}
            value={proveedorSel}
            getOptionLabel={(p) => p.nombre}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, val) => setPrvId(val ? String(val.id) : TODOS)}
            renderInput={(params) => <TextField {...params} label="Proveedor" />}
          />
        </Stack>
      </Stack>

      {/* Estado / contador */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {loading
            ? progreso
              ? `Cargando ${progreso.n} de ${progreso.total}…`
              : 'Cargando…'
            : `${filtrados.length} artículo(s)${
                filtrados.length > MAX_RENDER ? ` · mostrando ${MAX_RENDER}` : ''
              }`}
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => void cargar()} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      {loading && progreso && (
        <LinearProgress
          variant="determinate"
          value={progreso.total ? (progreso.n / progreso.total) * 100 : 0}
          sx={{ mb: 2 }}
        />
      )}

      {filtrados.length > MAX_RENDER && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Hay {filtrados.length} coincidencias. Se muestran las primeras {MAX_RENDER}; afina la
          búsqueda o los filtros para ver el resto.
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button onClick={() => void cargar()}>Reintentar</Button>}
        >
          {error}
        </Alert>
      )}

      {loading && !progreso ? (
        <Box sx={{ py: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Stack spacing={1}>
          {visibles.map((a) => (
            <ArticuloRow
              key={a.id}
              articulo={a}
              familiaNombre={famNombre(a.fam)}
              proveedores={(artToPrv.get(a.id) ?? []).map(
                (id) => provNombre.get(id) ?? `Proveedor ${id}`
              )}
              onSave={handleSave}
            />
          ))}
          {!error && !loading && filtrados.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
              No hay artículos que coincidan.
            </Typography>
          )}
        </Stack>
      )}
    </Container>
  );
}
