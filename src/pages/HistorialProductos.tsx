import { Fragment, useEffect, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, badgeStyle, btnStyle } from '../components/ui/tokens';
import { ETIQUETA_CAMPO } from '../components/productos/productoFormUtils';
import { mensajeError } from '../utils/errores';
import { fechaLegible } from '../utils/traspasoPdf';
import type { AuditoriaProducto, AuditoriaProductosResponse } from '../types';

const POR_PAGINA = 25;

interface Filtros {
  desde: string;
  hasta: string;
  nombre: string;
  producto: string;
  accion: '' | 'CREAR' | 'EDITAR';
}

const FILTROS_VACIOS: Filtros = { desde: '', hasta: '', nombre: '', producto: '', accion: '' };
const CAMPO: React.CSSProperties = { ...S.input, height: 38 };

const aParams = (f: Filtros, page: number) => ({
  ...(f.desde ? { fecha_desde: f.desde } : {}),
  ...(f.hasta ? { fecha_hasta: f.hasta } : {}),
  ...(f.nombre.trim() ? { nombre: f.nombre.trim() } : {}),
  ...(f.producto.trim() ? { producto: f.producto.trim() } : {}),
  ...(f.accion ? { accion: f.accion } : {}),
  page,
  limit: POR_PAGINA,
});

const mostrar = (valor: string | number | null | undefined) =>
  valor === null || valor === undefined || valor === '' ? '—' : String(valor);

// Campos del producto que se listan al abrir una creación
const CAMPOS_CREACION = [
  'descPro', 'codFab', 'codPro', 'marca', 'modelo', 'tipo', 'unidad', 'barra', 'codAnt',
  'plisPro', 'pminPro', 'pmayPro', 'plisBs', 'pminBs', 'pmayBs', 'cifCbba', 'comentario',
] as const;
const ETIQUETA_CREACION: Record<string, string> = {
  ...ETIQUETA_CAMPO, marca: 'Marca / proveedor', modelo: 'Modelo', tipo: 'Tipo de producto',
};

/**
 * Rastro de auditoría de productos (solo Administrador): quién creó o editó
 * cada producto, cuándo, y los datos antes y después del cambio.
 */
