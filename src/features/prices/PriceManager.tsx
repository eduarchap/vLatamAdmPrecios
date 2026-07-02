import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert, Box, Button, CircularProgress, Container, FormControl, InputAdornment,
  InputLabel, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSnackbar } from 'notistack';
import type { Articulo, Familia } from '@/types';
import { fetchArticulos, fetchFamilias, fetchProveedores, guardarPrecio } from './prices.api';
import { ArticuloRow } from './ArticuloRow';

const TODOS = '__todos__';

export function PriceManager() {
  const { enqueueSnackbar } = useSnackbar();

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [proveedores, setProveedores] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [famId, setFamId] = useState<string>(TODOS);
  const [prvId, setPrvId] = useState<string>(TODOS);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [arts, fams] = await Promise.all([fetchArticulos(), fetchFamilias()]);
      setArticulos(arts);
      setFamilias(fams);
      const provIds = arts.map((a) => a.prv ?? 0);
      setProveedores(await fetchProveedores(provIds));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const familiaNombre = useCallback(
    (id?: string) => familias.find((f) => f.id === id)?.name,
    [familias]
  );

  const handleSave = useCallback(
    async (id: number, pvp: number) => {
      try {
        await guardarPrecio(id, pvp);
        setArticulos((prev) => prev.map((a) => (a.id === id ? { ...a, pvp } : a)));
        enqueueSnackbar('Precio actualizado', { variant: 'success' });
      } catch (e) {
        enqueueSnackbar(e instanceof Error ? e.message : 'No se pudo guardar', {
          variant: 'error',
        });
        throw e;
      }
    },
    [enqueueSnackbar]
  );

  // Proveedores presentes en los artículos (para el desplegable)
  const proveedorOpciones = useMemo(
    () =>
      [...proveedores.entries()]
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [proveedores]
  );

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articulos.filter((a) => {
      if (famId !== TODOS && a.fam !== famId) return false;
      if (prvId !== TODOS && String(a.prv ?? 0) !== prvId) return false;
      if (q) {
        const hay =
          a.name?.toLowerCase().includes(q) ||
          a.dsc?.toLowerCase().includes(q) ||
          String(a.id).includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [articulos, query, famId, prvId]);

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      {/* Filtros */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, descripción o código…"
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
          <FormControl fullWidth size="small" disabled={proveedorOpciones.length === 0}>
            <InputLabel>Proveedor</InputLabel>
            <Select label="Proveedor" value={prvId} onChange={(e) => setPrvId(e.target.value)}>
              <MenuItem value={TODOS}>Todos los proveedores</MenuItem>
              {proveedorOpciones.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Contador + refrescar */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Cargando…' : `${filtrados.length} de ${articulos.length} artículos`}
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => void cargar()} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => void cargar()}>Reintentar</Button>}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1}>
          {filtrados.map((a) => (
            <ArticuloRow
              key={a.id}
              articulo={a}
              familiaNombre={familiaNombre(a.fam)}
              proveedorNombre={a.prv ? proveedores.get(a.prv) : undefined}
              onSave={handleSave}
            />
          ))}
          {!error && filtrados.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
              No hay artículos que coincidan con la búsqueda.
            </Typography>
          )}
        </Stack>
      )}
    </Container>
  );
}
