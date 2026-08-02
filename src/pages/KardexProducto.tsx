import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { BRAND, S, btnStyle, badgeStyle } from '../components/ui/tokens';

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
  cliente: string;
  observacion: string;
}

const ALMACENES = [
  { codSuc: 'TODOS',  nomSuc: 'Todos los almacenes' },
  { codSuc: '00004',  nomSuc: 'Almacén I' },
  { codSuc: '00005',  nomSuc: 'Almacén II' },
  { codSuc: '00006',  nomSuc: 'Almacén III' },
  { codSuc: '00007',  nomSuc: 'Almacén IV' },
  { codSuc: '00010',  nomSuc: 'Almacén 2H' },
  { codSuc: '00011',  nomSuc: 'Motor Zone' },
];

const PERIODOS = [
  { label: 'Todo',          value: '' },
  { label: 'Último año',    value: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; } },
  { label: 'Último mes',    value: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; } },
  { label: 'Última semana', value: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; } },
];

export function KardexProducto() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [info, setInfo]               = useState<InfoProducto | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading]         = useState(false);

  const [codSuc, setCodSuc]           = useState('TODOS');
  const [periodoSel, setPeriodoSel]   = useState('');
  const [fechaDesde, setFechaDesde]   = useState('');

  const cargarKardex = async (suc = codSuc, fecha = fechaDesde) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (suc && suc !== 'TODOS') params.codSuc = suc;
      if (fecha) params.fechaDesde = fecha;

      const { data } = await api.get(`/productos/${id}/kardex-almacen`, { params });
      setInfo(data.info);
      setMovimientos(data.movimientos ?? []);
    } catch {
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarKardex();
  }, []);

  const seleccionarPeriodo = (periodo: typeof PERIODOS[0]) => {
    setPeriodoSel(periodo.label);
    const fecha = typeof periodo.value === 'function' ? periodo.value() : periodo.value;
    setFechaDesde(fecha);
    cargarKardex(codSuc, fecha);
  };

  const seleccionarAlmacen = (suc: string) => {
    setCodSuc(suc);
    cargarKardex(suc, fechaDesde);
  };

  const formatFecha = (f: string) => {
    const d = new Date(f);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getNomSuc = (cod: string) => ALMACENES.find((a) => a.codSuc === cod)?.nomSuc ?? cod;

  return (
    <div>
      {/* Botón volver */}
      <div style={{ marginBottom: 16 }}>
        <button style={btnStyle()} onClick={() => navigate(-1)}>
          <i className="ti ti-arrow-left" aria-hidden="true" />
          Volver
        </button>
      </div>

      {/* Info del producto */}
      <div style={S.card}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 16, alignItems: 'start',
        }}>
          {/* Izquierda — Filtros */}
          <div>
            <div style={{ ...S.cardTitle, marginBottom: 12 }}>Filtros</div>

            {/* Periodo */}
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
                    cargarKardex(codSuc, e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Almacén */}
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

          {/* Derecha — Detalle del producto */}
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

      {/* Tabla de movimientos */}
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

        {loading && (
          <div style={{ color: BRAND.gray600, fontSize: 13 }}>Cargando movimientos…</div>
        )}

        {!loading && movimientos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: BRAND.gray600 }}>
            <i className="ti ti-clipboard-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} aria-hidden="true" />
            No hay movimientos para los filtros seleccionados.
          </div>
        )}

        {!loading && movimientos.length > 0 && (
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
                  <th style={S.th}>Cliente</th>
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
                        m.descripcion === 'INVENTARIO' && m.entrada > 0 ? 'green' :
                        m.descripcion === 'DEVOLUCION' ? 'green' :
                        m.descripcion === 'REMISION DE SALIDA' ? 'red' :
                        m.descripcion === 'VENTA' ? 'red' :
                        m.descripcion === 'CREDITO' ? 'red' : 'gray'
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
                    <td style={{ ...S.td, fontSize: 12 }}>
                      {m.cliente ?? <span style={{ color: BRAND.gray400 }}>—</span>}
                    </td>
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
    </div>
  );
}