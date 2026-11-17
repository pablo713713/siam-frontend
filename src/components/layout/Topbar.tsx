import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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

export function Topbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '?';

  const pageLabel = ROUTE_LABELS[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? 'SIAM';

  return (
    <header className={css.topbar}>
      <span className={css.pageTitle}>{pageLabel}</span>

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
