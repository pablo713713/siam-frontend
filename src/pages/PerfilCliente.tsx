import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type {
  ClientePerfil,
  HistorialComprasResponse,
  CompraHistorial,
} from '../types';

// ── Tipos locales ─────────────────────────────────────────────────────────────
interface ClienteSearch {
  codCli: number;
  nomCli: string | null;
  apeCli: string | null;
  razonSocial: string | null;
  numCiNit: string | null;
  telDom: string | null;
  cel: string | null;
  domicilio: string | null;
  descuento: number | null;
  creditoMaximo: number | null;
  baja: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  }).format(n);

const fmtDate = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

function nombreCliente(c: ClienteSearch) {
  if (c.razonSocial) return c.razonSocial;
  return [c.nomCli, c.apeCli].filter(Boolean).join(' ') || '—';
}

// ── Toggle / Switch ───────────────────────────────────────────────────────────
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          position: 'relative', width: 44, height: 24, borderRadius: 12,
          border: 'none', cursor: 'pointer',
          background: value ? '#1a7a40' : BRAND.gray400,
          transition: 'background 0.2s', flexShrink: 0, padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute', top: 3,
            left: value ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%',
            background: BRAND.white, transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }}
        />
      </button>
      <span style={{ fontSize: 13, color: BRAND.black, fontWeight: 500 }}>{label}</span>
      <span style={badgeStyle(value ? 'green' : 'gray')}>{value ? 'Activo' : 'Inactivo'}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr>
      <td style={{ ...S.td, color: BRAND.gray600, width: 160, fontSize: 12, fontWeight: 600 }}>{label}</td>
      <td style={{ ...S.td, fontWeight: 500 }}>{value || '—'}</td>
    </tr>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export function PerfilCliente() {
  const navigate = useNavigate();

  // ── Buscador por nombre/CI ──
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ClienteSearch[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Perfil seleccionado ──
  const [codCli, setCodCli] = useState('');
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [historial, setHistorial] = useState<HistorialComprasResponse | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

  // ── Extensión ──
  const [aceptaDevoluciones, setAceptaDevoluciones] = useState(false);
  const [savingExt, setSavingExt] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Detalle de compra (drawer) ──
  const [compraSelId, setCompraSelId] = useState<string | null>(null);
  const [detalleCompra, setDetalleCompra] = useState<any>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ── Buscar por nombre/CI/NIT ──
  const buscarClientes = async (q: string) => {
    if (!q.trim()) { setResultados([]); return; }
    setLoadingSearch(true);
    setErrorSearch('');
    try {
      const { data } = await api.get('/clientes/search', { params: { q: q.trim(), limit: 10 } });
      setResultados(data.data ?? []);
      if ((data.data ?? []).length === 0) setErrorSearch('No se encontraron clientes con ese criterio.');
    } catch {
      setErrorSearch('Error al buscar clientes.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const onQueryChange = (val: string) => {
    setQuery(val);
    setErrorSearch('');
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => buscarClientes(val), 400);
  };

  // ── Cargar perfil completo al hacer click en un resultado ──
  const seleccionarCliente = async (c: ClienteSearch) => {
    setResultados([]);
    setQuery(nombreCliente(c));
    setLoadingPerfil(true);
    setErrorPerfil('');
    setPerfil(null);
    setHistorial(null);
    setSaveMsg('');
    setCompraSelId(null);
    setDetalleCompra(null);

    try {
      const { data } = await api.get<ClientePerfil>(`/clientes/${c.codCli}/perfil`);
      setPerfil(data);
      setCodCli(String(c.codCli));
      setAceptaDevoluciones(data.extension?.acepta_devoluciones ?? false);
      cargarHistorial(String(c.codCli));
    } catch (e: any) {
      setErrorPerfil(e?.response?.data?.message ?? 'No se pudo cargar el perfil del cliente.');
    } finally {
      setLoadingPerfil(false);
    }
  };

  // ── Cargar historial ──
  const cargarHistorial = async (cod: string) => {
    setLoadingHistorial(true);
    try {
      const { data } = await api.get<HistorialComprasResponse>(`/clientes/${cod}/historial-compras`);
      setHistorial(data);
    } catch {
      // silencioso
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ── Guardar extensión ──
  const guardarExtension = async () => {
    if (!codCli) return;
    setSavingExt(true);
    setSaveMsg('');
    try {
      await api.put(`/clientes/${codCli}/extension`, { acepta_devoluciones: aceptaDevoluciones });
      setSaveMsg('✓ Configuraciones guardadas correctamente.');
      if (perfil) setPerfil({ ...perfil, extension: { ...perfil.extension, acepta_devoluciones: aceptaDevoluciones } });
    } catch {
      setSaveMsg('✗ No se pudo guardar. Intente nuevamente.');
    } finally {
      setSavingExt(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  // ── Cargar detalle de compra ──
  const verDetalleCompra = async (compra: CompraHistorial) => {
    if (compra.tipo !== 'CONTADO') return; // solo ventas tienen endpoint de detalle
    setCompraSelId(compra.id);
    setDetalleCompra(null);
    setLoadingDetalle(true);
    try {
      const { data } = await api.get(`/ventas/${compra.id}`);
      setDetalleCompra(data);
    } catch {
      setDetalleCompra({ error: true });
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ── Badges ──
  const tipoBadge = (tipo: CompraHistorial['tipo']) => (
    <span style={badgeStyle(tipo === 'CREDITO' ? 'gray' : 'green')}>
      {tipo === 'CREDITO' ? 'Crédito' : 'Contado'}
    </span>
  );

  const estadoBadge = (estado: string) => {
    const ok = estado === 'C' || estado === 'COMPLETADO';
    return <span style={badgeStyle(ok ? 'green' : 'gray')}>{ok ? 'Completado' : estado}</span>;
  };

  // ── Crédito del cliente (viene del search) ──
  const clienteActual = resultados.length === 0 && perfil ? null : null; // del search
  // El indicador de crédito viene de la extensión (limite_credito) o del campo CREDITO_MAXIMO en search
  const puedeCredito =
    perfil?.extension?.limite_credito != null && Number(perfil.extension.limite_credito) > 0;

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Gestión de Clientes</div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Busca un cliente por nombre, razón social o CI/NIT para ver su perfil y historial.
        </div>
      </div>

      {/* Buscador */}
      <div style={{ ...S.card, position: 'relative' }}>
        <label style={S.label}>Buscar cliente</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <i
              className="ti ti-search"
              style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: BRAND.gray400, fontSize: 15, pointerEvents: 'none',
              }}
            />
            <input
              style={{ ...S.input, paddingLeft: 32 }}
              placeholder="Nombre, apellido, razón social o CI/NIT…"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarClientes(query)}
              autoComplete="off"
            />
          </div>
          {loadingSearch && (
            <i className="ti ti-loader-2" style={{ fontSize: 18, color: BRAND.gray400, animation: 'spin 1s linear infinite' }} />
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Dropdown resultados */}
        {resultados.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: BRAND.white, border: `1px solid ${BRAND.gray200}`,
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              marginTop: 4, overflow: 'hidden',
            }}
          >
            {resultados.map(c => {
              const tieneCredito = c.creditoMaximo != null && Number(c.creditoMaximo) > 0;
              return (
                <div
                  key={c.codCli}
                  onClick={() => seleccionarCliente(c)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: `1px solid ${BRAND.gray100}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = BRAND.gray50)}
                  onMouseLeave={e => (e.currentTarget.style.background = BRAND.white)}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: BRAND.red,
                      color: BRAND.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, flexShrink: 0,
                    }}
                  >
                    {nombreCliente(c).charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: BRAND.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {nombreCliente(c)}
                    </div>
                    <div style={{ fontSize: 11, color: BRAND.gray600 }}>
                      CI/NIT: {c.numCiNit || '—'} · Cod: {c.codCli}
                      {c.telDom && ` · ${c.telDom}`}
                    </div>
                  </div>
                  {/* Crédito badge */}
                  <span style={badgeStyle(tieneCredito ? 'green' : 'gray')}>
                    {tieneCredito ? `Crédito: ${fmtMoney(Number(c.creditoMaximo))}` : 'Sin crédito'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {errorSearch && !loadingSearch && (
          <div style={{ marginTop: 8, fontSize: 12, color: BRAND.gray600 }}>
            {errorSearch}
          </div>
        )}
      </div>

      {/* Loading perfil */}
      {loadingPerfil && (
        <div style={{ ...S.card, textAlign: 'center', padding: 32, color: BRAND.gray600 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 24, display: 'block', marginBottom: 6, animation: 'spin 1s linear infinite' }} />
          Cargando perfil…
        </div>
      )}

      {/* Error perfil */}
      {errorPerfil && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.red}`, color: BRAND.red, display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-alert-circle" />{errorPerfil}
        </div>
      )}

      {perfil && (
        <>
          {/* ── Información básica del cliente ── */}
          <div
            style={{
              ...S.card,
              borderLeft: `4px solid ${BRAND.red}`,
              display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%', background: BRAND.red,
                color: BRAND.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, flexShrink: 0,
              }}
            >
              {perfil.razon_social?.charAt(0)?.toUpperCase() ?? '?'}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.black }}>{perfil.razon_social}</span>
                <span style={badgeStyle(perfil.activo ? 'green' : 'red')}>
                  {perfil.activo ? 'Activo' : 'Inactivo'}
                </span>
                {/* Indicador de crédito */}
                {puedeCredito ? (
                  <span style={{ ...badgeStyle('green'), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-credit-card" style={{ fontSize: 12 }} />
                    Crédito: {fmtMoney(Number(perfil.extension.limite_credito))}
                  </span>
                ) : (
                  <span style={{ ...badgeStyle('gray'), display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-credit-card-off" style={{ fontSize: 12 }} />
                    Sin crédito habilitado
                  </span>
                )}
              </div>

              <table style={{ ...S.table, maxWidth: 600 }}>
                <tbody>
                  <InfoRow label="Código" value={String(perfil.cod_cli)} />
                  <InfoRow label="CI / NIT" value={perfil.num_ci_nit} />
                  <InfoRow label="Teléfono" value={perfil.telefono} />
                  <InfoRow label="Celular" value={perfil.celular} />
                  <InfoRow label="Domicilio" value={perfil.domicilio} />
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Configuraciones del cliente ── */}
          <div style={S.card}>
            <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-settings" style={{ color: BRAND.red, fontSize: 15 }} />
              Configuraciones del Cliente
            </div>

            <Toggle value={aceptaDevoluciones} onChange={setAceptaDevoluciones} label="Acepta devoluciones" />

            <div style={{ height: 1, background: BRAND.gray200, margin: '12px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={btnStyle('primary')} onClick={guardarExtension} disabled={savingExt}>
                <i className={`ti ${savingExt ? 'ti-loader-2' : 'ti-device-floppy'}`} />
                {savingExt ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {saveMsg && (
                <span style={{ fontSize: 12, color: saveMsg.startsWith('✓') ? '#1a7a40' : BRAND.red, fontWeight: 600 }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {/* ── Historial de Compras ── */}
          <div style={S.card}>
            <div
              style={{
                ...S.cardTitle, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-receipt" style={{ color: BRAND.red, fontSize: 15 }} />
                Historial de Compras
              </div>
              {historial && <span style={badgeStyle('gray')}>{historial.total_compras} operaciones</span>}
            </div>

            {loadingHistorial && (
              <div style={{ textAlign: 'center', padding: 32, color: BRAND.gray600, fontSize: 13 }}>
                <i className="ti ti-loader-2" style={{ fontSize: 20, display: 'block', marginBottom: 6, animation: 'spin 1s linear infinite' }} />
                Cargando historial…
              </div>
            )}

            {!loadingHistorial && historial && historial.historial.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: BRAND.gray600, fontSize: 13 }}>
                <i className="ti ti-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 6 }} />
                Sin historial de compras registrado.
              </div>
            )}

            {!loadingHistorial && historial && historial.historial.length > 0 && (
              <>
                {/* Totales rápidos */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                  {(['CONTADO', 'CREDITO'] as const).map(tipo => {
                    const its = historial.historial.filter(h => h.tipo === tipo);
                    const total = its.reduce((s, h) => s + Number(h.monto), 0);
                    return (
                      <div
                        key={tipo}
                        style={{
                          background: BRAND.gray50, border: `1px solid ${BRAND.gray200}`,
                          borderRadius: 8, padding: '10px 16px',
                        }}
                      >
                        <div style={{ fontSize: 10, color: BRAND.gray600, fontWeight: 700, letterSpacing: 0.5 }}>
                          {tipo === 'CONTADO' ? 'VENTAS CONTADO' : 'CRÉDITOS'}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: tipo === 'CONTADO' ? '#1a7a40' : '#185fa5' }}>
                          {fmtMoney(total)}
                        </div>
                        <div style={{ fontSize: 11, color: BRAND.gray600, marginTop: 2 }}>
                          {its.length} operaciones
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Referencia', 'Tipo', 'Fecha', 'Monto', 'Estado', ''].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historial.historial.map((compra, i) => {
                        const esContado = compra.tipo === 'CONTADO';
                        return (
                          <tr
                            key={`${compra.id}-${i}`}
                            onClick={() => esContado && verDetalleCompra(compra)}
                            style={{
                              background: compraSelId === compra.id ? '#eef4ff' : i % 2 === 0 ? BRAND.white : BRAND.gray50,
                              cursor: esContado ? 'pointer' : 'default',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => esContado && (e.currentTarget.style.background = '#eef4ff')}
                            onMouseLeave={e => esContado && (e.currentTarget.style.background = compraSelId === compra.id ? '#eef4ff' : i % 2 === 0 ? BRAND.white : BRAND.gray50)}
                          >
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: BRAND.gray600 }}>
                              {compra.id}
                            </td>
                            <td style={S.td}>{tipoBadge(compra.tipo)}</td>
                            <td style={{ ...S.td, fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(compra.fecha)}</td>
                            <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                              {fmtMoney(Number(compra.monto))}
                            </td>
                            <td style={S.td}>{estadoBadge(compra.estado)}</td>
                            <td style={{ ...S.td, textAlign: 'center' as const }}>
                              {esContado && (
                                <i
                                  className={`ti ${compraSelId === compra.id ? 'ti-chevron-down' : 'ti-chevron-right'}`}
                                  style={{ color: BRAND.gray400, fontSize: 15 }}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Drawer / panel de detalle de compra ── */}
      {compraSelId && (
        <>
          <div
            onClick={() => { setCompraSelId(null); setDetalleCompra(null); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0, width: 480, maxWidth: '95vw',
              background: BRAND.white, zIndex: 201, display: 'flex', flexDirection: 'column',
              boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header drawer */}
            <div
              style={{
                padding: '20px 24px', borderBottom: `1px solid ${BRAND.gray200}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: BRAND.gray600, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
                  Detalle de Compra
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: BRAND.black }}>
                  {compraSelId}
                </div>
              </div>
              <button
                onClick={() => { setCompraSelId(null); setDetalleCompra(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: BRAND.gray600 }}
              >
                <i className="ti ti-x" style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Body drawer */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {loadingDetalle && (
                <div style={{ textAlign: 'center', padding: 48, color: BRAND.gray600 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }} />
                  Cargando detalle…
                </div>
              )}

              {detalleCompra?.error && (
                <div style={{ color: BRAND.red, padding: 16, borderRadius: 8, background: '#ffeaea', fontSize: 13 }}>
                  No se pudo cargar el detalle de esta compra.
                </div>
              )}

              {detalleCompra && !detalleCompra.error && (
                <>
                  {/* Info general */}
                  <div style={{ background: BRAND.gray50, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                    <table style={{ ...S.table, fontSize: 13 }}>
                      <tbody>
                        <tr>
                          <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, width: 120, fontSize: 12 }}>Fecha</td>
                          <td style={S.td}>
                            {new Date(detalleCompra.fecha).toLocaleString('es-BO', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Estado</td>
                          <td style={S.td}>
                            {detalleCompra.estado === 'C'
                              ? <span style={badgeStyle('green')}>Completada</span>
                              : detalleCompra.estado === 'A'
                              ? <span style={badgeStyle('red')}>Anulada</span>
                              : <span style={badgeStyle('gray')}>{detalleCompra.estado}</span>
                            }
                          </td>
                        </tr>
                        {detalleCompra.obs && (
                          <tr>
                            <td style={{ ...S.td, color: BRAND.gray600, fontWeight: 600, fontSize: 12 }}>Observación</td>
                            <td style={S.td}>{detalleCompra.obs}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Items */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.gray600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                      Productos ({detalleCompra.items?.length ?? 0})
                    </div>
                    <div style={{ border: `1px solid ${BRAND.gray200}`, borderRadius: 8, overflow: 'hidden' }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            {['Descripción', 'Cant.', 'Precio', 'Subtotal'].map(h => (
                              <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(detalleCompra.items ?? []).map((it: any, i: number) => (
                            <tr key={`${it.idFab}-${i}`} style={{ background: i % 2 === 0 ? BRAND.white : BRAND.gray50 }}>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                                <div style={{ fontSize: 11, color: BRAND.gray600, fontFamily: 'monospace' }}>{it.codFab}</div>
                              </td>
                              <td style={{ ...S.td, textAlign: 'center' as const }}>{it.cantidad}</td>
                              <td style={{ ...S.td, textAlign: 'right' as const }}>{fmtMoney(Number(it.precioVenta))}</td>
                              <td style={{ ...S.td, textAlign: 'right' as const, fontWeight: 700 }}>
                                {fmtMoney(Number(it.cantidad) * Number(it.precioVenta))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Total */}
                  <div
                    style={{
                      display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
                      padding: '14px 16px', background: BRAND.black, borderRadius: 8,
                    }}
                  >
                    <span style={{ color: BRAND.gray400, fontSize: 13, fontWeight: 600 }}>TOTAL</span>
                    <span style={{ color: BRAND.white, fontSize: 22, fontWeight: 800 }}>
                      {fmtMoney(Number(detalleCompra.total))}
                    </span>
                  </div>

                  {/* Link a devolución si aplica */}
                  {detalleCompra.estado !== 'A' && perfil?.extension?.acepta_devoluciones && (
                    <div style={{ marginTop: 16 }}>
                      <button
                        style={btnStyle('secondary')}
                        onClick={() => navigate(`/devoluciones?venta=${compraSelId}`)}
                      >
                        <i className="ti ti-arrow-back-up" />
                        Procesar devolución de esta venta
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
