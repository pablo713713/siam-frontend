import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Producto, AdvancedSearchParams } from '../types';
import css from './Kardex.module.css';

interface InfoProducto {
  codSiam: string;
  codFabrica: string;
  idFab: number;
  descripcion: string;
  marca: string;
}

interface Movimiento {
  fecha: string;
  idFab: number;
  codigo: string;
  descripcion: string;
  entrada: number;
  salida: number;
  existencia: number;
  sucursal: string;
  usuario: string;
  observacion: string;
}

const ALMACENES = [
  { codSuc: 'TODOS', nomSuc: 'Todos los almacenes' },
  { codSuc: '00004', nomSuc: 'Almacén I' },
  { codSuc: '00005', nomSuc: 'Almacén II' },
  { codSuc: '00006', nomSuc: 'Almacén III' },
  { codSuc: '00007', nomSuc: 'Almacén IV' },
  { codSuc: '00010', nomSuc: 'Almacén 2H' },
  { codSuc: '00011', nomSuc: 'Motor Zone' },
];

const PERIODOS = [
  { label: 'Todo', value: '' },
  { label: 'Último año', value: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; } },
  { label: 'Último mes', value: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; } },
  { label: 'Última semana', value: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; } },
];

const LIMIT = 200;

export function Kardex() {
  // --- Búsqueda de producto ---
  const [q, setQ]               = useState('');
  const [codigo, setCodigo]     = useState('');
  const [results, setResults]   = useState<Producto[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useRef(0);

  // --- Producto seleccionado + kardex ---
  const [productoSel, setProductoSel]     = useState<Producto | null>(null);
  const [info, setInfo]                   = useState<InfoProducto | null>(null);
  const [movimientos, setMovimientos]     = useState<Movimiento[]>([]);
  const [loadingKardex, setLoadingKardex] = useState(false);

  const [codSuc, setCodSuc]         = useState('TODOS');
  const [periodoSel, setPeriodoSel] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim() && !codigo.trim()) { setResults([]); setTotal(0); setSearched(false); return; }
    debounce.current = setTimeout(() => { search(); }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, codigo]);

  const search = async () => {
    const id = ++searchId.current;
    setLoading(true); setSearched(true);
    const params: AdvancedSearchParams = { page: 1, limit: LIMIT };
    if (q.trim())      params.q      = q.trim();
    if (codigo.trim()) params.codigo = codigo.trim();
    try {
      const { data } = await api.get('/productos/search/advanced', { params });
      if (id !== searchId.current) return; // llegó tarde: ya hay una búsqueda más nueva en curso
      if (Array.isArray(data)) { setResults(data); setTotal(data.length); }
      else { setResults(data.data ?? data.items ?? []); setTotal(data.total ?? 0); }
    } catch {
      if (id !== searchId.current) return;
      setResults([]); setTotal(0);
    } finally {
      if (id === searchId.current) setLoading(false);
    }
  };

  const clear = () => {
    setQ(''); setCodigo(''); setResults([]); setTotal(0); setSearched(false);
    cerrarKardex();
  };

  const cargarKardex = async (productoId: number, suc = codSuc, fecha = fechaDesde) => {
    setLoadingKardex(true);
    try {
      const params: Record<string, string> = {};
      if (suc && suc !== 'TODOS') params.codSuc = suc;
      if (fecha) params.fechaDesde = fecha;

      const { data } = await api.get(`/productos/${productoId}/kardex-almacen`, { params });
      setInfo(data.info);
      setMovimientos(data.movimientos ?? []);
    } catch {
      setInfo(null); setMovimientos([]);
    } finally {
      setLoadingKardex(false);
    }
  };

  const seleccionarProducto = (p: Producto) => {
    setProductoSel(p);
    setCodSuc('TODOS'); setPeriodoSel(''); setFechaDesde('');
    cargarKardex(p.id, 'TODOS', '');
  };

  const cerrarKardex = () => {
    setProductoSel(null); setInfo(null); setMovimientos([]);
    setCodSuc('TODOS'); setPeriodoSel(''); setFechaDesde('');
  };

  const seleccionarPeriodo = (periodo: typeof PERIODOS[0]) => {
    if (!productoSel) return;
    setPeriodoSel(periodo.label);
    const fecha = typeof periodo.value === 'function' ? periodo.value() : periodo.value;
    setFechaDesde(fecha);
    cargarKardex(productoSel.id, codSuc, fecha);
  };

  const seleccionarAlmacen = (suc: string) => {
    if (!productoSel) return;
    setCodSuc(suc);
    cargarKardex(productoSel.id, suc, fechaDesde);
  };

  const formatFecha = (f: string) => {
    const d = new Date(f);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getNomSuc = (cod: string) => ALMACENES.find((a) => a.codSuc === cod)?.nomSuc ?? cod;

  return (
    <div>
      {}
      <div className={css.header}>
        <h1 className={css.title}>Kardex</h1>
        <p className={css.subtitle}>Consulta de movimientos de inventario por producto</p>
      </div>

      {}
      <div className={css.filtersCard}>
        <div className={css.filtersRow}>
          <div className={css.filterGroup}>
            <label className={css.filterLabel} htmlFor="kardex-search-q">Nombre / descripcion</label>
            <input id="kardex-search-q" style={S.input} value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto por nombre o descripcion"
            />
          </div>
          <div className={css.filterActions}>
            {(q || codigo) && (
              <button style={btnStyle('ghost')} onClick={clear}>
                <i className="ti ti-x" aria-hidden="true" /> Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {}
      {searched && !productoSel && (
        <div className={css.tableCard}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BRAND.gray100}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Resultados</span>
            {!loading && (
              <span style={badgeStyle('gray')}>{total} producto{total !== 1 ? 's' : ''}</span>
            )}
          </div>

          {loading && (
            <div className={css.emptyState}>
              <span className={css.emptyIcon} aria-hidden="true"><i className="ti ti-loader" /></span>
              <span className={css.emptyText}>Buscando...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className={css.emptyState}>
              <span className={css.emptyIcon} aria-hidden="true"><i className="ti ti-search-off" /></span>
              <span className={css.emptyText}>No se encontraron productos con los filtros aplicados.</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className={css.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Cod. SIAM</th>
                    <th style={S.th}>Cod. Fabrica</th>
                    <th style={S.th}>Marca</th>
                    <th style={S.th}>Descripcion</th>
                    <th style={S.th}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => seleccionarProducto(p)}
                      className={css.tableRow}
                    >
                      <td style={{ ...S.td, fontSize: 12, color: BRAND.gray600 }}>{p.codPro ?? '—'}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{p.codFab ?? '—'}</td>
                      <td style={S.td}>{p.marca ?? '—'}</td>
                      <td style={{ ...S.td, fontWeight: 600, maxWidth: 320 }}>{p.descPro}</td>
                      <td style={S.td}>
                        <span style={badgeStyle(p.estado === 'A' ? 'green' : 'red')}>
                          {p.estado === 'A' ? 'Activo' : p.estado ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {}
      {productoSel && (
        <>
          <div style={{ marginBottom: 16 }}>
            <button style={btnStyle()} onClick={cerrarKardex}>
              <i className="ti ti-arrow-left" aria-hidden="true" />
              Volver a la busqueda
            </button>
          </div>

          {}
          <div style={S.card}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 16, alignItems: 'start',
            }}>
              {}
              <div>
                <div style={{ ...S.cardTitle, marginBottom: 12 }}>Filtros</div>

                {}
                <div style={S.formGroup}>
                  <label style={S.label}>Mostrar kardex desde</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PERIODOS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => seleccionarPeriodo(p)}
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          border: `1px solid ${periodoSel === p.label ? BRAND.red : BRAND.gray200}`,
                          background: periodoSel === p.label ? '#ffeaea' : BRAND.white,
                          color: periodoSel === p.label ? BRAND.red : BRAND.black,
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Fecha personalizada:</label>
                    <input
                      type="date"
                      style={{ ...S.input, width: 'auto' }}
                      value={fechaDesde}
                      onChange={(e) => {
                        setFechaDesde(e.target.value);
                        setPeriodoSel('');
                        if (productoSel) cargarKardex(productoSel.id, codSuc, e.target.value);
                      }}
                    />
                  </div>
                </div>

                {}
                <div style={S.formGroup}>
                  <label style={S.label}>Mostrar kardex de almacén</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ALMACENES.map((a) => (
                      <button
                        key={a.codSuc}
                        onClick={() => seleccionarAlmacen(a.codSuc)}
                        style={{
                          padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          border: `1px solid ${codSuc === a.codSuc ? BRAND.red : BRAND.gray200}`,
                          background: codSuc === a.codSuc ? '#ffeaea' : BRAND.white,
                          color: codSuc === a.codSuc ? BRAND.red : BRAND.black,
                        }}
                      >
                        {a.nomSuc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {}
              <div style={{
                background: BRAND.gray50, borderRadius: 8,
                padding: 16, border: `1px solid ${BRAND.gray200}`,
              }}>
                <div style={{ ...S.cardTitle, marginBottom: 12 }}>Producto</div>
                {info ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Cód. SIAM',    value: info.codSiam },
                      { label: 'Cód. Fábrica', value: info.codFabrica },
                      { label: 'ID Fábrica',   value: String(info.idFab) },
                      { label: 'Descripción',  value: info.descripcion },
                      { label: 'Marca',        value: info.marca },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray400, minWidth: 100, textTransform: 'uppercase' }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 13, color: BRAND.black, fontWeight: 500 }}>
                          {value ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: BRAND.gray400 }}>Cargando…</div>
                )}
              </div>
            </div>
          </div>

          {}
          <div style={S.card}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 16,
            }}>
              <div style={S.cardTitle}>Movimientos</div>
              <span style={badgeStyle('gray')}>
                {movimientos.length} registro{movimientos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingKardex && (
              <div style={{ color: BRAND.gray600, fontSize: 13 }}>Cargando movimientos…</div>
            )}

            {!loadingKardex && movimientos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: BRAND.gray600 }}>
                <i className="ti ti-clipboard-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
                No hay movimientos para los filtros seleccionados.
              </div>
            )}

            {!loadingKardex && movimientos.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Fecha</th>
                      <th style={S.th}>Código</th>
                      <th style={S.th}>Descripción</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Entrada</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Salida</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Existencia</th>
                      <th style={S.th}>Sucursal</th>
                      <th style={S.th}>Usuario</th>
                      <th style={S.th}>Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m, i) => (
                      <tr
                        key={i}
                        onMouseEnter={(e) => (e.currentTarget.style.background = BRAND.gray50)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{ transition: 'background 0.1s' }}
                      >
                        <td style={{ ...S.td, fontSize: 12, whiteSpace: 'nowrap' }}>{formatFecha(m.fecha)}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{m.codigo}</td>
                        <td style={S.td}>
                          <span style={badgeStyle(
                            m.descripcion === 'REMISION DE INGRESO' ? 'green' :
                            m.descripcion === 'REMISION DE SALIDA' ? 'red' : 'gray'
                          )}>
                            {m.descripcion}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: m.entrada > 0 ? '#1a7a40' : BRAND.gray400 }}>
                          {m.entrada > 0 ? m.entrada : '—'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: m.salida > 0 ? BRAND.red : BRAND.gray400 }}>
                          {m.salida > 0 ? m.salida : '—'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'center' }}>{m.existencia}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{getNomSuc(m.sucursal)}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{m.usuario}</td>
                        <td style={{ ...S.td, fontSize: 12, maxWidth: 250, color: BRAND.gray600 }}>
                          {m.observacion || <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
