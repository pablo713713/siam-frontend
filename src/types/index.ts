export interface Usuario {
  cod_usu: string;
  alias: string;
  nombre: string;
  apellido: string;
  roles: string[];
  id_roles: number[];
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
