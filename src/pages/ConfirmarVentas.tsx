import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import {
  Calendario,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  nombreCliente,
  estadoBadge,
} from './VentasRealizadas';

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

interface VentaItem {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidadOriginal: number;
  cantidad: number;
  precioVenta: number;
  precLista: number;
  codPro: string;
}

interface VentaDetalle extends VentaResumen {
  obs: string | null;
  codCli: number | null;
  numCiNit: string | null;
  totalOriginal?: number;
  items: VentaItem[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const getMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

function PendienteBadge() {
  return <span style={badgeStyle('gray')}>Pendiente</span>;
}

function DetalleDrawer({ codVenta, onClose, onConfirmed }: {
  codVenta: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState('');
  const [precios, setPrecios] = useState<Record<number, string>>({});

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<VentaDetalle>(`/ventas/${codVenta}`);
      if (data.estado !== 'P') {
        setError('Esta venta ya no está pendiente de confirmación.');
        setDetalle(data);
        return;
      }
      setDetalle(data);
      setPrecios(Object.fromEntries(data.items.map(it => [it.idFab, String(it.precioVenta)])));
    } catch (e) {
      setError(getMessage(e, 'No se pudo cargar el detalle de la venta.'));
    } finally {
      setLoading(false);
    }
  }, [codVenta]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarPrecio = (idFab: number, value: string) => {
    if (value === '' || /^\d*(\.\d{0,2})?$/.test(value)) {
      setPrecios(prev => ({ ...prev, [idFab]: value }));
    }
  };

  const confirmar = async () => {
    if (!detalle || detalle.estado !== 'P') return;

    const items = detalle.items.map(it => {
      const precio = Number(precios[it.idFab]);
      return { ...it, precio_venta: precio };
    });

    if (items.some(it => !Number.isFinite(it.precio_venta) || it.precio_venta < 0)) {
      setMsg('Todos los precios deben ser válidos y no pueden ser negativos.');
      return;
    }

    if (!window.confirm(`¿Confirmar la venta ${detalle.codVenta}? Una vez confirmada pasará a Ventas Realizadas.`)) return;

    setConfirmando(true);
    setMsg('');
    try {
      await api.put(`/ventas/${detalle.codVenta}/confirmar`, {
        items: items.map(it => ({
          id_fab: it.idFab,
          precio_venta: it.precio_venta,
        })),
      });
      setMsg('Venta confirmada correctamente.');
      onConfirmed();
      setTimeout(onClose, 500);
    } catch (e) {
      setMsg(getMessage(e, 'No se pudo confirmar la venta.'));
    } finally {
      setConfirmando(false);
    }
  };

  const totalEditado = detalle?.items.reduce((sum, it) => {
    const precio = Number(precios[it.idFab]);
    return sum + (Number.isFinite(precio) ? precio * it.cantidad : 0);
  }, 0) ?? 0;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 560, maxWidth: '95vw',
        background: BRAND.white, zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BRAND.gray200}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Confirmar Venta</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.black, fontFamily: 'monospace' }}>{codVenta}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: BRAND.gray600 }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>Cargando…</div>}
          {error && <div style={{ color: BRAND.red, padding: 16, borderRadius: 8, background: '#ffeaea', fontSize: 13 }}>{error}</div>}

          {detalle && !loading && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <PendienteBadge />
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

              <div style={{
                padding: '12px 14px', marginBottom: 14, borderRadius: 8,
                background: '#fff8e6', border: '1px solid #f0d48a', fontSize: 12, color: '#72520b',
              }}>
                <i className="ti ti-pencil" style={{ marginRight: 6 }} />
                Esta venta aún está pendiente. Puedes ajustar el precio de cada producto antes de confirmarla.
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Productos ({detalle.items.length})
                </div>
                <div style={{ border: `1px solid ${BRAND.gray200}`, borderRadius: 8, overflow: 'hidden' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Descripción', 'Cant.', 'Precio actual', 'Nuevo precio', 'Subtotal'].map(h => (
                          <th key={h} style={{ ...S.th, fontSize: 11, textAlign: h === 'Descripción' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.items.map((it, i) => {
                        const precio = Number(precios[it.idFab]);
                        const cambio = Number.isFinite(precio) ? precio - Number(it.precioVenta) : 0;
                        return (
                          <tr key={`${it.idFab}-${i}`} style={{ background: i % 2 === 0 ? BRAND.white : BRAND.gray50 }}>
                            <td style={S.td}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                              <div style={{ fontSize: 11, color: BRAND.gray600, fontFamily: 'monospace' }}>{it.codFab}</div>
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>{it.cantidad}</td>
                            <td style={{ ...S.td, textAlign: 'right' as const, color: BRAND.gray600 }}>{fmtMoney(Number(it.precioVenta))}</td>
                            <td style={{ ...S.td, textAlign: 'right' as const }}>
                              <input
                                value={precios[it.idFab] ?? ''}
                                onChange={e => cambiarPrecio(it.idFab, e.target.value)}
                                inputMode="decimal"
                                aria-label={`Nuevo precio de ${it.descPro}`}
                                style={{
                                  width: 100, padding: '7px 8px', border: `1px solid ${BRAND.gray300 ?? BRAND.gray200}`,
                                  borderRadius: 6, textAlign: 'right', fontFamily: 'inherit', fontSize: 13,
                                }}
                              />
                              {cambio !== 0 && Number.isFinite(precio) && (
                                <div style={{ fontSize: 10, color: cambio > 0 ? '#1a7a40' : BRAND.red, marginTop: 3 }}>
                                  {cambio > 0 ? '+' : ''}{fmtMoney(cambio)}
                                </div>
                              )}
                            </td>
                            <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                              {fmtMoney((Number.isFinite(precio) ? precio : 0) * it.cantidad)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '14px 16px', background: BRAND.black, borderRadius: 8 }}>
                <span style={{ color: BRAND.gray400, fontSize: 13, fontWeight: 600 }}>TOTAL</span>
                <span style={{ color: BRAND.white, fontSize: 22, fontWeight: 800 }}>{fmtMoney(totalEditado)}</span>
              </div>

              {msg && (
                <div style={{ marginTop: 12, fontSize: 12, color: msg.includes('correctamente') ? '#1a7a40' : BRAND.red, fontWeight: 600 }}>
                  {msg}
                </div>
              )}

              {detalle.estado === 'P' && !error && (
                <div style={{ marginTop: 20 }}>
                  <button onClick={confirmar} disabled={confirmando} style={{ ...btnStyle('primary'), width: '100%', justifyContent: 'center' }}>
                    <i className={`ti ${confirmando ? 'ti-loader-2' : 'ti-check'}`} />
                    {confirmando ? 'Confirmando…' : 'Confirmar venta'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function ConfirmarVenta() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selVenta, setSelVenta] = useState<string | null>(null);

  const cargar = useCallback(async (p = 1, d = desde, h = hasta) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: p, limit: 200, estado: 'P' };
      if (d) params.fecha = d;
      if (h) params.fecha_fin = h;
      const { data } = await api.get('/ventas', { params });
      // El filtro local evita que una API antigua que ignore "estado" muestre ventas realizadas.
      const pendientes = (data.data ?? []).filter((v: VentaResumen) => v.estado === 'P');
      setVentas(pendientes);
      setMeta(data.meta ?? null);
      setPage(p);
    } catch (e) {
      setError(getMessage(e, 'No se pudo cargar el listado de ventas pendientes.'));
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

  const totalPendiente = ventas.reduce((s, v) => s + Number(v.total), 0);

  const labelFecha = desde && hasta
    ? desde === hasta ? desde : `${desde} → ${hasta}`
    : desde ? `Desde ${desde}` : 'Últimas 200 ventas pendientes';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Confirmar Venta</div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Revisa las ventas pendientes, ajusta los precios si es necesario y confírmalas para registrarlas como realizadas.
        </div>
      </div>

      <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <label style={S.label}>Rango de fechas</label>
          <button
            onClick={() => setShowCal(s => !s)}
            style={{ ...S.input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: BRAND.white, minWidth: 220 }}
          >
            <i className="ti ti-calendar" style={{ color: BRAND.gray600 }} />
            {labelFecha}
          </button>
          {showCal && <Calendario desde={desde} hasta={hasta} onChange={aplicarRango} onClose={() => setShowCal(false)} />}
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

      {!loading && ventas.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Ventas pendientes', value: String(ventas.length), icon: 'ti-clock', color: '#e67e00' },
            { label: 'Monto pendiente', value: fmtMoney(totalPendiente), icon: 'ti-cash', color: '#185fa5' },
          ].map(stat => (
            <div key={stat.label} style={{ background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 220px' }}>
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

      <div style={S.card}>
        {loading && <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>Cargando ventas pendientes…</div>}

        {!loading && ventas.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
            <i className="ti ti-clock-off" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No hay ventas pendientes</div>
            <div style={{ fontSize: 12 }}>Las nuevas ventas aparecerán aquí hasta que sean confirmadas.</div>
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
                      style={{ background: i % 2 === 0 ? BRAND.white : BRAND.gray50, cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eef4ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? BRAND.white : BRAND.gray50)}
                    >
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>{v.codVenta}</td>
                      <td style={{ ...S.td, maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreCliente(v)}</div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(v.fecha)}</td>
                      <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>{fmtMoney(Number(v.total))}</td>
                      <td style={S.td}><PendienteBadge /></td>
                      <td style={{ ...S.td, textAlign: 'center' as const }}><i className="ti ti-chevron-right" style={{ color: BRAND.gray400, fontSize: 16 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <button style={btnStyle()} disabled={page <= 1} onClick={() => cargar(page - 1)}><i className="ti ti-chevron-left" /> Anterior</button>
                <span style={{ fontSize: 13, color: BRAND.gray600 }}>Página {meta.page} de {meta.totalPages} — {meta.total} ventas pendientes</span>
                <button style={btnStyle()} disabled={page >= meta.totalPages} onClick={() => cargar(page + 1)}>Siguiente <i className="ti ti-chevron-right" /></button>
              </div>
            )}
          </>
        )}
      </div>

      {selVenta && <DetalleDrawer codVenta={selVenta} onClose={() => setSelVenta(null)} onConfirmed={() => cargar(page)} />}
    </div>
  );
}
