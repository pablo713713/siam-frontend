import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';

// ── Interfaces ──
interface VentaResumen {
  codVenta: string;
  fecha: string;
  total: number;
  estado: string;
  factura: number;
  tipoVenta: string;
  descuento: number;
  codUsu: string;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
}

interface ItemVenta {
  idFab: number;
  codFab: string;
  cantidadOriginal: number;
  cantidadDevuelta: number;
  cantidad: number;
  precioVenta: number;
  precLista: number;
  descuento: number;
  descPro: string;
  codPro: string;
}

interface VentaDetalle extends VentaResumen {
  obs: string | null;
  codCli: number | null;
  numCiNit: string | null;
  totalOriginal?: number;
  totalDevuelto?: number;
  items: ItemVenta[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers de Fecha y Moneda ──
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(n);

/** Formatea YYYY-MM-DD o ISO sin desfase de zona horaria */
const parseLocalDate = (d: string) => {
  if (!d) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(d);
};

const fmtDate = (d: string) => {
  const date = parseLocalDate(d);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d: string) => {
  const date = parseLocalDate(d);
  return isNaN(date.getTime()) ? d : date.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Retorna la fecha local en formato YYYY-MM-DD evitando errores de zona horaria UTC */
const isoDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayISO = () => isoDate(new Date());

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function estadoBadge(estado: string) {
  if (estado === 'C') return <span style={badgeStyle('green')}>Completada</span>;
  if (estado === 'A') return <span style={badgeStyle('red')}>Anulada</span>;
  return <span style={badgeStyle('gray')}>{estado}</span>;
}

function nombreCliente(v: VentaResumen) {
  if (v.razonSocial) return v.razonSocial;
  const partes = [v.nomCliente, v.apeCliente].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Cliente ocasional';
}

// ── Componente Calendario ──
interface CalendarioProps {
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  onClose: () => void;
}

function Calendario({ desde, hasta, onChange, onClose }: CalendarioProps) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [hover, setHover] = useState<string | null>(null);
  const [selStart, setSelStart] = useState<string | null>(desde || null);
  const [selEnd, setSelEnd] = useState<string | null>(hasta || null);
  const [seleccionando, setSeleccionando] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const primerDia = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const offsetInicio = (primerDia.getDay() + 6) % 7;

  const celdas: (Date | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(anio, mes, i + 1)),
  ];

  const isInRange = (d: Date) => {
    const iso = isoDate(d);
    const start = selStart;
    const end = seleccionando ? (hover ?? selEnd) : selEnd;
    if (!start) return false;
    if (!end) return iso === start;
    const [a, b] = start <= end ? [start, end] : [end, start];
    return iso >= a && iso <= b;
  };

  const isStart = (d: Date) => isoDate(d) === selStart;
  const isEnd = (d: Date) => {
    const end = seleccionando ? (hover ?? selEnd) : selEnd;
    return isoDate(d) === end;
  };

  const clickDia = (d: Date) => {
    const iso = isoDate(d);
    if (!seleccionando || !selStart) {
      setSelStart(iso);
      setSelEnd(null);
      setSeleccionando(true);
    } else {
      const [a, b] = selStart <= iso ? [selStart, iso] : [iso, selStart];
      setSelEnd(b);
      setSelStart(a);
      setSeleccionando(false);
      onChange(a, b);
      onClose();
    }
  };

  const mesAnterior = () => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else setMes(m => m - 1);
  };

