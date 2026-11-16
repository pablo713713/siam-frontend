import { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { BRAND, S, badgeStyle, btnStyle } from '../components/ui/tokens';
import {
  ESTADO_TRASPASO_TEXTO,
  TIPO_TRASPASO_TEXTO,
  exportarComprobanteTraspaso,
  exportarListadoTraspasos,
  fechaLegible,
} from '../utils/traspasoPdf';
import type {
  Almacen,
  EstadoTraspaso,
  FiltrosHistorialTraspasos,
  HistorialTraspasosResponse,
  TipoTraspaso,
  TraspasoHistorial,
} from '../types';

const POR_PAGINA = 25;
const MAX_EXPORTAR = 2000;

interface Filtros {
  desde: string;
  hasta: string;
  nombre: string;
  almacen: string;
}

const FILTROS_VACIOS: Filtros = { desde: '', hasta: '', nombre: '', almacen: '' };

// Misma altura para fecha, texto y select (los campos de fecha son más altos por defecto)
const CAMPO: React.CSSProperties = { ...S.input, height: 38 };

const COLOR_TIPO: Record<TipoTraspaso, 'amber' | 'blue' | 'gray'> = {
  SALIDA_VENTA: 'amber',
  INGRESO_TIENDA: 'blue',
  ENTRE_ALMACENES: 'gray',
};

const COLOR_ESTADO: Record<EstadoTraspaso, 'amber' | 'green' | 'gray' | 'blue'> = {
  PENDIENTE: 'amber',
  COMPLETADO: 'green',
  VENDIDO: 'green',
  DEVUELTO: 'gray',
};

const mensajeError = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const m = error.response?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (m) return m;
  }
  return 'No se pudo cargar el historial. Intenta nuevamente.';
};

// Solo se envían los filtros con valor (el backend rechaza parámetros vacíos)
const aParams = (f: Filtros, page: number, limit: number) => ({
  ...(f.desde ? { fecha_desde: f.desde } : {}),
  ...(f.hasta ? { fecha_hasta: f.hasta } : {}),
  ...(f.nombre.trim() ? { nombre: f.nombre.trim() } : {}),
  ...(f.almacen ? { cod_suc_ori: f.almacen } : {}),
  page,
  limit,
});

/**
 * Talonario digital: historial de traspasos firmados.
 * El Administrador ve todos; el Encargado de Almacén, solo los de sus almacenes
 * (el backend aplica el permiso).
 */
