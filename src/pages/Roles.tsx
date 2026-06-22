import { useEffect, useState } from 'react';
import api from '../api/axios';
import { S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Rol, CreateRolDto } from '../types';
import css from './Roles.module.css';

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
      setRoles(Array.isArray(data) ? data : []);
    } catch {
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
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(Array.isArray(m) ? m.join(', ') : m ?? 'Error al guardar.', 'err');
    }
  };

  const startEdit = (r: Rol) => { setEditId(r.id); setNombre(r.nombre); setDesc(r.descripcion ?? ''); };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este rol?')) return;
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
    <div className={css.page}>
      {}
      <div className={css.header}>
        <div>
          <h1 className={css.title}>Roles del sistema</h1>
          <p className={css.subtitle}>Administra los roles y permisos de acceso</p>
        </div>
      </div>

      {}
      <div className={css.formCard}>
        <div className={css.formTitle}>
          <i className="ti ti-shield-lock" style={{ color: '#D72626' }} aria-hidden="true" />
          {editId !== null ? 'Editar rol' : 'Crear nuevo rol'}
        </div>

        {msg && (
          <div className={`${css.banner} ${msg.type === 'ok' ? css.bannerOk : css.bannerErr}`} role="alert">
            <i className={`ti ${msg.type === 'ok' ? 'ti-check' : 'ti-alert-circle'}`} aria-hidden="true" />
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={css.formGrid}>
            <div style={S.formGroup}>
              <label style={S.label} htmlFor="rol-nombre">Nombre del rol *</label>
              <input id="rol-nombre" style={S.input}
                value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Supervisor" required maxLength={50}
              />
            </div>
            <div style={S.formGroup}>
              <label style={S.label} htmlFor="rol-desc">Descripcion</label>
              <input id="rol-desc" style={S.input}
                value={descripcion} onChange={(e) => setDesc(e.target.value)}
                placeholder="Descripcion opcional" maxLength={200}
              />
            </div>
          </div>
          <div className={css.formActions}>
            <button style={btnStyle('primary')} type="submit">
              <i className={`ti ${editId !== null ? 'ti-check' : 'ti-plus'}`} aria-hidden="true" />
              {editId !== null ? 'Actualizar' : 'Crear rol'}
            </button>
            {editId !== null && (
              <button style={btnStyle('ghost')} type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {}
      <div className={css.tableCard}>
        {loading ? (
          <div className={css.loadingWrap}>Cargando...</div>
        ) : (
          <div className={css.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Nombre</th>
                  <th style={S.th}>Descripcion</th>
                  <th style={S.th}>Estado</th>
                  <th style={S.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...S.td, ...S.emptyState }}>
                      Sin roles registrados
                    </td>
                  </tr>
                ) : roles.map((r) => (
                  <tr key={r.id} className={css.tableRow}>
                    <td style={{ ...S.td, color: '#666', fontSize: 12 }}>{r.id}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{r.nombre}</td>
                    <td style={{ ...S.td, color: '#666' }}>{r.descripcion ?? '—'}</td>
                    <td style={S.td}>
                      <span style={badgeStyle(r.activo ? 'green' : 'red')}>
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div className={css.actionCell}>
                        <button style={btnStyle('secondary', 'sm')} onClick={() => startEdit(r)}>
                          <i className="ti ti-edit" aria-hidden="true" /> Editar
                        </button>
                        <button style={btnStyle('danger', 'sm')} onClick={() => handleDelete(r.id)}
                          disabled={deleting === r.id}>
                          <i className="ti ti-trash" aria-hidden="true" />
                          {deleting === r.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
