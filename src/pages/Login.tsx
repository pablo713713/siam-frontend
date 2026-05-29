import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND } from '../components/ui/tokens';
import type { AuthResponse } from '../types';

export function Login() {
  const [alias, setAlias]         = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { alias, contrasena });
      login(data.access_token, data.usuario);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Alias o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#111', fontFamily: "'Barlow', 'Helvetica Neue', Arial, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: 0,
          left: `${10 + i * 18}%`,
          width: 6, background: BRAND.red,
          opacity: 0.15 - i * 0.02,
          height: `${38 + i * 12}%`,
        }} />
      ))}

      <div style={{
        width: 400, background: '#1a1a1a', borderRadius: 14,
        padding: '40px 36px', border: '1px solid #2a2a2a', position: 'relative',
      }}>
        {}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
            {[32, 26, 20].map((h, i) => (
              <div key={i} style={{ width: 4, height: h, background: BRAND.red }} />
            ))}
          </div>
          <div>
            <div style={{ color: BRAND.white, fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>SIAM</div>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Sistema Integral de Administración y Mercadería
            </div>
          </div>
        </div>
        <div style={{ color: '#555', fontSize: 12, marginBottom: 28 }}>
          Maximport · Acceso al sistema
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>
              Alias
            </label>
            <input
              style={{
                width: '100%', padding: '9px 12px',
                background: '#111', border: '1px solid #333',
                borderRadius: 6, color: BRAND.white, fontSize: 13,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              placeholder="Tu alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 4 }}>
              Contraseña
            </label>
            <input
              type="password"
              style={{
                width: '100%', padding: '9px 12px',
                background: '#111', border: '1px solid #333',
                borderRadius: 6, color: BRAND.white, fontSize: 13,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
              }}
              placeholder="Tu contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              color: BRAND.red, fontSize: 12, marginBottom: 12,
              background: '#2a0000', padding: '8px 12px',
              borderRadius: 6, border: '1px solid #5a1111',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#8a1515' : BRAND.red,
              color: BRAND.white, border: 'none',
              borderRadius: 6, fontSize: 14, fontWeight: 700,
              letterSpacing: 1, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Verificando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}