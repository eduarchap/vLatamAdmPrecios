import { useState, useRef, useEffect } from 'react';
import {
  Box, Card, Chip, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import type { Articulo } from '@/types';
import { config } from '@/config';
import { formatPrecio, parsePrecio } from '@/format';

interface Props {
  articulo: Articulo;
  familiaNombre?: string;
  proveedorNombre?: string;
  onSave: (id: number, pvp: number) => Promise<void>;
}

export function ArticuloRow({ articulo, familiaNombre, proveedorNombre, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap fontWeight={600}>
            {articulo.name}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip size="small" label={`#${articulo.id}`} variant="outlined" />
            {familiaNombre && <Chip size="small" label={familiaNombre} />}
            {proveedorNombre && (
              <Chip size="small" color="secondary" variant="outlined" label={proveedorNombre} />
            )}
          </Stack>
        </Box>

        {editing ? (
          <Stack direction="row" alignItems="center" spacing={0.5}>
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
              sx={{ width: 130 }}
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
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>
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
