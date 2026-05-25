import { useEffect, useState } from 'react';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { Producto, AdvancedSearchParams } from '../types';

interface BusquedaProps {
  /** Viene del Topbar a través de MainLayout */
  quickSearch?: string;
  setQuickSearch?: (q: string) => void;
}

const LIMIT = 20;

export function Busqueda({ quickSearch = '', setQuickSearch }: BusquedaProps) {
  const [q, setQ]             = useState(quickSearch);
  const [codigo, setCodigo]   = useState('');
  const [results, setResults] = useState<Producto[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Si llega una búsqueda rápida desde el Topbar, pre-rellena el campo
  useEffect(() => {
    if (quickSearch) setQ(quickSearch);
  }, [quickSearch]);

  const search = async (targetPage = 1) => {
    setLoading(true);
    setSearched(true);
    const params: AdvancedSearchParams = { page: targetPage, limit: LIMIT };
    if (q.trim())      params.q      = q.trim();
    if (codigo.trim()) params.codigo = codigo.trim();

    try {
      const { data } = await api.get('/productos/search/advanced', { params });
      // El backend puede devolver array directo o { data, total }
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
    setQuickSearch?.('');
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      {/* ── HU-F3.02: Formulario de filtros ── */}
      <div style={S.card}>
        <div style={S.cardTitle}>Búsqueda avanzada de productos</div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14,
        }}>
          <div>
            <label style={S.label}>Nombre / descripción</label>
            <input
              style={S.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Buscar por nombre o descripción"
            />
          </div>
          <div>
            <label style={S.label}>Código de fábrica / barras</label>
            <input
              style={S.input}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Código del producto"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnStyle('primary')} onClick={() => search(1)} disabled={loading}>
            <i className="ti ti-search" aria-hidden="true" />
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
          <button style={btnStyle()} onClick={clear}>
            <i className="ti ti-x" aria-hidden="true" />
            Limpiar
          </button>
        </div>
      </div>

      {/* ── HU-F3.03: Tabla de resultados ── */}
      {searched && (
        <div style={S.card}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16,
          }}>
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
                      <th style={S.th}>ID</th>
                      <th style={S.th}>Descripción</th>
                      <th style={S.th}>Cód. Producto</th>
                      <th style={S.th}>Cód. Fábrica</th>
                      <th style={S.th}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p) => (
                      <tr
                        key={p.id}
                        onMouseEnter={(e) => (e.currentTarget.style.background = BRAND.gray50)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{ transition: 'background 0.1s' }}
                      >
                        <td style={{ ...S.td, color: BRAND.gray600, fontSize: 12 }}>{p.id}</td>
                        <td style={{ ...S.td, fontWeight: 600, maxWidth: 320 }}>{p.descPro}</td>
                        <td style={S.td}>{p.codPro ?? <span style={{ color: BRAND.gray400 }}>—</span>}</td>
                        <td style={S.td}>{p.codigo ?? <span style={{ color: BRAND.gray400 }}>—</span>}</td>
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

              {/* ── Paginación ── */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} total={total} onPage={search} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente de paginación ──────────────────────────────────────────────────
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
