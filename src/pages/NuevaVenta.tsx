import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { ClienteVenta, ItemCarrito, Producto } from '../types';

const COD_CLI_OCASIONAL = 1191;

export function NuevaVenta() {
  const { usuario } = useAuth();

  // ── Almacén ──
  const [codSuc, setCodSuc] = useState(
    usuario?.almacenes?.length === 1 ? usuario.almacenes[0].codSuc : ''
  );

  // ── Cliente ──
  const [queryCliente, setQueryCliente]     = useState('');
  const [clienteResults, setClienteResults] = useState<ClienteVenta[]>([]);
  const [clienteSel, setClienteSel]         = useState<ClienteVenta | null>(null);
  const [loadingCliente, setLoadingCliente] = useState(false);

  // ── Productos ──
  const [queryProducto, setQueryProducto]     = useState('');
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [loadingProducto, setLoadingProducto] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carrito ──
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // ── Estado general ──
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  // ── Buscar cliente ──
  const buscarCliente = async () => {
    if (!queryCliente.trim()) return;
    setLoadingCliente(true);
    setClienteResults([]);
    try {
      const { data } = await api.get('/clientes/search', {
        params: { q: queryCliente.trim(), limit: 10 },
      });
      setClienteResults(data.data ?? []);
      if ((data.data ?? []).length === 0) flash('No se encontraron clientes.', 'err');
    } catch {
      flash('Error al buscar clientes.', 'err');
    } finally {
      setLoadingCliente(false);
    }
  };

  const seleccionarCliente = (c: ClienteVenta) => {
    setClienteSel(c);
    setClienteResults([]);
    setQueryCliente('');
  };

  const seleccionarOcasional = async () => {
    try {
      const { data } = await api.get('/clientes/search', {
        params: { q: 'OCASIONAL', limit: 1 },
      });
      if (data.data?.length > 0) seleccionarCliente(data.data[0]);
    } catch {
      flash('Error al cargar cliente ocasional.', 'err');
    }
  };

  // ── Buscar producto ──
  const handleProductoChange = (val: string) => {
    setQueryProducto(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (!val.trim()) { setProductoResults([]); return; }
    setLoadingProducto(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/productos/search', {
          params: { q: val.trim(), limit: 8 },
        });
        setProductoResults(Array.isArray(data.data) ? data.data : []);
      } catch {
        setProductoResults([]);
      } finally {
        setLoadingProducto(false);
      }
    }, 400);
  };

  const agregarAlCarrito = (p: Producto) => {
    if (!p.idFab || !p.plisPro) return;
    const existe = carrito.find((i) => i.idFab === p.idFab);
    if (existe) {
      setCarrito(carrito.map((i) =>
        i.idFab === p.idFab
          ? { ...i, cantidad: i.cantidad + 1, importe: (i.cantidad + 1) * i.precioUnitario }
          : i
      ));
    } else {
      setCarrito([...carrito, {
        idFab: p.idFab,
        codFab: p.codFab ?? '',
        descPro: p.descPro,
        cantidad: 1,
        precioUnitario: p.plisPro,
        importe: p.plisPro,
      }]);
    }
    setQueryProducto('');
    setProductoResults([]);
  };

  const cambiarCantidad = (idFab: number, cantidad: number) => {
    if (cantidad < 1) return;
    setCarrito(carrito.map((i) =>
      i.idFab === idFab
        ? { ...i, cantidad, importe: cantidad * i.precioUnitario }
        : i
    ));
  };

  const quitarDelCarrito = (idFab: number) => {
    setCarrito(carrito.filter((i) => i.idFab !== idFab));
  };

  const totalCarrito = carrito.reduce((sum, i) => sum + i.importe, 0);

  // ── Confirmar venta ──
  const confirmarVenta = async () => {
    if (!codSuc) { flash('Seleccioná un almacén.', 'err'); return; }
    if (!clienteSel) { flash('Seleccioná un cliente.', 'err'); return; }
    if (carrito.length === 0) { flash('El carrito está vacío.', 'err'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/ventas', {
        cod_usu: usuario?.cod_usu,
        cod_cli: clienteSel.codCli,
        cod_suc: codSuc,
        factura: false,
        descuento: 0,
        obs: '',
        items: carrito.map((i) => ({
          id_fab: i.idFab,
          cod_fab: i.codFab,
          cantidad: i.cantidad,
          precio_venta: i.precioUnitario,
          prec_lista: i.precioUnitario,
          existencia: i.cantidad,
        })),
      });

      flash(`Venta ${data.cod_venta} registrada correctamente.`);
      setCarrito([]);
      setClienteSel(null);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al registrar la venta.', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Almacén */}
      {usuario?.almacenes && usuario.almacenes.length > 1 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Almacén de despacho</div>
          <div style={S.formGroup}>
            <label style={S.label}>Seleccioná el almacén</label>
            <select style={S.select} value={codSuc} onChange={(e) => setCodSuc(e.target.value)}>
              <option value="">— Seleccione —</option>
              {usuario.almacenes.map((a) => (
                <option key={a.codSuc} value={a.codSuc}>{a.nomSuc}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Cliente */}
      <div style={S.card}>
        <div style={S.cardTitle}>Cliente</div>

        {!clienteSel ? (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Buscar por nombre, apellido o razón social</label>
                <input
                  style={S.input}
                  value={queryCliente}
                  onChange={(e) => setQueryCliente(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
                  placeholder="Ej: Juan, Pérez, Ferretería..."
                />
              </div>
              <button style={btnStyle('primary')} onClick={buscarCliente} disabled={loadingCliente}>
                <i className="ti ti-search" aria-hidden="true" />
                {loadingCliente ? 'Buscando…' : 'Buscar'}
              </button>
              <button style={btnStyle()} onClick={seleccionarOcasional}>
                <i className="ti ti-user-off" aria-hidden="true" />
                Ocasional
              </button>
            </div>

            {clienteResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {clienteResults.map((c) => (
                  <div
                    key={c.codCli}
                    onClick={() => seleccionarCliente(c)}
                    style={{
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${BRAND.gray200}`, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = BRAND.red;
                      (e.currentTarget as HTMLDivElement).style.background = '#ffeaea';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = BRAND.gray200;
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                    }}
                  >
                    <i className="ti ti-user" style={{ color: BRAND.red, fontSize: 18 }} aria-hidden="true" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nomCli} {c.apeCli}</div>
                      <div style={{ fontSize: 11, color: BRAND.gray600 }}>
                        {c.razonSocial} · NIT: {c.numCiNit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#ffeaea',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-user" style={{ color: BRAND.red, fontSize: 18 }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {clienteSel.codCli === COD_CLI_OCASIONAL
                    ? 'Cliente Ocasional'
                    : `${clienteSel.nomCli} ${clienteSel.apeCli}`}
                </div>
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>
                  {clienteSel.razonSocial} · NIT: {clienteSel.numCiNit}
                  {clienteSel.telDom && ` · Tel: ${clienteSel.telDom}`}
                </div>
              </div>
            </div>
            <button style={btnStyle()} onClick={() => setClienteSel(null)}>
              <i className="ti ti-x" aria-hidden="true" />
              Cambiar
            </button>
          </div>
        )}
      </div>

      {/* Buscador de productos */}
      <div style={S.card}>
        <div style={S.cardTitle}>Agregar productos</div>
        <div style={{ position: 'relative' }}>
          <input
            style={S.input}
            value={queryProducto}
            onChange={(e) => handleProductoChange(e.target.value)}
            placeholder="Buscar producto por nombre, código, marca..."
          />
          {loadingProducto && (
            <div style={{ padding: '8px 12px', fontSize: 12, color: BRAND.gray600 }}>Buscando…</div>
          )}
          {productoResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: BRAND.white, border: `1px solid ${BRAND.gray200}`,
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              zIndex: 200, maxHeight: 320, overflowY: 'auto',
            }}>
              {productoResults.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '10px 14px', borderBottom: `1px solid ${BRAND.gray200}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.descPro}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND.gray600 }}>
                      {p.codPro} · {p.marca ?? '—'} · <strong>${p.plisPro?.toFixed(2) ?? '—'}</strong>
                    </div>
                  </div>
                  <button
                    style={btnStyle('primary')}
                    onClick={() => agregarAlCarrito(p)}
                    disabled={!p.plisPro || !p.idFab}
                  >
                    <i className="ti ti-plus" aria-hidden="true" />
                    Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrito */}
      {carrito.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Carrito</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Producto</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Cantidad</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Precio Unit.</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Importe</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => (
                  <tr key={item.idFab}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.descPro}</div>
                      <div style={{ fontSize: 11, color: BRAND.gray600 }}>{item.codFab}</div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          onClick={() => cambiarCantidad(item.idFab, item.cantidad - 1)}
                          style={{
                            width: 24, height: 24, borderRadius: 4, border: `1px solid ${BRAND.gray200}`,
                            background: BRAND.white, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                          }}
                        >−</button>
                        <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.idFab, item.cantidad + 1)}
                          style={{
                            width: 24, height: 24, borderRadius: 4, border: `1px solid ${BRAND.gray200}`,
                            background: BRAND.white, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                          }}
                        >+</button>
                      </div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                      ${item.precioUnitario.toFixed(2)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: BRAND.red }}>
                      ${item.importe.toFixed(2)}
                    </td>
                    <td style={S.td}>
                      <button
                        onClick={() => quitarDelCarrito(item.idFab)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: BRAND.gray400, fontSize: 16, padding: 4,
                        }}
                      >
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BRAND.gray200}`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Total: <span style={{ color: BRAND.red }}>${totalCarrito.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: msg.type === 'ok' ? '#e6f9ee' : '#ffeaea',
          color: msg.type === 'ok' ? '#1a7a40' : BRAND.red,
          fontSize: 13, fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      {/* Confirmar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          style={btnStyle()}
          onClick={() => { setCarrito([]); setClienteSel(null); }}
          disabled={loading}
        >
          <i className="ti ti-x" aria-hidden="true" />
          Cancelar
        </button>
        <button
          style={btnStyle('primary')}
          onClick={confirmarVenta}
          disabled={loading || carrito.length === 0 || !clienteSel || !codSuc}
        >
          <i className="ti ti-check" aria-hidden="true" />
          {loading ? 'Registrando…' : `Confirmar venta · $${totalCarrito.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}