import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../ui/tokens';

interface NavItem {
  icon?: string;
  label?: string;
  to?: string;
  section?: string;
}

const NAV: NavItem[] = [
  { icon: 'ti-layout-dashboard', label: 'Dashboard',         to: '/dashboard'    },
  { section: 'Administración' },
  { icon: 'ti-shield-lock',      label: 'Roles',             to: '/roles'        },
  { icon: 'ti-user-check',       label: 'Asignar Rol',       to: '/asignar-rol'  },
  { section: 'Inventario' },
  { icon: 'ti-search',           label: 'Búsqueda Avanzada', to: '/busqueda'     },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const initials = usuario
    ? `${usuario.nombre?.[0] ?? ''}${usuario.apellido?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <aside style={{
      width: 220, background: BRAND.sidebar,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {}
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${BRAND.sidebarLine}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {}
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
            {[28, 22, 16].map((h, i) => (
              <div key={i} style={{ width: 4, height: h, background: BRAND.red }} />
            ))}
          </div>
          <div>
            <div style={{ color: BRAND.white, fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>SIAM</div>
            <div style={{ color: '#555', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Maximport
            </div>
          </div>
        </div>
      </div>

      {}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} style={{
                padding: '8px 16px 4px', color: '#555',
                fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600,
              }}>
                {item.section}
              </div>
            );
          }
          const active = pathname === item.to;
          return (
            <div
              key={i}
              onClick={() => navigate(item.to!)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px', cursor: 'pointer',
                color: active ? BRAND.white : '#999',
                background: active ? '#1f1f1f' : 'transparent',
                borderLeft: active ? `3px solid ${BRAND.red}` : '3px solid transparent',
                fontSize: 13, fontWeight: active ? 600 : 400,
                userSelect: 'none', transition: 'all 0.15s',
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 16, width: 18, textAlign: 'center' }} aria-hidden="true" />
              {item.label}
            </div>
          );
        })}
      </nav>

      {}
      <div style={{ padding: '16px 20px', borderTop: `1px solid ${BRAND.sidebarLine}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: BRAND.red,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: BRAND.white, fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{
              color: BRAND.white, fontSize: 12, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {usuario?.nombre} {usuario?.apellido}
            </div>
            <div style={{ color: '#666', fontSize: 10 }}>{usuario?.rol ?? 'Sin rol'}</div>
          </div>
          <i
            className="ti ti-logout"
            style={{ color: '#555', fontSize: 16, cursor: 'pointer' }}
            onClick={() => { logout(); navigate('/login'); }}
            aria-label="Cerrar sesión"
          />
        </div>
      </div>
    </aside>
  );
}