  const mesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else setMes(m => m + 1);
  };

  const presets = [
    { label: 'Hoy', fn: () => { const h = todayISO(); onChange(h, h); onClose(); } },
    { label: 'Ayer', fn: () => { const a = isoDate(addDays(new Date(), -1)); onChange(a, a); onClose(); } },
    { label: 'Últimos 7 días', fn: () => { onChange(isoDate(addDays(new Date(), -6)), todayISO()); onClose(); } },
    { label: 'Últimos 30 días', fn: () => { onChange(isoDate(addDays(new Date(), -29)), todayISO()); onClose(); } },
    { label: 'Este mes', fn: () => { const h = new Date(); onChange(isoDate(new Date(h.getFullYear(), h.getMonth(), 1)), todayISO()); onClose(); } },
  ];

  return (
    <div
      ref={calRef}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
        background: BRAND.white, border: `1px solid ${BRAND.gray200}`,
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        display: 'flex', minWidth: 520,
      }}
    >
      {/* Presets */}
      <div style={{
        borderRight: `1px solid ${BRAND.gray200}`, padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray400, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          Accesos rápidos
        </div>
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={p.fn}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              padding: '6px 10px', borderRadius: 6, fontSize: 13, color: BRAND.black,
              fontFamily: 'inherit', transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BRAND.gray50)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Grid Calendario */}
      <div style={{ padding: 16, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={mesAnterior} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: BRAND.gray600 }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 16 }} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{MESES[mes]} {anio}</span>
          <button onClick={mesSiguiente} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: BRAND.gray600 }}>
            <i className="ti ti-chevron-right" style={{ fontSize: 16 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 2, marginBottom: 4 }}>
          {DIAS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: BRAND.gray400, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: 2 }}>
          {celdas.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />;
            const iso = isoDate(d);
            const enRango = isInRange(d);
            const esStart = isStart(d);
            const esEnd = isEnd(d);
            const esHoy = iso === todayISO();

            return (
              <div
                key={iso}
                onClick={() => clickDia(d)}
                onMouseEnter={() => seleccionando && setHover(iso)}
                style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: (esStart || esEnd) ? '50%' : enRango ? 0 : '50%',
                  background: (esStart || esEnd) ? BRAND.red : enRango ? '#ffeaea' : 'transparent',
                  color: (esStart || esEnd) ? BRAND.white : enRango ? BRAND.red : esHoy ? BRAND.red : BRAND.black,
                  fontWeight: (esStart || esEnd || esHoy) ? 700 : 400,
                  cursor: 'pointer',
                  fontSize: 13,
                  border: esHoy && !esStart && !esEnd ? `1px solid ${BRAND.red}` : 'none',
                  transition: 'background 0.1s',
                }}
              >
                {d.getDate()}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: BRAND.gray600, textAlign: 'center' }}>
          {selStart && selEnd
            ? `${selStart} → ${selEnd}`
            : selStart
            ? `Desde: ${selStart} — seleccioná fecha fin`
            : 'Seleccioná fecha de inicio'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button style={btnStyle()} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Drawer Detalle ──
function DetalleDrawer({ codVenta, onClose }: { codVenta: string; onClose: () => void }) {
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [msgAnular, setMsgAnular] = useState('');

  // Escuchar tecla ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<VentaDetalle>(`/ventas/${codVenta}`)
      .then(({ data }) => setDetalle(data))
      .catch(() => setError('No se pudo cargar el detalle de la venta.'))
      .finally(() => setLoading(false));
  }, [codVenta]);

  const anular = async () => {
    if (!detalle) return;
    if (!window.confirm(`¿Está seguro de anular la venta ${detalle.codVenta}? Esto devolverá los productos al stock.`)) return;
    
    setAnulando(true);
    setMsgAnular('');
    try {
      // 1. Llamamos a la API enviando el flag explícito de restituir stock (si tu backend lo requiere)
      await api.put(`/ventas/${detalle.codVenta}/anular`, { restaurarStock: true });
      
      setDetalle({ ...detalle, estado: 'A' });
      setMsgAnular('Venta anulada correctamente y stock devuelto al inventario.');
      
      // 2. IMPORTANTE: Notificar o recargar la lista principal para reflejar cambios
      cargar(page); 
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setMsgAnular(e.response?.data?.message ?? 'Error al anular la venta.');
      } else {
        setMsgAnular('Ocurrió un error insospechado.');
      }
    } finally {
      setAnulando(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, maxWidth: '95vw',
        background: BRAND.white, zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BRAND.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Detalle de Venta</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.black, fontFamily: 'monospace' }}>{codVenta}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: BRAND.gray600 }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>Cargando detalle…</div>}
          {error && <div style={{ color: BRAND.red, padding: 16, borderRadius: 8, background: '#ffeaea', fontSize: 13 }}>{error}</div>}
          {detalle && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {estadoBadge(detalle.estado)}
                <span style={badgeStyle('gray')}>{detalle.tipoVenta === 'CO' ? 'Contado' : detalle.tipoVenta}</span>
                {detalle.factura === 1 && <span style={badgeStyle('gray')}>Con factura</span>}
              </div>

              <div style={{ background: BRAND.gray50, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <table style={{ ...S.table, fontSize: 13 }}>
                  <tbody>
                    {([
                      ['Fecha', fmtDateTime(detalle.fecha)],
                      ['Cliente', nombreCliente(detalle)],
                      detalle.numCiNit ? ['CI / NIT', detalle.numCiNit] : null,
                      detalle.descuento > 0 ? ['Descuento', `${detalle.descuento}%`] : null,
                      detalle.obs ? ['Observación', detalle.obs] : null,
                      ['Vendedor', detalle.codUsu],
                    ] as ([string, string] | null)[]).filter((row): row is [string, string] => row !== null).map(([label, value]) => (
                      <tr key={label}>
                        <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, width: 130, fontSize: 12 }}>{label}</td>
                        <td style={S.td}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Productos ({detalle.items.length})
                </div>
                <div style={{ border: `1px solid ${BRAND.gray200}`, borderRadius: 8, overflow: 'hidden' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Descripción', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                          <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((it, i) => {
                        const tieneDevolucion = it.cantidadDevuelta > 0;
                        const esTotalmenteDevuelto = it.cantidad === 0;

                        return (
                          <tr
                            key={`${it.idFab}-${i}`}
                            style={{
                              background: i % 2 === 0 ? BRAND.white : BRAND.gray50,
                              opacity: esTotalmenteDevuelto ? 0.6 : 1,
                            }}
                          >
                            <td style={S.td}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {it.descPro}
                                {esTotalmenteDevuelto && (
                                  <span style={{ ...badgeStyle('red'), marginLeft: 6, fontSize: 10 }}>Totalmente Devuelto</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: BRAND.gray600, fontFamily: 'monospace' }}>{it.codFab}</div>
                            </td>

                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              {tieneDevolucion ? (
                                <div>
                                  <span style={{ textDecoration: 'line-through', color: BRAND.gray400, marginRight: 4, fontSize: 11 }}>
                                    {it.cantidadOriginal}
                                  </span>
                                  <span style={{ fontWeight: 700, color: esTotalmenteDevuelto ? BRAND.red : BRAND.black }}>
                                    {it.cantidad}
                                  </span>
                                  <div style={{ fontSize: 10, color: BRAND.red, marginTop: 2 }}>
                                    (-{it.cantidadDevuelta} dev.)
                                  </div>
                                </div>
                              ) : (
                                it.cantidad
                              )}
                            </td>

                            <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtMoney(it.precioVenta)}</td>

                            <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                              {tieneDevolucion && (
                                <div style={{ textDecoration: 'line-through', color: BRAND.gray400, fontSize: 11, fontWeight: 400 }}>
                                  {fmtMoney(it.cantidadOriginal * it.precioVenta)}
                                </div>
                              )}
                              <span style={{ color: esTotalmenteDevuelto ? BRAND.gray400 : BRAND.black }}>
                                {fmtMoney(it.cantidad * it.precioVenta)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales Informativos de Devolución */}
              {Number(detalle.totalDevuelto) > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 16px', background: BRAND.gray50, borderRadius: '8px 8px 0 0', border: `1px solid ${BRAND.gray200}`, borderBottom: 'none', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: BRAND.gray600 }}>
                    <span>Monto original de venta:</span>
                    <span>{fmtMoney(Number(detalle.totalOriginal))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: BRAND.red, fontWeight: 600 }}>
                    <span>Crédito devuelto acumulado:</span>
                    <span>-{fmtMoney(Number(detalle.totalDevuelto))}</span>
                  </div>
                </div>
              )}

              {/* Total Neto Principal */}
              <div style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                background: BRAND.black,
                borderRadius: Number(detalle.totalDevuelto) > 0 ? '0 0 8px 8px' : '8px'
              }}>
                <span style={{ color: BRAND.gray400, fontSize: 13, fontWeight: 600 }}>TOTAL NETO</span>
                <span style={{ color: BRAND.white, fontSize: 22, fontWeight: 800 }}>{fmtMoney(Number(detalle.total))}</span>
              </div>

              {detalle.estado !== 'A' && (
                <div style={{ marginTop: 20 }}>
                  {/* <button onClick={anular} disabled={anulando} style={btnStyle('danger')}>
                    <i className={`ti ${anulando ? 'ti-loader-2' : 'ti-ban'}`} />
                    {anulando ? 'Anulando…' : 'Anular venta'}
                  </button> */}
                  {msgAnular && (
                    <div style={{ marginTop: 8, fontSize: 12, color: msgAnular.includes('correctamente') ? '#1a7a40' : BRAND.red, fontWeight: 600 }}>
                      {msgAnular}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Componente Principal ──
export function VerVentas() {
  const [desde, setDesde]       = useState('');
  const [hasta, setHasta]       = useState('');
  const [showCal, setShowCal]   = useState(false);
  const [ventas, setVentas]     = useState<VentaResumen[]>([]);
  const [meta, setMeta]         = useState<Meta | null>(null);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [selVenta, setSelVenta] = useState<string | null>(null);

  const cargar = useCallback(async (p = 1, d = desde, h = hasta) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: p, limit: 200 };
      if (d) params.fecha = d;
      if (h) params.fecha_fin = h;
      const { data } = await api.get('/ventas', { params });
      setVentas(data.data ?? []);
      setMeta(data.meta ?? null);
      setPage(p);
    } catch {
      setError('No se pudo cargar el listado de ventas.');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(1, '', ''); }, []);

  const aplicarRango = (d: string, h: string) => {
    setDesde(d);
    setHasta(h);
    cargar(1, d, h);
  };

  const limpiar = () => {
    setDesde('');
    setHasta('');
    cargar(1, '', '');
  };

  const totalVentas = ventas.reduce((s, v) => s + (v.estado !== 'A' ? Number(v.total) : 0), 0);
  const ventasActivas = ventas.filter(v => v.estado !== 'A').length;

  const labelFecha = desde && hasta
    ? desde === hasta ? `${desde}` : `${desde} → ${hasta}`
    : desde ? `Desde ${desde}` : 'Últimas 200 ventas';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Ventas</div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Consulta, filtra y revisa el detalle de cada venta registrada.
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <label style={S.label}>Rango de fechas</label>
          <button
            onClick={() => setShowCal(s => !s)}
            style={{
              ...S.input, display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', background: BRAND.white, minWidth: 220,
            }}
          >
            <i className="ti ti-calendar" style={{ color: BRAND.gray600 }} />
            {labelFecha}
          </button>
          {showCal && (
            <Calendario
              desde={desde}
              hasta={hasta}
              onChange={aplicarRango}
              onClose={() => setShowCal(false)}
            />
          )}
        </div>

        {loading && (
          <span style={{ fontSize: 12, color: BRAND.gray600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-loader-2" /> Buscando…
          </span>
        )}

        {(desde || hasta) && (
          <button style={btnStyle('secondary')} onClick={limpiar}>
            <i className="ti ti-x" /> Limpiar
          </button>
        )}
      </div>

      {error && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{error}
        </div>
      )}

      {/* Tarjetas resumen */}
      {!loading && ventas.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total facturado', value: fmtMoney(totalVentas), icon: 'ti-cash', color: '#1a7a40' },
            { label: 'Ventas realizadas', value: String(ventasActivas), icon: 'ti-receipt', color: '#185fa5' },
            { label: 'Anuladas', value: String(ventas.length - ventasActivas), icon: 'ti-ban', color: BRAND.red },
          ].map(stat => (
            <div key={stat.label} style={{
              background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 10,
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 180px',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: BRAND.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${stat.icon}`} style={{ fontSize: 20, color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.black }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de Ventas */}
      <div style={S.card}>
        {loading && <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>Cargando ventas…</div>}

        {!loading && ventas.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
            <i className="ti ti-receipt-off" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin ventas para este período</div>
          </div>
        )}

        {!loading && ventas.length > 0 && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Código venta', 'Cliente', 'Fecha y hora', 'Total', 'Estado', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v, i) => (
                    <tr
                      key={v.codVenta}
                      onClick={() => setSelVenta(v.codVenta)}
                      style={{
                        background: i % 2 === 0 ? BRAND.white : BRAND.gray50,
                        cursor: 'pointer',
                        opacity: v.estado === 'A' ? 0.55 : 1,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eef4ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? BRAND.white : BRAND.gray50)}
                    >
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>{v.codVenta}</td>
                      <td style={{ ...S.td, maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nombreCliente(v)}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(v.fecha)}</td>
                      <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>{fmtMoney(Number(v.total ))}</td>
                      <td style={S.td}>{estadoBadge(v.estado)}</td>
                      <td style={{ ...S.td, textAlign: 'center' as const }}>
                        <i className="ti ti-chevron-right" style={{ color: BRAND.gray400, fontSize: 16 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <button style={btnStyle()} disabled={page <= 1} onClick={() => cargar(page - 1)}>
                  <i className="ti ti-chevron-left" /> Anterior
                </button>
                <span style={{ fontSize: 13, color: BRAND.gray600 }}>
                  Página {meta.page} de {meta.totalPages} — {meta.total} ventas
                </span>
                <button style={btnStyle()} disabled={page >= meta.totalPages} onClick={() => cargar(page + 1)}>
                  Siguiente <i className="ti ti-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selVenta && <DetalleDrawer codVenta={selVenta} onClose={() => setSelVenta(null)} />}
    </div>
  );
}