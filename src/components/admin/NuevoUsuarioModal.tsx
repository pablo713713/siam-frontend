import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, btnStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';

interface Catalogos {
  cargos: { codCar: string; descCar: string }[];
  sucursales: { codSuc: string; nomSuc: string }[];
  roles: { id: number; nombre: string }[];
}

interface Props {
  onClose: () => void;
  onCreado: (codUsu: string, alias: string) => void;
}

/** Alta de usuario con roles y almacenes (Administrador). */
export function NuevoUsuarioModal({ onClose, onCreado }: Props) {
  const [cat, setCat] = useState<Catalogos>({ cargos: [], sucursales: [], roles: [] });
  const [v, setV] = useState({
    nom_usu: '', ap_usu: '', alias: '', contrasena: '', confirmar: '',
    cod_car: '', cod_suc: '', email: '', telefono: '', celular: '',
  });
  const [roles, setRoles] = useState<number[]>([]);
  const [almacenes, setAlmacenes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (c: keyof typeof v, valor: string) => setV((p) => ({ ...p, [c]: valor }));

  useEffect(() => {
    api.get<Catalogos>('/usuarios/catalogos')
      .then(({ data }) => setCat(data))
      .catch(() => setError('No se pudieron cargar cargos, sucursales y roles.'));
  }, []);

  // Los almacenes solo tienen sentido para un Encargado de Almacen
  const esEncargado = useMemo(
    () => cat.roles.some((r) => roles.includes(r.id) && r.nombre.toLowerCase().startsWith('encargado')),
    [cat.roles, roles],
  );

  const alternar = <T,>(lista: T[], valor: T) => (lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.nom_usu.trim() || !v.alias.trim() || !v.cod_car || !v.cod_suc) {
      setError('Nombre, alias, cargo y sucursal son obligatorios.'); return;
    }
    if (/\s/.test(v.alias)) { setError('El alias no puede tener espacios.'); return; }
    if (v.contrasena.length < 3) { setError('La contraseña debe tener al menos 3 caracteres.'); return; }
    if (v.contrasena !== v.confirmar) { setError('Las contraseñas no coinciden.'); return; }
    setError('');
    setEnviando(true);
    try {
      const opcional = (t: string) => (t.trim() ? t.trim() : undefined);
      const { data } = await api.post<{ cod_usu: string; alias: string }>('/usuarios', {
        nom_usu: v.nom_usu.trim(), ap_usu: opcional(v.ap_usu), alias: v.alias.trim(), contrasena: v.contrasena,
        cod_car: v.cod_car, cod_suc: v.cod_suc,
        email: opcional(v.email), telefono: opcional(v.telefono), celular: opcional(v.celular),
        roles, almacenes: esEncargado ? almacenes : [],
      });
      onCreado(data.cod_usu, data.alias);
    } catch (err) {
      setError(mensajeError(err, 'No se pudo crear el usuario.'));
    } finally {
      setEnviando(false);
    }
  };

  const campo = (id: keyof typeof v, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`nu-${id}`} style={S.label}>{etiqueta}</label>
      <input id={`nu-${id}`} style={S.input} disabled={enviando} value={v[id]} onChange={(e) => set(id, e.target.value)} {...props} />
    </div>
  );
  const fila: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 };
  const chip = (activo: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
    border: `1px solid ${activo ? BRAND.red : BRAND.gray200}`, background: activo ? '#fff1f1' : BRAND.white,
  });

  return (
    <Modal titulo="Nuevo usuario" icono="ti-user-plus" ancho={680} onClose={enviando ? undefined : onClose}>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}
      <form onSubmit={guardar} autoComplete="off">
        <div style={fila}>
          {campo('nom_usu', 'Nombre *', { maxLength: 30, autoFocus: true })}
          {campo('ap_usu', 'Apellido', { maxLength: 50 })}
        </div>
        <div style={fila}>
          {campo('alias', 'Alias (para iniciar sesión) *', { maxLength: 30 })}
          {campo('contrasena', 'Contraseña *', { type: 'password', autoComplete: 'new-password', maxLength: 100 })}
          {campo('confirmar', 'Repetir contraseña *', { type: 'password', autoComplete: 'new-password', maxLength: 100 })}
        </div>
        <div style={fila}>
          <div>
            <label htmlFor="nu-car" style={S.label}>Cargo *</label>
            <select id="nu-car" style={S.select} value={v.cod_car} disabled={enviando} onChange={(e) => set('cod_car', e.target.value)}>
              <option value="">Seleccione</option>
              {cat.cargos.map((c) => <option key={c.codCar} value={c.codCar}>{c.descCar}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nu-suc" style={S.label}>Sucursal *</label>
            <select id="nu-suc" style={S.select} value={v.cod_suc} disabled={enviando} onChange={(e) => set('cod_suc', e.target.value)}>
              <option value="">Seleccione</option>
              {cat.sucursales.map((s) => <option key={s.codSuc} value={s.codSuc}>{s.nomSuc} ({s.codSuc})</option>)}
            </select>
          </div>
        </div>
        <div style={fila}>
          {campo('email', 'Correo', { type: 'email', maxLength: 50 })}
          {campo('telefono', 'Teléfono', { maxLength: 10 })}
          {campo('celular', 'Celular', { maxLength: 10 })}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={S.label}>Roles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cat.roles.map((r) => (
              <label key={r.id} style={chip(roles.includes(r.id))}>
                <input type="checkbox" checked={roles.includes(r.id)} disabled={enviando}
                  onChange={() => setRoles((l) => alternar(l, r.id))} />
                {r.nombre}
              </label>
            ))}
          </div>
        </div>

        {esEncargado && (
          <div style={{ marginBottom: 12 }}>
            <div style={S.label}>Almacenes a cargo</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cat.sucursales.map((s) => (
                <label key={s.codSuc} style={chip(almacenes.includes(s.codSuc))}>
                  <input type="checkbox" checked={almacenes.includes(s.codSuc)} disabled={enviando}
                    onChange={() => setAlmacenes((l) => alternar(l, s.codSuc))} />
                  {s.nomSuc}
                </label>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: BRAND.gray600, margin: '0 0 12px' }}>
          El código de usuario se genera solo. Los roles y almacenes se pueden cambiar después en esta misma pantalla.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={enviando}>Cancelar</button>
          <button type="submit" style={btnStyle('primary')} disabled={enviando}>
            <i className="ti ti-device-floppy" /> {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