export function HistorialProductos() {
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<AuditoriaProductosResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState<number | null>(null);

  useEffect(() => {
    let vigente = true;
    api.get<AuditoriaProductosResponse>('/productos/auditoria', { params: aParams(aplicados, pagina) })
      .then(({ data }) => { if (vigente) setResultado(data); })
      .catch((e: unknown) => {
        if (!vigente) return;
        setResultado(null);
        setError(mensajeError(e, 'No se pudo cargar el historial.'));
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [aplicados, pagina]);

  const consultar = (f: Filtros, page: number) => {
    setCargando(true);
    setError('');
    setAbierto(null);
    setPagina(page);
    setAplicados(f);
  };

  const buscar = (event: React.FormEvent) => {
    event.preventDefault();
    if (borrador.desde && borrador.hasta && borrador.desde > borrador.hasta) {
      setError('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return;
    }
    consultar({ ...borrador }, 1);
  };

  const limpiar = () => {
    setBorrador(FILTROS_VACIOS);
    consultar({ ...FILTROS_VACIOS }, 1);
  };

  const filas = resultado?.data ?? [];
  const meta = resultado?.meta;

  const resumen = (a: AuditoriaProducto) =>
    a.accion === 'CREAR'
      ? 'Producto registrado'
      : a.cambios.map((c) => ETIQUETA_CAMPO[c.campo] ?? c.campo).join(', ') || '—';

  return (
    <div>
      <header style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Historial de productos</h1>
          <p style={S.pageSubtitle}>
            Quién registró o editó cada producto, cuándo, y qué datos tenía antes y después.
          </p>
        </div>
      </header>

      {error && <div style={S.errorBanner} role="alert">{error}</div>}

      <form style={S.card} onSubmit={buscar} aria-label="Filtros">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <label htmlFor="hp-desde" style={S.label}>Fecha desde</label>
            <input id="hp-desde" type="date" style={CAMPO} value={borrador.desde} max={borrador.hasta || undefined}
              onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hp-hasta" style={S.label}>Fecha hasta</label>
            <input id="hp-hasta" type="date" style={CAMPO} value={borrador.hasta} min={borrador.desde || undefined}
              onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hp-nombre" style={S.label}>Usuario</label>
            <input id="hp-nombre" style={CAMPO} placeholder="Nombre, apellido o alias" maxLength={60}
              value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hp-producto" style={S.label}>Producto</label>
            <input id="hp-producto" style={CAMPO} placeholder="Descripción o código de fábrica" maxLength={60}
              value={borrador.producto} onChange={(e) => setBorrador({ ...borrador, producto: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hp-accion" style={S.label}>Acción</label>
            <select id="hp-accion" style={{ ...S.select, height: 38 }} value={borrador.accion}
              onChange={(e) => setBorrador({ ...borrador, accion: e.target.value as Filtros['accion'] })}>
              <option value="">Todas</option>
              <option value="EDITAR">Ediciones</option>
              <option value="CREAR">Registros nuevos</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={btnStyle('primary')} disabled={cargando}>
              <i className="ti ti-search" aria-hidden="true" /> Buscar
            </button>
            <button type="button" style={btnStyle('ghost')} onClick={limpiar} disabled={cargando}>Limpiar</button>
          </div>
        </div>
      </form>

      <section style={S.cardFlush}>
        {cargando ? (
          <p style={S.emptyState}>Cargando historial…</p>
        ) : filas.length === 0 ? (
          <p style={S.emptyState}>
            {error ? 'No se pudo mostrar el historial.' : 'No hay cambios de productos con esos filtros.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Fecha</th>
                  <th style={S.th}>Hora</th>
                  <th style={S.th}>Acción</th>
                  <th style={S.th}>Producto</th>
                  <th style={S.th}>Usuario</th>
                  <th style={S.th}>Qué cambió</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((a) => {
                  const expandido = abierto === a.idAuditoria;
                  return (
                    <Fragment key={a.idAuditoria}>
                      <tr style={expandido ? { background: BRAND.gray50 } : undefined}>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', fontWeight: 600 }}>{fechaLegible(a.fecha)}</td>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', color: BRAND.gray600 }}>{a.hora}</td>
                        <td style={S.td}>
                          <span style={badgeStyle(a.accion === 'CREAR' ? 'green' : 'blue')}>
                            {a.accion === 'CREAR' ? 'Registro' : 'Edición'}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600 }}>{a.descProActual || a.descPro}</div>
                          <div style={{ fontSize: 11, color: BRAND.gray600 }}>{a.codFab}</div>
                        </td>
                        <td style={S.td}>
                          {a.nombreUsuario}
                          <div style={{ fontSize: 11, color: BRAND.gray600 }}>{a.codUsu}</div>
                        </td>
                        <td style={{ ...S.td, maxWidth: 280, color: BRAND.gray700 }}>{resumen(a)}</td>
                        <td style={{ ...S.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            style={btnStyle('ghost', 'sm')}
                            onClick={() => setAbierto(expandido ? null : a.idAuditoria)}
                            aria-expanded={expandido}
                          >
                            <i className={`ti ${expandido ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
                            {expandido ? 'Ocultar' : 'Ver detalle'}
                          </button>
                        </td>
                      </tr>

                      {expandido && (
                        <tr>
                          <td colSpan={7} style={{ ...S.td, background: BRAND.gray50, padding: '8px 16px 18px' }}>
                            {a.accion === 'EDITAR' ? (
                              <table style={{ ...S.table, background: BRAND.white, border: `1px solid ${BRAND.gray200}` }}>
                                <thead>
                                  <tr>
                                    <th style={S.th}>Campo</th>
                                    <th style={S.th}>Antes</th>
                                    <th style={S.th}>Después</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {a.cambios.map((c) => (
                                    <tr key={c.campo}>
                                      <td style={{ ...S.td, fontWeight: 600 }}>{ETIQUETA_CAMPO[c.campo] ?? c.campo}</td>
                                      <td style={{ ...S.td, color: BRAND.redBadge }}>{mostrar(c.antes)}</td>
                                      <td style={{ ...S.td, color: BRAND.green, fontWeight: 600 }}>{mostrar(c.despues)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px 20px', background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 8, padding: 14 }}>
                                {CAMPOS_CREACION.map((campo) => (
                                  <div key={campo}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.gray400, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                                      {ETIQUETA_CREACION[campo] ?? campo}
                                    </div>
                                    <div style={{ fontSize: 13 }}>{mostrar(a.datosNuevos?.[campo])}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: `1px solid ${BRAND.gray200}`, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: BRAND.gray600 }}>
              {meta.total} cambio{meta.total === 1 ? '' : 's'} · página {meta.page} de {meta.totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={btnStyle('ghost', 'sm')} onClick={() => consultar(aplicados, meta.page - 1)} disabled={cargando || meta.page <= 1}>
                <i className="ti ti-chevron-left" aria-hidden="true" /> Anterior
              </button>
              <button type="button" style={btnStyle('ghost', 'sm')} onClick={() => consultar(aplicados, meta.page + 1)} disabled={cargando || meta.page >= meta.totalPages}>
                Siguiente <i className="ti ti-chevron-right" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
