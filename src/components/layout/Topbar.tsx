import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../ui/tokens';
import api from '../../api/axios';
import type { Producto } from '../../types';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/roles':       'Gestión de Roles',
  '/asignar-rol': 'Asignación de Roles',
  '/busqueda':    'Búsqueda de Productos',
};

interface TopbarProps {
  onQuickSearch: (q: string) => void;
}

export function Topbar({ onQuickSearch }: TopbarProps) {
  const { usuario,logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
    if (!val.trim()) { setResults([]); setShowDrop(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get<Producto[]>('/productos/search', {
          params: { q: val.trim(), limit: 8 },
        });
        setResults(Array.isArray(data) ? data : []);
        setShowDrop(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const goToAdvanced = () => {
    onQuickSearch(query);
    setShowDrop(false);
    navigate('/busqueda');
  };

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <header style={{
      background: BRAND.white,
      borderBottom: `1px solid ${BRAND.gray200}`,
      padding: '0 24px', height: 56,
      display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
    }}>
      {/* Título de sección actual */}
      <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.black, letterSpacing: 0.5, flex: 1 }}>
        {ROUTE_LABELS[pathname] ?? 'SIAM'}
      </span>

      {/* ── Búsqueda rápida (HU-F3.01) ── */}
      <div style={{ position: 'relative', width: 280 }}>
        <i className="ti ti-search" aria-hidden="true" style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: BRAND.gray400, fontSize: 15, pointerEvents: 'none',
        }} />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && goToAdvanced()}
          placeholder="Buscar producto…"
          style={{
            width: '100%', padding: '8px 12px 8px 34px',
            border: `1px solid ${BRAND.gray200}`, borderRadius: 6,
            fontSize: 13, background: BRAND.gray50, outline: 'none',
            color: BRAND.black, boxSizing: 'border-box',
          }}
        />

        {}
        {showDrop && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: BRAND.white, border: `1px solid ${BRAND.gray200}`,
            borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 200, maxHeight: 320, overflowY: 'auto',
          }}>
            {searching && (
              <div style={{ padding: 12, color: BRAND.gray600, fontSize: 13 }}>Buscando…</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ padding: 12, color: BRAND.gray600, fontSize: 13 }}>Sin resultados</div>
            )}
            {!searching && results.map((p) => (
              <div
                key={p.id}
                onClick={goToAdvanced}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: `1px solid ${BRAND.gray200}`,
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{p.descPro}</span>
                <span style={{ fontSize: 11, color: BRAND.gray600 }}>
                  Cód: {p.codPro ?? '—'} | Fab: {p.codigo ?? '—'}
                </span>
              </div>
            ))}
            {results.length > 0 && (
              <div
                onClick={goToAdvanced}
                style={{
                  padding: '8px 14px', fontSize: 12,
                  color: BRAND.red, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Ver todos los resultados →
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: BRAND.red,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: BRAND.white, fontWeight: 700, fontSize: 12,
        }}>
          {initials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.black }}>
          {usuario?.alias}
        </span>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          title="Cerrar sesión"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 6,
            border: `1px solid ${BRAND.black}`,
            background: 'transparent', cursor: 'pointer',
            color: BRAND.black, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.red;
            (e.currentTarget as HTMLButtonElement).style.color = BRAND.red;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.black;
            (e.currentTarget as HTMLButtonElement).style.color = BRAND.black;
          }}
        >
          <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
