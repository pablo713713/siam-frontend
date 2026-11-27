import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle } from '../components/ui/tokens';
import type { Almacen, Rol, UsuarioRolResponse } from '../types';
import { NuevoUsuarioModal } from '../components/admin/NuevoUsuarioModal';

// Roles que pueden registrar traspasos: a estos usuarios se les asignan almacenes
const ROLES_CON_ALMACEN = ['Encargado de Almacen', 'Administrador'];

interface UsuarioSearch {
  codUsu: string;
  nomUsu: string;
  apUsu: string;
  alias: string;
}

export function AsignarRol() {
  const [roles, setRoles]                 = useState<Rol[]>([]);
  const [query, setQuery]                 = useState('');
  const [usuariosBusqueda, setUsuariosBusqueda] = useState<UsuarioSearch[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [usuarioSel, setUsuarioSel]       = useState<UsuarioSearch | null>(null);
  const [rolesUsuario, setRolesUsuario]   = useState<UsuarioRolResponse[]>([]);
  const [loadingRoles, setLoadingRoles]   = useState(false);
  const [selectedRol, setSelectedRol]     = useState('');
  const [showModal, setShowModal]         = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [mostrarNuevoUsuario, setMostrarNuevoUsuario] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Almacenes del encargado: desde cuáles puede registrar traspasos
  const [almacenes, setAlmacenes]               = useState<Almacen[]>([]);
  const [almacenesUsuario, setAlmacenesUsuario] = useState<Almacen[]>([]);
  const [selectedAlmacen, setSelectedAlmacen]   = useState('');
  const [guardandoAlmacen, setGuardandoAlmacen] = useState(false);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    api.get<Rol[]>('/roles')
      .then(({ data }) => setRoles(Array.isArray(data) ? data.filter((r) => r.activo) : []))
      .catch(() => {});
    // Almacenes habilitados para movimientos (los únicos que sirven como origen)
    api.get<Almacen[]>('/productos/almacenes-disponibles')
      .then(({ data }) => setAlmacenes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const cargarAlmacenesUsuario = async (codUsu: string) => {
    try {
      const { data } = await api.get<Almacen[]>(`/almacenes/usuario/${codUsu}`);
      setAlmacenesUsuario(Array.isArray(data) ? data : []);
    } catch {
      setAlmacenesUsuario([]);
    }
  };

  const mensajeApi = (err: unknown, porDefecto: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? porDefecto;

  const handleAsignarAlmacen = async () => {
    if (!usuarioSel || !selectedAlmacen) return;
    setGuardandoAlmacen(true);
    try {
      await api.post('/almacenes/asignar', { cod_usu: usuarioSel.codUsu, cod_suc: selectedAlmacen });
      flash('Almacén asignado correctamente.');
      setSelectedAlmacen('');
      await cargarAlmacenesUsuario(usuarioSel.codUsu);
    } catch (err: unknown) {
      flash(mensajeApi(err, 'Error al asignar el almacén.'), 'err');
    } finally {
      setGuardandoAlmacen(false);
    }
  };

  const handleQuitarAlmacen = async (codSuc: string) => {
    if (!usuarioSel) return;
    setGuardandoAlmacen(true);
    try {
      await api.delete(`/almacenes/usuario/${usuarioSel.codUsu}/almacen/${codSuc}`);
      flash('Almacén removido correctamente.');
      await cargarAlmacenesUsuario(usuarioSel.codUsu);
    } catch (err: unknown) {
      flash(mensajeApi(err, 'Error al remover el almacén.'), 'err');
    } finally {
      setGuardandoAlmacen(false);
    }
  };

  const buscarUsuarios = async (val: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!val.trim()) { setUsuariosBusqueda([]); return; }
    setLoadingSearch(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/usuarios/search', {
          params: { q: val.trim(), limit: 20 },
        });
        setUsuariosBusqueda(data.data ?? []);
      } catch {
        setUsuariosBusqueda([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
  };

  const seleccionarUsuario = async (u: UsuarioSearch) => {
    setUsuarioSel(u);
    setUsuariosBusqueda([]);
    setSelectedRol('');
    setSelectedAlmacen('');
    setLoadingRoles(true);
    void cargarAlmacenesUsuario(u.codUsu);
    try {
      const { data } = await api.get<UsuarioRolResponse[]>(`/roles/usuario/${u.codUsu}`);
      setRolesUsuario(Array.isArray(data) ? data : []);
    } catch {
      setRolesUsuario([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleAsignar = async () => {
    if (!usuarioSel || !selectedRol) return;
    try {
      await api.post('/roles/asignar', {
        cod_usu: usuarioSel.codUsu,
        id_rol: parseInt(selectedRol),
      });
      flash('Rol asignado correctamente.');
      setShowModal(false);
      seleccionarUsuario(usuarioSel);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al asignar el rol.', 'err');
      setShowModal(false);
    }
  };

  const handleQuitarRol = async (id_rol: number) => {
    if (!usuarioSel) return;
    try {
      await api.delete(`/roles/usuario/${usuarioSel.codUsu}/rol/${id_rol}`);
      flash('Rol removido correctamente.');
      seleccionarUsuario(usuarioSel);
    } catch {
      flash('Error al remover el rol.', 'err');
    }
  };

  const rolSeleccionado = roles.find((r) => r.id === parseInt(selectedRol));
  const rolesAsignados = rolesUsuario.map((ur) => ur.id_rol);
  const rolesDisponibles = roles.filter((r) => !rolesAsignados.includes(r.id));

  // La sección de almacenes aparece cuando el usuario tiene un rol que traspasa
  const manejaAlmacenes = rolesUsuario.some((ur) => ROLES_CON_ALMACEN.includes(ur.rol.nombre));
  const codigosAsignados = almacenesUsuario.map((a) => a.codSuc);
  const codigosHabilitados = almacenes.map((a) => a.codSuc);
  const almacenesDisponibles = almacenes.filter((a) => !codigosAsignados.includes(a.codSuc));

  return (
    <div>
      {}
        {mostrarNuevoUsuario && (
          <NuevoUsuarioModal
            onClose={() => setMostrarNuevoUsuario(false)}
            onCreado={(codUsu, alias) => {
              setMostrarNuevoUsuario(false);
              setMsg({ text: `Usuario ${alias} creado con el código ${codUsu}.`, type: 'ok' });
              setQuery(alias);
            }}
          />
        )}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={S.cardTitle}>Buscar usuario</div>
            <button style={btnStyle('primary')} onClick={() => setMostrarNuevoUsuario(true)}>
              <i className="ti ti-user-plus" /> Nuevo usuario
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Nombre, apellido o alias</label>
              <input
                style={S.input}
                value={query}
                onChange={(e) => { setQuery(e.target.value); buscarUsuarios(e.target.value); }}
                placeholder="Ej: bladimir, paz, bladyd"
              />
            </div>
          </div>

        {loadingSearch && (
          <div style={{ marginTop: 10, fontSize: 12, color: BRAND.gray600 }}>Buscando…</div>
        )}

        {msg && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: '8px 12px', borderRadius: 6,
            background: msg.type === 'ok' ? '#e6f9ee' : '#ffeaea',
            color: msg.type === 'ok' ? '#1a7a40' : BRAND.red,
          }}>
            {msg.text}
          </div>
        )}

        {}
        {usuariosBusqueda.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: BRAND.gray600, marginBottom: 8 }}>
              {usuariosBusqueda.length} usuario{usuariosBusqueda.length !== 1 ? 's' : ''} encontrado{usuariosBusqueda.length !== 1 ? 's' : ''} — seleccioná uno
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {usuariosBusqueda.map((u) => (
                <div
                  key={u.codUsu}
                  onClick={() => seleccionarUsuario(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 8,
                    border: `1px solid ${BRAND.gray200}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = BRAND.red;
                    (e.currentTarget as HTMLDivElement).style.background = '#ffeaea';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = BRAND.gray200;
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#ffeaea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className="ti ti-user" style={{ fontSize: 16, color: BRAND.red }} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {u.nomUsu} {u.apUsu}
                    </div>
                    <div style={{ fontSize: 12, color: BRAND.gray600 }}>
                      @{u.alias} · Cód: {u.codUsu}
                    </div>
                  </div>
                  <i className="ti ti-chevron-right" style={{ marginLeft: 'auto', color: BRAND.gray400 }} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {}
      {usuarioSel && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#ffeaea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-user" style={{ fontSize: 20, color: BRAND.red }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {usuarioSel.nomUsu} {usuarioSel.apUsu}
              </div>
              <div style={{ fontSize: 12, color: BRAND.gray600 }}>
                @{usuarioSel.alias} · {usuarioSel.codUsu}
              </div>
            </div>
          </div>

          {}
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Roles asignados actualmente</div>
            {loadingRoles && (
              <div style={{ fontSize: 13, color: BRAND.gray600, marginTop: 6 }}>Cargando roles…</div>
            )}
            {!loadingRoles && rolesUsuario.length === 0 && (
              <div style={{ fontSize: 13, color: BRAND.gray400, marginTop: 6 }}>Sin roles asignados</div>
            )}
            {!loadingRoles && rolesUsuario.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {rolesUsuario.map((ur) => (
                  <span
                    key={ur.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 20,
                      background: '#ffeaea', color: BRAND.red, fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {ur.rol.nombre}
                    <button
                      onClick={() => handleQuitarRol(ur.id_rol)}
                      title="Quitar rol"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: '50%',
                        border: 'none', background: BRAND.red, color: BRAND.white,
                        cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={S.divider} />

          {}
          {rolesDisponibles.length > 0 ? (
            <>
              <div style={{ ...S.formGroup, marginTop: 16 }}>
                <label style={S.label}>Agregar rol</label>
                <select
                  style={S.select}
                  value={selectedRol}
                  onChange={(e) => setSelectedRol(e.target.value)}
                >
                  <option value="">— Seleccione un rol —</option>
                  {rolesDisponibles.map((r) => (
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
            </>
          ) : (
            <div style={{ fontSize: 13, color: BRAND.gray600, marginTop: 16 }}>
              Este usuario ya tiene todos los roles disponibles asignados.
            </div>
          )}

          {/* Almacenes que maneja: solo para quienes pueden registrar traspasos */}
          {!loadingRoles && manejaAlmacenes && (
            <>
              <div style={{ ...S.divider, marginTop: 20 }} />
              <div style={S.label}>Almacenes que maneja</div>
              <div style={{ fontSize: 12, color: BRAND.gray600, marginBottom: 8 }}>
                Solo puede registrar traspasos desde estos almacenes.
              </div>
              {almacenesUsuario.length === 0 ? (
                <div style={{ fontSize: 13, color: BRAND.gray400, marginBottom: 12 }}>Sin almacenes asignados</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {almacenesUsuario.map((a) => {
                    const habilitado = codigosHabilitados.length === 0 || codigosHabilitados.includes(a.codSuc);
                    return (
                      <span
                        key={a.codSuc}
                        title={habilitado ? undefined : 'Este almacén no está habilitado para movimientos'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: habilitado ? BRAND.blueSubtle : BRAND.gray100,
                          color: habilitado ? BRAND.blue : BRAND.gray600,
                        }}
                      >
                        {a.nomSuc} ({a.codSuc}){!habilitado && ' · no habilitado'}
                        <button
                          onClick={() => handleQuitarAlmacen(a.codSuc)}
                          disabled={guardandoAlmacen}
                          title="Quitar almacén"
                          aria-label={`Quitar ${a.nomSuc}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16, borderRadius: '50%',
                            border: 'none', background: habilitado ? BRAND.blue : BRAND.gray600, color: BRAND.white,
                            cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1,
                            fontFamily: 'inherit',
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {almacenesDisponibles.length > 0 ? (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <label style={S.label} htmlFor="asignar-almacen">Agregar almacén</label>
                    <select
                      id="asignar-almacen"
                      style={S.select}
                      value={selectedAlmacen}
                      onChange={(e) => setSelectedAlmacen(e.target.value)}
                    >
                      <option value="">— Seleccione un almacén —</option>
                      {almacenesDisponibles.map((a) => (
                        <option key={a.codSuc} value={a.codSuc}>{a.nomSuc} ({a.codSuc})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    style={btnStyle('primary')}
                    onClick={handleAsignarAlmacen}
                    disabled={!selectedAlmacen || guardandoAlmacen}
                  >
                    <i className="ti ti-building-warehouse" aria-hidden="true" />
                    Asignar almacén
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: BRAND.gray600 }}>
                  Este usuario ya tiene todos los almacenes habilitados.
                </div>
              )}
            </>
          )}
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
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
              Confirmar asignación
            </div>
            <p style={{ fontSize: 14, color: '#444', marginBottom: 24, lineHeight: 1.6 }}>
              ¿Confirmas asignar el rol{' '}
              <strong>{rolSeleccionado?.nombre}</strong>{' '}
              a{' '}
              <strong>{usuarioSel?.nomUsu} {usuarioSel?.apUsu}</strong>?
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