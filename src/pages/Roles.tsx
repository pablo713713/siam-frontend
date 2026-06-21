import { useEffect, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Rol, CreateRolDto } from '../types';

export function Roles() {
  const [roles, setRoles]       = useState<Rol[]>([]);
  const [loading, setLoading]   = useState(true);
  const [nombre, setNombre]     = useState('');
  const [descripcion, setDesc]  = useState('');
  const [editId, setEditId]     = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [msg, setMsg]           = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Rol[]>('/roles');
      setRoles(Array.isArray(data) ? data : []);    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setNombre(''); setDesc(''); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateRolDto = { nombre, ...(descripcion ? { descripcion } : {}) };
    try {
      if (editId !== null) {
        await api.put(`/roles/${editId}`, dto);
        flash('Rol actualizado correctamente.');
      } else {
        await api.post('/roles', dto);
        flash('Rol creado correctamente.');
      }
      resetForm();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Error al guardar.', 'err');
    }
  };

  const startEdit = (r: Rol) => {
    setEditId(r.id);
    setNombre(r.nombre);
    setDesc(r.descripcion ?? '');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este rol?')) return;
    setDeleting(id);
    try {
      await api.delete(`/roles/${id}`);
      flash('Rol eliminado.');
      load();
    } catch {
      flash('No se pudo eliminar el rol.', 'err');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {}
      {/* <div style={S.card}>
        <div style={S.cardTitle}>{editId !== null ? 'Editar Rol' : 'Crear Nuevo Rol'}</div>

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 12, alignItems: 'flex-end',
          }}>
            <div>
              <label style={S.label}>Nombre del rol *</label>
              <input
                style={S.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder=""
                required
                maxLength={50}
              />
            </div>
            <div>
              <label style={S.label}>Descripción</label>
              <input
                style={S.input}
                value={descripcion}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Descripción opcional"
                maxLength={200}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnStyle('primary')} type="submit">
                <i className={`ti ${editId !== null ? 'ti-check' : 'ti-plus'}`} aria-hidden="true" />
                {editId !== null ? 'Actualizar' : 'Crear'}
              </button>
              {editId !== null && (
                <button style={btnStyle()} type="button" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>

        {msg && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 6,
            background: msg.type === 'ok' ? '#e6f9ee' : '#ffeaea',
            color: msg.type === 'ok' ? '#1a7a40' : BRAND.red,
            border: `1px solid ${msg.type === 'ok' ? '#b0e4c2' : '#f5b8b8'}`,
          }}>
            {msg.text}
          </div>
        )}
      </div> */}

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Roles del sistema</div>

        {loading ? (
          <div style={{ color: BRAND.gray600, fontSize: 13 }}>Cargando…</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>ID</th>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Descripción</th>
                <th style={S.th}>Estado</th>
                <th style={S.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: 'center', color: BRAND.gray600 }}>
                    Sin roles registrados
                  </td>
                </tr>
              ) : roles.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...S.td, color: BRAND.gray600, fontSize: 12 }}>{r.id}</td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{r.nombre}</td>
                  <td style={{ ...S.td, color: BRAND.gray600 }}>{r.descripcion ?? '—'}</td>
                  <td style={S.td}>
                    <span style={badgeStyle(r.activo ? 'green' : 'red')}>
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        style={{ ...btnStyle(), padding: '5px 12px' }}
                        onClick={() => startEdit(r)}
                      >
                        <i className="ti ti-edit" style={{ fontSize: 13 }} aria-hidden="true" /> Editar
                      </button>
                      <button
                        style={{ ...btnStyle('danger'), padding: '5px 12px' }}
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
                        {deleting === r.id ? '…' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
