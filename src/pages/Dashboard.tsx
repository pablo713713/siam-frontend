import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BRAND, S } from '../components/ui/tokens';
import type { IngresosResponse, GananciaResponse } from '../types';

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function hoy() {
  return toISO(new Date());
}

function hace7Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return toISO(d);
}

function inicioMes() {
  const d = new Date();
  d.setDate(1);
  return toISO(d);
}

type RangoPreset = 'hoy' | '7dias' | 'mes' | 'custom';

interface Rango {
  fecha_inicio: string;
  fecha_fin: string;
}

const PRESETS: { key: RangoPreset; label: string; icon: string }[] = [
  { key: 'hoy',   label: 'Hoy',           icon: 'ti-calendar-event' },
  { key: '7dias', label: 'Últimos 7 días', icon: 'ti-calendar-week'  },
  { key: 'mes',   label: 'Este mes',       icon: 'ti-calendar-month' },
];

function rangoDesdePreset(p: RangoPreset, custom?: Rango): Rango {
  const fin = hoy();
  switch (p) {
    case 'hoy':   return { fecha_inicio: fin,        fecha_fin: fin };
    case '7dias': return { fecha_inicio: hace7Dias(), fecha_fin: fin };
    case 'mes':   return { fecha_inicio: inicioMes(), fecha_fin: fin };
    case 'custom':
      return custom ?? { fecha_inicio: inicioMes(), fecha_fin: fin };
  }
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function KpiCard({
  icon,
  label,
  value,
  sub,
  accentColor,
  loading,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  loading: boolean;
}) {
  return (
    <div
      style={{
        background: BRAND.white,
        border: `1px solid ${BRAND.gray200}`,
        borderRadius: 10,
        padding: '20px 24px',
        borderTop: `4px solid ${accentColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 220,
        flex: 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: BRAND.gray600,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accentColor + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i
            className={`ti ${icon}`}
            style={{ fontSize: 16, color: accentColor }}
          />
        </div>
      </div>

      {loading ? (
        <div
          style={{
            height: 34,
            background: BRAND.gray100,
            borderRadius: 6,
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      ) : (
        <div
          style={{ fontSize: 28, fontWeight: 900, color: BRAND.black, letterSpacing: -1 }}
        >
          {value}
        </div>
      )}

      {sub && !loading && (
        <div style={{ fontSize: 11, color: BRAND.gray600 }}>{sub}</div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .4; }
        }
      `}</style>
    </div>
  );
}

function PresetBtn({
  item,
  active,
  onClick,
}: {
  item: (typeof PRESETS)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 8,
        border: active ? `2px solid ${BRAND.red}` : `2px solid ${BRAND.gray200}`,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        background: active ? '#ffeaea' : BRAND.white,
        color: active ? BRAND.red : BRAND.black,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      <i className={`ti ${item.icon}`} style={{ fontSize: 14 }} />
      {item.label}
    </button>
  );
}

function MargenBar({ pct }: { pct: number }) {
  const color = pct >= 30 ? '#1a7a40' : pct >= 10 ? '#854f0b' : BRAND.red;
  return (
    <div
      style={{
        background: BRAND.gray100,
        borderRadius: 4,
        height: 8,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(pct, 100)}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();

  const [preset, setPreset] = useState<RangoPreset>('mes');
  const [customRango, setCustomRango] = useState<Rango>({
    fecha_inicio: inicioMes(),
    fecha_fin: hoy(),
  });
  const [showCustom, setShowCustom] = useState(false);

  const [ingresos, setIngresos] = useState<IngresosResponse | null>(null);
  const [ganancia, setGanancia] = useState<GananciaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const rango = rangoDesdePreset(preset, customRango);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setIngresos(null);
    setGanancia(null);
    try {
      const params = {
        fecha_inicio: rango.fecha_inicio,
        fecha_fin: rango.fecha_fin,
      };
      const [{ data: ing }, { data: gan }] = await Promise.all([
        api.get<IngresosResponse>('/reportes/ingresos', { params }),
        api.get<GananciaResponse>('/reportes/ganancia', { params }),
      ]);
      setIngresos(ing);
      setGanancia(gan);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [rango.fecha_inicio, rango.fecha_fin]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  const handlePreset = (p: RangoPreset) => {
    setPreset(p);
    if (p !== 'custom') setShowCustom(false);
    else setShowCustom(true);
  };

  return (
    <div>
      {/* Saludo */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>
          Bienvenido, {usuario?.nombre}
        </div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Sistema de inventarios — Maximport
        </div>
      </div>

      {}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div
          style={{
            ...S.cardTitle,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <i className="ti ti-calendar" style={{ color: BRAND.red, fontSize: 15 }} />
          Rango de fechas
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {PRESETS.map((p) => (
            <PresetBtn
              key={p.key}
              item={p}
              active={preset === p.key}
              onClick={() => handlePreset(p.key)}
            />
          ))}

          {}
          <button
            onClick={() => {
              setPreset('custom');
              setShowCustom(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border:
                preset === 'custom'
                  ? `2px solid ${BRAND.red}`
                  : `2px solid ${BRAND.gray200}`,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: preset === 'custom' ? 700 : 500,
              background: preset === 'custom' ? '#ffeaea' : BRAND.white,
              color: preset === 'custom' ? BRAND.red : BRAND.black,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14 }} />
            Personalizado
          </button>
        </div>

        {}
        {showCustom && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 14,
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <label style={S.label}>Desde</label>
              <input
                type="date"
                style={{ ...S.input, width: 160 }}
                value={customRango.fecha_inicio}
                max={customRango.fecha_fin}
                onChange={(e) =>
                  setCustomRango((r) => ({ ...r, fecha_inicio: e.target.value }))
                }
              />
            </div>
            <div>
              <label style={S.label}>Hasta</label>
              <input
                type="date"
                style={{ ...S.input, width: 160 }}
                value={customRango.fecha_fin}
                min={customRango.fecha_inicio}
                max={hoy()}
                onChange={(e) =>
                  setCustomRango((r) => ({ ...r, fecha_fin: e.target.value }))
                }
              />
            </div>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: BRAND.red,
                color: BRAND.white,
                fontFamily: 'inherit',
              }}
              onClick={fetchKpis}
            >
              <i className="ti ti-refresh" />
              Aplicar
            </button>
          </div>
        )}

        {}
        <div style={{ marginTop: 12, fontSize: 12, color: BRAND.gray600 }}>
          <i className="ti ti-clock" style={{ marginRight: 4 }} />
          Mostrando datos del{' '}
          <strong>{fmtDate(rango.fecha_inicio)}</strong> al{' '}
          <strong>{fmtDate(rango.fecha_fin)}</strong>
        </div>
      </div>

      {}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {}
        <KpiCard
          icon="ti-cash"
          label="Ingresos Totales"
          value={ingresos ? fmtMoney(ingresos.total_bruto) : '—'}
          sub={
            ingresos
              ? `${ingresos.ventas_contado.cantidad + ingresos.ventas_credito.cantidad} operaciones`
              : undefined
          }
          accentColor={BRAND.red}
          loading={loading}
        />

        {}
        <KpiCard
          icon="ti-coin"
          label="Ventas al Contado"
          value={ingresos ? fmtMoney(ingresos.ventas_contado.total) : '—'}
          sub={ingresos ? `${ingresos.ventas_contado.cantidad} ventas` : undefined}
          accentColor="#1a7a40"
          loading={loading}
        />

        {}
        <KpiCard
          icon="ti-credit-card"
          label="Ventas al Crédito"
          value={ingresos ? fmtMoney(ingresos.ventas_credito.total) : '—'}
          sub={ingresos ? `${ingresos.ventas_credito.cantidad} créditos` : undefined}
          accentColor="#185fa5"
          loading={loading}
        />

        {}
        <KpiCard
          icon="ti-trending-up"
          label="Ganancia Neta"
          value={ganancia ? fmtMoney(ganancia.ganancia_neta) : '—'}
          sub={
            ganancia
              ? `Margen: ${ganancia.margen_porcentaje.toFixed(1)}%`
              : undefined
          }
          accentColor="#854f0b"
          loading={loading}
        />
      </div>

      {}
      {ganancia && !loading && (
        <div style={S.card}>
          <div
            style={{
              ...S.cardTitle,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <i
              className="ti ti-chart-bar"
              style={{ color: BRAND.red, fontSize: 15 }}
            />
            Resumen de Rentabilidad
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 20,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 600, marginBottom: 4 }}>
                INGRESOS BRUTOS
              </div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {fmtMoney(ganancia.ingresos_brutos)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 600, marginBottom: 4 }}>
                COSTO DE MERCANCÍA
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.red }}>
                − {fmtMoney(ganancia.costo_mercancia)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 600, marginBottom: 4 }}>
                GANANCIA NETA
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: ganancia.ganancia_neta >= 0 ? '#1a7a40' : BRAND.red,
                }}
              >
                {fmtMoney(ganancia.ganancia_neta)}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: BRAND.gray600,
                marginBottom: 2,
              }}
            >
              <span>Margen de ganancia</span>
              <strong
                style={{
                  color:
                    ganancia.margen_porcentaje >= 30
                      ? '#1a7a40'
                      : ganancia.margen_porcentaje >= 10
                      ? '#854f0b'
                      : BRAND.red,
                }}
              >
                {ganancia.margen_porcentaje.toFixed(2)}%
              </strong>
            </div>
            <MargenBar pct={ganancia.margen_porcentaje} />
          </div>
        </div>
      )}

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Información de sesión</div>
        <table style={S.table}>
          <tbody>
            {(
              [
                ['Código', usuario?.cod_usu],
                ['Alias', usuario?.alias],
                [
                  'Nombre completo',
                  `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim(),
                ],
                ['Rol asignado', (usuario as any)?.rol ?? 'Sin rol'],
              ] as [string, string | undefined][]
            ).map(([k, v]) => (
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