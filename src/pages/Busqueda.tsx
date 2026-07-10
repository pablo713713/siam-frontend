import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Producto, AdvancedSearchParams } from '../types';
import { useNavigate } from 'react-router-dom';
import css from './Busqueda.module.css';

interface BusquedaProps {
  quickSearch?: string;
  setQuickSearch?: (q: string) => void;
}

interface ResumenProducto {
  detalle: {
    codSiam: string;
    codFabrica: string;
    descripcion: string;
    marca: string;
  } | null;
  stockPorAlmacen: {
    codSuc: string;
    nomSuc: string;
    cantidad: number;
    diasSinMovimiento: number | null;
  }[];
}

const LIMIT = 200;

export function Busqueda({ quickSearch = '', setQuickSearch }: BusquedaProps) {
  const [q, setQ]               = useState(quickSearch);
  const [codigo, setCodigo]     = useState('');
  const [results, setResults]   = useState<Producto[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const [productoSel, setProductoSel]         = useState<Producto | null>(null);
  const [resumen, setResumen]                 = useState<ResumenProducto | null>(null);
  const [loadingResumen, setLoadingResumen]   = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (quickSearch) setQ(quickSearch); }, [quickSearch]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim() && !codigo.trim()) { setResults([]); setTotal(0); setSearched(false); return; }
    debounce.current = setTimeout(() => { search(1); }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, codigo]);

  const search = async (targetPage = 1) => {
    setLoading(true); setSearched(true);
    const params: AdvancedSearchParams = { page: targetPage, limit: LIMIT };
    if (q.trim())      params.q      = q.trim();
    if (codigo.trim()) params.codigo = codigo.trim();
    try {
      const { data } = await api.get('/productos/search/advanced', { params });
      if (Array.isArray(data)) { setResults(data); setTotal(data.length); }
      else { setResults(data.data ?? data.items ?? []); setTotal(data.total ?? 0); }
      setPage(targetPage);
    } catch {
      setResults([]); setTotal(0);
    } finally { setLoading(false); }
  };

  const clear = () => {
    setQ(''); setCodigo(''); setResults([]); setTotal(0);
    setSearched(false); setPage(1); setProductoSel(null); setResumen(null);
    setQuickSearch?.('');
  };

  const seleccionarProducto = async (p: Producto) => {
    setProductoSel(p); setLoadingResumen(true); setResumen(null);
    try {
      const { data } = await api.get(`/productos/${p.id}/resumen`);
      setResumen(data);
    } catch {
      setResumen(null);
    } finally { setLoadingResumen(false); }
  };

  const cerrarPanel = () => { setProductoSel(null); setResumen(null); };
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div style={{ paddingBottom: productoSel ? 320 : 0, transition: 'padding-bottom 0.3s' }}>
      {}
      <div className={css.header}>
        <h1 className={css.title}>Busqueda avanzada</h1>
        <p className={css.subtitle}>Productos — Inventario Maximport</p>
      </div>

      {}
      <div className={css.filtersCard}>
        <div className={css.filtersRow}>
          <div className={css.filterGroup}>
            <label className={css.filterLabel} htmlFor="search-q">Nombre / descripcion</label>
            <input id="search-q" style={S.input} value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o descripcion"
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
      {searched && (
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
            <>
              <div className={css.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Cod. SIAM</th>
                      <th style={S.th}>Cod. Fabrica</th>
                      <th style={S.th}>Marca</th>
                      <th style={S.th}>Descripcion</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>P. Fact</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>P. Detalle</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>P. Mayor</th>
                      <th style={{ ...S.th, textAlign: 'right' }}>P. CIIF</th>
                      <th style={S.th}>Estado</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => seleccionarProducto(p)}
                        className={`${css.tableRow} ${productoSel?.id === p.id ? css.tableRowSelected : ''}`}
                      >
                        <td style={{ ...S.td, fontSize: 12, color: BRAND.gray600 }}>{p.codPro ?? '—'}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{p.codFab ?? '—'}</td>
                        <td style={S.td}>{p.marca ?? '—'}</td>
                        <td style={{ ...S.td, fontWeight: 600, maxWidth: 280 }}>{p.descPro}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{p.plisPro ? `$${p.plisPro.toFixed(2)}` : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{p.pminPro ? `$${p.pminPro.toFixed(2)}` : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{p.pmayPro ? `$${p.pmayPro.toFixed(2)}` : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>{p.ciffSus ? `$${p.ciffSus.toFixed(2)}` : '—'}</td>
                        <td style={S.td}>
                          <span style={badgeStyle(p.estado === 'A' ? 'green' : 'red')}>
                            {p.estado === 'A' ? 'Activo' : p.estado ?? '—'}
                          </span>
                        </td>
                        <td style={S.td} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button style={btnStyle('secondary', 'sm')}
                              onClick={(e) => {
                                e.stopPropagation();
                                localStorage.setItem('siam_producto_pendiente', JSON.stringify(p));
                                navigate('/ventas/nueva');
                              }}>
                              <i className="ti ti-shopping-cart" aria-hidden="true" /> Venta
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} total={total} onPage={search} />
              )}
            </>
          )}
        </div>
      )}

      {}
      {productoSel && (
        <div style={{
          position: 'fixed', bottom: 0, left: 220, right: 0,
          background: BRAND.white, borderTop: `2px solid ${BRAND.red}`,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          zIndex: 500, height: 300, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', borderBottom: `1px solid ${BRAND.gray200}`,
            background: BRAND.gray50, flexShrink: 0,
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{productoSel.descPro}</span>
            <button onClick={cerrarPanel} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: BRAND.gray600, fontSize: 18, padding: 4, lineHeight: 1,
            }} aria-label="Cerrar panel">x</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
            {/* Stock */}
            <div style={{ padding: '12px 20px', borderRight: `1px solid ${BRAND.gray200}`, overflowY: 'auto' }}>
              <div style={S.sectionLabel}>Stock por almacen</div>
              {loadingResumen ? (
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>Cargando...</div>
              ) : (
                <table style={{ ...S.table, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px' }}>Sucursal</th>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Dias sin mov.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen?.stockPorAlmacen.map((s) => (
                      <tr key={s.codSuc}>
                        <td style={{ ...S.td, padding: '6px 8px', fontSize: 12 }}>{s.nomSuc}</td>
                        <td style={{ ...S.td, padding: '6px 8px', textAlign: 'center', fontWeight: 700,
                          color: s.cantidad > 0 ? BRAND.green : BRAND.gray400 }}>{s.cantidad}</td>
                        <td style={{ ...S.td, padding: '6px 8px', textAlign: 'center', color: BRAND.gray600 }}>
                          {s.diasSinMovimiento !== null ? s.diasSinMovimiento : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Detalle */}
            <div style={{ padding: '12px 20px', overflowY: 'auto' }}>
              <div style={S.sectionLabel}>Detalle del producto</div>
              {loadingResumen ? (
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>Cargando...</div>
              ) : resumen?.detalle ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'COD. SIAM',    value: resumen.detalle.codSiam },
                    { label: 'COD. FABRICA', value: resumen.detalle.codFabrica },
                    { label: 'DESCRIPCION',  value: resumen.detalle.descripcion },
                    { label: 'MARCA',        value: resumen.detalle.marca },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={S.sectionLabel}>{label}</div>
                      <div style={{ fontSize: 13, color: BRAND.black, fontWeight: 500, marginTop: 2 }}>
                        {value ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: BRAND.gray400 }}>Sin datos</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PaginationProps {
  page: number; totalPages: number; total: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
  const pages: (number | '...')[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);
  if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }

  const base: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 6, border: `1px solid ${BRAND.gray200}`,
    background: BRAND.white, color: BRAND.black, cursor: 'pointer',
    fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };
  const active: React.CSSProperties = { ...base, background: BRAND.red, color: BRAND.white,
    border: `1px solid ${BRAND.red}`, fontWeight: 700 };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
      padding: '16px', borderTop: `1px solid ${BRAND.gray100}` }}>
      <button style={base} onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Pagina anterior">
        <i className="ti ti-chevron-left" aria-hidden="true" />
      </button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={i} style={{ padding: '0 4px', color: BRAND.gray400 }}>...</span>
          : <button key={i} style={p === page ? active : base} onClick={() => onPage(p as number)}>{p}</button>
      )}
      <button style={base} onClick={() => onPage(page + 1)} disabled={page === totalPages} aria-label="Pagina siguiente">
        <i className="ti ti-chevron-right" aria-hidden="true" />
      </button>
      <span style={{ fontSize: 12, color: BRAND.gray600, marginLeft: 8 }}>
        Pagina {page} de {totalPages} · {total} resultados
      </span>
    </div>
  );
}
