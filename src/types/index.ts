export interface Usuario {
  cod_usu: string;
  alias: string;
  nombre: string;
  apellido: string;
  roles: string[];
  id_roles: number[];
  almacenes: Almacen[];
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
  importe: number;
}

export interface Almacen {
  codSuc: string;
  nomSuc: string;
}
