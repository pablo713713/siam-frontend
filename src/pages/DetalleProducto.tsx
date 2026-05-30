import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';
import type { KardexResponse, MovimientoKardex } from '../types';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  const date = new Date(d);
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

type TabFiltro = 'TODO' | 'INGRESO' | 'SALIDA';

const TAB_LABELS: Record<TabFiltro, string> = {
  TODO: 'Todo',
  INGRESO: 'Solo Ingresos',
  SALIDA: 'Solo Salidas',
};

const ORIGEN_LABELS: Record<string, string> = {
  IMPORTACION: 'Importación',
  INVENTARIO: 'Inventario',
  VENTA: 'Venta',
  CREDITO: 'Crédito',
  PEDIDO: 'Pedido',
};

function StockCard({
  nombre,
  fisico,
  virtual,
}: {
  nombre: string;
  fisico: number;
  virtual: number;
}) {
  return (
    <div
      style={{
        background: BRAND.white,
        border: `1px solid ${BRAND.gray200}`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minWidth: 220,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: `1px solid ${BRAND.gray100}`,
          paddingBottom: 10,
        }}
      >
        <i
          className="ti ti-building-store"
          style={{ color: BRAND.red, fontSize: 15 }}
        />
        <span
          style={{ fontSize: 13, fontWeight: 700, color: BRAND.black }}
        >
          {nombre}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: BRAND.gray600, fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>
            STOCK FÍSICO
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: fisico > 0 ? '#1a7a40' : BRAND.red,
            }}
          >
            {fmt(fisico)}
          </div>
        </div>
        <div style={{ width: 1, background: BRAND.gray200 }} />
        <div>
          <div style={{ fontSize: 10, color: BRAND.gray600, fontWeight: 600, letterSpacing: 0.5, marginBottom: 2 }}>
            STOCK VIRTUAL
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: virtual > 0 ? '#185fa5' : BRAND.gray600,
            }}
          >
            {fmt(virtual)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: 'INGRESO' | 'SALIDA' }) {
  const isIngreso = tipo === 'INGRESO';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: isIngreso ? '#e6f9ee' : '#ffeaea',
        color: isIngreso ? '#1a7a40' : BRAND.red,
      }}
    >
      <i
        className={`ti ${isIngreso ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'}`}
        style={{ fontSize: 11 }}
      />
      {isIngreso ? 'Ingreso' : 'Salida'}
    </span>
  );
}

