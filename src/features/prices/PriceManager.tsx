import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Container, FormControl,
  InputAdornment, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar } from 'notistack';
import type { Articulo, Familia, Entidad } from '@/types';
import { config } from '@/config';
import {
  fetchPagina, fetchTodoFiltrado, fetchFamilias, fetchProveedores, buscarPorCodigo, guardarPrecio,
} from './prices.api';
import { ArticuloRow } from './ArticuloRow';

const TODOS = '';
const PAGE = 100;
const CAP = 5000;

function texto(a: Articulo, field: string): string {
  if (!field) return '';
  const v = a[field];
  return v != null ? String(v).toLowerCase() : '';
}

export function PriceManager() {
  const { enqueueSnackbar } = useSnackbar();

  const [familias, setFamilias] = useState<Familia[]>([]);
  const [proveedores, setProveedores] = useState<Entidad[]>([]);

  const [famId, setFamId] = useState<string>(TODOS);
  const [prvId, setPrvId] = useState<string>(TODOS);

  const [rows, setRows] = useState<Articulo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [truncado, setTruncado] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [progreso, setProgreso] = useState<{ n: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [queryDeb, setQueryDeb] = useState('');
  const [codigoRes, setCodigoRes] = useState<Articulo[]>([]);

  const hayFiltro = famId !== TODOS || prvId !== TODOS;
  const modoBrowse = !hayFiltro;

  // --- Catálogos (familias + proveedores) --------------------------------
  useEffect(() => {
    Promise.all([fetchFamilias(), fetchProveedores()])
      .then(([fams, provs]) => {
        setFamilias(fams);
        setProveedores(provs);
      })
      .catch(() => {
        /* si fallan los catálogos, la lista sigue funcionando */
      });
  }, []);

  // --- Carga de artículos según filtros ----------------------------------
  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgreso(null);
    try {
      const fam = famId || undefined;
      const prv = prvId || undefined;
      if (fam || prv) {
        const { items, total: t, truncado: tr } = await fetchTodoFiltrado({
          fam,
          prv,
          cap: CAP,
          onProgress: (n, tt) => setProgreso({ n, total: tt }),
        });
        setRows(items);
        setTotal(t);
        setTruncado(tr);
      } else {
        const { items, total: t } = await fetchPagina({ page: 1, pageSize: PAGE });
        setRows(items);
        setTotal(t);
        setTruncado(false);
        setPage(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando artículos');
    } finally {
      setLoading(false);
      setProgreso(null);
    }
  }, [famId, prvId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarMas = useCallback(async () => {
    if (loadingMore || rows.length >= total) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { items } = await fetchPagina({ page: next, pageSize: PAGE });
      setRows((prev) => [...prev, ...items]);
      setPage(next);
    } catch {
      /* silencioso; el usuario puede reintentar */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, rows.length, total, page]);

  // --- Búsqueda: debounce + lookup exacto en servidor --------------------
  useEffect(() => {
    const t = setTimeout(() => setQueryDeb(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = queryDeb.trim();
    if (q.length < 2) {
      setCodigoRes([]);
      return;
    }
    let vivo = true;
    buscarPorCodigo(q)
      .then((r) => vivo && setCodigoRes(r))
      .catch(() => vivo && setCodigoRes([]));
    return () => {
      vivo = false;
    };
  }, [queryDeb]);

  const handleSave = useCallback(
    async (id: number, pvp: number) => {
      try {
        await guardarPrecio(id, pvp);
        const upd = (a: Articulo) => (a.id === id ? { ...a, pvp } : a);
        setRows((prev) => prev.map(upd));
        setCodigoRes((prev) => prev.map(upd));
        enqueueSnackbar('Precio actualizado', { variant: 'success' });
      } catch (e) {
        enqueueSnackbar(e instanceof Error ? e.message : 'No se pudo guardar', { variant: 'error' });
        throw e;
      }
    },
    [enqueueSnackbar]
  );

  const provNombre = useMemo(
    () =>
      new Map(
        proveedores.map((p) => [p.id, p.nom_com || p.nom_fis || `Proveedor ${p.id}`] as const)
      ),
    [proveedores]
  );
  const famNombre = useCallback(
    (id?: string) => familias.find((f) => f.id === id)?.name,
    [familias]
  );

  // --- Lista mostrada (filtro texto cliente + resultados exactos) --------
  const displayRows = useMemo(() => {
    const q = queryDeb.trim().toLowerCase();
    const refF = config.fields.referencia;
    const barF = config.fields.codigoBarras;
    let base = rows;
    if (q) {
      base = rows.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.dsc?.toLowerCase().includes(q) ||
          texto(a, refF).includes(q) ||
          texto(a, barF).includes(q) ||
          String(a.id).includes(q)
      );
      if (codigoRes.length) {
        const ids = new Set(base.map((a) => a.id));
        base = [...codigoRes.filter((a) => !ids.has(a.id)), ...base];
      }
    }
    return base;
  }, [rows, queryDeb, codigoRes]);

  // --- Scroll infinito (solo en modo browse, sin búsqueda de texto) ------
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!modoBrowse || queryDeb.trim() || rows.length >= total) return;
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void cargarMas();
      },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [modoBrowse, queryDeb, rows.length, total, cargarMas]);

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
            getOptionLabel={(p) => p.nom_com || p.nom_fis || `Proveedor ${p.id}`}
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
            : queryDeb
              ? `${displayRows.length} coincidencia(s)`
              : hayFiltro
                ? `${rows.length} artículo(s)`
                : `Mostrando ${rows.length} de ${total}`}
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => void cargar()} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      {truncado && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Mostrando los primeros {CAP} artículos del filtro. Afina con familia/proveedor o busca por
          referencia/código de barras.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => void cargar()}>Reintentar</Button>}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ py: 4 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Stack spacing={1}>
          {displayRows.map((a) => (
            <ArticuloRow
              key={a.id}
              articulo={a}
              familiaNombre={famNombre(a.fam)}
              proveedorNombre={a.prv ? provNombre.get(a.prv) : undefined}
              onSave={handleSave}
            />
          ))}

          {!error && displayRows.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
              No hay artículos que coincidan.
            </Typography>
          )}

          {/* Cargar más (modo browse, sin búsqueda) */}
          {modoBrowse && !queryDeb && rows.length < total && (
            <>
              <Box ref={sentinel} sx={{ height: 1 }} />
              <Button onClick={() => void cargarMas()} disabled={loadingMore} sx={{ mt: 1 }}>
                {loadingMore ? <CircularProgress size={20} /> : `Cargar más (${rows.length}/${total})`}
              </Button>
            </>
          )}
        </Stack>
      )}
    </Container>
  );
}
