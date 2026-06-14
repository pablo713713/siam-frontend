import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';

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

interface VentaDetalle extends VentaResumen {
  obs: string | null;
  codCli: number | null;
  numCiNit: string | null;
  items: {
    idFab: number;
    codFab: string;
    cantidad: number;
    precioVenta: number;
    precLista: number;
    descuento: number;
    descPro: string;
    codPro: string;
  }[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const todayISO = () => new Date().toISOString().split('T')[0];

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

function DetalleDrawer({
  codVenta,
  onClose,
}: {
  codVenta: string;
  onClose: () => void;
}) {
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [msgAnular, setMsgAnular] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get<VentaDetalle>(`/ventas/${codVenta}`)
      .then(({ data }) => setDetalle(data))
      .catch(() => setError('No se pudo cargar el detalle.'))
      .finally(() => setLoading(false));
  }, [codVenta]);

  const anular = async () => {
    if (!detalle) return;
    if (!window.confirm(`¿Anular la venta ${detalle.codVenta}? Esta acción no se puede deshacer.`)) return;
    setAnulando(true);
    try {
      await api.put(`/ventas/${detalle.codVenta}/anular`);
      setDetalle({ ...detalle, estado: 'A' });
      setMsgAnular('Venta anulada correctamente.');
    } catch (e: any) {
      setMsgAnular(e?.response?.data?.message ?? 'Error al anular la venta.');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <>
      {}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
        }}
      />

