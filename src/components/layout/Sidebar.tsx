import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import css from './Sidebar.module.css';

interface NavItem {
  icon?: string;
  label?: string;
  to?: string;
  section?: string;
  requiredRole?: string;
}

const NAV: NavItem[] = [
  { section: 'Administracion',                                                     requiredRole: 'Administrador' },
  { icon: 'ti-layout-dashboard', label: 'Dashboard',         to: '/dashboard',    requiredRole: 'Administrador' },
  { icon: 'ti-shield-lock',      label: 'Roles',             to: '/roles',        requiredRole: 'Administrador' },
  { icon: 'ti-user-check',       label: 'Asignar Rol',       to: '/asignar-rol',  requiredRole: 'Administrador' },
  { icon: 'ti-currency-dollar',  label: 'Tipo de Cambio',    to: '/tipo-cambio',  requiredRole: 'Administrador' },
  { section: 'Inventario' },
  { icon: 'ti-search',           label: 'Busqueda Avanzada', to: '/busqueda'      },
  { icon: 'ti-list',             label: 'Kardex',            to: '/kardex'        },
  { section: 'Clientes' },
  { icon: 'ti-users',            label: 'Gestion de Clientes', to: '/clientes'    },
  { section: 'Ventas' },
  { icon: 'ti-shopping-cart',    label: 'Nueva Venta',       to: '/ventas/nueva', requiredRole: 'Vendedor'      },
  { icon: 'ti-shopping-cart',    label: 'Confirmar Venta',       to: '/ventas/confirmar', requiredRole: 'Vendedor'      }, 
  { icon: 'ti-receipt',          label: 'Ventas realizadas',        to: '/ventas',       requiredRole: 'Administrador' },
  { icon: 'ti-arrow-back-up',    label: 'Devoluciones',      to: '/devoluciones', requiredRole: 'Administrador' },
];

export function Sidebar() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '?';

  const navFiltrado = NAV.filter((item) => {
    if (!item.requiredRole) return true;
    return usuario?.roles?.includes(item.requiredRole) ?? false;
  });

  return (
    <aside className={css.sidebar}>
      {}
      <div className={css.logoArea}>
        <div className={css.logoInner}>
          <div className={css.logoBars}>
            {[28, 22, 16].map((h, i) => (
              <div key={i} className={css.logoBar} style={{ height: h }} />
            ))}
          </div>
          <div>
            <div className={css.logoText}>SIAM</div>
            <div className={css.logoSub}>Maximport</div>
          </div>
        </div>
      </div>

      {}
      <nav className={css.nav}>
        {navFiltrado.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className={css.navSection}>
                {item.section}
              </div>
            );
          }
          const active = pathname === item.to;
          return (
            <div
              key={i}
              onClick={() => navigate(item.to!)}
              className={`${css.navItem} ${active ? css.navItemActive : ''}`}
            >
              <i className={`ti ${item.icon} ${css.navIcon}`} aria-hidden="true" />
              {item.label}
            </div>
          );
        })}
      </nav>

      {}
      <div className={css.userArea}>
        <div className={css.userInner}>
          <div className={css.avatar}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={css.userName}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div className={css.userRole}>
              {usuario?.roles?.join(', ') ?? 'Sin rol'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
