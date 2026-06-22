import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BRAND, S, btnStyle } from '../components/ui/tokens';
import type { IngresosResponse, GananciaResponse } from '../types';
import css from './Dashboard.module.css';

function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function hoy() { return toISO(new Date()); }
function hace7Dias() { const d = new Date(); d.setDate(d.getDate() - 6); return toISO(d); }
function inicioMes() { const d = new Date(); d.setDate(1); return toISO(d); }

type RangoPreset = 'hoy' | '7dias' | 'mes' | 'custom';
interface Rango { fecha_inicio: string; fecha_fin: string; }

const PRESETS: { key: RangoPreset; label: string; icon: string }[] = [
  { key: 'hoy',   label: 'Hoy',            icon: 'ti-calendar-event' },
  { key: '7dias', label: 'Ultimos 7 dias',  icon: 'ti-calendar-week'  },
  { key: 'mes',   label: 'Este mes',        icon: 'ti-calendar-month' },
];

function rangoDesdePreset(p: RangoPreset, custom?: Rango): Rango {
  const fin = hoy();
  switch (p) {
    case 'hoy':    return { fecha_inicio: fin,         fecha_fin: fin };
    case '7dias':  return { fecha_inicio: hace7Dias(),  fecha_fin: fin };
    case 'mes':    return { fecha_inicio: inicioMes(),  fecha_fin: fin };
    case 'custom': return custom ?? { fecha_inicio: inicioMes(), fecha_fin: fin };
  }
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB',
    minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtMoneyShort = (n: number) => {
  if (n >= 1_000_000) return `Bs ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `Bs ${(n / 1_000).toFixed(1)}K`;
  return `Bs ${n.toFixed(0)}`;
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });

function KpiCard({ icon, label, value, sub, accentColor, loading }: {
  icon: string; label: string; value: string; sub?: string;
  accentColor: string; loading: boolean;
}) {
  return (
    <div className={css.kpiCard} style={{ borderTop: `4px solid ${accentColor}` }}>
      <div className={css.kpiTop}>
        <span className={css.kpiLabel}>{label}</span>
        <div className={css.kpiIcon} style={{ background: accentColor + '18' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16, color: accentColor }} />
        </div>
      </div>

      {loading
        ? <div className={css.kpiSkeleton} />
        : <div className={css.kpiValue}>{value}</div>
      }

      {sub && !loading && <div className={css.kpiSub}>{sub}</div>}
    </div>
  );
}

function MargenBar({ pct }: { pct: number }) {
  const color = pct >= 30 ? BRAND.green : pct >= 10 ? BRAND.amber : BRAND.red;
  return (
    <div>
      <div className={css.marginBarLabel}>
        <span>Margen de ganancia</span>
        <strong style={{ color }}>{pct.toFixed(2)}%</strong>
      </div>
      <div className={css.marginBarTrack}>
        <div
          className={css.marginBarFill}
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={css.chartTooltip}>
      <div className={css.chartTooltipLabel}>{label}</div>
      {payload.map((item) => (
        <div key={item.name} className={css.chartTooltipRow}>
          <span className={css.chartTooltipDot} style={{ background: item.color }} />
          <span className={css.chartTooltipName}>{item.name}</span>
          <span className={css.chartTooltipValue}>{fmtMoney(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface GananciaChartProps {
  ganancia: GananciaResponse;
  labelRango: string;
}

function GananciaChart({ ganancia, labelRango }: GananciaChartProps) {
  const data = [
    {
      nombre: labelRango,
      Ingresos: ganancia.ingresos_brutos,
      Costos:   ganancia.costo_mercancia,
      Ganancia: ganancia.ganancia_neta,
    },
  ];

  const positivo = ganancia.ganancia_neta >= 0;

  return (
    <div style={S.card}>
      <div className={css.cardTitleRow}>
        <i className="ti ti-chart-bar" style={{ color: BRAND.red }} />
        Grafico de Ganancias
      </div>

      <div className={css.chartLegend}>
        <span className={css.chartLegendItem}>
          <span className={css.chartLegendDot} style={{ background: BRAND.blue }} />
          Ingresos
        </span>
        <span className={css.chartLegendItem}>
          <span className={css.chartLegendDot} style={{ background: BRAND.red }} />
          Costos
        </span>
        <span className={css.chartLegendItem}>
          <span className={css.chartLegendDot} style={{ background: positivo ? BRAND.green : BRAND.amber }} />
          Ganancia neta
        </span>
      </div>

      <div className={css.chartWrap}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
            barCategoryGap="30%"
            barGap={6}
          >
            <CartesianGrid
              vertical={false}
              stroke={BRAND.gray200}
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="nombre"
              tick={{ fontSize: 12, fill: BRAND.gray600, fontFamily: 'Barlow, sans-serif', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtMoneyShort}
              tick={{ fontSize: 11, fill: BRAND.gray600, fontFamily: 'Barlow, sans-serif' }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: BRAND.gray100 }} />
            <Legend hide />

            <Bar dataKey="Ingresos" radius={[4, 4, 0, 0]} maxBarSize={72}>
              <Cell fill={BRAND.blue} />
            </Bar>
            <Bar dataKey="Costos" radius={[4, 4, 0, 0]} maxBarSize={72}>
              <Cell fill={BRAND.red} />
            </Bar>
            <Bar dataKey="Ganancia" radius={[4, 4, 0, 0]} maxBarSize={72}>
              <Cell fill={positivo ? BRAND.green : BRAND.amber} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={css.chartFooter}>
        <div className={css.chartFooterItem}>
          <span className={css.chartFooterLabel}>Ingresos brutos</span>
          <span className={css.chartFooterValue} style={{ color: BRAND.blue }}>
            {fmtMoney(ganancia.ingresos_brutos)}
          </span>
        </div>
        <div className={css.chartFooterDivider} />
        <div className={css.chartFooterItem}>
          <span className={css.chartFooterLabel}>Costo de mercancia</span>
          <span className={css.chartFooterValue} style={{ color: BRAND.red }}>
            -{fmtMoney(ganancia.costo_mercancia)}
          </span>
        </div>
        <div className={css.chartFooterDivider} />
        <div className={css.chartFooterItem}>
          <span className={css.chartFooterLabel}>Ganancia neta</span>
          <span
            className={css.chartFooterValue}
            style={{ color: positivo ? BRAND.green : BRAND.amber }}
          >
            {fmtMoney(ganancia.ganancia_neta)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();
  const [preset, setPreset]           = useState<RangoPreset>('mes');
  const [customRango, setCustomRango] = useState<Rango>({ fecha_inicio: inicioMes(), fecha_fin: hoy() });
  const [showCustom, setShowCustom]   = useState(false);
  const [ingresos, setIngresos]       = useState<IngresosResponse | null>(null);
  const [ganancia, setGanancia]       = useState<GananciaResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [kpiError, setKpiError]       = useState<string | null>(null);

  const rango = rangoDesdePreset(preset, customRango);

  const labelRango = (() => {
    switch (preset) {
      case 'hoy':    return 'Hoy';
      case '7dias':  return 'Ultimos 7 dias';
      case 'mes':    return 'Este mes';
      case 'custom': return `${fmtDate(rango.fecha_inicio)} - ${fmtDate(rango.fecha_fin)}`;
    }
  })();

  const fetchKpis = useCallback(async () => {
    setLoading(true); setIngresos(null); setGanancia(null); setKpiError(null);
    try {
      const params = { fecha_inicio: rango.fecha_inicio, fecha_fin: rango.fecha_fin };
      const [{ data: ing }, { data: gan }] = await Promise.all([
        api.get<IngresosResponse>('/reportes/ingresos', { params }),
        api.get<GananciaResponse>('/reportes/ganancia', { params }),
      ]);
      setIngresos(ing); setGanancia(gan);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 500) {
        setKpiError('Error interno del servidor. Contacta al administrador si el problema persiste.');
      } else if (status === 502 || status === 503 || status === 504) {
        setKpiError('El servidor de reportes no esta disponible. Intenta nuevamente en unos minutos.');
      } else {
        setKpiError('No se pudieron cargar los datos. Verifica tu conexion e intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [rango.fecha_inicio, rango.fecha_fin]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const handlePreset = (p: RangoPreset) => {
    setPreset(p);
    setShowCustom(p === 'custom');
  };

  return (
    <div className={css.page}>
      {kpiError && (
        <div role="alert" style={S.errorBanner}>
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {kpiError}
        </div>
      )}

      <div className={css.header}>
        <div className={css.headerLeft}>
          <h1 className={css.title}>Bienvenido, {usuario?.nombre}</h1>
          <p className={css.subtitle}>Sistema de inventarios — Maximport</p>
        </div>
      </div>

      <div style={S.card}>
        <div className={css.cardTitleRow}>
          <i className="ti ti-calendar" style={{ color: BRAND.red }} />
          Rango de fechas
        </div>

        <div className={css.presetBar}>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`${css.presetBtn} ${preset === p.key ? css.presetBtnActive : ''}`}
            >
              <i className={`ti ${p.icon}`} />
              {p.label}
            </button>
          ))}
          <button
            onClick={() => handlePreset('custom')}
            className={`${css.presetBtn} ${preset === 'custom' ? css.presetBtnActive : ''}`}
          >
            <i className="ti ti-adjustments-horizontal" />
            Personalizado
          </button>
        </div>

        {showCustom && (
          <div className={css.dateRow} style={{ marginTop: 14 }}>
            <div>
              <label style={S.label}>Desde</label>
              <input type="date" className={css.dateInput}
                value={customRango.fecha_inicio} max={customRango.fecha_fin}
                onChange={(e) => setCustomRango((r) => ({ ...r, fecha_inicio: e.target.value }))}
              />
            </div>
            <div>
              <label style={S.label}>Hasta</label>
              <input type="date" className={css.dateInput}
                value={customRango.fecha_fin} min={customRango.fecha_inicio} max={hoy()}
                onChange={(e) => setCustomRango((r) => ({ ...r, fecha_fin: e.target.value }))}
              />
            </div>
            <button className={css.applyBtn} onClick={fetchKpis}>
              <i className="ti ti-refresh" />
              Aplicar
            </button>
          </div>
        )}

        <p className={css.dateContext}>
          <i className="ti ti-clock" />
          Mostrando datos del <strong>{fmtDate(rango.fecha_inicio)}</strong> al <strong>{fmtDate(rango.fecha_fin)}</strong>
        </p>
      </div>

      <div className={css.kpiGrid}>
        <KpiCard icon="ti-cash"        label="Ingresos Totales"   loading={loading}
          value={ingresos ? fmtMoney(ingresos.total_bruto) : '—'}
          sub={ingresos ? `${ingresos.ventas_contado.cantidad + ingresos.ventas_credito.cantidad} operaciones` : undefined}
          accentColor={BRAND.red}
        />
        <KpiCard icon="ti-coin"        label="Ventas al Contado"  loading={loading}
          value={ingresos ? fmtMoney(ingresos.ventas_contado.total) : '—'}
          sub={ingresos ? `${ingresos.ventas_contado.cantidad} ventas` : undefined}
          accentColor={BRAND.green}
        />
        <KpiCard icon="ti-credit-card" label="Ventas al Credito"  loading={loading}
          value={ingresos ? fmtMoney(ingresos.ventas_credito.total) : '—'}
          sub={ingresos ? `${ingresos.ventas_credito.cantidad} creditos` : undefined}
          accentColor={BRAND.blue}
        />
        <KpiCard icon="ti-trending-up" label="Ganancia Neta"      loading={loading}
          value={ganancia ? fmtMoney(ganancia.ganancia_neta) : '—'}
          sub={ganancia ? `Margen: ${ganancia.margen_porcentaje.toFixed(1)}%` : undefined}
          accentColor={BRAND.amber}
        />
      </div>

      {ganancia && !loading && (
        <GananciaChart ganancia={ganancia} labelRango={labelRango} />
      )}

      {ganancia && !loading && (
        <div style={S.card}>
          <div className={css.cardTitleRow}>
            <i className="ti ti-chart-bar" style={{ color: BRAND.red }} />
            Resumen de Rentabilidad
          </div>

          <div className={css.rentGrid}>
            <div className={css.rentItem}>
              <div className={css.rentItemLabel}>Ingresos Brutos</div>
              <div className={css.rentItemValue}>{fmtMoney(ganancia.ingresos_brutos)}</div>
            </div>
            <div className={css.rentItem}>
              <div className={css.rentItemLabel}>Costo de Mercancia</div>
              <div className={css.rentItemValue} style={{ color: BRAND.red }}>
                - {fmtMoney(ganancia.costo_mercancia)}
              </div>
            </div>
            <div className={css.rentItem}>
              <div className={css.rentItemLabel}>Ganancia Neta</div>
              <div className={css.rentItemValue}
                style={{ color: ganancia.ganancia_neta >= 0 ? BRAND.green : BRAND.red }}>
                {fmtMoney(ganancia.ganancia_neta)}
              </div>
            </div>
          </div>

          <MargenBar pct={ganancia.margen_porcentaje} />
        </div>
      )}

      <div style={S.card}>
        <div style={S.cardTitle}>Informacion de sesion</div>
        <table style={S.table}>
          <tbody>
            {([
              ['Codigo', usuario?.cod_usu],
              ['Alias', usuario?.alias],
              ['Nombre completo', `${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim()],
              ['Rol asignado', (usuario as any)?.rol ?? 'Sin rol'],
            ] as [string, string | undefined][]).map(([k, v]) => (
              <tr key={k}>
                <td style={{ ...S.td, color: BRAND.gray600, width: 180, fontWeight: 600 }}>{k}</td>
                <td style={S.td}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
