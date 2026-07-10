import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle } from '../components/ui/tokens';
import type { ClienteVenta, Producto } from '../types';

const COD_CLI_OCASIONAL = 1191;
const COD_SUC_MOTORZONE = '00011';
const STORAGE_KEY = 'siam_carrito';
const STORAGE_CLI = 'siam_cliente_venta';

interface StockAlmacen {
  codSuc: string;
  nomSuc: string;
  cantidad: number;
}

interface StockFab {
  idFab: number;
  stockMotorZone: number;
  totalStock: number;
  porAlmacen: StockAlmacen[];
}

interface DistribItem {
  cod_suc: string;
  nomSuc: string;
  cantidad: number;
}

interface ItemCarrito {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  stockMotorZone: number;
  totalStock: number;
  stockPorAlmacen: StockAlmacen[];
  distribucion: DistribItem[];
}

export function NuevaVenta() {
  const { usuario } = useAuth();

  const [clienteSel, setClienteSel] = useState<ClienteVenta | null>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CLI) ?? 'null'); } catch { return null; }
  });
  const [carrito, setCarrito] = useState<ItemCarrito[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(carrito)); }, [carrito]);
  useEffect(() => { localStorage.setItem(STORAGE_CLI, JSON.stringify(clienteSel)); }, [clienteSel]);
  useEffect(() => {
  const pendiente = localStorage.getItem('siam_producto_pendiente');
  if (!pendiente) return;
  localStorage.removeItem('siam_producto_pendiente');

  const p: Producto = JSON.parse(pendiente);
  if (!p.idFab || !p.plisPro) return;
  if (carrito.find((i) => i.idFab === p.idFab)) return;

  api.get<StockFab>(`/productos/stock-fab/${p.idFab}`).then(({ data }) => {
    const distribucion: DistribItem[] = data.stockMotorZone > 0
      ? [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: 1 }]
      : [];

    setCarrito((prev) => [...prev, {
      idFab: p.idFab!,
      codFab: p.codFab ?? '',
      descPro: p.descPro,
      cantidad: 1,
      precioUnitario: p.plisPro!,
      importe: p.plisPro!,
      stockMotorZone: data.stockMotorZone,
      totalStock: data.totalStock,
      stockPorAlmacen: data.porAlmacen,
      distribucion,
    }]);
  }).catch(() => {});
}, []);

  const [queryCliente, setQueryCliente]       = useState('');
  const [clienteResults, setClienteResults]   = useState<ClienteVenta[]>([]);
  const [loadingCliente, setLoadingCliente]   = useState(false);
  const [queryProducto, setQueryProducto]     = useState('');
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [loadingProducto, setLoadingProducto] = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [msg, setMsg]                         = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [expandedStock, setExpandedStock]     = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceCliente = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const buscarCliente = async (val: string) => {
    if (debounceCliente.current) clearTimeout(debounceCliente.current);
    if (!val.trim()) { setClienteResults([]); return; }
    setLoadingCliente(true);
    debounceCliente.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/clientes/search', { params: { q: val.trim(), limit: 10 } });
        setClienteResults(data.data ?? []);
      } catch { setClienteResults([]); }
      finally { setLoadingCliente(false); }
    }, 400);
  };

  const seleccionarCliente = (c: ClienteVenta) => {
    setClienteSel(c);
    setClienteResults([]);
    setQueryCliente('');
  };

  const seleccionarOcasional = async () => {
    try {
      const { data } = await api.get('/clientes/search', { params: { q: 'OCASIONAL', limit: 1 } });
      if (data.data?.length > 0) seleccionarCliente(data.data[0]);
    } catch { flash('Error al cargar cliente ocasional.', 'err'); }
  };

  const handleProductoChange = (val: string) => {
    setQueryProducto(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (!val.trim()) { setProductoResults([]); return; }
    setLoadingProducto(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/productos/search', { params: { q: val.trim(), limit: 8 } });
        setProductoResults(Array.isArray(data.data) ? data.data : []);
      } catch { setProductoResults([]); }
      finally { setLoadingProducto(false); }
    }, 400);
  };

  const agregarAlCarrito = async (p: Producto) => {
    if (!p.idFab || !p.plisPro) return;
    if (carrito.find((i) => i.idFab === p.idFab)) {
      flash('Este producto ya está en el carrito.', 'err');
      setQueryProducto(''); setProductoResults([]);
      return;
    }
    try {
      const { data } = await api.get<StockFab>(`/productos/stock-fab/${p.idFab}`);
      const distribucion: DistribItem[] = data.stockMotorZone > 0
        ? [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: 1 }]
        : [];

      setCarrito((prev) => [...prev, {
        idFab: p.idFab!,
        codFab: p.codFab ?? '',
        descPro: p.descPro,
        cantidad: 1,
        precioUnitario: p.plisPro!,
        importe: p.plisPro!,
        stockMotorZone: data.stockMotorZone,
        totalStock: data.totalStock,
        stockPorAlmacen: data.porAlmacen,
        distribucion,
      }]);
    } catch { flash('Error al obtener stock.', 'err'); }
    setQueryProducto(''); setProductoResults([]);
  };

  const cambiarCantidad = (idFab: number, nuevaCantidad: number) => {
    if (nuevaCantidad < 1) return;
    setCarrito((prev) => prev.map((item) => {
      if (item.idFab !== idFab) return item;

      if (nuevaCantidad <= item.stockMotorZone) {
        return {
          ...item,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * item.precioUnitario,
          distribucion: [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: nuevaCantidad }],
        };
      }

      return {
        ...item,
        cantidad: nuevaCantidad,
        importe: nuevaCantidad * item.precioUnitario,
        distribucion: item.stockMotorZone > 0
          ? [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: item.stockMotorZone }]
          : [],
      };
    }));
  };

  const cambiarDistribucion = (idFab: number, codSuc: string, nomSuc: string, cantidadAlmacen: number) => {
    if (!codSuc) return;
    setCarrito((prev) => prev.map((item) => {
      if (item.idFab !== idFab) return item;
      let nuevaDistrib: DistribItem[];
      const existe = item.distribucion.find((d) => d.cod_suc === codSuc);
      if (existe) {
        nuevaDistrib = cantidadAlmacen > 0
          ? item.distribucion.map((d) => d.cod_suc === codSuc ? { ...d, cantidad: cantidadAlmacen } : d)
          : item.distribucion.filter((d) => d.cod_suc !== codSuc);
      } else {
        nuevaDistrib = cantidadAlmacen > 0
          ? [...item.distribucion, { cod_suc: codSuc, nomSuc, cantidad: cantidadAlmacen }]
          : item.distribucion;
      }
      const totalDistrib = nuevaDistrib.reduce((s, d) => s + d.cantidad, 0);
      return { ...item, distribucion: nuevaDistrib, cantidad: totalDistrib, importe: totalDistrib * item.precioUnitario };
    }));
  };

  const quitarDelCarrito = (idFab: number) => {
    setCarrito((prev) => prev.filter((i) => i.idFab !== idFab));
    if (expandedStock === idFab) setExpandedStock(null);
  };

  const getColorCantidad = (item: ItemCarrito) => {
    if (item.cantidad <= item.stockMotorZone) return '#1a7a40';
    if (item.cantidad <= item.totalStock) return '#e67e00';
    return BRAND.red;
  };

  const totalCarrito = carrito.reduce((sum, i) => sum + i.importe, 0);

  const confirmarVenta = async () => {
    if (!clienteSel) { flash('Seleccioná un cliente.', 'err'); return; }
    if (!carrito.length) { flash('El carrito está vacío.', 'err'); return; }

    for (const item of carrito) {
      if (item.cantidad > item.totalStock) {
        flash(`Stock insuficiente para "${item.descPro}". Disponible: ${item.totalStock}`, 'err');
        return;
      }
      const totalDistrib = item.distribucion.reduce((s, d) => s + d.cantidad, 0);
      if (totalDistrib !== item.cantidad) {
        flash(`La distribución de "${item.descPro}" no coincide. Distribuido: ${totalDistrib}, Pedido: ${item.cantidad}`, 'err');
        return;
      }
    }

    setLoading(true);
    try {
      const { data } = await api.post('/ventas', {
        cod_usu: usuario?.cod_usu,
        cod_cli: clienteSel.codCli,
        cod_suc: COD_SUC_MOTORZONE,
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
          distribucion: i.distribucion.map((d) => ({
            cod_suc: d.cod_suc,
            cantidad: d.cantidad,
          })),
        })),
      });

      flash(`Venta ${data.cod_venta} registrada correctamente.`);
      setCarrito([]);
      setClienteSel(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_CLI);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al registrar la venta.', 'err');
    } finally {
      setLoading(false);
    }
  };

  const cancelarVenta = () => {
    setCarrito([]);
    setClienteSel(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_CLI);
  };

  return (
    <div>
      {}
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
                  onChange={(e) => { setQueryCliente(e.target.value); buscarCliente(e.target.value); }}
                  placeholder="Ej: Juan, Pérez, Ferretería..."
                />
              </div>
            </div>
            {loadingCliente && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: BRAND.gray600 }}>Buscando…</div>
            )}
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
                    <i className="ti ti-user" style={{ color: BRAND.red, fontSize: 18 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nomCli} {c.apeCli}</div>
                      <div style={{ fontSize: 11, color: BRAND.gray600 }}>{c.razonSocial} · NIT: {c.numCiNit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffeaea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-user" style={{ color: BRAND.red, fontSize: 18 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {clienteSel.codCli === COD_CLI_OCASIONAL ? 'Cliente Ocasional' : `${clienteSel.nomCli} ${clienteSel.apeCli}`}
                </div>
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>{clienteSel.razonSocial} · NIT: {clienteSel.numCiNit}</div>
              </div>
            </div>
            <button style={btnStyle()} onClick={() => setClienteSel(null)}>
              <i className="ti ti-x" /> Cambiar
            </button>
          </div>
        )}
      </div>

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Agregar productos</div>
        <div style={{ position: 'relative' }}>
          <input
            style={S.input}
            value={queryProducto}
            onChange={(e) => handleProductoChange(e.target.value)}
            placeholder="Buscar por nombre, código, marca..."
          />
          {loadingProducto && <div style={{ padding: '8px 12px', fontSize: 12, color: BRAND.gray600 }}>Buscando…</div>}
          {productoResults.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: BRAND.white, border: `1px solid ${BRAND.gray200}`,
              borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              zIndex: 200, maxHeight: 320, overflowY: 'auto',
            }}>
              {productoResults.map((p) => (
                <div key={p.id} style={{
                  padding: '10px 14px', borderBottom: `1px solid ${BRAND.gray200}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descPro}</div>
                    <div style={{ fontSize: 11, color: BRAND.gray600 }}>{p.codPro} · {p.marca ?? '—'} · <strong>${p.plisPro?.toFixed(2) ?? '—'}</strong></div>
                  </div>
                  <button style={btnStyle('primary')} onClick={() => agregarAlCarrito(p)} disabled={!p.plisPro || !p.idFab}>
                    <i className="ti ti-plus" /> Agregar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {}
      {carrito.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Carrito — Motor Zone</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Producto</th>
                  <th style={{ ...S.th, textAlign: 'center', width: 160 }}>Cantidad</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Precio Unit.</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Importe</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((item) => {
                  const totalDistrib = item.distribucion.reduce((s, d) => s + d.cantidad, 0);
                  const distribOk = totalDistrib === item.cantidad;
                  return (
                    <>
                      <tr key={item.idFab} style={{ verticalAlign: 'top' }}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.descPro}</div>
                          <div style={{ fontSize: 11, color: BRAND.gray600 }}>{item.codFab}</div>
                          <div style={{ fontSize: 11, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: BRAND.gray600 }}>
                              MZ: <strong style={{ color: item.stockMotorZone > 0 ? '#1a7a40' : BRAND.red }}>{item.stockMotorZone}</strong>
                            </span>
                            <span style={{ color: BRAND.gray600 }}>
                              Total: <strong>{item.totalStock}</strong>
                            </span>
                            {item.cantidad > item.stockMotorZone && (
                              <button
                                onClick={() => setExpandedStock(expandedStock === item.idFab ? null : item.idFab)}
                                style={{
                                  background: 'none', border: `1px solid ${item.cantidad <= item.totalStock ? '#e67e00' : BRAND.red}`,
                                  borderRadius: 4, color: item.cantidad <= item.totalStock ? '#e67e00' : BRAND.red,
                                  fontSize: 10, cursor: 'pointer', padding: '1px 6px', fontFamily: 'inherit', fontWeight: 600,
                                }}
                              >
                                Stock actual {expandedStock === item.idFab ? '▲' : '▼'}
                              </button>
                            )}
                            {item.cantidad > item.stockMotorZone && !distribOk && (
                              <span style={{ color: '#e67e00', fontSize: 10, fontWeight: 600 }}>
                                ⚠ Distribuido: {totalDistrib}/{item.cantidad}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => cambiarCantidad(item.idFab, item.cantidad - 1)}
                              style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${BRAND.gray200}`, background: BRAND.white, cursor: 'pointer', fontSize: 14 }}
                            >−</button>
                            <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 15, color: getColorCantidad(item) }}>
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => cambiarCantidad(item.idFab, item.cantidad + 1)}
                              style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${BRAND.gray200}`, background: BRAND.white, cursor: 'pointer', fontSize: 14 }}
                            >+</button>
                          </div>
                        </td>

                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>${item.precioUnitario.toFixed(2)}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: BRAND.red }}>${item.importe.toFixed(2)}</td>
                        <td style={S.td}>
                          <button
                            onClick={() => quitarDelCarrito(item.idFab)}
                            style={{ background: '#ffeaea', border: 'none', cursor: 'pointer', color: BRAND.red, fontSize: 14, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </td>
                      </tr>

                      {expandedStock === item.idFab && (
                        <tr key={`${item.idFab}-dist`}>
                          <td colSpan={5} style={{ ...S.td, background: '#fffbf0', padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#e67e00', marginBottom: 8 }}>
                              Stock actual — ingresá cuántas unidades tomar de cada almacén
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {item.stockPorAlmacen.map((alm) => {
                                const distrib = item.distribucion.find((d) => d.cod_suc === alm.codSuc);
                                return (
                                  <div key={alm.codSuc} style={{
                                    border: `1px solid ${BRAND.gray200}`, borderRadius: 8,
                                    padding: '8px 12px', background: BRAND.white, minWidth: 160,
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray600, marginBottom: 4 }}>{alm.nomSuc}</div>
                                    <div style={{ fontSize: 11, color: BRAND.gray600, marginBottom: 6 }}>
                                      Disponible: <strong style={{ color: '#1a7a40' }}>{alm.cantidad}</strong>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <label style={{ fontSize: 10, color: BRAND.gray600 }}>Tomar:</label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={alm.cantidad}
                                        value={distrib?.cantidad ?? 0}
                                        onChange={(e) => cambiarDistribucion(
                                          item.idFab, alm.codSuc, alm.nomSuc,
                                          Math.min(Math.max(0, Number(e.target.value)), alm.cantidad)
                                        )}
                                        style={{
                                          width: 60, padding: '3px 6px', borderRadius: 4,
                                          border: `1px solid ${BRAND.gray200}`, fontSize: 12,
                                          fontFamily: 'inherit', textAlign: 'center',
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                              Distribuido:{' '}
                              <strong style={{ color: distribOk ? '#1a7a40' : '#e67e00' }}>
                                {totalDistrib}
                              </strong>
                              {' '}/ {item.cantidad} unidades
                              {distribOk && <span style={{ color: '#1a7a40', marginLeft: 6 }}>✓ Completo</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BRAND.gray200}` }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Total: <span style={{ color: BRAND.red }}>${totalCarrito.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {}
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

      {}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button style={btnStyle()} onClick={cancelarVenta} disabled={loading}>
          <i className="ti ti-x" /> Cancelar
        </button>
        <button
          style={btnStyle('primary')}
          onClick={confirmarVenta}
          disabled={loading || !carrito.length || !clienteSel}
        >
          <i className="ti ti-check" />
          {loading ? 'Registrando…' : `Confirmar venta · $${totalCarrito.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}