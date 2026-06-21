import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Producto, AdvancedSearchParams } from '../types';
import { useNavigate } from 'react-router-dom';

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

  const [productoSel, setProductoSel]     = useState<Producto | null>(null);
  const [resumen, setResumen]             = useState<ResumenProducto | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (quickSearch) setQ(quickSearch);
  }, [quickSearch]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim() && !codigo.trim()) {
      setResults([]);
      setTotal(0);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(() => { search(1); }, 350);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, codigo]);

  const search = async (targetPage = 1) => {
    setLoading(true);
    setSearched(true);
    const params: AdvancedSearchParams = { page: targetPage, limit: LIMIT };
    if (q.trim())      params.q      = q.trim();
    if (codigo.trim()) params.codigo = codigo.trim();

    try {
      const { data } = await api.get('/productos/search/advanced', { params });
      if (Array.isArray(data)) {
        setResults(data);
        setTotal(data.length);
      } else {
        setResults(data.data ?? data.items ?? []);
        setTotal(data.total ?? 0);
      }
      setPage(targetPage);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQ('');
    setCodigo('');
    setResults([]);
    setTotal(0);
    setSearched(false);
    setPage(1);
    setProductoSel(null);
    setResumen(null);
    setQuickSearch?.('');
  };

  const seleccionarProducto = async (p: Producto) => {
    setProductoSel(p);
    setLoadingResumen(true);
    setResumen(null);
    try {
      const { data } = await api.get(`/productos/${p.id}/resumen`);
      setResumen(data);
    } catch {
      setResumen(null);
    } finally {
      setLoadingResumen(false);
    }
  };

  const cerrarPanel = () => {
    setProductoSel(null);
    setResumen(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div style={{ paddingBottom: productoSel ? 320 : 0, transition: 'padding-bottom 0.3s' }}>

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Búsqueda avanzada de productos</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={S.label}>Nombre / descripción</label>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o descripción"
            />
          </div>
          <div>
            <label style={S.label}>Código de fábrica / barras</label>
            <input
              style={S.input}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código del producto"
            />
          </div>
        </div>
      </div>

      {}
      {searched && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={S.cardTitle}>Resultados</div>
            {!loading && (
              <span style={badgeStyle('gray')}>
                {total} producto{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading && (
            <div style={{ color: BRAND.gray600, fontSize: 13 }}>Cargando resultados…</div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: BRAND.gray600 }}>
              <i className="ti ti-search-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
              No se encontraron productos con los filtros aplicados.
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Cód. SIAM</th>
                      <th style={S.th}>Cód. Fábrica</th>
                      <th style={S.th}>Marca</th>
                      <th style={S.th}>Descripción</th>
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
                        onMouseEnter={(e) => (e.currentTarget.style.background = BRAND.gray50)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = productoSel?.id === p.id ? '#ffeaea' : 'transparent')}
                        style={{
                          transition: 'background 0.1s',
                          cursor: 'pointer',
                          background: productoSel?.id === p.id ? '#ffeaea' : 'transparent',
                        }}
                      >
                        {}
                        <td style={{ ...S.td, fontSize: 12, color: BRAND.gray600 }}>{p.codPro ?? <span style={{ color: BRAND.gray400 }}>—</span>}</td>
                        <td style={{ ...S.td, fontSize: 12 }}>{p.codFab ?? <span style={{ color: BRAND.gray400 }}>—</span>}</td>
                        <td style={S.td}>{p.marca ?? <span style={{ color: BRAND.gray400 }}>—</span>}</td>
                        <td style={{ ...S.td, fontWeight: 600, maxWidth: 300 }}>{p.descPro}</td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          {p.plisPro ? `$${p.plisPro.toFixed(2)}` : <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          {p.pminPro ? `$${p.pminPro.toFixed(2)}` : <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          {p.pmayPro ? `$${p.pmayPro.toFixed(2)}` : <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          {p.ciffSus ? `$${p.ciffSus.toFixed(2)}` : <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                        <td style={S.td}>
                          <span style={badgeStyle(p.estado === 'A' ? 'green' : 'red')}>
                            {p.estado === 'A' ? 'Activo' : p.estado ?? '—'}
                          </span>
                        </td>
                        <td style={S.td} onClick={(e) => e.stopPropagation()}>
                          <button
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 12px', borderRadius: 6,
                              border: `1px solid ${BRAND.gray200}`,
                              background: BRAND.white, color: BRAND.black,
                              cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              fontFamily: 'inherit', transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.red;
                              (e.currentTarget as HTMLButtonElement).style.color = BRAND.red;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.gray200;
                              (e.currentTarget as HTMLButtonElement).style.color = BRAND.black;
                            }}
                            onClick={(e) => { e.stopPropagation(); navigate('/ventas/nueva'); }}
                          >
                            <i className="ti ti-shopping-cart" style={{ fontSize: 13 }} />
                            Agregar al carrito
                          </button>
                          <button
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 12px', borderRadius: 6,
                              border: `1px solid ${BRAND.gray200}`,
                              background: BRAND.white, color: BRAND.black,
                              cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              fontFamily: 'inherit', transition: 'all 0.15s', marginLeft: 6,
                            }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/productos/${p.id}/kardex`); }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.red;
                              (e.currentTarget as HTMLButtonElement).style.color = BRAND.red;
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND.gray200;
                              (e.currentTarget as HTMLButtonElement).style.color = BRAND.black;
                            }}
                          >
                            <i className="ti ti-list" style={{ fontSize: 13 }} />
                            Ver kardex
                          </button>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} total={total} onPage={search} />
              )}

              {results.length === LIMIT && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button style={btnStyle()} onClick={() => search(page + 1)} disabled={loading}>
                    <i className="ti ti-plus" aria-hidden="true" />
                    Cargar más resultados
                  </button>
                </div>
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
          zIndex: 500, height: 300,
          display: 'flex', flexDirection: 'column',
        }}>
          {}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', borderBottom: `1px solid ${BRAND.gray200}`,
            background: BRAND.gray50, flexShrink: 0,
          }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: BRAND.black }}>
              {productoSel.descPro}
            </span>
            <button
              onClick={cerrarPanel}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: BRAND.gray600, fontSize: 18, padding: 4, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>

            {}
            <div style={{ padding: '12px 20px', borderRight: `1px solid ${BRAND.gray200}`, overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Stock por almacén
              </div>
              {loadingResumen ? (
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>Cargando…</div>
              ) : (
                <table style={{ ...S.table, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px' }}>Sucursal</th>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                      <th style={{ ...S.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Días sin mov.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen?.stockPorAlmacen.map((s) => (
                      <tr key={s.codSuc}>
                        <td style={{ ...S.td, padding: '6px 8px', fontSize: 12 }}>{s.nomSuc}</td>
                        <td style={{
                          ...S.td, padding: '6px 8px', textAlign: 'center', fontWeight: 700,
                          color: s.cantidad > 0 ? '#1a7a40' : BRAND.gray400,
                        }}>
                          {s.cantidad}
                        </td>
                        <td style={{ ...S.td, padding: '6px 8px', textAlign: 'center', color: BRAND.gray600 }}>
                          {s.diasSinMovimiento !== null ? s.diasSinMovimiento : <span style={{ color: BRAND.gray400 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {}
            <div style={{ padding: '12px 20px', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: BRAND.gray600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                Detalle del producto
              </div>
              {loadingResumen ? (
                <div style={{ fontSize: 12, color: BRAND.gray600 }}>Cargando…</div>
              ) : resumen?.detalle ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'COD. SIAM',    value: resumen.detalle.codSiam },
                    { label: 'COD. FÁBRICA', value: resumen.detalle.codFabrica },
                    { label: 'DESCRIPCIÓN',  value: resumen.detalle.descripcion },
                    { label: 'MARCA',        value: resumen.detalle.marca },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.gray400, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 13, color: BRAND.black, fontWeight: 500, marginTop: 2 }}>
                        {value ?? <span style={{ color: BRAND.gray400 }}>—</span>}
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
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
  const pages: (number | '…')[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);

  if (start > 1) { pages.push(1); if (start > 2) pages.push('…'); }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) { if (end < totalPages - 1) pages.push('…'); pages.push(totalPages); }

  const btnBase: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 6, border: `1px solid ${BRAND.gray200}`,
    background: BRAND.white, color: BRAND.black, cursor: 'pointer',
    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const btnActive: React.CSSProperties = {
    ...btnBase, background: BRAND.red, color: BRAND.white,
    border: `1px solid ${BRAND.red}`, fontWeight: 700,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 20 }}>
      <button style={btnBase} onClick={() => onPage(page - 1)} disabled={page === 1}>
        <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={i} style={{ padding: '0 4px', color: BRAND.gray400 }}>…</span>
          : <button key={i} style={p === page ? btnActive : btnBase} onClick={() => onPage(p as number)}>{p}</button>
      )}
      <button style={btnBase} onClick={() => onPage(page + 1)} disabled={page === totalPages}>
        <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
      <span style={{ fontSize: 12, color: BRAND.gray600, marginLeft: 8 }}>
        Página {page} de {totalPages} · {total} resultados
      </span>
    </div>
  );
}