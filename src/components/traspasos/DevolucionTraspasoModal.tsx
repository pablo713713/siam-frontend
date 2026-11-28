import { useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, badgeStyle, btnStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';
import type { TraspasoHistorial } from '../../types';

interface Props {
  traspaso: TraspasoHistorial;
  nombreUsuario: string;
  onClose: () => void;
  onRegistrada: (mensaje: string) => void;
}

interface RespuestaDevolucion {
  unidadesDevueltas: number;
  firma: { fechaBolivia: string | null; horaBolivia: string | null };
}

/**
 * Devolución al almacén de origen de productos de una salida: el vendedor
 * regresa lo que se llevó (todo → Devuelto, una parte → Devuelto parcialmente).
 * Doble firma: quien recibe la mercadería (encargado del almacén de origen o
 * Administrador) y el vendedor que se la llevó, cada uno con su contraseña.
 */
export function DevolucionTraspasoModal({ traspaso, nombreUsuario, onClose, onRegistrada }: Props) {
  const pendientes = traspaso.items.filter((it) => (it.porDevolver ?? 0) > 0);
  // Por defecto se devuelve todo lo que queda; se puede bajar para una devolución parcial
  const [cantidades, setCantidades] = useState<Record<number, string>>(
    () => Object.fromEntries(pendientes.map((it) => [it.idFab, String(it.porDevolver)])),
  );
  const [password, setPassword] = useState('');
  const [passwordVendedor, setPasswordVendedor] = useState('');
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const items = pendientes
    .map((it) => ({ it, cantidad: Number(cantidades[it.idFab] || 0) }))
    .filter((x) => x.cantidad > 0);
  const total = items.reduce((s, x) => s + x.cantidad, 0);
  const invalido = pendientes.some((it) => {
    const n = Number(cantidades[it.idFab] || 0);
    return !Number.isInteger(n) || n < 0 || n > (it.porDevolver ?? 0);
  });

  const registrar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalido) { setError('Revisa las cantidades: no pueden superar lo que queda por devolver.'); return; }
    if (total === 0) { setError('Indica al menos una unidad a devolver.'); return; }
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.post<RespuestaDevolucion>(
        `/productos/traspasos/${traspaso.idAutorizacion}/devolucion`,
        {
          password_firma: password,
          password_vendedor: passwordVendedor,
          items: items.map((x) => ({ id_fab: x.it.idFab, cantidad: x.cantidad })),
          ...(obs.trim() ? { obs: obs.trim() } : {}),
        },
      );
      onRegistrada(
        `Devolución registrada: ${data.unidadesDevueltas} unidad${data.unidadesDevueltas === 1 ? '' : 'es'} ` +
        `de vuelta en ${traspaso.nomSucOri}` +
        (data.firma.horaBolivia ? ` (${data.firma.horaBolivia}).` : '.'),
      );
    } catch (e) {
      setError(mensajeError(e, 'No se pudo registrar la devolución.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo="Registrar devolución"
      icono="ti-arrow-back-up"
      ancho={620}
      onClose={enviando ? undefined : onClose}
      etiqueta={<span style={badgeStyle('gray')}>{traspaso.nomSucDes} → {traspaso.nomSucOri}</span>}
    >
      <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 12px' }}>
        Lo que <strong style={{ color: BRAND.gray700 }}>{traspaso.nombreFirmante}</strong> se llevó y está devolviendo
        vuelve a <strong style={{ color: BRAND.gray700 }}>{traspaso.nomSucOri}</strong>. Traspaso N° {traspaso.codRemSalida}.
      </p>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}

      <form onSubmit={registrar} autoComplete="off">
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ ...S.table, border: `1px solid ${BRAND.gray200}` }}>
            <thead>
              <tr>
                <th style={S.th}>Producto</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Puede devolver</th>
                <th style={{ ...S.th, width: 120 }}>Devuelve</th>
              </tr>
            </thead>
            <tbody>
              {pendientes.map((it) => (
                <tr key={it.idFab}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600 }}>{it.descPro ?? '—'}</div>
                    <div style={{ fontSize: 11, color: BRAND.gray600 }}>{it.codFab}</div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{it.porDevolver}</td>
                  <td style={S.td}>
                    <input
                      type="number" min={0} max={it.porDevolver ?? 0} step={1}
                      style={S.input} disabled={enviando}
                      value={cantidades[it.idFab] ?? ''}
                      onChange={(e) => setCantidades({ ...cantidades, [it.idFab]: e.target.value })}
                      aria-label={`Unidades a devolver de ${it.descPro ?? it.codFab}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.formGroup}>
          <label htmlFor="dv-obs" style={S.label}>Observación (opcional)</label>
          <input id="dv-obs" style={S.input} maxLength={250} value={obs} disabled={enviando}
            onChange={(e) => setObs(e.target.value)} />
        </div>

        <div style={{ ...S.formGroup, padding: 12, border: `1px solid ${BRAND.gray200}`, borderRadius: 8 }}>
          <label htmlFor="dv-password-vendedor" style={S.label}>
            Contraseña del vendedor · {traspaso.nombreFirmante}
          </label>
          <input
            id="dv-password-vendedor" type="password" autoComplete="new-password"
            style={S.input} value={passwordVendedor} disabled={enviando}
            onChange={(e) => setPasswordVendedor(e.target.value)}
          />
          <p style={{ fontSize: 11, color: BRAND.gray600, margin: '4px 0 0' }}>
            El vendedor que se llevó los productos confirma que los está devolviendo.
          </p>
        </div>

        <div style={S.formGroup}>
          <label htmlFor="dv-password" style={S.label}>Tu contraseña</label>
          <input
            id="dv-password" type="password" autoComplete="new-password"
            style={S.input} value={password} disabled={enviando}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p style={{ fontSize: 11, color: BRAND.gray600, margin: '4px 0 0' }}>
            Firmas como <strong style={{ color: BRAND.gray700 }}>{nombreUsuario}</strong>: confirmas que recibiste la mercadería de vuelta.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={enviando}>Cancelar</button>
          <button type="submit" style={btnStyle('primary')} disabled={enviando || !password || !passwordVendedor || total === 0 || invalido}>
            <i className="ti ti-signature" aria-hidden="true" />
            {enviando ? 'Registrando…' : `Firmar y devolver ${total} unidad${total === 1 ? '' : 'es'}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
