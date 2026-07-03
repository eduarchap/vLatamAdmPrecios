import { useState, useRef, useEffect } from 'react';
import {
  Box, Card, Chip, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import TagIcon from '@mui/icons-material/Tag';
import type { Articulo } from '@/types';
import { config } from '@/config';
import { formatPrecio, parsePrecio } from '@/format';

interface Props {
  articulo: Articulo;
  familiaNombre?: string;
  proveedores?: string[];
  onSave: (id: number, pvp: number) => Promise<void>;
}

function campoTexto(articulo: Articulo, field: string): string {
  if (!field) return '';
  const v = articulo[field];
  return v != null ? String(v) : '';
}

export function ArticuloRow({ articulo, familiaNombre, proveedores, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const referencia = campoTexto(articulo, config.fields.referencia);
  const codigoBarras = campoTexto(articulo, config.fields.codigoBarras);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setText(String(articulo.pvp ?? 0));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setText('');
  };

  const commit = async () => {
    const nuevo = parsePrecio(text);
    if (nuevo === null) return;
    if (nuevo === articulo.pvp) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(articulo.id, nuevo);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.25, sm: 1.5 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={600} sx={{ fontSize: { xs: 14, sm: 16 } }}>
            {articulo.name}
          </Typography>

          {/* Referencia y código de barras */}
          {(referencia || codigoBarras) && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ mt: 0.25, color: 'text.secondary', flexWrap: 'wrap' }}
            >
              {referencia && (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <TagIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {referencia}
                  </Typography>
                </Stack>
              )}
              {codigoBarras && (
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <QrCode2Icon sx={{ fontSize: 15 }} />
                  <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {codigoBarras}
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}

          {/* Familia y proveedores */}
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {familiaNombre && <Chip size="small" label={familiaNombre} />}
            {proveedores?.map((p) => (
              <Chip key={p} size="small" color="secondary" variant="outlined" label={p} />
            ))}
          </Stack>
        </Box>

        {editing ? (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <TextField
              inputRef={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commit();
                if (e.key === 'Escape') cancel();
              }}
              size="small"
              type="text"
              inputMode="decimal"
              disabled={saving}
              sx={{ width: { xs: 108, sm: 130 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">{config.currencySymbol}</InputAdornment>
                ),
              }}
            />
            <IconButton color="success" onClick={() => void commit()} disabled={saving}>
              <CheckIcon />
            </IconButton>
            <IconButton onClick={cancel} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <Typography
              variant="h6"
              sx={{ fontVariantNumeric: 'tabular-nums', fontSize: { xs: 16, sm: 20 }, whiteSpace: 'nowrap' }}
            >
              {formatPrecio(articulo.pvp ?? 0)}
            </Typography>
            <IconButton color="primary" onClick={startEdit} aria-label="Editar precio">
              <EditIcon />
            </IconButton>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
