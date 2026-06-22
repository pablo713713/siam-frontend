import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { AuthResponse } from '../types';
import css from './Login.module.css';

export function Login() {
  const [alias, setAlias]           = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
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
      setError('Alias o contrasena incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css.root}>
      {}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={css.bar}
          style={{
            left:    `${10 + i * 18}%`,
            height:  `${38 + i * 12}%`,
            opacity: 0.15 - i * 0.02,
          }}
        />
      ))}

      <div className={css.card}>
        {}
        <div className={css.logoArea}>
          <div className={css.logoBars}>
            {[32, 26, 20].map((h, i) => (
              <div key={i} className={css.logoBar} style={{ height: h }} />
            ))}
          </div>
          <div>
            <div className={css.logoText}>SIAM</div>
            <div className={css.logoFull}>Sistema Integral de Administracion y Mercaderia</div>
          </div>
        </div>
        <p className={css.tagline}>Maximport · Acceso al sistema</p>

        <form onSubmit={handleSubmit}>
          <div className={css.formGroup}>
            <label className={css.label} htmlFor="alias">Alias</label>
            <input
              id="alias"
              className={css.input}
              placeholder="Tu alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={css.formGroup}>
            <label className={css.label} htmlFor="contrasena">Contrasena</label>
            <input
              id="contrasena"
              type="password"
              className={css.input}
              placeholder="Tu contrasena"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className={css.error} role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          <div className={css.submitWrap}>
            <button type="submit" disabled={loading} className={css.submitBtn}>
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
