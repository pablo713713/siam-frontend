import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';

type TipoDocumento = 'VENTA' | 'CREDITO';

interface ItemDoc {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidadDisponible: number; // cantidad vendida (venta) o disponible a devolver (crédito)
  precioUnit: number;
}

interface Documento {
  tipo: TipoDocumento;
  codigo: string;
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
  codSuc: string | null; // solo relevante para crédito, requerido al devolver
  saldo?: number; // solo crédito
  items: ItemDoc[];
}

interface ItemDevolucion extends ItemDoc {
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

function nombreCliente(v: Documento) {
  if (v.razonSocial && v.razonSocial.trim().toUpperCase() !== 'NINGUNO') return v.razonSocial;
  const partes = [v.nomCliente, v.apeCliente].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Cliente ocasional';
}

function detectarTipo(cod: string): TipoDocumento | null {
  const len = cod.trim().length;
  if (len === 14) return 'VENTA';
  if (len === 13) return 'CREDITO';
  return null;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
};

const modalStyle: React.CSSProperties = {
  background: BRAND.white, borderRadius: 12, padding: '28px 32px', maxWidth: 440, width: '100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 20,
};

export function Devoluciones() {
  const { usuario } = useAuth();

  const [codInput, setCodInput] = useState('');
  const [doc, setDoc] = useState<Documento | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState('');

  const [items, setItems] = useState<ItemDevolucion[]>([]);
  const [obs, setObs] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExito, setShowExito] = useState(false);
  const [exitoMsg, setExitoMsg] = useState('');
  const [errorProceso, setErrorProceso] = useState('');

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscarDocumento = async (val: string) => {
    const cod = val.trim().toUpperCase();
    if (debounce.current) clearTimeout(debounce.current);
    if (!cod) { setDoc(null); setItems([]); setErrorDoc(''); return; }

    const tipo = detectarTipo(cod);
    if (!tipo) {
      // Sigue tipeando, no mostramos error hasta que tenga longitud razonable
      if (cod.length >= 13) {
        setErrorDoc('Código inválido: debe tener 13 caracteres (crédito) o 14 (venta).');
      }
      setDoc(null);
      setItems([]);
      return;
    }

    debounce.current = setTimeout(async () => {
      setLoadingDoc(true);
      setErrorDoc('');
      setDoc(null);
      setItems([]);
      setErrorProceso('');

      try {
        if (tipo === 'VENTA') {
          const { data } = await api.get(`/ventas/${cod}`);
          const documento: Documento = {
            tipo: 'VENTA',
            codigo: data.codVenta,
            fecha: data.fecha,
            total: Number(data.total),
            estado: data.estado,
            obs: data.obs,
            codCli: data.codCli,
            nomCliente: data.nomCliente,
            apeCliente: data.apeCliente,
            razonSocial: data.razonSocial,
            numCiNit: data.numCiNit,
            codUsu: data.codUsu,
            codSuc: null,
            items: data.items.map((it: any) => ({
              idFab: it.idFab,
              codFab: it.codFab,
              descPro: it.descPro,
              cantidadDisponible: Number(it.cantidad),
              precioUnit: Number(it.precioVenta),
            })),
          };
          setDoc(documento);
          setItems(documento.items.map(it => ({ ...it, cantidadDevolver: 0 })));
        } else {
          const { data } = await api.get(`/creditos/${cod}`);
          const documento: Documento = {
            tipo: 'CREDITO',
            codigo: data.codCre,
            fecha: data.fecInicio,
            total: Number(data.total),
            estado: data.estado,
            obs: data.obs,
            codCli: data.codCli,
            nomCliente: data.nomCliente,
            apeCliente: data.apeCliente,
            razonSocial: data.razonSocial,
            numCiNit: data.numCiNit,
            codUsu: data.codUsu,
            codSuc: data.codSuc,
            saldo: Number(data.saldo),
            items: data.items.map((it: any) => ({
              idFab: it.idFab,
              codFab: it.codFab,
              descPro: it.descPro,
              cantidadDisponible: Number(it.cantidadDisponible),
              precioUnit: Number(it.precioCre),
            })),
          };
          setDoc(documento);
          setItems(documento.items.map(it => ({ ...it, cantidadDevolver: 0 })));
        }
      } catch (e: any) {
        setErrorDoc(e?.response?.data?.message ?? `${tipo === 'VENTA' ? 'Venta' : 'Crédito'} no encontrado.`);
      } finally {
        setLoadingDoc(false);
      }
    }, 500);
  };

