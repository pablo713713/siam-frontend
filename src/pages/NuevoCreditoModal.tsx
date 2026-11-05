import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import css from './Creditos.module.css';
import type { ClienteCredito, Producto } from '../types';

const COD_SUC_MOTORZONE = '00011';
const PLAZO_DEFAULT = 4;

interface StockAlmacen { codSuc: string; nomSuc: string; cantidad: number; }
interface StockFab { idFab: number; stockMotorZone: number; totalStock: number; porAlmacen: StockAlmacen[]; }
interface DistribItem { cod_suc: string; nomSuc: string; cantidad: number; }

interface ItemCarritoCredito {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidad: number;
  precioUnitario: number;
  precioOriginal: number;
  importe: number;
  stockMotorZone: number;
  totalStock: number;
  stockPorAlmacen: StockAlmacen[];
  distribucion: DistribItem[];
}

interface Props {
  clientesHabilitados: ClienteCredito[];
  onClose: () => void;
  onCreated: () => void;
  codUsu: string;
}

export function NuevoCreditoModal({ clientesHabilitados, onClose, onCreated, codUsu }: Props) {
  const [clienteSel, setClienteSel] = useState<ClienteCredito | null>(null);
  const [buscarCli, setBuscarCli] = useState('');
  const [carrito, setCarrito] = useState<ItemCarritoCredito[]>([]);
  const [semanasPlazo, setSemanasPlazo] = useState(PLAZO_DEFAULT);
  const [tipoCambio, setTipoCambio] = useState(1);
  const [queryProducto, setQueryProducto] = useState('');
  const [productoResults, setProductoResults] = useState<Producto[]>([]);
  const [loadingProducto, setLoadingProducto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get('/ventas/dolar-paralelo/vigente', { params: { cod_emp: '001' } })
      .then(({ data }) => setTipoCambio(Number(data.tipoCambio) || 1))
      .catch(() => setTipoCambio(1));
  }, []);

  const clientesFiltrados = clientesHabilitados.filter((c) => {
    const term = buscarCli.trim().toLowerCase();
    if (!term) return false;
    const nombre = c.razonSocial || `${c.nomCliente ?? ''} ${c.apeCliente ?? ''}`;
    return `${nombre} ${c.codCli}`.toLowerCase().includes(term);
  });

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
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
        precioOriginal: p.plisPro!,
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
      const distribucion = nuevaCantidad <= item.stockMotorZone
        ? [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: nuevaCantidad }]
        : item.stockMotorZone > 0
        ? [{ cod_suc: COD_SUC_MOTORZONE, nomSuc: 'MOTOR ZONE', cantidad: item.stockMotorZone }]
        : [];
      return { ...item, cantidad: nuevaCantidad, importe: nuevaCantidad * item.precioUnitario, distribucion };
    }));
  };

  const cambiarPrecio = (idFab: number, nuevoPrecioBs: number) => {
    if (nuevoPrecioBs < 0) return;
    const nuevoPrecioUSD = tipoCambio > 0 ? nuevoPrecioBs / tipoCambio : 0;
    setCarrito((prev) => prev.map((item) =>
      item.idFab !== idFab ? item : { ...item, precioUnitario: nuevoPrecioUSD, importe: item.cantidad * nuevoPrecioUSD }
    ));
  };

  const quitarDelCarrito = (idFab: number) => setCarrito((prev) => prev.filter((i) => i.idFab !== idFab));

  const totalCarritoBs = carrito.reduce((sum, i) => sum + i.importe * tipoCambio, 0);

  const crearCredito = async () => {
    if (!clienteSel) { flash('Seleccioná un cliente habilitado para crédito.', 'err'); return; }
    if (!carrito.length) { flash('El carrito está vacío.', 'err'); return; }
    for (const item of carrito) {
      if (item.cantidad > item.totalStock) {
        flash(`Stock insuficiente para "${item.descPro}". Disponible: ${item.totalStock}`, 'err');
        return;
      }
      const totalDistrib = item.distribucion.reduce((s, d) => s + d.cantidad, 0);
      if (totalDistrib !== item.cantidad) {
        flash(`La distribución de "${item.descPro}" no coincide.`, 'err');
        return;
      }
    }
    setLoading(true);
    try {
      const { data } = await api.post('/creditos', {
        cod_usu: codUsu,
        cod_cli: clienteSel.codCli,
        cod_suc: COD_SUC_MOTORZONE,
        semanasPlazo,
        descuento: 0,
        obs: '',
        items: carrito.map((i) => ({
          id_fab: i.idFab,
          cod_fab: i.codFab,
          cantidad: i.cantidad,
          precio_cre: i.precioUnitario * tipoCambio,
          distribucion: i.distribucion.map((d) => ({ cod_suc: d.cod_suc, cantidad: d.cantidad })),
        })),
      });
      flash(`Crédito ${data.cod_cre} registrado correctamente.`);
      onCreated();
      setTimeout(onClose, 800);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al registrar el crédito.', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>Nueva venta a crédito</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#777' }}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Cliente */}
          <div style={{ marginBottom: 18 }}>
            <label className={css.panelHint} style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Cliente (obligatorio)</label>
            {!clienteSel ? (
              <>
                <input
                  className={css.search}
                  style={{ marginTop: 0 }}
                  value={buscarCli}
                  onChange={(e) => setBuscarCli(e.target.value)}
                  placeholder="Buscar cliente habilitado por nombre o código"
                />
                {clientesFiltrados.length > 0 && (
                  <div style={{ border: '1px solid #eee', borderRadius: 6, marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {clientesFiltrados.map((c) => {
                      const nombre = c.razonSocial || `${c.nomCliente ?? ''} ${c.apeCliente ?? ''}`;
                      return (
                        <div key={c.codCli} onClick={() => { setClienteSel(c); setBuscarCli(''); }}
                          style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{nombre}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>Código {c.codCli} · Disponible {c.disponible.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #eee', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{clienteSel.razonSocial || `${clienteSel.nomCliente ?? ''} ${clienteSel.apeCliente ?? ''}`}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Cupo disponible: {clienteSel.disponible.toFixed(2)}</div>
                </div>
                <button onClick={() => setClienteSel(null)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>Cambiar</button>
              </div>
            )}
          </div>

          {/* Plazo */}
          <div style={{ marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className={css.panelHint} style={{ fontWeight: 700 }}>Plazo (semanas)</label>
            <input
              type="number" min={1} value={semanasPlazo}
              onChange={(e) => setSemanasPlazo(Math.max(1, Number(e.target.value)))}
              style={{ width: 70, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 5, fontSize: 13, fontFamily: 'inherit' }}
            />
          </div>

          {/* Productos */}
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <label className={css.panelHint} style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Agregar productos</label>
            <input className={css.search} style={{ marginTop: 0 }} value={queryProducto}
              onChange={(e) => handleProductoChange(e.target.value)}
              placeholder="Buscar por nombre, código, marca..."
            />
            {loadingProducto && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Buscando…</div>}
            {productoResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #eee', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 10, maxHeight: 260, overflowY: 'auto' }}>
                {productoResults.map((p) => (
                  <div key={p.idFab} style={{ padding: '10px 12px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descPro}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{p.codFab} · ${p.plisPro?.toFixed(2) ?? '—'}</div>
                    </div>
                    <button onClick={() => agregarAlCarrito(p)} disabled={!p.plisPro || !p.idFab}
                      style={{ background: '#d72626', color: '#fff', border: 'none', borderRadius: 5, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrito */}
          {carrito.length > 0 && (
            <div className={css.tableWrap} style={{ marginBottom: 16 }}>
              <table className={css.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'center' }}>Cant.</th>
                    <th style={{ textAlign: 'right' }}>Precio Bs</th>
                    <th style={{ textAlign: 'right' }}>Importe Bs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((item) => (
                    <tr key={item.idFab}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.descPro}</div>
                        <div style={{ fontSize: 10, color: '#888' }}>MZ: {item.stockMotorZone} · Total: {item.totalStock}</div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="number" min={1} value={item.cantidad}
                          onChange={(e) => cambiarCantidad(item.idFab, Math.max(1, Number(e.target.value)))}
                          style={{ width: 50, textAlign: 'center', border: '1px solid #ddd', borderRadius: 4, padding: '3px 4px', fontFamily: 'inherit' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input type="number" min={0} step="0.01" value={(item.precioUnitario * tipoCambio).toFixed(2)}
                          onChange={(e) => cambiarPrecio(item.idFab, Number(e.target.value))}
                          style={{ width: 85, textAlign: 'right', border: '1px solid #ddd', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit' }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>Bs {(item.importe * tipoCambio).toFixed(2)}</td>
                      <td>
                        <button onClick={() => quitarDelCarrito(item.idFab)} style={{ background: 'none', border: 'none', color: '#d72626', cursor: 'pointer' }}>
                          <i className="ti ti-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {msg && (
            <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 14, fontSize: 12, fontWeight: 600, background: msg.type === 'ok' ? '#ecfaf1' : '#fff0f0', color: msg.type === 'ok' ? '#1b7540' : '#a51d1d' }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className={css.totalLabel}>Total</span>
              <div className={css.totalValue}>Bs {totalCarritoBs.toFixed(2)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} disabled={loading} style={{ border: '1px solid #ddd', background: '#fff', borderRadius: 6, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={crearCredito} disabled={loading || !carrito.length || !clienteSel} className={css.payButton}>
                {loading ? 'Registrando…' : 'Registrar crédito'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}