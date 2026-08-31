import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import type { Producto } from '../../types';
import css from './Topbar.module.css';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/roles':       'Gestion de Roles',
  '/asignar-rol': 'Asignacion de Roles',
  '/busqueda':    'Busqueda de Productos',
  '/clientes':    'Gestion de Clientes',
  '/ventas/nueva':'Nueva Venta',
  '/ventas/confirmar':'Confirmar Venta',
  '/ventas':'Ventas Realizadas',
  '/devoluciones':'Devoluciones',
  '/tipo-cambio': 'Tipo de Cambio',
};

interface TopbarProps {
  onQuickSearch: (q: string) => void;
}

export function Topbar({ onQuickSearch }: TopbarProps) {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Producto[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounce.current) clearTimeout(debounce.current);
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

  const pageLabel = ROUTE_LABELS[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? 'SIAM';

  return (
    <header className={css.topbar}>
      <span className={css.pageTitle}>{pageLabel}</span>

      {}
      <div className={css.searchWrap}>
        <i className={`ti ti-search ${css.searchIcon}`} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 200)}
          onKeyDown={(e) => e.key === 'Enter' && goToAdvanced()}
          placeholder="Buscar producto..."
          className={css.searchInput}
          aria-label="Busqueda rapida"
        />

        {showDrop && (
          <div className={css.dropdown}>
            {searching && (
              <div className={css.dropdownMsg}>Buscando...</div>
            )}
            {!searching && results.length === 0 && (
              <div className={css.dropdownMsg}>Sin resultados</div>
            )}
            {!searching && results.map((p) => (
              <div key={p.id} onClick={goToAdvanced} className={css.dropdownItem}>
                <span className={css.dropdownItemName}>{p.descPro}</span>
                <span className={css.dropdownItemMeta}>
                  Cod: {p.codPro ?? '—'} | Fab: {p.codigo ?? '—'}
                </span>
              </div>
            ))}
            {results.length > 0 && (
              <div onClick={goToAdvanced} className={css.dropdownMore}>
                Ver todos los resultados
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <div className={css.userArea}>
        <div className={css.avatar}>{initials}</div>
        <span className={css.userName}>{usuario?.alias}</span>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          title="Cerrar sesion"
          aria-label="Cerrar sesion"
          className={css.logoutBtn}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
