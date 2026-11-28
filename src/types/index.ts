export interface Usuario {
  cod_usu: string;
  alias: string;
  nombre: string;
  apellido: string;
  roles: string[];
  id_roles: number[];
  almacenes: Almacen[];
  cod_emp?: string; // empresa del usuario (viene en el token)
}

export interface AuthResponse {
  access_token: string;
  usuario: Usuario;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioRolResponse {
  id: number;
  cod_usu: string;
  id_rol: number;
  asignadoAt: string;
  rol: Rol;
}

export interface CreateRolDto {
  nombre: string;
  descripcion?: string;
}

export interface UpdateRolDto {
  nombre?: string;
  descripcion?: string;
}

export interface AsignarRolDto {
  cod_usu: string;
  id_rol: number;
}

export interface Producto {
  id: number;
  codPro: string | null;
  descPro: string;
  estado: string | null;
  codigo: string | null;
  codFab: string | null;
  barra: string | null;
  codAnt: string | null;
  marca: string | null;
  modelo: string | null;
  plisPro: number | null;
  pminPro: number | null;
  pmayPro: number | null;
  ciffSus: number | null;
  idFab: number | null;
  plisBs: number | null;
  pminBs: number | null;
  pmayBs: number | null;
  stockAlmacen?: number; // stock en el almacén consultado (búsqueda con cod_suc)
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdvancedSearchParams {
  q?: string;
  codigo?: string;
  page?: number;
  limit?: number;
}

export interface StockSucursal {
  codSucursal: string;
  nombreSucursal: string;
  stockFisico: number;
  inventarioVirtual: number;
}

export type TipoOperacion = 'INGRESO' | 'SALIDA';
export type OrigenMovimiento =
  | 'IMPORTACION'
  | 'INVENTARIO'
  | 'VENTA'
  | 'CREDITO'
  | 'PEDIDO';

export interface MovimientoKardex {
  fecha: string;
  tipoOperacion: TipoOperacion;
  origen: OrigenMovimiento;
  cantidad: number;
  referencia: string;
  saldoAcumulado: number;
}

export interface KardexResponse {
  stockPorSucursal: StockSucursal[];
  totalStockFisico: number;
  totalInventarioVirtual: number;
  movimientos: MovimientoKardex[];
}

export interface ClienteExtension {
  acepta_devoluciones: boolean;
  limite_credito: number | null;
  nivel_fidelidad: number;
  observaciones: string | null;
}

export interface ClientePerfil {
  cod_cli: number;
  razon_social: string;
  num_ci_nit: string;
  telefono: string | null;
  celular: string | null;
  domicilio: string | null;
  activo: boolean;
  extension: ClienteExtension;
  credito?: CupoCreditoCliente | null;
}

export interface CompraHistorial {
  id: string;
  tipo: 'CONTADO' | 'CREDITO';
  fecha: string;
  monto: number;
  estado: string;
}

export interface HistorialComprasResponse {
  cod_cli: number;
  razon_social: string;
  total_compras: number;
  historial: CompraHistorial[];
}

export interface IngresosResponse {
  rango: { fecha_inicio: string; fecha_fin: string };
  ventas_contado: { total: number; cantidad: number };
  ventas_credito: { total: number; cantidad: number };
  total_bruto: number;
  total_devoluciones: number;
  total_devoluciones_credito?: number;
}

export interface GananciaResponse {
  rango: { fecha_inicio: string; fecha_fin: string };
  ingresos_brutos: number;
  costo_mercancia: number;
  ganancia_neta: number;
  margen_porcentaje: number;
}
export interface ClienteVenta {
  codCli: number;
  nomCli: string;
  apeCli: string;
  razonSocial: string;
  numCiNit: string;
  telDom: string;
  cel: string;
  domicilio: string;
}

export interface ProductoVenta {
  idFab: number;
  codFab: string;
  codPro: string;
  descPro: string;
  plisPro: number;
}

export interface ItemCarrito {
  idFab: number;
  codFab: string;
  descPro: string;
  cantidad: number;
  precioUnitario: number;
  precioOriginal: number;
  importe: number;
  plisBs: number;
  pminBs: number;
  pmayBs: number;
}

export interface Almacen {
  codSuc: string;
  nomSuc: string;
}

export interface ItemMovimientoMercaderia {
  id_fab: number;
  cantidad: number;
  obs?: string;
}

export interface IngresoMercaderiaRequest {
  cod_suc: string;
  obs?: string;
  items: ItemMovimientoMercaderia[];
}

// Tipo de traspaso: lo calcula el backend según origen y destino
export type TipoTraspaso = 'INGRESO_TIENDA' | 'SALIDA_VENTA' | 'ENTRE_ALMACENES' | 'DEVOLUCION';
// Tipos que se registran desde Movimientos (la devolución se registra desde el historial)
export type TipoTraspasoRegistro = Exclude<TipoTraspaso, 'DEVOLUCION'>;

export interface TraspasoAlmacenRequest {
  cod_suc_ori: string;
  cod_suc_des: string;
  // El encargado que registra se toma del token en el backend
  password_firma: string;
  password_encargado?: string; // salida, paso 1: firma del encargado
  cod_usu_vendedor?: string;   // salida, paso 2: vendedor que se lleva los productos
  reposicion?: boolean;        // hacia MOTOR ZONE sin vendedor
  obs?: string;
  items: ItemMovimientoMercaderia[];
}

export interface ContextoTraspaso {
  puedeTraspasar: boolean;
  origenes: Almacen[];      // almacenes asignados al usuario
  destinos: Almacen[];
  almacenPrincipal: string; // 00011 MOTOR ZONE
  almacenesTienda: string[];
}

export interface VendedorFirma {
  codUsu: string;
  nomUsu: string | null;
  apUsu: string | null;
  alias: string;
}

export interface FirmaTraspaso {
  idAutorizacion: number | null;
  // Salida: encargado que entregó (paso 1) y vendedor que se llevó (paso 2)
  encargado?: { codUsu: string; alias: string; nombre: string } | null;
  firmante: { codUsu: string; alias: string; nombre: string };
  fechaBolivia: string | null;
  horaBolivia: string | null;
  estado: EstadoTraspaso;
}

// ─── Historial de traspasos firmados (talonario digital) ───────────────────
// Salidas: COMPLETADO → PARCIAL (devolvió una parte) | DEVUELTO (devolvió todo)
export type EstadoTraspaso = 'COMPLETADO' | 'PARCIAL' | 'DEVUELTO';

export interface ItemTraspasoHistorial {
  idFab: number;
  codFab: string;
  descPro: string | null;
  cantidad: number;
  obs: string | null;
  // Solo en salidas con detalle; en los demás traspasos, null
  devuelta: number | null;
  porDevolver: number | null;
}

export interface TraspasoHistorial {
  idAutorizacion: number;
  codRemSalida: string;
  codRemEntrada: string | null;
  tipo: TipoTraspaso;
  estado: EstadoTraspaso;
  fecha: string; // YYYY-MM-DD, hora de Bolivia
  hora: string;  // HH:mm:ss
  codSucOri: string;
  nomSucOri: string;
  codSucDes: string;
  nomSucDes: string;
  codUsuEncargado: string;
  nombreEncargado: string;
  codUsuFirmante: string;
  nombreFirmante: string;
  obs: string | null;
  totalUnidades: number;
  items: ItemTraspasoHistorial[];
  idTaOrigen: number | null;      // en una devolución: el traspaso que se devolvió
  codVenta: string | null;
  puedeDevolver: boolean;          // el usuario puede registrar la devolución
}

export interface EncargadosAlmacen {
  codSuc: string;
  nomSuc: string;
  encargados: { codUsu: string; nombre: string; alias: string; rol: string }[];
}

// ─── Alta y edición de productos ────────────────────────────────────────────
export interface ProductoDetalle {
  idPro: number;
  idFab: number;
  codPro: string | null;
  codFab: string | null;
  descPro: string;
  codProv: string;
  marca: string | null;
  codMod: number;
  modelo: string | null;
  codigoTipo: string;
  tipo: string | null;
  unidad: string | null;
  barra: string;
  codAnt: string;
  comentario: string;
  plisPro: number;
  pminPro: number;
  pmayPro: number;
  plisBs: number;
  pminBs: number;
  pmayBs: number;
  cifCbba: number;
}

export interface CatalogosProducto {
  proveedores: { codProv: string; nomProv: string }[];
  tipos: { codigo: string; descripcion: string | null }[];
  modelos: { codMod: number; nomModelo: string; nomMarca: string | null }[];
}

export interface CambioProducto {
  campo: string;
  antes: string | number | null;
  despues: string | number | null;
}

export interface AuditoriaProducto {
  idAuditoria: number;
  accion: 'CREAR' | 'EDITAR';
  idPro: number;
  idFab: number;
  codFab: string;
  descPro: string;
  descProActual: string;
  fecha: string;
  hora: string;
  codUsu: string;
  nombreUsuario: string;
  cambios: CambioProducto[];
  datosNuevos: Partial<ProductoDetalle> | null;
}

export interface AuditoriaProductosResponse {
  data: AuditoriaProducto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface HistorialTraspasosResponse {
  data: TraspasoHistorial[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface FiltrosHistorialTraspasos {
  alcance: 'TODOS' | 'MIS_ALMACENES';
  almacenes: Almacen[];
}

export interface MovimientoMercaderiaResponse {
  message: string;
  codRemEntrada: string;
  codRemSalida?: string;
  almacen?: string;
  tipo?: TipoTraspasoRegistro;
  firma?: FirmaTraspaso;
}

export type AlertaCredito = 'ok' | 'proximo' | 'vencido';

export interface CreditoActivo {
  codCre: string;
  codCli: number;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
  fecInicio: string;
  fecFin: string;
  total: number;
  saldo: number;
  diasRestantes: number;
  alerta: AlertaCredito;
}

export interface ClienteCredito {
  codCli: number;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
  creditoMaximo: number;
  usado: number;
  disponible: number;
  alerta: AlertaCredito | null;
}

export interface CupoCreditoCliente {
  limite: number;
  fuente: 'PERFIL' | 'LEGACY';
  deuda: number;
  disponible: number;
  habilitado: boolean;
}

export interface CreditoClienteResponse {
  cupo?: CupoCreditoCliente | null;
  creditos: Pick<CreditoActivo, 'codCre' | 'fecInicio' | 'fecFin' | 'total' | 'saldo' | 'diasRestantes' | 'alerta'>[];
  totalSaldos: number;
}

export interface PagoMultipleResponse {
  resultados: { cod_cre: string; montoAbonado: number; estado: string }[];
  totalAbonado: number;
  message: string;
}