  const setCantidad = (idFab: number, val: number) => {
    setItems(prev =>
      prev.map(it =>
        it.idFab === idFab
          ? { ...it, cantidadDevolver: Math.max(0, Math.min(val, it.cantidadDisponible)) }
          : it,
      ),
    );
  };

  const totalDevolver = items.reduce((s, it) => s + it.cantidadDevolver * it.precioUnit, 0);
  const itemsSeleccionados = items.filter(it => it.cantidadDevolver > 0);

  const documentoBloqueado = doc
    ? (doc.tipo === 'VENTA' ? doc.estado === 'A' : doc.estado !== 'A')
    : false;

  const abrirConfirm = () => {
    if (!doc || itemsSeleccionados.length === 0) return;
    setErrorProceso('');
    setShowConfirm(true);
  };

  const procesar = async () => {
    if (!doc || itemsSeleccionados.length === 0) return;
    setShowConfirm(false);
    setProcesando(true);
    setErrorProceso('');

    try {
      if (doc.tipo === 'VENTA') {
        await api.post('/devoluciones', {
          cod_venta: doc.codigo,
          cod_usu: usuario?.cod_usu ?? '0000001',
          obs: obs.trim() || undefined,
          items: itemsSeleccionados.map(it => ({
            id_fab: it.idFab,
            cod_fab: it.codFab,
            cantidad: it.cantidadDevolver,
          })),
        });

        setExitoMsg(
          `Devolución realizada correctamente. ${itemsSeleccionados.length} producto${itemsSeleccionados.length !== 1 ? 's' : ''} por ${fmtMoney(totalDevolver)}.`,
        );
      } else {
        const { data } = await api.post(`/creditos/${doc.codigo}/devolucion`, {
          cod_suc: doc.codSuc,
          obs: obs.trim() || undefined,
          items: itemsSeleccionados.map(it => ({
            id_fab: it.idFab,
            cod_fab: it.codFab,
            cantidad: it.cantidadDevolver,
            total: it.cantidadDevolver * it.precioUnit,
          })),
        });

        const cierre = data.estado === 'C' ? ' El crédito quedó saldado por completo.' : '';
        setExitoMsg(
          `Devolución realizada correctamente. ${itemsSeleccionados.length} producto${itemsSeleccionados.length !== 1 ? 's' : ''} por ${fmtMoney(totalDevolver)}. ` +
          `Nuevo saldo del crédito: ${fmtMoney(Number(data.nuevoSaldo))}.${cierre}`,
        );
      }

      setItems(prev =>
        prev.map(it => ({
          ...it,
          cantidadDisponible: it.cantidadDisponible - it.cantidadDevolver,
          cantidadDevolver: 0,
        })),
      );

      setDoc(prev =>
        prev
          ? { ...prev, total: Number(prev.total) - totalDevolver }
          : prev,
      );

      setObs('');
      setShowExito(true);
    } catch (e: any) {
      setErrorProceso(e?.response?.data?.message ?? 'Error al procesar la devolución.');
    } finally {
      setProcesando(false);
    }
  };

  const limpiar = () => {
    setDoc(null);
    setItems([]);
    setCodInput('');
    setErrorDoc('');
    setErrorProceso('');
    setObs('');
  };

