import { useEffect, useState } from 'react';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BRAND, S, badgeStyle, btnStyle } from '../components/ui/tokens';
import { FirmaTraspasoModal } from '../components/traspasos/FirmaTraspasoModal';
import { NuevoProductoModal } from '../components/productos/NuevoProductoModal';
import type {
  Almacen,
  ContextoTraspaso,
  IngresoMercaderiaRequest,
  TipoTraspasoRegistro as TipoTraspaso,
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

// Misma regla que el backend (calcularTipoTraspaso): solo se usa para mostrar
// qué firma se pedirá; el backend vuelve a calcularlo y es quien decide.
const calcularTipoTraspaso = (ctx: ContextoTraspaso | null, origen: string, destino: string): TipoTraspaso => {
  const tienda = ctx?.almacenesTienda ?? [];
  const origenEnTienda = tienda.includes(origen);
  if (origenEnTienda && destino === ctx?.almacenPrincipal) return 'SALIDA_VENTA';
  if (!origenEnTienda && tienda.includes(destino)) return 'INGRESO_TIENDA';
  return 'ENTRE_ALMACENES';
};

const ETIQUETA_TIPO: Record<TipoTraspaso, { texto: string; ayuda: string; color: 'amber' | 'blue' | 'gray' }> = {
  SALIDA_VENTA: {
    texto: 'Salida a venta',
    ayuda: 'Firma el vendedor que se lleva los productos.',
    color: 'amber',
  },
  INGRESO_TIENDA: {
    texto: 'Ingreso a tienda',
    ayuda: 'Firmas tú con tu contraseña.',
    color: 'blue',
  },
  ENTRE_ALMACENES: {
    texto: 'Entre almacenes',
    ayuda: 'Firmas tú con tu contraseña.',
    color: 'gray',
  },
};

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
  const [contexto, setContexto] = useState<ContextoTraspaso | null>(null);
  const [firmaAbierta, setFirmaAbierta] = useState(false);
  const [errorFirma, setErrorFirma] = useState('');
  const [nuevoProductoAbierto, setNuevoProductoAbierto] = useState(false);
  const [busquedaHecha, setBusquedaHecha] = useState(false);

  // Registrar productos nuevos: quienes manejan mercadería (lo valida el backend)
  const puedeCrearProducto = Boolean(
    usuario?.roles?.some((r) => r === 'Administrador' || r === 'Encargado de Almacen'),
  );

  useEffect(() => {
    const cargarAlmacenes = async () => {
      try {
        const { data } = await api.get<Almacen[]>('/productos/almacenes-disponibles');
        setAlmacenes(data);
        setAlmacenDestino(data[0]?.codSuc ?? '');
        // Si falla el contexto, el ingreso de mercadería sigue funcionando
        const { data: ctx } = await api.get<ContextoTraspaso>('/productos/traspaso/contexto');
        setContexto(ctx);
        // Traspaso: el origen solo puede ser un almacén asignado al encargado
        const origen = ctx.origenes[0]?.codSuc ?? '';
        setAlmacenOrigen(origen);
      } catch (requestError) {
        setAlmacenesError(getErrorMessage(requestError));
      } finally {
        setLoadingAlmacenes(false);
      }
    };
    void cargarAlmacenes();
  }, []);

  // Destinos posibles para el traspaso: todos menos el origen
  const destinosTraspaso = (contexto?.destinos ?? []).filter((d) => d.codSuc !== almacenOrigen);
  const tipoTraspaso = calcularTipoTraspaso(contexto, almacenOrigen, almacenDestino);
  const puedeTraspasar = Boolean(contexto?.puedeTraspasar && contexto.origenes.length > 0);

  // Cada modo tiene su propia lista de destinos: se reinicia el destino al cambiar
  const cambiarTipo = (valor: TipoMovimiento) => {
    setTipo(valor);
    setError('');
    setExito('');
    if (valor === 'INGRESO') {
      setAlmacenDestino(almacenes[0]?.codSuc ?? '');
    } else if (contexto) {
      setAlmacenDestino(
        almacenOrigen !== contexto.almacenPrincipal
          ? contexto.almacenPrincipal
          : contexto.destinos.find((d) => d.codSuc !== almacenOrigen)?.codSuc ?? '',
      );
    }
  };

  const cambiarOrigen = (origen: string) => {
    setAlmacenOrigen(origen);
    if (almacenDestino === origen) {
      setAlmacenDestino((contexto?.destinos ?? []).find((d) => d.codSuc !== origen)?.codSuc ?? '');
    }
  };

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
      setBusquedaHecha(true);
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

    setError('');
    setExito('');

    // El traspaso se firma antes de registrarse
    if (tipo === 'TRASPASO') {
      setErrorFirma('');
      setFirmaAbierta(true);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post<MovimientoMercaderiaResponse>(
        '/productos/actualizar-mercaderia',
        {
          cod_suc: almacenDestino,
          cod_usu: usuario.cod_usu,
          obs: observacion.trim() || undefined,
          items: payloadItems(),
        } satisfies IngresoMercaderiaRequest,
      );
      setExito(data.message);
      limpiarFormulario();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setEnviando(false);
    }
  };

  const payloadItems = () => items.map((item) => ({
    id_fab: item.producto.idFab!,
    cantidad: item.cantidad,
    ...(item.obs.trim() ? { obs: item.obs.trim() } : {}),
  }));

  const limpiarFormulario = () => {
    setItems([]);
    setObservacion('');
    setResultados([]);
    setTermino('');
    setBusquedaHecha(false);
  };

  // Se llama desde el modal de firma
  const registrarTraspasoFirmado = async (firma: { password_firma: string; cod_usu_vendedor?: string }) => {
    setErrorFirma('');
    setEnviando(true);
    try {
      const { data } = await api.post<MovimientoMercaderiaResponse>(
        '/productos/traspaso',
        {
          cod_suc_ori: almacenOrigen,
          cod_suc_des: almacenDestino,
          ...firma,
          obs: observacion.trim() || undefined,
          items: payloadItems(),
        } satisfies TraspasoAlmacenRequest,
      );
      const f = data.firma;
      setExito(
        f
          ? `${data.message}. Firmado por ${f.firmante.nombre || f.firmante.alias} el ${f.fechaBolivia} a las ${f.horaBolivia}.`
          : data.message,
      );
      setFirmaAbierta(false);
      limpiarFormulario();
    } catch (requestError) {
      // Contraseña incorrecta, sin stock, etc.: se muestra dentro del modal
      setErrorFirma(getErrorMessage(requestError));
    } finally {
      setEnviando(false);
    }
  };

  const almacenNombre = (codigo: string) =>
    [...almacenes, ...(contexto?.origenes ?? []), ...(contexto?.destinos ?? [])]
      .find((almacen) => almacen.codSuc === codigo)?.nomSuc ?? codigo;

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
              onClick={() => cambiarTipo(valor)}
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
                  onChange={(event) => cambiarOrigen(event.target.value)}
                  disabled={enviando || (contexto?.origenes.length ?? 0) <= 1}
                >
                  {(contexto?.origenes ?? []).map((almacen) => (
                    <option key={almacen.codSuc} value={almacen.codSuc}>
                      {almacen.nomSuc} ({almacen.codSuc})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: BRAND.gray600, margin: '4px 0 0' }}>
                  Solo los almacenes que tienes asignados.
                </p>
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
                {(tipo === 'TRASPASO' ? destinosTraspaso : almacenes).map((almacen) => (
                  <option key={almacen.codSuc} value={almacen.codSuc}>
                    {almacen.nomSuc} ({almacen.codSuc})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {tipo === 'TRASPASO' && !loadingAlmacenes && !puedeTraspasar && (
          <p style={{ color: BRAND.red, fontSize: 12, marginBottom: 0 }} role="alert">
            {contexto?.puedeTraspasar
              ? 'No tienes almacenes asignados. Pide al administrador que te asigne el almacén que manejas.'
              : 'Solo un usuario con rol "Encargado de Almacen" puede registrar traspasos.'}
          </p>
        )}
        {tipo === 'TRASPASO' && puedeTraspasar && almacenOrigen && almacenDestino && almacenOrigen !== almacenDestino && (
          <p style={{ fontSize: 12, color: BRAND.gray600, margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={badgeStyle(ETIQUETA_TIPO[tipoTraspaso].color)}>{ETIQUETA_TIPO[tipoTraspaso].texto}</span>
            {ETIQUETA_TIPO[tipoTraspaso].ayuda}
          </p>
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
              onChange={(event) => { setTermino(event.target.value); setBusquedaHecha(false); }}
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
            {busquedaHecha
              ? 'No se encontró ningún producto con ese texto.'
              : 'Usa el botón Buscar para consultar productos.'}
          </p>
        )}

        {/* Mercadería nueva que todavía no existe en el sistema */}
        {tipo === 'INGRESO' && busquedaHecha && puedeCrearProducto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BRAND.gray200}` }}>
            <span style={{ fontSize: 12, color: BRAND.gray600 }}>
              ¿Llegó un producto que no está en la lista?
            </span>
            <button
              type="button"
              style={btnStyle('secondary', 'sm')}
              onClick={() => setNuevoProductoAbierto(true)}
              disabled={enviando}
            >
              <i className="ti ti-plus" aria-hidden="true" />
              Registrar nuevo producto
            </button>
          </div>
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
          disabled={
            enviando || loadingAlmacenes || almacenes.length === 0 || Boolean(almacenesError)
            || (tipo === 'TRASPASO' && !puedeTraspasar)
          }
        >
          <i className={`ti ${tipo === 'INGRESO' ? 'ti-package-import' : 'ti-transfer'}`} aria-hidden="true" />
          {enviando
            ? 'Registrando…'
            : tipo === 'INGRESO'
              ? 'Registrar ingreso de mercadería'
              : 'Firmar y registrar traspaso'}
        </button>
      </section>

      {nuevoProductoAbierto && (
        <NuevoProductoModal
          onClose={() => setNuevoProductoAbierto(false)}
          onCreado={(producto) => {
            setNuevoProductoAbierto(false);
            agregarProducto(producto);
            setExito(`Producto "${producto.descPro}" registrado y agregado al ingreso. Indica la cantidad que llegó.`);
          }}
        />
      )}

      {firmaAbierta && (
        <FirmaTraspasoModal
          tipo={tipoTraspaso}
          origen={almacenNombre(almacenOrigen)}
          destino={almacenNombre(almacenDestino)}
          totalProductos={items.length}
          totalUnidades={items.reduce((s, i) => s + i.cantidad, 0)}
          nombreEncargado={`${usuario?.nombre ?? ''} ${usuario?.apellido ?? ''}`.trim() || usuario?.alias || ''}
          enviando={enviando}
          error={errorFirma}
          onCancel={() => setFirmaAbierta(false)}
          onConfirm={(firma) => void registrarTraspasoFirmado(firma)}
        />
      )}
    </div>
  );
}
