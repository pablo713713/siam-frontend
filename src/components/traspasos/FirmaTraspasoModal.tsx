import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { BRAND, S, badgeStyle, btnStyle } from '../ui/tokens';
import type { TipoTraspasoRegistro as TipoTraspaso, VendedorFirma } from '../../types';

interface Props {
  tipo: TipoTraspaso;
  origen: string;
  destino: string;
  totalProductos: number;
  totalUnidades: number;
  /** Nombre del usuario que registra (firma él mismo cuando no es una salida) */
  nombreEncargado: string;
  enviando: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (firma: { password_firma: string; password_encargado?: string; cod_usu_vendedor?: string }) => void;
}

const TITULO_TIPO: Record<TipoTraspaso, string> = {
  SALIDA_VENTA: 'Salida',
  INGRESO_TIENDA: 'Ingreso a tienda',
  ENTRE_ALMACENES: 'Traspaso entre almacenes',
};

/**
 * Firma digital de un traspaso (reemplaza el talonario físico).
 *  - Salida (a MOTOR ZONE), en dos pasos:
 *      1. el encargado que entrega confirma con su contraseña;
 *      2. el vendedor que se lleva los productos elige su usuario y firma.
 *  - Otros traspasos: el encargado que registra confirma con su contraseña.
 * Las contraseñas solo se envían para verificar; no se guardan.
 */