export function HistorialTraspasos() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [alcance, setAlcance] = useState<FiltrosHistorialTraspasos['alcance'] | null>(null);
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_VACIOS); // lo que se está escribiendo
  const [aplicados, setAplicados] = useState<Filtros>(FILTROS_VACIOS); // lo que se consultó
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<HistorialTraspasosResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState<number | null>(null);
  const [exportando, setExportando] = useState<'listado' | number | null>(null);

  useEffect(() => {
    api.get<FiltrosHistorialTraspasos>('/productos/traspasos/filtros')
      .then(({ data }) => { setAlmacenes(data.almacenes ?? []); setAlcance(data.alcance); })
      .catch(() => { /* el error se muestra al cargar el historial */ });
  }, []);

  // Consulta cada vez que cambian los filtros aplicados o la página.
  // "vigente" descarta respuestas viejas si el usuario cambia de filtro rápido.
  useEffect(() => {
    let vigente = true;
    api.get<HistorialTraspasosResponse>('/productos/traspasos', { params: aParams(aplicados, pagina, POR_PAGINA) })
      .then(({ data }) => { if (vigente) setResultado(data); })
      .catch((e: unknown) => {
        if (!vigente) return;
        setResultado(null);
        setError(mensajeError(e));
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [aplicados, pagina]);

  // Los cambios de filtro o de página se hacen desde aquí (marca la carga y limpia el error)
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

  const nombreAlmacen = (cod: string) => almacenes.find((a) => a.codSuc === cod)?.nomSuc ?? cod;

  const filtrosTexto = () => {
    const partes = [
      aplicados.desde && `desde ${fechaLegible(aplicados.desde)}`,
      aplicados.hasta && `hasta ${fechaLegible(aplicados.hasta)}`,
      aplicados.nombre.trim() && `nombre "${aplicados.nombre.trim()}"`,
      aplicados.almacen && `salida de ${nombreAlmacen(aplicados.almacen)}`,
    ].filter(Boolean);
    return partes.length ? partes.join(', ') : 'sin filtros (todos los traspasos)';
  };

  // Exporta TODOS los traspasos que cumplen los filtros, no solo la página visible
  const exportarListado = async () => {
    setExportando('listado');
    setError('');
    try {
      const todos: TraspasoHistorial[] = [];
      for (let page = 1; todos.length < MAX_EXPORTAR; page++) {
        const { data } = await api.get<HistorialTraspasosResponse>(
          '/productos/traspasos',
          { params: aParams(aplicados, page, 200) },
        );
        todos.push(...data.data);
        if (page >= data.meta.totalPages || data.data.length === 0) break;
      }
      await exportarListadoTraspasos(todos.slice(0, MAX_EXPORTAR), filtrosTexto());
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setExportando(null);
    }
  };

  const exportarComprobante = async (t: TraspasoHistorial) => {
    setExportando(t.idAutorizacion);
    try {
      await exportarComprobanteTraspaso(t);
    } catch {
      setError('No se pudo generar el PDF del traspaso.');
    } finally {
      setExportando(null);
    }
  };

  const traspasos = resultado?.data ?? [];
  const meta = resultado?.meta;

  return (
    <div>
      <header style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Historial de traspasos</h1>
          <p style={S.pageSubtitle}>
            Traspasos firmados digitalmente: quién registró, quién firmó, cuándo y qué productos.
            {alcance === 'MIS_ALMACENES' && ' Ves solo los traspasos que salieron de tus almacenes.'}
          </p>
        </div>
        <button
          type="button"
          style={btnStyle('secondary')}
          onClick={() => void exportarListado()}
          disabled={exportando !== null || cargando || !meta || meta.total === 0}
        >
          <i className="ti ti-file-type-pdf" aria-hidden="true" />
          {exportando === 'listado' ? 'Generando…' : 'Exportar listado (PDF)'}
        </button>
      </header>

      {error && <div style={S.errorBanner} role="alert">{error}</div>}

      <form style={S.card} onSubmit={buscar} aria-label="Filtros">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, alignItems: 'end' }}>
          <div>
            <label htmlFor="f-desde" style={S.label}>Fecha desde</label>
            <input
              id="f-desde" type="date" style={CAMPO}
              value={borrador.desde} max={borrador.hasta || undefined}
              onChange={(e) => setBorrador({ ...borrador, desde: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="f-hasta" style={S.label}>Fecha hasta</label>
            <input
              id="f-hasta" type="date" style={CAMPO}
              value={borrador.hasta} min={borrador.desde || undefined}
              onChange={(e) => setBorrador({ ...borrador, hasta: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="f-nombre" style={S.label}>Nombre (registró o firmó)</label>
            <input
              id="f-nombre" style={CAMPO} placeholder="Nombre, apellido o alias"
              value={borrador.nombre} maxLength={60}
              onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="f-almacen" style={S.label}>Almacén de salida</label>
            <select
              id="f-almacen" style={{ ...S.select, height: 38 }}
              value={borrador.almacen}
              onChange={(e) => setBorrador({ ...borrador, almacen: e.target.value })}
            >
              <option value="">Todos</option>
              {almacenes.map((a) => (
                <option key={a.codSuc} value={a.codSuc}>{a.nomSuc} ({a.codSuc})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={btnStyle('primary')} disabled={cargando}>
              <i className="ti ti-search" aria-hidden="true" /> Buscar
            </button>
            <button type="button" style={btnStyle('ghost')} onClick={limpiar} disabled={cargando}>
              Limpiar
            </button>
          </div>
        </div>
      </form>

      <section style={S.cardFlush}>
        {cargando ? (
          <p style={S.emptyState}>Cargando traspasos…</p>
        ) : traspasos.length === 0 ? (
          <p style={S.emptyState}>
            {error ? 'No se pudo mostrar el historial.' : 'No hay traspasos firmados con esos filtros.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Fecha</th>
                  <th style={S.th}>Hora</th>
                  <th style={S.th}>Almacén de salida</th>
                  <th style={S.th}>Destino</th>
                  <th style={S.th}>Tipo</th>
                  <th style={S.th}>Registró</th>
                  <th style={S.th}>Firmó</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Unid.</th>
                  <th style={S.th}>Estado</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {traspasos.map((t) => {
                  const expandido = abierto === t.idAutorizacion;
                  return (
                    <Fragment key={t.idAutorizacion}>
                      <tr style={expandido ? { background: BRAND.gray50 } : undefined}>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', fontWeight: 600 }}>{fechaLegible(t.fecha)}</td>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', color: BRAND.gray600 }}>{t.hora}</td>
                        <td style={S.td}>{t.nomSucOri}</td>
                        <td style={S.td}>{t.nomSucDes}</td>
                        <td style={S.td}><span style={badgeStyle(COLOR_TIPO[t.tipo] ?? 'gray')}>{TIPO_TRASPASO_TEXTO[t.tipo] ?? t.tipo}</span></td>
                        <td style={S.td}>{t.nombreEncargado}</td>
                        <td style={S.td}>{t.nombreFirmante}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{t.totalUnidades}</td>
                        <td style={S.td}><span style={badgeStyle(COLOR_ESTADO[t.estado] ?? 'gray')}>{ESTADO_TRASPASO_TEXTO[t.estado] ?? t.estado}</span></td>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button
                            type="button"
                            style={{ ...btnStyle('ghost', 'sm'), marginRight: 6 }}
                            onClick={() => setAbierto(expandido ? null : t.idAutorizacion)}
                            aria-expanded={expandido}
                          >
                            <i className={`ti ${expandido ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
                            {expandido ? 'Ocultar' : 'Ver productos'}
                          </button>
                          <button
                            type="button"
                            style={btnStyle('secondary', 'sm')}
                            onClick={() => void exportarComprobante(t)}
                            disabled={exportando !== null}
                            aria-label={`Exportar a PDF el traspaso ${t.codRemSalida}`}
                          >
                            <i className="ti ti-file-type-pdf" aria-hidden="true" />
                            {exportando === t.idAutorizacion ? '…' : 'PDF'}
                          </button>
                        </td>
                      </tr>

                      {expandido && (
                        <tr>
                          <td colSpan={10} style={{ ...S.td, background: BRAND.gray50, padding: '4px 16px 18px' }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: BRAND.gray600, margin: '8px 0 10px' }}>
                              <span>N° remisión de salida: <strong style={{ color: BRAND.black }}>{t.codRemSalida}</strong></span>
                              {t.codRemEntrada && <span>N° remisión de entrada: <strong style={{ color: BRAND.black }}>{t.codRemEntrada}</strong></span>}
                              <span>Registró: <strong style={{ color: BRAND.black }}>{t.nombreEncargado}</strong> ({t.codUsuEncargado})</span>
                              <span>Firmó: <strong style={{ color: BRAND.black }}>{t.nombreFirmante}</strong> ({t.codUsuFirmante})</span>
                            </div>
                            <table style={{ ...S.table, background: BRAND.white, border: `1px solid ${BRAND.gray200}` }}>
                              <thead>
                                <tr>
                                  <th style={S.th}>Código de fábrica</th>
                                  <th style={S.th}>Producto</th>
                                  <th style={S.th}>Observación</th>
                                  <th style={{ ...S.th, textAlign: 'right' }}>Cantidad</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.items.map((it) => (
                                  <tr key={it.idFab}>
                                    <td style={S.td}>{it.codFab}</td>
                                    <td style={S.td}>{it.descPro ?? '—'}</td>
                                    <td style={{ ...S.td, color: BRAND.gray600 }}>{it.obs ?? ''}</td>
                                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{it.cantidad}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {t.obs && (
                              <p style={{ fontSize: 12, color: BRAND.gray600, margin: '10px 0 0' }}>
                                Observación: <span style={{ color: BRAND.black }}>{t.obs}</span>
                              </p>
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
              {meta.total} traspaso{meta.total === 1 ? '' : 's'} · página {meta.page} de {meta.totalPages}
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
