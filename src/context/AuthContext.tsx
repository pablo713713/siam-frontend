import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '../types';

interface AuthContextValue {
  token: string | null;
  usuario: Usuario | null;
  isAuthenticated: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('siam_token')
  );
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    try {
      const raw = localStorage.getItem('siam_usuario');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const login = (access_token: string, usr: Usuario) => {
    setToken(access_token);
    setUsuario(usr);
    localStorage.setItem('siam_token', access_token);
    localStorage.setItem('siam_usuario', JSON.stringify(usr));
  };

  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('siam_token');
    localStorage.removeItem('siam_usuario');
  };

  return (
    <AuthContext.Provider value={{ token, usuario, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
