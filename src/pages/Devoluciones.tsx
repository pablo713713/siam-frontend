import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';

interface ItemVenta {
  idFab: number;
  codFab: string;
  cantidad: number;
  precioVenta: number;
  descPro: string;
  codPro: string;
}

interface VentaDetalle {
  codVenta: string;
  fecha: string;
  total: number;
  estado: string;
  obs: string | null;
  codCli: number | null;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
  numCiNit: string | null;
  codUsu: string;
  items: ItemVenta[];
}

interface ItemDevolucion {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidadVendida: number;
  precioVenta: number;
  cantidadDevolver: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(n);

const fmtDateTime = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function nombreCliente(v: VentaDetalle) {
  if (v.razonSocial) return v.razonSocial;
  const partes = [v.nomCliente, v.apeCliente].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Cliente ocasional';
}

export function Devoluciones() {
  const { usuario } = useAuth();

  const [codVentaInput, setCodVentaInput] = useState('');
  const [venta, setVenta] = useState<VentaDetalle | null>(null);
  const [loadingVenta, setLoadingVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState('');

  const [items, setItems] = useState<ItemDevolucion[]>([]);
  const [obs, setObs] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Buscar venta ──
  const buscarVenta = async () => {
    const cod = codVentaInput.trim().toUpperCase();
    if (!cod) return;
    setLoadingVenta(true);
    setErrorVenta('');
    setVenta(null);
    setItems([]);
    setResultado(null);

    try {
      const { data } = await api.get<VentaDetalle>(`/ventas/${cod}`);
      setVenta(data);

      setItems(
        data.items.map(it => ({
          idFab: it.idFab,
          codFab: it.codFab,
          descPro: it.descPro,
          cantidadVendida: Number(it.cantidad),
          precioVenta: Number(it.precioVenta),
          cantidadDevolver: 0,
        })),
      );
    } catch (e: any) {
      setErrorVenta(e?.response?.data?.message ?? 'Venta no encontrada.');
    } finally {
      setLoadingVenta(false);
    }
  };

  const setCantidad = (idFab: number, val: number) => {
    setItems(prev =>
      prev.map(it =>
        it.idFab === idFab
          ? { ...it, cantidadDevolver: Math.max(0, Math.min(val, it.cantidadVendida)) }
          : it,
      ),
    );
  };

  const totalDevolver = items.reduce((s, it) => s + it.cantidadDevolver * it.precioVenta, 0);
  const itemsSeleccionados = items.filter(it => it.cantidadDevolver > 0);

  const procesar = async () => {
    if (!venta || itemsSeleccionados.length === 0) return;
    if (!window.confirm(`¿Confirmar devolución de ${itemsSeleccionados.length} producto(s) por ${fmtMoney(totalDevolver)}?`)) return;

    setProcesando(true);
    setResultado(null);

    try {
      await api.post('/devoluciones', {
        cod_venta: venta.codVenta,
        cod_usu: usuario?.cod_usu ?? '0000001',
        obs: obs.trim() || undefined,
        items: itemsSeleccionados.map(it => ({
          id_fab: it.idFab,
          cod_fab: it.codFab,
          cantidad: it.cantidadDevolver,
        })),
      });

      setResultado({ ok: true, msg: `Devolución registrada correctamente. Se procesaron ${itemsSeleccionados.length} producto(s) por ${fmtMoney(totalDevolver)}.` });
      setItems(prev => prev.map(it => ({ ...it, cantidadDevolver: 0 })));
      setObs('');
    } catch (e: any) {
      setResultado({ ok: false, msg: e?.response?.data?.message ?? 'Error al procesar la devolución.' });
    } finally {
      setProcesando(false);
    }
  };

  const limpiar = () => {
    setVenta(null);
    setItems([]);
    setCodVentaInput('');
    setErrorVenta('');
    setResultado(null);
    setObs('');
  };

  return (
    <div>
      {}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Devoluciones</div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Busca una venta e indica qué productos y cantidades devuelve el cliente.
        </div>
      </div>

      {}
      <div style={{ ...S.card, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={S.label}>Código de Venta</label>
          <input
            style={{ ...S.input, fontFamily: 'monospace', letterSpacing: 0.5 }}
            placeholder="Ej: 00011012026050001"
            value={codVentaInput}
            onChange={e => setCodVentaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscarVenta()}
          />
        </div>
        <button style={btnStyle('primary')} onClick={buscarVenta} disabled={loadingVenta}>
          <i className="ti ti-search" />
          {loadingVenta ? 'Buscando…' : 'Buscar venta'}
        </button>
        {venta && (
          <button style={btnStyle('secondary')} onClick={limpiar}>
            <i className="ti ti-refresh" /> Nueva búsqueda
          </button>
        )}
      </div>

      {}
      {errorVenta && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{errorVenta}
        </div>
      )}

      {}
      {resultado && (
        <div
          style={{
            ...S.card,
            borderLeft: `4px solid ${resultado.ok ? '#1a7a40' : BRAND.red}`,
            color: resultado.ok ? '#1a7a40' : BRAND.red,
            display: 'flex', gap: 8, alignItems: 'center',
          }}
        >
          <i className={`ti ${resultado.ok ? 'ti-circle-check' : 'ti-alert-circle'}`} />
          {resultado.msg}
        </div>
      )}

      {venta && (
        <>
          {}
          <div
            style={{
              ...S.card,
              borderLeft: `4px solid ${venta.estado === 'A' ? BRAND.red : BRAND.red}`,
              display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: BRAND.black }}>
                  {venta.codVenta}
                </span>
                {venta.estado === 'A'
                  ? <span style={badgeStyle('red')}>Anulada</span>
                  : <span style={badgeStyle('green')}>Vigente</span>
                }
              </div>
              <table style={{ ...S.table, maxWidth: 500, fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, width: 130, fontSize: 12 }}>Cliente</td>
                    <td style={S.td}>{nombreCliente(venta)}</td>
                  </tr>
                  {venta.numCiNit && (
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>CI / NIT</td>
                      <td style={S.td}>{venta.numCiNit}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Fecha</td>
                    <td style={S.td}>{fmtDateTime(venta.fecha)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Total original</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmtMoney(Number(venta.total))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {}
          {venta.estado === 'A' && (
            <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, background: '#ffeaea' }}>
              <div style={{ color: BRAND.red, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="ti ti-ban" />
                Esta venta está anulada. No se pueden registrar devoluciones.
              </div>
            </div>
          )}

          {}
          {venta.estado !== 'A' && (
            <>
              <div style={S.card}>
                <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-arrow-back-up" style={{ color: BRAND.red, fontSize: 15 }} />
                  Selecciona los productos a devolver
                </div>
                <div style={{ fontSize: 13, color: BRAND.gray600, marginBottom: 16 }}>
                  Ingresa la cantidad a devolver de cada producto. Deja en 0 los que no se devuelven.
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Producto', 'Código', 'Cant. vendida', 'Precio unit.', 'Devolver', 'Subtotal devolución'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => {
                        const subtotal = it.cantidadDevolver * it.precioVenta;
                        const activo = it.cantidadDevolver > 0;
                        return (
                          <tr
                            key={it.idFab}
                            style={{
                              background: activo ? '#e6f9ee' : i % 2 === 0 ? BRAND.white : BRAND.gray50,
                              transition: 'background 0.15s',
                            }}
                          >
                            <td style={S.td}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                            </td>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>
                              {it.codFab}
                            </td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              <span style={badgeStyle('gray')}>{it.cantidadVendida}</span>
                            </td>
                            <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtMoney(it.precioVenta)}</td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <button
                                  onClick={() => setCantidad(it.idFab, it.cantidadDevolver - 1)}
                                  disabled={it.cantidadDevolver <= 0}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${BRAND.gray200}`,
                                    background: BRAND.white, cursor: 'pointer', fontWeight: 700, fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: it.cantidadDevolver <= 0 ? BRAND.gray400 : BRAND.black,
                                  }}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={it.cantidadVendida}
                                  value={it.cantidadDevolver}
                                  onChange={e => setCantidad(it.idFab, parseInt(e.target.value) || 0)}
                                  style={{
                                    width: 52, textAlign: 'center' as const, padding: '5px 4px',
                                    border: `1px solid ${activo ? '#1a7a40' : BRAND.gray200}`,
                                    borderRadius: 6, fontSize: 13, fontWeight: 700,
                                    color: activo ? '#1a7a40' : BRAND.black, background: BRAND.white,
                                    outline: 'none', fontFamily: 'inherit',
                                  }}
                                />
                                <button
                                  onClick={() => setCantidad(it.idFab, it.cantidadDevolver + 1)}
                                  disabled={it.cantidadDevolver >= it.cantidadVendida}
                                  style={{
                                    width: 28, height: 28, borderRadius: 6, border: `1px solid ${BRAND.gray200}`,
                                    background: BRAND.white, cursor: 'pointer', fontWeight: 700, fontSize: 16,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: it.cantidadDevolver >= it.cantidadVendida ? BRAND.gray400 : BRAND.black,
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: activo ? 700 : 400, color: activo ? '#1a7a40' : BRAND.gray400 }}>
                              {subtotal > 0 ? fmtMoney(subtotal) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {}
              <div style={S.card}>
                <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-clipboard-check" style={{ color: BRAND.red, fontSize: 15 }} />
                  Confirmar devolución
                </div>

                {}
                <div
                  style={{
                    background: itemsSeleccionados.length > 0 ? '#e6f9ee' : BRAND.gray50,
                    border: `1px solid ${itemsSeleccionados.length > 0 ? '#9be0b5' : BRAND.gray200}`,
                    borderRadius: 8, padding: '14px 16px', marginBottom: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Productos a devolver
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.black }}>
                      {itemsSeleccionados.length} producto{itemsSeleccionados.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 12, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      Total a reembolsar
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: itemsSeleccionados.length > 0 ? '#1a7a40' : BRAND.gray400 }}>
                      {fmtMoney(totalDevolver)}
                    </div>
                  </div>
                </div>

                {}
                <div style={S.formGroup}>
                  <label style={S.label}>Observación (opcional)</label>
                  <textarea
                    value={obs}
                    onChange={e => setObs(e.target.value)}
                    placeholder="Motivo de la devolución, estado del producto, etc."
                    rows={2}
                    style={{
                      ...S.input as React.CSSProperties,
                      resize: 'vertical',
                      minHeight: 64,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    style={btnStyle('primary')}
                    onClick={procesar}
                    disabled={procesando || itemsSeleccionados.length === 0}
                  >
                    <i className={`ti ${procesando ? 'ti-loader-2' : 'ti-arrow-back-up'}`} />
                    {procesando ? 'Procesando…' : 'Registrar devolución'}
                  </button>
                  {itemsSeleccionados.length === 0 && (
                    <span style={{ fontSize: 12, color: BRAND.gray600 }}>
                      Selecciona al menos un producto para devolver.
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
