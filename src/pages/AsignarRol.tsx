import { useEffect, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle } from '../components/ui/tokens';
import type { Rol, UsuarioRolResponse } from '../types';

export function AsignarRol() {
  const [roles, setRoles]             = useState<Rol[]>([]);
  const [codUsu, setCodUsu]           = useState('');
  const [rolActual, setRolActual]     = useState<UsuarioRolResponse | null | 'empty'>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [selectedRol, setSelectedRol] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    api.get<Rol[]>('/roles')
      .then(({ data }) => setRoles(Array.isArray(data) ? data.filter((r) => r.activo) : []))
      .catch(() => {});
  }, []);

  const buscarUsuario = async () => {
    if (!codUsu.trim()) return;
    setLoadingUser(true);
    setRolActual(null);
    setSelectedRol('');
    try {
      const { data } = await api.get<UsuarioRolResponse>(`/roles/usuario/${codUsu.trim()}`);
      setRolActual(data);
      setSelectedRol(String(data.id_rol));
    } catch {
      setRolActual('empty');
      flash('Usuario sin rol asignado o código no encontrado.', 'err');
    } finally {
      setLoadingUser(false);
    }
  };

  const handleAsignar = async () => {
    try {
      await api.post('/roles/asignar', {
        cod_usu: codUsu.trim(),
        id_rol: parseInt(selectedRol),
      });
      flash('Rol asignado correctamente.');
      setShowModal(false);
      buscarUsuario();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al asignar el rol.', 'err');
      setShowModal(false);
    }
  };

  const rolSeleccionado = roles.find((r) => r.id === parseInt(selectedRol));
  const usuarioEncontrado = rolActual !== null && rolActual !== 'empty';

  return (
    <div>
      {/* ── Buscador ── */}
      <div style={S.card}>
        <div style={S.cardTitle}>Buscar usuario</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>Código de usuario</label>
            <input
              style={S.input}
              value={codUsu}
              onChange={(e) => setCodUsu(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarUsuario()}
              placeholder="Ej: USR001"
            />
          </div>
          <button style={btnStyle('primary')} onClick={buscarUsuario} disabled={loadingUser}>
            <i className="ti ti-search" aria-hidden="true" />
            {loadingUser ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {msg && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 6,
            background: msg.type === 'ok' ? '#e6f9ee' : '#ffeaea',
            color: msg.type === 'ok' ? '#1a7a40' : BRAND.red,
          }}>
            {msg.text}
          </div>
        )}
      </div>

      {}
      {rolActual !== null && (
        <div style={S.card}>
          <div style={S.cardTitle}>Asignación de rol</div>

          {}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#ffeaea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-user" style={{ fontSize: 20, color: BRAND.red }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Usuario: {codUsu.trim()}</div>
              <div style={{ color: BRAND.gray600, fontSize: 13, marginTop: 2 }}>
                Rol actual:{' '}
                {usuarioEncontrado
                  ? <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 12px', borderRadius: 20,
                      background: '#ffeaea', color: BRAND.red, fontSize: 12, fontWeight: 600,
                    }}>
                      {(rolActual as UsuarioRolResponse).rol.nombre}
                    </span>
                  : <span style={{ color: BRAND.gray400 }}>Sin rol asignado</span>
                }
              </div>
            </div>
          </div>

          <div style={S.divider} />

          {}
          <div style={S.formGroup}>
            <label style={S.label}>Seleccionar nuevo rol</label>
            <select
              style={S.select}
              value={selectedRol}
              onChange={(e) => setSelectedRol(e.target.value)}
            >
              <option value="">— Seleccione un rol —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>

          <button
            style={btnStyle('primary')}
            onClick={() => setShowModal(true)}
            disabled={!selectedRol}
          >
            <i className="ti ti-user-check" aria-hidden="true" />
            Asignar Rol
          </button>
        </div>
      )}

      {}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{
            background: BRAND.white, borderRadius: 12, padding: 28,
            width: 440, maxWidth: '90vw',
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: BRAND.black, marginBottom: 14 }}>
              Confirmar asignación
            </div>
            <p style={{ fontSize: 14, color: '#444', marginBottom: 24, lineHeight: 1.6 }}>
              ¿Confirmas asignar el rol{' '}
              <strong>{rolSeleccionado?.nombre}</strong>{' '}
              al usuario{' '}
              <strong>{codUsu.trim()}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnStyle()} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={btnStyle('primary')} onClick={handleAsignar}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
