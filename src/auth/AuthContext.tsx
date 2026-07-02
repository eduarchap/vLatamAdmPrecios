import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Sesion } from '@/types';

interface AuthState {
  sesion: Sesion | null;
  iniciarSesion: (sesion: Sesion) => void;
  logout: () => void;
}

const STORAGE_KEY = 'vlatam_precios_sesion';

const AuthContext = createContext<AuthState | undefined>(undefined);

function loadStored(): Sesion | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(loadStored);

  const iniciarSesion = useCallback((s: Sesion) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSesion(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSesion(null);
  }, []);

  return (
    <AuthContext.Provider value={{ sesion, iniciarSesion, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