      {}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 520, maxWidth: '95vw',
          background: BRAND.white, zIndex: 201, display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
        }}
      >
        {}
        <div
          style={{
            padding: '20px 24px', borderBottom: `1px solid ${BRAND.gray200}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
              Detalle de Venta
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.black, fontFamily: 'monospace' }}>
              {codVenta}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: BRAND.gray600 }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
        </div>

        {}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Cargando…
            </div>
          )}

          {error && (
            <div style={{ color: BRAND.red, padding: 16, borderRadius: 8, background: '#ffeaea', fontSize: 13 }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
            </div>
          )}

          {detalle && (
            <>
              {}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {estadoBadge(detalle.estado)}
                <span style={badgeStyle('gray')}>{detalle.tipoVenta === 'CO' ? 'Contado' : detalle.tipoVenta}</span>
                {detalle.factura === 1 && <span style={badgeStyle('gray')}>Con factura</span>}
              </div>

              {}
              <div style={{ background: BRAND.gray50, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <table style={{ ...S.table, fontSize: 13 }}>
                  <tbody>
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, width: 130, fontSize: 12 }}>Fecha</td>
                      <td style={S.td}>{fmtDateTime(detalle.fecha)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Cliente</td>
                      <td style={S.td}>{nombreCliente(detalle)}</td>
                    </tr>
                    {detalle.numCiNit && (
                      <tr>
                        <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>CI / NIT</td>
                        <td style={S.td}>{detalle.numCiNit}</td>
                      </tr>
                    )}
                    {detalle.descuento > 0 && (
                      <tr>
                        <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Descuento</td>
                        <td style={S.td}>{detalle.descuento}%</td>
                      </tr>
                    )}
                    {detalle.obs && (
                      <tr>
                        <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Observación</td>
                        <td style={S.td}>{detalle.obs}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Vendedor</td>
                      <td style={S.td}>{detalle.codUsu}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {}
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
                      {detalle.items.map((it, i) => (
                        <tr key={`${it.idFab}-${i}`} style={{ background: i % 2 === 0 ? BRAND.white : BRAND.gray50 }}>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                            <div style={{ fontSize: 11, color: BRAND.gray600, fontFamily: 'monospace' }}>{it.codFab}</div>
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' as const }}>{it.cantidad}</td>
                          <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtMoney(it.precioVenta)}</td>
                          <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                            {fmtMoney(it.cantidad * it.precioVenta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {}
              <div
                style={{
                  display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
                  padding: '14px 16px', background: BRAND.black, borderRadius: 8,
                }}
              >
                <span style={{ color: BRAND.gray400, fontSize: 13, fontWeight: 600 }}>TOTAL</span>
                <span style={{ color: BRAND.white, fontSize: 22, fontWeight: 800 }}>
                  {fmtMoney(Number(detalle.total))}
                </span>
              </div>

              {}
              {detalle.estado !== 'A' && (
                <div style={{ marginTop: 20 }}>
                  <button onClick={anular} disabled={anulando} style={btnStyle('danger')}>
                    <i className={`ti ${anulando ? 'ti-loader-2' : 'ti-ban'}`} />
                    {anulando ? 'Anulando…' : 'Anular venta'}
                  </button>
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

export function VerVentas() {
  const [fecha, setFecha] = useState(todayISO());
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selVenta, setSelVenta] = useState<string | null>(null);

  const cargar = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/ventas', { params: { fecha, page: p, limit: 20 } });
        setVentas(data.data ?? []);
        setMeta(data.meta ?? null);
        setPage(p);
      } catch {
        setError('No se pudo cargar el listado de ventas.');
      } finally {
        setLoading(false);
      }
    },
    [fecha],
  );

  useEffect(() => { cargar(1); }, [cargar]);

  const totalVentas = ventas.reduce((s, v) => s + (v.estado !== 'A' ? Number(v.total) : 0), 0);
  const ventasActivas = ventas.filter(v => v.estado !== 'A').length;

  return (
    <div>
      {}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Ventas del día</div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Consulta, filtra y revisa el detalle de cada venta registrada.
        </div>
      </div>

      {}
      <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={S.label}>Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && cargar(1)}
            style={S.input}
          />
        </div>
        <button style={btnStyle('primary')} onClick={() => cargar(1)} disabled={loading}>
          <i className="ti ti-search" />
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button style={btnStyle('secondary')} onClick={() => { setFecha(todayISO()); }}>
          <i className="ti ti-calendar-today" />
          Hoy
        </button>
      </div>

      {}
      {error && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{error}
        </div>
      )}

      {}
      {!loading && ventas.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total facturado', value: fmtMoney(totalVentas), icon: 'ti-cash', color: '#1a7a40' },
            { label: 'Ventas realizadas', value: String(ventasActivas), icon: 'ti-receipt', color: '#185fa5' },
            { label: 'Anuladas', value: String(ventas.length - ventasActivas), icon: 'ti-ban', color: BRAND.red },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 10,
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 180px',
              }}
            >
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

      {}
      <div style={S.card}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Cargando ventas…
          </div>
        )}

        {!loading && ventas.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
            <i className="ti ti-receipt-off" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin ventas para esta fecha</div>
            <div style={{ fontSize: 12 }}>Prueba con otra fecha o registra una nueva venta.</div>
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
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>
                        {v.codVenta}
                      </td>
                      <td style={{ ...S.td, maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nombreCliente(v)}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(v.fecha)}</td>
                      <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                        {fmtMoney(Number(v.total))}
                      </td>
                      <td style={S.td}>{estadoBadge(v.estado)}</td>
                      <td style={{ ...S.td, textAlign: 'center' as const }}>
                        <i className="ti ti-chevron-right" style={{ color: BRAND.gray400, fontSize: 16 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {}
            {meta && meta.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <button
                  style={btnStyle('secondary')}
                  disabled={page <= 1}
                  onClick={() => cargar(page - 1)}
                >
                  <i className="ti ti-chevron-left" /> Anterior
                </button>
                <span style={{ fontSize: 13, color: BRAND.gray600 }}>
                  Página {meta.page} de {meta.totalPages} — {meta.total} ventas
                </span>
                <button
                  style={btnStyle('secondary')}
                  disabled={page >= meta.totalPages}
                  onClick={() => cargar(page + 1)}
                >
                  Siguiente <i className="ti ti-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {}
      {selVenta && (
        <DetalleDrawer codVenta={selVenta} onClose={() => setSelVenta(null)} />
      )}
    </div>
  );
}
