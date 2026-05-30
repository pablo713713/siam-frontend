import { useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type {
  ClientePerfil,
  HistorialComprasResponse,
  CompraHistorial,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
      }}
    >
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          background: value ? '#1a7a40' : BRAND.gray400,
          transition: 'background 0.2s',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: BRAND.white,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }}
        />
      </button>
      <span style={{ fontSize: 13, color: BRAND.black, fontWeight: 500 }}>
        {label}
      </span>
      <span style={badgeStyle(value ? 'green' : 'gray')}>
        {value ? 'Activo' : 'Inactivo'}
      </span>
    </div>
  );
}

// ── Fila de info del cliente ─────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <tr>
      <td
        style={{
          ...S.td,
          color: BRAND.gray600,
          width: 160,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {label}
      </td>
      <td style={{ ...S.td, fontWeight: 500 }}>{value || '—'}</td>
    </tr>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export function PerfilCliente() {
  const [codCli, setCodCli] = useState('');
  const [inputVal, setInputVal] = useState('');

  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [historial, setHistorial] = useState<HistorialComprasResponse | null>(null);

  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

  // estado local del formulario de extensión
  const [aceptaDevoluciones, setAceptaDevoluciones] = useState(false);
  const [savingExt, setSavingExt] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Buscar perfil ──
  const buscarPerfil = async () => {
    const cod = inputVal.trim();
    if (!cod) return;
    setLoadingPerfil(true);
    setErrorPerfil('');
    setPerfil(null);
    setHistorial(null);
    setSaveMsg('');
    try {
      const { data } = await api.get<ClientePerfil>(`/clientes/${cod}/perfil`);
      setPerfil(data);
      setCodCli(cod);
      setAceptaDevoluciones(data.extension?.acepta_devoluciones ?? false);
      // cargar historial en paralelo
      cargarHistorial(cod);
    } catch (e: any) {
      setErrorPerfil(
        e?.response?.data?.message ?? 'Cliente no encontrado o error de conexión.',
      );
    } finally {
      setLoadingPerfil(false);
    }
  };

  // ── Cargar historial ──
  const cargarHistorial = async (cod: string) => {
    setLoadingHistorial(true);
    try {
      const { data } = await api.get<HistorialComprasResponse>(
        `/clientes/${cod}/historial-compras`,
      );
      setHistorial(data);
    } catch {
      // silencioso: se muestra vacío
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
      await api.put(`/clientes/${codCli}/extension`, {
        acepta_devoluciones: aceptaDevoluciones,
      });
      setSaveMsg('✓ Configuraciones guardadas correctamente.');
      // actualizar perfil local
      if (perfil) {
        setPerfil({
          ...perfil,
          extension: { ...perfil.extension, acepta_devoluciones: aceptaDevoluciones },
        });
      }
    } catch {
      setSaveMsg('✗ No se pudo guardar. Intente nuevamente.');
    } finally {
      setSavingExt(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  // ── Badge de tipo de compra ──
  const tipoBadge = (tipo: CompraHistorial['tipo']) => (
    <span
      style={badgeStyle(tipo === 'CREDITO' ? 'gray' : 'green')}
    >
      {tipo === 'CREDITO' ? 'Crédito' : 'Contado'}
    </span>
  );

  // ── Badge estado ──
  const estadoBadge = (estado: string) => {
    const ok = estado === 'C' || estado === 'COMPLETADO';
    return (
      <span style={badgeStyle(ok ? 'green' : 'gray')}>
        {ok ? 'Completado' : estado}
      </span>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>
          Perfil de Cliente
        </div>
        <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
          Busca un cliente por su código para ver su perfil, configuraciones e
          historial de compras.
        </div>
      </div>

      {/* Buscador */}
      <div
        style={{
          ...S.card,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={S.label}>Código de Cliente</label>
          <input
            style={S.input}
            type="number"
            placeholder="Ej: 1023"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPerfil()}
          />
        </div>
        <button
          style={btnStyle('primary')}
          onClick={buscarPerfil}
          disabled={loadingPerfil}
        >
          <i className="ti ti-search" />
          {loadingPerfil ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {/* Error */}
      {errorPerfil && (
        <div
          style={{
            ...S.card,
            borderLeft: `4px solid ${BRAND.red}`,
            color: BRAND.red,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <i className="ti ti-alert-circle" />
          {errorPerfil}
        </div>
      )}

      {perfil && (
        <>
          {/* ── HU-F5.01: Información básica del cliente ── */}
          <div
            style={{
              ...S.card,
              borderLeft: `4px solid ${BRAND.red}`,
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: BRAND.red,
                color: BRAND.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {perfil.razon_social?.charAt(0)?.toUpperCase() ?? '?'}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.black }}>
                  {perfil.razon_social}
                </span>
                <span style={badgeStyle(perfil.activo ? 'green' : 'red')}>
                  {perfil.activo ? 'Activo' : 'Inactivo'}
                </span>
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

          {/* ── HU-F5.02: Formulario de Preferencias / Extensiones ── */}
          <div style={S.card}>
            <div
              style={{
                ...S.cardTitle,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <i className="ti ti-settings" style={{ color: BRAND.red, fontSize: 15 }} />
              Configuraciones del Cliente
            </div>

            <Toggle
              value={aceptaDevoluciones}
              onChange={setAceptaDevoluciones}
              label="Acepta devoluciones"
            />

            <div
              style={{
                height: 1,
                background: BRAND.gray200,
                margin: '12px 0',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                style={btnStyle('primary')}
                onClick={guardarExtension}
                disabled={savingExt}
              >
                <i className={`ti ${savingExt ? 'ti-loader-2' : 'ti-device-floppy'}`} />
                {savingExt ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {saveMsg && (
                <span
                  style={{
                    fontSize: 12,
                    color: saveMsg.startsWith('✓') ? '#1a7a40' : BRAND.red,
                    fontWeight: 600,
                  }}
                >
                  {saveMsg}
                </span>
              )}
            </div>
          </div>

          {/* ── HU-F5.03: Historial de Compras ── */}
          <div style={S.card}>
            <div
              style={{
                ...S.cardTitle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i
                  className="ti ti-receipt"
                  style={{ color: BRAND.red, fontSize: 15 }}
                />
                Historial de Compras
              </div>
              {historial && (
                <span style={badgeStyle('gray')}>
                  {historial.total_compras} operaciones
                </span>
              )}
            </div>

            {loadingHistorial && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: BRAND.gray600,
                  fontSize: 13,
                }}
              >
                <i
                  className="ti ti-loader-2"
                  style={{
                    fontSize: 20,
                    display: 'block',
                    marginBottom: 6,
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Cargando historial…
              </div>
            )}

            {!loadingHistorial && historial && historial.historial.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 32,
                  color: BRAND.gray600,
                  fontSize: 13,
                }}
              >
                <i
                  className="ti ti-inbox"
                  style={{ fontSize: 28, display: 'block', marginBottom: 6 }}
                />
                Sin historial de compras registrado.
              </div>
            )}

            {!loadingHistorial && historial && historial.historial.length > 0 && (
              <>
                {/* Totales rápidos */}
                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  {(['CONTADO', 'CREDITO'] as const).map((tipo) => {
                    const items = historial.historial.filter(
                      (h) => h.tipo === tipo,
                    );
                    const total = items.reduce((s, h) => s + Number(h.monto), 0);
                    return (
                      <div
                        key={tipo}
                        style={{
                          background: BRAND.gray50,
                          border: `1px solid ${BRAND.gray200}`,
                          borderRadius: 8,
                          padding: '10px 16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: BRAND.gray600,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                          }}
                        >
                          {tipo === 'CONTADO' ? 'VENTAS CONTADO' : 'CRÉDITOS'}
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: tipo === 'CONTADO' ? '#1a7a40' : '#185fa5',
                          }}
                        >
                          {fmtMoney(total)}
                        </div>
                        <div
                          style={{ fontSize: 11, color: BRAND.gray600, marginTop: 2 }}
                        >
                          {items.length} operaciones
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Referencia', 'Tipo', 'Fecha', 'Monto', 'Estado'].map(
                          (h) => (
                            <th key={h} style={S.th}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {historial.historial.map((compra, i) => (
                        <tr
                          key={`${compra.id}-${i}`}
                          style={{
                            background: i % 2 === 0 ? BRAND.white : BRAND.gray50,
                          }}
                        >
                          <td
                            style={{
                              ...S.td,
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: BRAND.gray600,
                            }}
                          >
                            {compra.id}
                          </td>
                          <td style={S.td}>{tipoBadge(compra.tipo)}</td>
                          <td
                            style={{
                              ...S.td,
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {fmtDate(compra.fecha)}
                          </td>
                          <td
                            style={{
                              ...S.td,
                              textAlign: 'right',
                              fontWeight: 700,
                            }}
                          >
                            {fmtMoney(Number(compra.monto))}
                          </td>
                          <td style={S.td}>{estadoBadge(compra.estado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
