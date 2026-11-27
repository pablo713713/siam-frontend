import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, btnStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';

interface Calificacion { codigo: string; tipoCliente: string; consignacion: string; calificacion: string }

interface Props {
  onClose: () => void;
  onCreado: (codCli: number, nombre: string) => void;
}

const VACIO = {
  nom_cli: '', ape_cli: '', razon_social: '', tipo_doc: 'CI', num_ci_nit: '',
  telefono: '', celular: '', domicilio: '', email: '', ciudad: '', codigo: '',
  limite_credito: '', acepta_devoluciones: true,
};

/** Alta de cliente (Administrador). */
export function NuevoClienteModal({ onClose, onCreado }: Props) {
  const [v, setV] = useState(VACIO);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (campo: keyof typeof VACIO, valor: string | boolean) => setV((p) => ({ ...p, [campo]: valor }));

  useEffect(() => {
    api.get<Calificacion[]>('/clientes/calificaciones')
      .then(({ data }) => setCalificaciones(data ?? []))
      .catch(() => setCalificaciones([]));
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.nom_cli.trim() || !v.ape_cli.trim()) { setError('Nombre y apellido son obligatorios.'); return; }
    const limite = v.limite_credito.trim() === '' ? undefined : Number(v.limite_credito.replace(',', '.'));
    if (limite !== undefined && (!Number.isFinite(limite) || limite < 0)) { setError('El límite de crédito debe ser un número mayor o igual a 0.'); return; }
    setError('');
    setEnviando(true);
    try {
      const opcional = (t: string) => (t.trim() ? t.trim() : undefined);
      const { data } = await api.post<{ cod_cli: number }>('/clientes', {
        nom_cli: v.nom_cli.trim(), ape_cli: v.ape_cli.trim(),
        razon_social: opcional(v.razon_social),
        tipo_doc: v.num_ci_nit.trim() ? v.tipo_doc : 'NIN',
        num_ci_nit: opcional(v.num_ci_nit),
        telefono: opcional(v.telefono), celular: opcional(v.celular),
        domicilio: opcional(v.domicilio), email: opcional(v.email), ciudad: opcional(v.ciudad),
        codigo: opcional(v.codigo),
        limite_credito: limite,
        acepta_devoluciones: v.acepta_devoluciones,
      });
      onCreado(data.cod_cli, `${v.nom_cli} ${v.ape_cli}`.toUpperCase());
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el cliente.'));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (id: keyof typeof VACIO, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`nc-${id}`} style={S.label}>{etiqueta}</label>
      <input id={`nc-${id}`} style={S.input} disabled={enviando} value={String(v[id])}
        onChange={(e) => set(id, e.target.value)} {...props} />
    </div>
  );
  const fila: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 };

  return (
    <Modal titulo="Nuevo cliente" icono="ti-user-plus" ancho={640} onClose={enviando ? undefined : onClose}>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}
      <form onSubmit={guardar} autoComplete="off">
        <div style={fila}>
          {campo('nom_cli', 'Nombre *', { maxLength: 30, autoFocus: true })}
          {campo('ape_cli', 'Apellido *', { maxLength: 50 })}
        </div>
        <div style={fila}>
          {campo('razon_social', 'Razón social (factura)', { maxLength: 150, placeholder: 'Si se deja vacío: nombre y apellido' })}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
            <div>
              <label htmlFor="nc-tipo" style={S.label}>Doc.</label>
              <select id="nc-tipo" style={S.select} value={v.tipo_doc} disabled={enviando} onChange={(e) => set('tipo_doc', e.target.value)}>
                <option value="CI">CI</option>
                <option value="NIT">NIT</option>
              </select>
            </div>
            {campo('num_ci_nit', 'CI / NIT', { maxLength: 20 })}
          </div>
        </div>
        <div style={fila}>
          {campo('telefono', 'Teléfono', { maxLength: 15 })}
          {campo('celular', 'Celular', { maxLength: 20 })}
          {campo('email', 'Correo', { maxLength: 50, type: 'email' })}
        </div>
        <div style={fila}>
          {campo('domicilio', 'Domicilio', { maxLength: 255 })}
          {campo('ciudad', 'Ciudad', { maxLength: 50 })}
        </div>
        <div style={fila}>
          <div>
            <label htmlFor="nc-calif" style={S.label}>Calificación</label>
            <select id="nc-calif" style={S.select} value={v.codigo} disabled={enviando} onChange={(e) => set('codigo', e.target.value)}>
              <option value="">Por defecto</option>
              {calificaciones.map((c) => (
                <option key={c.codigo} value={c.codigo}>{c.calificacion} · {c.tipoCliente} ({c.consignacion})</option>
              ))}
            </select>
          </div>
          {campo('limite_credito', 'Límite de crédito (Bs)', { inputMode: 'decimal', placeholder: 'Sin crédito' })}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
          <input type="checkbox" checked={v.acepta_devoluciones} disabled={enviando}
            onChange={(e) => set('acepta_devoluciones', e.target.checked)} />
          Acepta devoluciones
        </label>
        <p style={{ fontSize: 11, color: BRAND.gray600, margin: '0 0 12px' }}>
          El cliente queda registrado en tu sucursal (tu empresa). El CI/NIT no puede repetirse.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={enviando}>Cancelar</button>
          <button type="submit" style={btnStyle('primary')} disabled={enviando}>
            <i className="ti ti-device-floppy" /> {enviando ? 'Guardando…' : 'Registrar cliente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
