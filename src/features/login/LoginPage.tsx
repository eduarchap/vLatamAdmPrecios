import { useState, type FormEvent } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '@/auth/AuthContext';
import { config } from '@/config';
import { autenticar } from '@/auth/auth.api';

export function LoginPage() {
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sesion = await autenticar(usuario, clave);
      iniciarSesion(sesion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 380 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Box
              sx={{
                bgcolor: 'primary.main',
                color: '#fff',
                borderRadius: '50%',
                width: 56,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              {config.clientName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Administración de precios
            </Typography>
          </Stack>

          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
                autoComplete="username"
                fullWidth
                required
              />
              <TextField
                label="Contraseña"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !usuario.trim()}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              >
                Ingresar
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
