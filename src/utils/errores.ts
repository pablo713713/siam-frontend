import axios from 'axios';

/** Mensaje de error del backend (NestJS) o uno genérico. */
export function mensajeError(error: unknown, porDefecto = 'No se pudo completar la operación. Intenta nuevamente.') {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const m = error.response?.data?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (m) return m;
  }
  return porDefecto;
}
