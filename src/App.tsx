import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '@/auth/AuthContext';
import { config } from '@/config';
import { LoginPage } from '@/features/login/LoginPage';
import { PriceManager } from '@/features/prices/PriceManager';

export function App() {
  const { sesion, logout } = useAuth();

  if (!sesion) return <LoginPage />;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="sticky">
        <Toolbar>
          <StorefrontIcon sx={{ mr: 1 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap lineHeight={1.1}>
              {config.clientName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              Precios · {sesion.nombre}
            </Typography>
          </Box>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>
      <PriceManager />
    </Box>
  );
}
