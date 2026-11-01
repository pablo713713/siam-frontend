import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BRAND, S, badgeStyle, btnStyle } from '../components/ui/tokens';
import type {
  Almacen,
  IngresoMercaderiaRequest,
  MovimientoMercaderiaResponse,
  Producto,
  TraspasoAlmacenRequest,
} from '../types';

type TipoMovimiento = 'INGRESO' | 'TRASPASO';

interface ProductoMovimiento {
  producto: Producto;
  cantidad: number;
  obs: string;
}

interface BusquedaProductosResponse {
  data: Producto[];
}

interface ApiErrorResponse {
  message?: string | string[];
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return 'No se pudo completar la operación. Intenta nuevamente.';
};

const LIMIT = 30;

export function MovimientosAlmacen() {
  const { usuario } = useAuth();
  const [tipo, setTipo] = useState<TipoMovimiento>('INGRESO');
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(true);
  const [almacenesError, setAlmacenesError] = useState('');
  const [almacenDestino, setAlmacenDestino] = useState('');
  const [almacenOrigen, setAlmacenOrigen] = useState('');
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [items, setItems] = useState<ProductoMovimiento[]>([]);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargarAlmacenes = async () => {
      try {
        const { data } = await api.get<Almacen[]>('/productos/almacenes-disponibles');
        setAlmacenes(data);
        setAlmacenOrigen(data[0]?.codSuc ?? '');
        setAlmacenDestino(data[1]?.codSuc ?? data[0]?.codSuc ?? '');
      } catch (requestError) {
        setAlmacenesError(getErrorMessage(requestError));
      } finally {
        setLoadingAlmacenes(false);
      }
    };
    void cargarAlmacenes();
  }, []);

  const buscarProductos = async () => {
    const query = termino.trim();
    if (!query) {
      setError('Ingresa una descripción o código para buscar productos.');
      return;
    }

    setError('');
    setExito('');
    setBuscando(true);
    try {
      const { data } = await api.get<BusquedaProductosResponse>(
        '/productos/search/advanced',
        { params: { q: query, page: 1, limit: LIMIT } },
      );
      setResultados(data.data ?? []);
    } catch (requestError) {
      setResultados([]);
      setError(getErrorMessage(requestError));
    } finally {
      setBuscando(false);
    }
  };

  const agregarProducto = (producto: Producto) => {
    if (producto.idFab == null) {
      setError('El producto seleccionado no tiene un ID de fábrica válido.');
      return;
    }
    setError('');
    setExito('');
    setItems((actuales) => {
      if (actuales.some((item) => item.producto.idFab === producto.idFab)) return actuales;
      return [...actuales, { producto, cantidad: 1, obs: '' }];
    });
  };

  const actualizarItem = (
    idFab: number,
    cambio: Partial<Pick<ProductoMovimiento, 'cantidad' | 'obs'>>,
  ) => {
    setItems((actuales) =>
      actuales.map((item) =>
        item.producto.idFab === idFab ? { ...item, ...cambio } : item,
      ),
    );
  };

  const registrarMovimiento = async () => {
    if (items.length === 0) {
      setError('Agrega al menos un producto para continuar.');
      return;
    }
    if (items.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1)) {
      setError('Cada cantidad debe ser un número entero mayor a cero.');
      return;
    }
    if (!usuario?.cod_usu) {
      setError('No se pudo identificar al usuario. Vuelve a iniciar sesión.');
      return;
    }
    if (!almacenDestino) {
      setError('Selecciona el almacén destino.');
      return;
    }
    if (tipo === 'TRASPASO' && (!almacenOrigen || almacenOrigen === almacenDestino)) {
      setError('Selecciona almacenes de origen y destino diferentes.');
      return;
    }

    const payloadItems = items.map((item) => ({
      id_fab: item.producto.idFab!,
      cantidad: item.cantidad,
      ...(item.obs.trim() ? { obs: item.obs.trim() } : {}),
    }));
    const obs = observacion.trim() || undefined;

    setError('');
    setExito('');
    setEnviando(true);
    try {
      const { data } = tipo === 'INGRESO'
        ? await api.post<MovimientoMercaderiaResponse>(
          '/productos/actualizar-mercaderia',
          {
            cod_suc: almacenDestino,
            cod_usu: usuario.cod_usu,
            obs,
            items: payloadItems,
          } satisfies IngresoMercaderiaRequest,
        )
        : await api.post<MovimientoMercaderiaResponse>(
          '/productos/traspaso',
          {
            cod_suc_ori: almacenOrigen,
            cod_suc_des: almacenDestino,
            cod_usu: usuario.cod_usu,
            obs,
            items: payloadItems,
          } satisfies TraspasoAlmacenRequest,
        );
      setExito(data.message);
      setItems([]);
      setObservacion('');
      setResultados([]);
      setTermino('');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setEnviando(false);
    }
  };

  const almacenNombre = (codigo: string) =>
    almacenes.find((almacen) => almacen.codSuc === codigo)?.nomSuc ?? codigo;

  return (
    <div>
      <header style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Movimientos entre almacenes</h1>
          <p style={S.pageSubtitle}>Registra ingresos de mercadería y traspasos de stock.</p>
        </div>
      </header>

      {almacenesError && <div style={S.errorBanner} role="alert">{almacenesError}</div>}
      {error && <div style={S.errorBanner} role="alert">{error}</div>}
      {exito && <div style={S.successBanner} role="status">{exito}</div>}

      <section style={S.card} aria-label="Tipo de movimiento">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            ['INGRESO', 'Actualizar mercadería', 'ti-package-import'],
            ['TRASPASO', 'Traspaso entre almacenes', 'ti-transfer'],
          ] as const).map(([valor, etiqueta, icono]) => (
            <button
              key={valor}
              type="button"
              onClick={() => { setTipo(valor); setError(''); setExito(''); }}
              style={tipo === valor ? btnStyle('primary') : btnStyle()}
              aria-pressed={tipo === valor}
            >
              <i className={`ti ${icono}`} aria-hidden="true" />
              {etiqueta}
            </button>
          ))}
        </div>
      </section>

      <section style={S.card}>
        <h2 style={S.cardTitle}>Almacenes</h2>
        {loadingAlmacenes ? (
          <p style={{ color: BRAND.gray600, fontSize: 13 }}>Cargando almacenes…</p>
        ) : almacenes.length === 0 ? (
          <p style={{ color: BRAND.gray600, fontSize: 13 }}>No hay almacenes disponibles para movimientos.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {tipo === 'TRASPASO' && (
              <div>
                <label htmlFor="almacen-origen" style={S.label}>Almacén de origen</label>
                <select
                  id="almacen-origen"
                  style={S.select}
                  value={almacenOrigen}
                  onChange={(event) => setAlmacenOrigen(event.target.value)}
                  disabled={enviando}
                >
                  {almacenes.map((almacen) => (
                    <option key={almacen.codSuc} value={almacen.codSuc}>
                      {almacen.nomSuc} ({almacen.codSuc})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="almacen-destino" style={S.label}>Almacén destino</label>
              <select
                id="almacen-destino"
                style={S.select}
                value={almacenDestino}
                onChange={(event) => setAlmacenDestino(event.target.value)}
                disabled={enviando}
              >
                {almacenes.map((almacen) => (
                  <option key={almacen.codSuc} value={almacen.codSuc}>
                    {almacen.nomSuc} ({almacen.codSuc})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {tipo === 'TRASPASO' && almacenOrigen && almacenDestino && almacenOrigen === almacenDestino && (
          <p style={{ color: BRAND.red, fontSize: 12, marginBottom: 0 }} role="alert">
            El almacén de origen y destino deben ser diferentes.
          </p>
        )}
      </section>

      <section style={S.card}>
        <h2 style={S.cardTitle}>Agregar productos</h2>
        <form
          onSubmit={(event) => { event.preventDefault(); void buscarProductos(); }}
          style={{ display: 'flex', alignItems: 'end', gap: 10, flexWrap: 'wrap' }}
        >
          <div style={{ ...S.formGroup, flex: 1, minWidth: 220, marginBottom: 0 }}>
            <label htmlFor="producto-busqueda" style={S.label}>Descripción o código de fábrica</label>
            <input
              id="producto-busqueda"
              value={termino}
              onChange={(event) => setTermino(event.target.value)}
              style={S.input}
              placeholder="Buscar producto"
              disabled={buscando || enviando}
            />
          </div>
          <button type="submit" style={btnStyle('secondary')} disabled={buscando || enviando}>
            <i className="ti ti-search" aria-hidden="true" />
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {resultados.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Código fábrica</th>
                  <th style={S.th}>Descripción</th>
                  <th style={S.th}>Marca</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((producto, index) => {
                  const agregado = items.some((item) => item.producto.idFab === producto.idFab);
                  return (
                    <tr key={`${producto.idFab ?? producto.id}-${index}`}>
                      <td style={S.td}>{producto.codFab ?? '—'}</td>
                      <td style={S.td}>{producto.descPro}</td>
                      <td style={S.td}>{producto.marca ?? '—'}</td>
                      <td style={S.td}>
                        <button
                          type="button"
                          style={btnStyle(agregado ? 'ghost' : 'secondary', 'sm')}
                          onClick={() => agregarProducto(producto)}
                          disabled={agregado || producto.idFab == null || enviando}
                        >
                          {agregado ? 'Agregado' : 'Agregar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!buscando && termino.trim() && resultados.length === 0 && (
          <p style={{ color: BRAND.gray600, fontSize: 13, marginBottom: 0 }}>
            Sin resultados. Usa el botón Buscar para consultar productos.
          </p>
        )}
      </section>

      <section style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h2 style={{ ...S.cardTitle, marginBottom: 0 }}>Detalle del movimiento</h2>
          <span style={badgeStyle('gray')}>{items.length} producto{items.length === 1 ? '' : 's'}</span>
        </div>

        {items.length === 0 ? (
          <p style={{ ...S.emptyState, padding: '20px 8px' }}>Agrega productos para preparar el movimiento.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Código</th>
                  <th style={S.th}>Producto</th>
                  <th style={{ ...S.th, width: 130 }}>Cantidad</th>
                  <th style={S.th}>Observación del producto</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ producto, cantidad, obs }) => (
                  <tr key={producto.idFab}>
                    <td style={S.td}>{producto.codFab ?? '—'}</td>
                    <td style={S.td}>{producto.descPro}</td>
                    <td style={S.td}>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={cantidad}
                        onChange={(event) => actualizarItem(producto.idFab!, { cantidad: Number(event.target.value) })}
                        style={{ ...S.input, minWidth: 90 }}
                        aria-label={`Cantidad de ${producto.descPro}`}
                        disabled={enviando}
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        value={obs}
                        onChange={(event) => actualizarItem(producto.idFab!, { obs: event.target.value })}
                        style={S.input}
                        aria-label={`Observación de ${producto.descPro}`}
                        disabled={enviando}
                      />
                    </td>
                    <td style={S.td}>
                      <button
                        type="button"
                        style={btnStyle('danger', 'sm')}
                        onClick={() => setItems((actuales) => actuales.filter((item) => item.producto.idFab !== producto.idFab))}
                        disabled={enviando}
                        aria-label={`Quitar ${producto.descPro}`}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ ...S.formGroup, marginTop: 16 }}>
          <label htmlFor="observacion-movimiento" style={S.label}>Observación general</label>
          <textarea
            id="observacion-movimiento"
            value={observacion}
            onChange={(event) => setObservacion(event.target.value)}
            style={{ ...S.input, minHeight: 82, resize: 'vertical' }}
            disabled={enviando}
          />
        </div>

        {tipo === 'TRASPASO' && almacenOrigen && almacenDestino && (
          <p style={{ color: BRAND.gray600, fontSize: 12 }}>
            {almacenNombre(almacenOrigen)} <i className="ti ti-arrow-right" aria-hidden="true" /> {almacenNombre(almacenDestino)}
          </p>
        )}
        <button
          type="button"
          style={btnStyle('primary')}
          onClick={() => void registrarMovimiento()}
          disabled={enviando || loadingAlmacenes || almacenes.length === 0 || Boolean(almacenesError)}
        >
          <i className={`ti ${tipo === 'INGRESO' ? 'ti-package-import' : 'ti-transfer'}`} aria-hidden="true" />
          {enviando
            ? 'Registrando…'
            : tipo === 'INGRESO'
              ? 'Registrar ingreso de mercadería'
              : 'Registrar traspaso'}
        </button>
      </section>
    </div>
  );
}
