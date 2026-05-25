import { useAuth } from '../context/AuthContext';
import { BRAND, S } from '../components/ui/tokens';

const STAT_CARDS = [
  { icon: 'ti-package',         label: 'Productos en sistema', color: BRAND.red      },
  { icon: 'ti-users',           label: 'Usuarios activos',     color: '#1a7a40'      },
  { icon: 'ti-shield-lock',     label: 'Roles configurados',   color: '#185fa5'      },
  { icon: 'ti-arrow-up-right',  label: 'Ingresos del mes',     color: '#854f0b'      },
];

export function Dashboard() {
  const { usuario } = useAuth();

  return (
    <div>
      {}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>
          Bienvenido, {usuario?.nombre}
        </div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Sistema de inventarios — Maximport
        </div>
      </div>

      {}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        {STAT_CARDS.map((c) => (
          <div key={c.label} style={{
            ...S.card,
            marginBottom: 0,
            borderTop: `3px solid ${c.color}`,
          }}>
            <i className={`ti ${c.icon}`} style={{ fontSize: 22, color: c.color }} aria-hidden="true" />
            <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.black, margin: '8px 0 4px' }}>—</div>
            <div style={{ fontSize: 12, color: BRAND.gray600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Información de sesión</div>
        <table style={S.table}>
          <tbody>
            {([
              ['Código',         usuario?.cod_usu],
              ['Alias',          usuario?.alias],
              ['Nombre completo', `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim()],
              ['Rol asignado',   usuario?.rol ?? 'Sin rol'],
            ] as [string, string | undefined][]).map(([k, v]) => (
              <tr key={k}>
                <td style={{ ...S.td, color: BRAND.gray600, width: 180 }}>{k}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
