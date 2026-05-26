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
  descripcion: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerfilCliente {
  cod_cli: number;
  razon_social: string;
  num_ci_nit: string;
  telefono: string;
  celular: string;
  domicilio: string;
  activo: boolean;
  extension: {
    acepta_devoluciones: boolean;
    limite_credito: number | null;
    nivel_fidelidad: number;
    observaciones: string | null;
  };
}

export interface GananciaNeta {
  rango: { fecha_inicio: string; fecha_fin: string };
  ingresos_brutos: number;
  costo_mercancia: number;
  ganancia_neta: number;
  margen_porcentaje: number;
}