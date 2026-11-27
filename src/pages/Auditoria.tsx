import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { BRAND, S, badgeStyle, btnStyle } from '../components/ui/tokens';
import { mensajeError } from '../utils/errores';
import { fechaLegible } from '../utils/traspasoPdf';
import { exportarAuditoria, MODULO_TEXTO, type RegistroAuditoria } from '../utils/auditoriaPdf';

interface Respuesta {
  data: RegistroAuditoria[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  tablaDisponible: boolean;
}

interface Filtros { fecha_ini: string; fecha_fin: string; modulo: string; cod_usu: string; q: string }

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
const haceDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d);
};

const COLOR_MODULO: Record<string, Parameters<typeof badgeStyle>[0]> = {
  VENTA: 'green', CREDITO: 'blue', PAGO: 'blue', DEVOLUCION: 'amber', TIPO_CAMBIO: 'gray',
  ROL: 'red', ALMACEN: 'red', CLIENTE: 'gray', USUARIO: 'red',
};

/** Muestra un objeto JSON de la auditoría como lista legible. */
function Detalle({ titulo, datos }: { titulo: string; datos: unknown }) {
  if (datos === null || datos === undefined) return null;
  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray600, textTransform: 'uppercase', marginBottom: 4 }}>{titulo}</div>
      <pre style={{
        margin: 0, padding: 10, background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 6,
        fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflowY: 'auto',
      }}>
        {typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Auditoría general (Administrador): quién hizo qué y cuándo en ventas,
 * créditos, pagos, devoluciones, tipo de cambio, roles, almacenes, clientes y
 * usuarios. Los cambios de productos y los traspasos tienen su propio historial.
 */
export function Auditoria() {
  const [filtros, setFiltros] = useState<Filtros>({ fecha_ini: haceDias(7), fecha_fin: hoy(), modulo: '', cod_usu: '', q: '' });
  const [aplicados, setAplicados] = useState<Filtros>(filtros);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Respuesta | null>(null);
  const [usuarios, setUsuarios] = useState<{ codUsu: string; alias: string; nombre: string }[]>([]);
  const [modulos, setModulos] = useState<string[]>([]);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');

  const params = (f: Filtros) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));

  const cargar = useCallback(async (f: Filtros, p: number) => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get<Respuesta>('/auditoria', { params: { ...params(f), page: p, limit: 50 } });
      setRes(data);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo cargar la auditoría.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    api.get<{ modulos: string[]; usuarios: { codUsu: string; alias: string; nombre: string }[] }>('/auditoria/filtros')
      .then(({ data }) => { setModulos(data.modulos); setUsuarios(data.usuarios); })
      .catch(() => undefined);
  }, []);

  useEffect(() => { void cargar(aplicados, page); }, [aplicados, page, cargar]);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (filtros.fecha_ini && filtros.fecha_fin && filtros.fecha_ini > filtros.fecha_fin) {
      setError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    setPage(1);
    setAplicados({ ...filtros });
  };

  const textoFiltros = () => {
    const partes: string[] = [];
    if (aplicados.fecha_ini || aplicados.fecha_fin) {
      partes.push(`del ${aplicados.fecha_ini ? fechaLegible(aplicados.fecha_ini) : '…'} al ${aplicados.fecha_fin ? fechaLegible(aplicados.fecha_fin) : '…'}`);
    }
    if (aplicados.modulo) partes.push(`módulo ${MODULO_TEXTO[aplicados.modulo] ?? aplicados.modulo}`);
    if (aplicados.cod_usu) partes.push(`usuario ${usuarios.find((u) => u.codUsu === aplicados.cod_usu)?.nombre ?? aplicados.cod_usu}`);
    if (aplicados.q) partes.push(`"${aplicados.q}"`);
    return partes.join(' · ') || 'sin filtros';
  };

  // El PDF lleva todos los registros del filtro (hasta 500), no solo la página visible
  const exportar = async () => {
    setExportando(true);
    try {
      const { data } = await api.get<Respuesta>('/auditoria', { params: { ...params(aplicados), page: 1, limit: 500 } });
      await exportarAuditoria(data.data, textoFiltros() + (data.meta.total > 500 ? ` (primeros 500 de ${data.meta.total})` : ''));
    } catch (e) {
      setError(mensajeError(e, 'No se pudo exportar el PDF.'));
    } finally {
      setExportando(false);
    }
  };

  const total = res?.meta.total ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: BRAND.black }}>Auditoría</div>
          <div style={{ color: BRAND.gray600, fontSize: 14, marginTop: 4 }}>
            Quién hizo qué y cuándo (hora de Bolivia). Cambios de productos en{' '}
            <Link to="/productos/historial">Historial de productos</Link> y traspasos en{' '}
            <Link to="/productos/traspasos">Historial de traspasos</Link>.
          </div>
        </div>
        <button style={btnStyle('secondary')} onClick={() => void exportar()} disabled={exportando || total === 0}>
          <i className="ti ti-file-type-pdf" /> {exportando ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>

      {res && !res.tablaDisponible && (
        <div style={{ ...S.card, borderLeft: `4px solid ${BRAND.amber}`, background: BRAND.amberSubtle }}>
          Falta ejecutar el bloque 10 de <code>sql/siam_scripts.sql</code> (SISTEMA_AUDITORIA). Hasta entonces no se registra auditoría.
        </div>
      )}

      <form onSubmit={buscar} style={{ ...S.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, alignItems: 'end' }}>
        <div>
          <label htmlFor="au-desde" style={S.label}>Desde</label>
          <input id="au-desde" type="date" style={S.input} value={filtros.fecha_ini} onChange={(e) => setFiltros({ ...filtros, fecha_ini: e.target.value })} />
        </div>
        <div>
          <label htmlFor="au-hasta" style={S.label}>Hasta</label>
          <input id="au-hasta" type="date" style={S.input} value={filtros.fecha_fin} onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })} />
        </div>
        <div>
          <label htmlFor="au-modulo" style={S.label}>Módulo</label>
          <select id="au-modulo" style={S.select} value={filtros.modulo} onChange={(e) => setFiltros({ ...filtros, modulo: e.target.value })}>
            <option value="">Todos</option>
            {modulos.map((m) => <option key={m} value={m}>{MODULO_TEXTO[m] ?? m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="au-usuario" style={S.label}>Usuario</label>
          <select id="au-usuario" style={S.select} value={filtros.cod_usu} onChange={(e) => setFiltros({ ...filtros, cod_usu: e.target.value })}>
            <option value="">Todos</option>
            {usuarios.map((u) => <option key={u.codUsu} value={u.codUsu}>{u.nombre || u.alias} ({u.alias})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="au-q" style={S.label}>Documento o texto</label>
          <input id="au-q" style={S.input} placeholder="N° de venta, crédito, alias…" value={filtros.q} onChange={(e) => setFiltros({ ...filtros, q: e.target.value })} />
        </div>
        <button type="submit" style={btnStyle('primary')} disabled={cargando}>
          <i className="ti ti-search" /> Buscar
        </button>
      </form>

      {error && <div style={S.errorBanner} role="alert">{error}</div>}

      <div style={S.card}>
        <div style={{ fontSize: 12, color: BRAND.gray600, marginBottom: 10 }}>
          {cargando ? 'Cargando…' : `${total} registro${total === 1 ? '' : 's'} · ${textoFiltros()}`}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Fecha y hora', 'Usuario', 'Módulo', 'Acción', 'Documento', 'Descripción', ''].map((h) => (
                  <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(res?.data ?? []).map((r) => (
                <Fragment key={r.id}>
                  <tr style={{ background: abierto === r.id ? '#f7f9ff' : undefined }}>
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>{fechaLegible(r.fecha)} {r.hora}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{r.nombreUsuario || r.codUsu}</div>
                      <div style={{ fontSize: 11, color: BRAND.gray600 }}>{r.alias}</div>
                    </td>
                    <td style={S.td}><span style={badgeStyle(COLOR_MODULO[r.modulo] ?? 'gray')}>{MODULO_TEXTO[r.modulo] ?? r.modulo}</span></td>
                    <td style={{ ...S.td, fontSize: 12 }}>{r.accion}</td>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{r.documento ?? '—'}</td>
                    <td style={{ ...S.td, fontSize: 13 }}>{r.descripcion}</td>
                    <td style={S.td}>
                      {(r.antes != null || r.despues != null) && (
                        <button type="button" style={btnStyle('ghost')} onClick={() => setAbierto(abierto === r.id ? null : r.id)}
                          aria-expanded={abierto === r.id} aria-label="Ver detalle">
                          <i className={`ti ${abierto === r.id ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {abierto === r.id && (
                    <tr>
                      <td colSpan={7} style={{ ...S.td, background: BRAND.gray50 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <Detalle titulo="Antes" datos={r.antes} />
                          <Detalle titulo={r.antes != null ? 'Después' : 'Datos'} datos={r.despues} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!cargando && (res?.data.length ?? 0) === 0 && (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: BRAND.gray600, padding: 24 }}>No hay registros con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {(res?.meta.totalPages ?? 0) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button style={btnStyle('ghost')} disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)}>
              <i className="ti ti-chevron-left" /> Anterior
            </button>
            <span style={{ fontSize: 12, color: BRAND.gray600 }}>Página {page} de {res?.meta.totalPages}</span>
            <button style={btnStyle('ghost')} disabled={page >= (res?.meta.totalPages ?? 1) || cargando} onClick={() => setPage((p) => p + 1)}>
              Siguiente <i className="ti ti-chevron-right" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