export function DetalleProducto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [kardex, setKardex] = useState<KardexResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabFiltro>('TODO');

  const searchParams = new URLSearchParams(window.location.search);
  const nombreParam = searchParams.get('nombre') ?? `Producto #${id}`;
  const codParam = searchParams.get('cod') ?? '';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<KardexResponse>(`/productos/${id}/kardex`)
      .then(({ data }) => setKardex(data))
      .catch(() => setError('No se pudo cargar la información del producto.'))
      .finally(() => setLoading(false));
  }, [id]);

  const movimientosFiltrados: MovimientoKardex[] = kardex
    ? tab === 'TODO'
      ? kardex.movimientos
      : kardex.movimientos.filter((m) => m.tipoOperacion === tab)
    : [];

  return (
    <div>
      {}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            ...btnStyle('secondary'),
            padding: '6px 12px',
            fontSize: 12,
          }}
        >
          <i className="ti ti-arrow-left" />
          Volver
        </button>
        <span style={{ color: BRAND.gray400, fontSize: 13 }}>/</span>
        <span style={{ color: BRAND.gray600, fontSize: 13 }}>Inventario</span>
        <span style={{ color: BRAND.gray400, fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: BRAND.black }}>
          Detalle de Producto
        </span>
      </div>

      {}
      <div
        style={{
          ...S.card,
          marginBottom: 20,
          borderLeft: `4px solid ${BRAND.red}`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            background: '#ffeaea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i className="ti ti-package" style={{ fontSize: 24, color: BRAND.red }} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: BRAND.black,
              marginBottom: 4,
            }}
          >
            {nombreParam}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {codParam && (
              <span style={{ fontSize: 12, color: BRAND.gray600 }}>
                <strong>Código:</strong> {codParam}
              </span>
            )}
            <span style={{ fontSize: 12, color: BRAND.gray600 }}>
              <strong>ID interno:</strong> {id}
            </span>
            {kardex && (
              <>
                <span
                  style={{
                    ...badgeStyle('green'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i className="ti ti-box" style={{ fontSize: 11 }} />
                  Stock Total: {fmt(kardex.totalStockFisico)} uds.
                </span>
                <span
                  style={{
                    ...badgeStyle('gray'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <i className="ti ti-clipboard-list" style={{ fontSize: 11 }} />
                  Virtual: {fmt(kardex.totalInventarioVirtual)} uds.
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 60,
            color: BRAND.gray600,
          }}
        >
          <i className="ti ti-loader-2" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} />
          Cargando información…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div
          style={{
            ...S.card,
            borderLeft: `4px solid ${BRAND.red}`,
            color: BRAND.red,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: 18 }} />
          {error}
        </div>
      )}

      {kardex && !loading && (
        <>
          {}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ ...S.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-map-pin" style={{ color: BRAND.red, fontSize: 15 }} />
              Stock por Sucursal
            </div>
            {kardex.stockPorSucursal.length === 0 ? (
              <div style={{ color: BRAND.gray600, fontSize: 13, textAlign: 'center', padding: 24 }}>
                Sin información de sucursales.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                }}
              >
                {kardex.stockPorSucursal.map((s) => (
                  <StockCard
                    key={s.codSucursal}
                    nombre={s.nombreSucursal}
                    fisico={s.stockFisico}
                    virtual={s.inventarioVirtual}
                  />
                ))}
              </div>
            )}
          </div>

          {}
          <div style={S.card}>
            <div
              style={{
                ...S.cardTitle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-timeline" style={{ color: BRAND.red, fontSize: 15 }} />
                Movimientos — Kardex
              </div>
              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  background: BRAND.gray100,
                  borderRadius: 8,
                  padding: 3,
                }}
              >
                {(Object.keys(TAB_LABELS) as TabFiltro[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      background: tab === t ? BRAND.white : 'transparent',
                      color: tab === t ? BRAND.black : BRAND.gray600,
                      boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              {movimientosFiltrados.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: BRAND.gray600,
                    fontSize: 13,
                  }}
                >
                  <i className="ti ti-database-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                  No hay movimientos para este filtro.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Fecha', 'Tipo', 'Origen', 'Referencia', 'Cantidad', 'Saldo'].map(
                          (h) => (
                            <th key={h} style={S.th}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosFiltrados.map((m, i) => (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? BRAND.white : BRAND.gray50,
                          }}
                        >
                          <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: 12 }}>
                            {fmtDate(m.fecha)}
                          </td>
                          <td style={S.td}>
                            <TipoBadge tipo={m.tipoOperacion} />
                          </td>
                          <td style={{ ...S.td, fontSize: 12, color: BRAND.gray600 }}>
                            {ORIGEN_LABELS[m.origen] ?? m.origen}
                          </td>
                          <td
                            style={{
                              ...S.td,
                              fontSize: 12,
                              fontFamily: 'monospace',
                              color: BRAND.gray600,
                            }}
                          >
                            {m.referencia}
                          </td>
                          <td
                            style={{
                              ...S.td,
                              fontWeight: 700,
                              color:
                                m.tipoOperacion === 'INGRESO' ? '#1a7a40' : BRAND.red,
                              textAlign: 'right',
                            }}
                          >
                            {m.tipoOperacion === 'INGRESO' ? '+' : '-'}
                            {fmt(m.cantidad)}
                          </td>
                          <td
                            style={{
                              ...S.td,
                              textAlign: 'right',
                              fontWeight: 600,
                              color: BRAND.black,
                            }}
                          >
                            {fmt(m.saldoAcumulado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {}
            {movimientosFiltrados.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 24,
                  marginTop: 14,
                  padding: '10px 12px',
                  background: BRAND.gray50,
                  borderRadius: 8,
                  fontSize: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: BRAND.gray600 }}>
                  <strong style={{ color: BRAND.black }}>
                    {movimientosFiltrados.length}
                  </strong>{' '}
                  movimientos
                </span>
                {tab !== 'SALIDA' && (
                  <span style={{ color: '#1a7a40' }}>
                    Ingresos:{' '}
                    <strong>
                      {fmt(
                        movimientosFiltrados
                          .filter((m) => m.tipoOperacion === 'INGRESO')
                          .reduce((s, m) => s + m.cantidad, 0),
                      )}
                    </strong>
                  </span>
                )}
                {tab !== 'INGRESO' && (
                  <span style={{ color: BRAND.red }}>
                    Salidas:{' '}
                    <strong>
                      {fmt(
                        movimientosFiltrados
                          .filter((m) => m.tipoOperacion === 'SALIDA')
                          .reduce((s, m) => s + m.cantidad, 0),
                      )}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