export function FirmaTraspasoModal({
  tipo, origen, destino, totalProductos, totalUnidades,
  nombreEncargado, enviando, error, onCancel, onConfirm,
}: Props) {
  const firmaVendedor = tipo === 'SALIDA_VENTA';
  const [vendedores, setVendedores] = useState<VendedorFirma[]>([]);
  const [cargando, setCargando] = useState(firmaVendedor);
  const [errorCarga, setErrorCarga] = useState('');
  const [codVendedor, setCodVendedor] = useState('');
  const [password, setPassword] = useState('');
  // Salida: paso 1 (encargado) → paso 2 (vendedor)
  const [paso, setPaso] = useState<1 | 2>(1);
  const [passwordEncargado, setPasswordEncargado] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [errorPaso1, setErrorPaso1] = useState('');

  useEffect(() => {
    if (!firmaVendedor) return;
    api.get<{ data: VendedorFirma[] }>('/usuarios/vendedores')
      .then(({ data }) => setVendedores(data.data ?? []))
      .catch(() => setErrorCarga('No se pudo cargar la lista de vendedores.'))
      .finally(() => setCargando(false));
  }, [firmaVendedor]);

  const enPaso1 = firmaVendedor && paso === 1;
  const puedeConfirmar = enPaso1
    ? passwordEncargado.length > 0 && !verificando
    : password.length > 0 && (!firmaVendedor || codVendedor !== '') && !enviando;

  // Paso 1: se verifica la contraseña del encargado antes de pasar al vendedor
  const verificarEncargado = async () => {
    setVerificando(true);
    setErrorPaso1('');
    try {
      await api.post('/usuarios/verificar-password', { password: passwordEncargado });
      setPaso(2);
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setErrorPaso1((Array.isArray(m) ? m[0] : m) ?? 'No se pudo verificar la contraseña.');
    } finally {
      setVerificando(false);
    }
  };

  const confirmar = (event: React.FormEvent) => {
    event.preventDefault();
    if (!puedeConfirmar) return;
    if (enPaso1) { void verificarEncargado(); return; }
    onConfirm({
      password_firma: password,
      ...(firmaVendedor ? { cod_usu_vendedor: codVendedor, password_encargado: passwordEncargado } : {}),
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="firma-titulo"
    >
      <form
        onSubmit={confirmar}
        style={{ ...S.card, width: 440, maxWidth: '100%', marginBottom: 0 }}
        autoComplete="off"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <h2 id="firma-titulo" style={{ ...S.cardTitle, marginBottom: 0 }}>
            <i className="ti ti-signature" aria-hidden="true" /> Firmar traspaso
          </h2>
          <span style={badgeStyle(firmaVendedor ? 'amber' : 'blue')}>{TITULO_TIPO[tipo]}</span>
        </div>

        <p style={{ fontSize: 13, color: BRAND.gray700, margin: '0 0 4px' }}>
          {origen} → {destino}
        </p>
        <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 16px' }}>
          {totalProductos} producto{totalProductos === 1 ? '' : 's'} · {totalUnidades} unidad{totalUnidades === 1 ? '' : 'es'}
        </p>

        {firmaVendedor && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }} aria-label="Pasos de la firma">
            {[1, 2].map((n) => (
              <div key={n} style={{
                flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: paso > n ? '#e6f9ee' : paso === n ? '#fff6e5' : BRAND.gray50,
                color: paso > n ? '#1a7a40' : BRAND.gray700,
                border: `1px solid ${paso > n ? '#b7e4c7' : BRAND.gray200}`,
              }}>
                {paso > n ? '✓ ' : ''}Paso {n} de 2 · {n === 1 ? 'Encargado' : 'Vendedor'}
              </div>
            ))}
          </div>
        )}

        {enPaso1 && errorPaso1 && <div style={S.errorBanner} role="alert">{errorPaso1}</div>}
        {!enPaso1 && error && <div style={S.errorBanner} role="alert">{error}</div>}
        {errorCarga && <div style={S.errorBanner} role="alert">{errorCarga}</div>}

        {enPaso1 ? (
          <>
            <p style={{ fontSize: 12, color: BRAND.gray600, marginTop: 0 }}>
              Firma como <strong style={{ color: BRAND.gray700 }}>{nombreEncargado}</strong>: confirmas que entregas estos productos.
            </p>
            <div style={S.formGroup}>
              <label htmlFor="firma-password-encargado" style={S.label}>Tu contraseña (encargado)</label>
              <input
                id="firma-password-encargado" type="password" autoComplete="new-password" style={S.input}
                value={passwordEncargado} onChange={(e) => setPasswordEncargado(e.target.value)}
                disabled={verificando} autoFocus
              />
            </div>
          </>
        ) : firmaVendedor ? (
          <>
            <div style={{ fontSize: 12, color: '#1a7a40', fontWeight: 600, marginBottom: 8 }}>
              ✓ Paso 1 de 2 completado: firmó {nombreEncargado}.
            </div>
            <p style={{ fontSize: 12, color: BRAND.gray600, marginTop: 0 }}>
              El vendedor que se lleva los productos debe seleccionar su usuario e ingresar su contraseña.
            </p>
            <div style={S.formGroup}>
              <label htmlFor="firma-vendedor" style={S.label}>Vendedor</label>
              <select
                id="firma-vendedor"
                style={S.select}
                value={codVendedor}
                onChange={(e) => setCodVendedor(e.target.value)}
                disabled={cargando || enviando}
              >
                <option value="">{cargando ? 'Cargando…' : 'Seleccione su usuario'}</option>
                {vendedores.map((v) => (
                  <option key={v.codUsu} value={v.codUsu}>
                    {`${v.nomUsu ?? ''} ${v.apUsu ?? ''}`.trim()} ({v.alias})
                  </option>
                ))}
              </select>
              {!cargando && !errorCarga && vendedores.length === 0 && (
                <p style={{ fontSize: 12, color: BRAND.red, margin: '6px 0 0' }}>
                  No hay usuarios con el rol Vendedor. Pide al administrador que lo asigne.
                </p>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: BRAND.gray600, marginTop: 0 }}>
            Firma como <strong style={{ color: BRAND.gray700 }}>{nombreEncargado}</strong>: confirma el traspaso con tu contraseña.
          </p>
        )}

        {!enPaso1 && (
          <div style={S.formGroup}>
            <label htmlFor="firma-password" style={S.label}>{firmaVendedor ? 'Contraseña del vendedor' : 'Contraseña'}</label>
            <input
              id="firma-password"
              type="password"
              autoComplete="new-password"
              style={S.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={enviando}
              autoFocus={!firmaVendedor}
            />
          </div>
        )}

        <p style={{ fontSize: 11, color: BRAND.gray600 }}>
          La fecha y hora de la firma las registra el servidor (hora de Bolivia).
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button type="button" style={btnStyle('ghost')} onClick={onCancel} disabled={enviando || verificando}>
            Cancelar
          </button>
          <button type="submit" style={btnStyle('primary')} disabled={!puedeConfirmar}>
            <i className={`ti ${enPaso1 ? 'ti-arrow-right' : 'ti-signature'}`} aria-hidden="true" />
            {enPaso1
              ? (verificando ? 'Verificando…' : 'Firmar y pasar al vendedor')
              : (enviando ? 'Firmando…' : firmaVendedor ? 'Firmar y confirmar traspaso' : 'Firmar y registrar')}
          </button>
        </div>
      </form>
    </div>
  );
}
