import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { BRAND, S, btnStyle } from '../ui/tokens';
import type { Producto } from '../../types';

/** Producto que el cliente se lleva en un cambio (precio unitario en Bs). */
export interface ItemLleva {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidad: number;
  precio: number;
  precioLista: number;
  stockMotorZone: number;
}

interface Props {
  items: ItemLleva[];
  onChange: (items: ItemLleva[]) => void;
  disabled?: boolean;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(n);

/**
 * Cambio de producto dentro de una devolución: el cliente devuelve un producto
 * y se lleva otro (p. ej. devuelve el amortiguador derecho y lleva el
 * izquierdo). Funciona como una venta: el producto sale de MOTOR ZONE.
 */
export function CambioProducto({ items, onChange, disabled }: Props) {
  const [abierto, setAbierto] = useState(items.length > 0);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [tipoCambio, setTipoCambio] = useState(1);
  const [aviso, setAviso] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mismo tipo de cambio que la venta: precio en Bs = precio lista USD × dólar paralelo
  useEffect(() => {
    api.get('/ventas/dolar-paralelo/vigente')
      .then(({ data }) => setTipoCambio(Number(data.tipoCambio) || 1))
      .catch(() => setTipoCambio(1));
  }, []);

  const buscar = (val: string) => {
    setQuery(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (val.trim().length < 2) { setResultados([]); return; }
    debounce.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await api.get('/productos/search', { params: { q: val.trim(), limit: 8 } });
        setResultados(Array.isArray(data?.data) ? data.data : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
  };

  const agregar = async (p: Producto) => {
    if (!p.idFab || !p.plisPro) return;
    setAviso('');
    if (items.some((it) => it.idFab === p.idFab)) {
      onChange(items.map((it) => (it.idFab === p.idFab ? { ...it, cantidad: it.cantidad + 1 } : it)));
    } else {
      let stockMotorZone = 0;
      try {
        const { data } = await api.get<{ stockMotorZone: number }>(`/productos/stock-fab/${p.idFab}`);
        stockMotorZone = Number(data.stockMotorZone) || 0;
      } catch { /* se valida igual en la API */ }
      const precio = Math.round(Number(p.plisPro) * tipoCambio * 100) / 100;
      onChange([...items, {
        idFab: p.idFab, codFab: p.codFab ?? '', descPro: p.descPro,
        cantidad: 1, precio, precioLista: precio, stockMotorZone,
      }]);
      if (stockMotorZone < 1) {
        setAviso(`"${p.descPro}" no tiene stock en MOTOR ZONE: pide un traspaso antes de hacer el cambio.`);
      }
    }
    setQuery('');
    setResultados([]);
  };

  const actualizar = (idFab: number, cambios: Partial<ItemLleva>) =>
    onChange(items.map((it) => (it.idFab === idFab ? { ...it, ...cambios } : it)));

  if (!abierto && items.length === 0) {
    return (
      <button type="button" style={{ ...btnStyle('secondary'), marginBottom: 16 }} onClick={() => setAbierto(true)} disabled={disabled}>
        <i className="ti ti-arrows-exchange" /> Agregar producto que se lleva (cambio)
      </button>
    );
  }

  return (
    <div style={{ border: `1px dashed ${BRAND.gray200}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-arrows-exchange" style={{ color: BRAND.red }} /> Cambio de producto: lo que se lleva
        </div>
        {items.length === 0 && (
          <button type="button" style={btnStyle('ghost')} onClick={() => setAbierto(false)} disabled={disabled}>Cerrar</button>
        )}
      </div>
      <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 10px' }}>
        Sale de MOTOR ZONE como una venta. Se registra en la misma operación que la devolución.
      </p>

      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input
          style={S.input} placeholder="Buscar producto por descripción o código"
          value={query} disabled={disabled} onChange={(e) => buscar(e.target.value)}
          aria-label="Buscar producto que se lleva"
        />
        {(buscando || resultados.length > 0) && (
          <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', background: BRAND.white, border: `1px solid ${BRAND.gray200}`, borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.08)', maxHeight: 260, overflowY: 'auto' }}>
            {buscando && <div style={{ padding: 10, fontSize: 12, color: BRAND.gray600 }}>Buscando…</div>}
            {resultados.map((p) => (
              <button
                key={`${p.idFab}-${p.id}`} type="button" onClick={() => void agregar(p)} disabled={!p.plisPro || !p.idFab}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 0, borderBottom: `1px solid ${BRAND.gray200}`, background: 'none', cursor: 'pointer' }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.descPro}</div>
                <div style={{ fontSize: 11, color: BRAND.gray600 }}>
                  {p.codFab} · {p.marca ?? '—'} · Bs {((Number(p.plisPro) || 0) * tipoCambio).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {aviso && <div style={{ ...S.errorBanner, marginBottom: 10 }} role="alert">{aviso}</div>}

      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Producto', 'Stock MZ', 'Cant.', 'Precio (Bs)', 'Subtotal', ''].map((h) => (
                  <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.idFab}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{it.descPro}</div>
                    <div style={{ fontSize: 11, color: BRAND.gray600 }}>{it.codFab}</div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center', color: it.cantidad > it.stockMotorZone ? BRAND.red : undefined, fontWeight: 600 }}>
                    {it.stockMotorZone}
                  </td>
                  <td style={{ ...S.td, width: 80 }}>
                    <input
                      type="number" min={1} step={1} style={S.input} disabled={disabled} value={it.cantidad}
                      onChange={(e) => actualizar(it.idFab, { cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                      aria-label={`Cantidad de ${it.descPro}`}
                    />
                  </td>
                  <td style={{ ...S.td, width: 120 }}>
                    <input
                      type="number" min={0.01} step={0.01} style={S.input} disabled={disabled} value={it.precio}
                      onChange={(e) => actualizar(it.idFab, { precio: Math.max(0, Number(e.target.value) || 0) })}
                      aria-label={`Precio de ${it.descPro}`}
                    />
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(it.cantidad * it.precio)}</td>
                  <td style={S.td}>
                    <button
                      type="button" style={btnStyle('ghost')} disabled={disabled}
                      onClick={() => onChange(items.filter((x) => x.idFab !== it.idFab))}
                      aria-label={`Quitar ${it.descPro}`}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