  return(
    <div>
      {showConfirm &&(
        <div style={overlayStyle} onClick={() => setShowConfirm(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffeaea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-arrow-back-up" style={{ color: BRAND.red, fontSize: 20 }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: BRAND.black }}>
                  Confirmar devolución
                </div>
              </div>
              <div style={{ fontSize: 14, color: BRAND.gray600, lineHeight: 1.6 }}>
                ¿Querés realizar la siguiente devolución{doc?.tipo === 'CREDITO' ? ' sobre este crédito' : ''}?
              </div>
            </div>

            <div style={{ background: BRAND.gray50, border: `1px solid ${BRAND.gray200}`, borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {itemsSeleccionados.map(it => (
                <div key={it.idFab} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: BRAND.black, fontWeight: 600 }}>
                    {it.descPro}
                    <span style={{ fontWeight: 400, color: BRAND.gray600 }}> × {it.cantidadDevolver}</span>
                  </span>
                  <span style={{ fontWeight: 700, color: '#1a7a40' }}>
                    {fmtMoney(it.cantidadDevolver * it.precioUnit)}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BRAND.gray200}`, marginTop: 6, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
                <span>Total a reembolsar</span>
                <span style={{ color: '#1a7a40' }}>{fmtMoney(totalDevolver)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnStyle('secondary')} onClick={() => setShowConfirm(false)}>No</button>
              <button style={btnStyle('primary')} onClick={procesar}>
                <i className="ti ti-check" /> Sí, devolver
              </button>
            </div>
          </div>
        </div>
      )}

      {showExito && (
        <div style={overlayStyle} onClick={() => setShowExito(false)}>
          <div style={{ ...modalStyle, alignItems: 'center', textAlign: 'center' as const }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#e6f9ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-circle-check" style={{ color: '#1a7a40', fontSize: 32 }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.black, marginBottom: 6 }}>Devolución realizada</div>
              <div style={{ fontSize: 14, color: BRAND.gray600, lineHeight: 1.6 }}>{exitoMsg}</div>
            </div>
            <button style={{ ...btnStyle('primary'), width: '100%', justifyContent: 'center' }} onClick={() => setShowExito(false)}>
              Aceptar
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Devoluciones</div>
        
      </div>

      <div style={{ ...S.card, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={S.label}>Código de Venta o Crédito</label>
          <input
            style={{ ...S.input, fontFamily: 'monospace', letterSpacing: 0.5 }}
            placeholder="Ej: 00000012026012 (venta) o 1010120260001 (crédito)"
            value={codInput}
            onChange={e => { setCodInput(e.target.value); buscarDocumento(e.target.value); }}
          />
        </div>
        {loadingDoc && (
          <span style={{ fontSize: 12, color: BRAND.gray600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-loader-2" /> Buscando…
          </span>
        )}
        {doc && (
          <button style={btnStyle('secondary')} onClick={limpiar}>
            <i className="ti ti-x" /> Limpiar
          </button>
        )}
      </div>

      {errorDoc && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{errorDoc}
        </div>
      )}

      {errorProceso && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{errorProceso}
        </div>
      )}

      {doc && (
        <>
          <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: BRAND.black }}>
                  {doc.codigo}
                </span>
                <span style={badgeStyle('gray')}>{doc.tipo === 'VENTA' ? 'Venta' : 'Crédito'}</span>
                {documentoBloqueado
                  ? <span style={badgeStyle('red')}>{doc.tipo === 'VENTA' ? 'Anulada' : 'No activo'}</span>
                  : <span style={badgeStyle('green')}>Vigente</span>
                }
              </div>
              <table style={{ ...S.table, maxWidth: 500, fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, width: 130, fontSize: 12 }}>Cliente</td>
                    <td style={S.td}>{nombreCliente(doc)}</td>
                  </tr>
                  {doc.numCiNit && (
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>CI / NIT</td>
                      <td style={S.td}>{doc.numCiNit}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Fecha</td>
                    <td style={S.td}>{fmtDateTime(doc.fecha)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Total original</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmtMoney(Number(doc.total))}</td>
                  </tr>
                  {doc.tipo === 'CREDITO' && (
                    <tr>
                      <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Saldo pendiente</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{fmtMoney(Number(doc.saldo))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {documentoBloqueado && (
            <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, background: '#ffeaea' }}>
              <div style={{ color: BRAND.red, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="ti ti-ban" />
                {doc.tipo === 'VENTA'
                  ? 'Esta venta está anulada. No se pueden registrar devoluciones.'
                  : 'Este crédito no está activo (ya fue pagado o cancelado). No se pueden registrar devoluciones.'}
              </div>
            </div>
          )}

          {!documentoBloqueado && (
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
                        {['Producto', 'Código', doc.tipo === 'VENTA' ? 'Cant. vendida' : 'Cant. disponible', 'Precio unit.', 'Devolver', 'Subtotal devolución'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => {
                        const subtotal = it.cantidadDevolver * it.precioUnit;
                        const activo = it.cantidadDevolver > 0;
                        return (
                          <tr key={it.idFab} style={{ background: activo ? '#e6f9ee' : i % 2 === 0 ? BRAND.white : BRAND.gray50, transition: 'background 0.15s' }}>
                            <td style={S.td}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                            </td>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>{it.codFab}</td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              <span style={badgeStyle('gray')}>{it.cantidadDisponible}</span>
                            </td>
                            <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtMoney(it.precioUnit)}</td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <button
                                  onClick={() => setCantidad(it.idFab, it.cantidadDevolver - 1)}
                                  disabled={it.cantidadDevolver <= 0}
                                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BRAND.gray200}`, background: BRAND.white, cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.cantidadDevolver <= 0 ? BRAND.gray400 : BRAND.black }}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={it.cantidadDisponible}
                                  value={it.cantidadDevolver}
                                  onChange={e => setCantidad(it.idFab, parseInt(e.target.value) || 0)}
                                  style={{ width: 52, textAlign: 'center' as const, padding: '5px 4px', border: `1px solid ${activo ? '#1a7a40' : BRAND.gray200}`, borderRadius: 6, fontSize: 13, fontWeight: 700, color: activo ? '#1a7a40' : BRAND.black, background: BRAND.white, outline: 'none', fontFamily: 'inherit' }}
                                />
                                <button
                                  onClick={() => setCantidad(it.idFab, it.cantidadDevolver + 1)}
                                  disabled={it.cantidadDevolver >= it.cantidadDisponible}
                                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BRAND.gray200}`, background: BRAND.white, cursor: 'pointer', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.cantidadDevolver >= it.cantidadDisponible ? BRAND.gray400 : BRAND.black }}
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

              <div style={S.card}>
                <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-clipboard-check" style={{ color: BRAND.red, fontSize: 15 }} />
                  Confirmar devolución
                </div>

                <div style={{ background: itemsSeleccionados.length > 0 ? '#e6f9ee' : BRAND.gray50, border: `1px solid ${itemsSeleccionados.length > 0 ? '#9be0b5' : BRAND.gray200}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Productos a devolver</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: BRAND.black }}>
                      {itemsSeleccionados.length} producto{itemsSeleccionados.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 12, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Total a reembolsar</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: itemsSeleccionados.length > 0 ? '#1a7a40' : BRAND.gray400 }}>
                      {fmtMoney(totalDevolver)}
                    </div>
                  </div>
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>Observación (opcional)</label>
                  <textarea
                    value={obs}
                    onChange={e => setObs(e.target.value)}
                    placeholder="Motivo de la devolución, estado del producto, etc."
                    rows={2}
                    style={{ ...S.input as React.CSSProperties, resize: 'vertical', minHeight: 64 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button style={btnStyle('primary')} onClick={abrirConfirm} disabled={procesando || itemsSeleccionados.length === 0}>
                    <i className={`ti ${procesando ? 'ti-loader-2' : 'ti-arrow-back-up'}`} />
                    {procesando ? 'Procesando…' : 'Registrar devolución'}
                  </button>
                  {itemsSeleccionados.length === 0 && (
                    <span style={{ fontSize: 12, color: BRAND.gray600 }}>Selecciona al menos un producto para devolver.</span>
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