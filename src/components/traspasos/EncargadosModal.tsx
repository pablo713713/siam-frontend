import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, badgeStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';
import type { EncargadosAlmacen } from '../../types';

/** Quiénes pueden registrar traspasos desde cada almacén. */
export function EncargadosModal({ onClose }: { onClose: () => void }) {
  const [almacenes, setAlmacenes] = useState<EncargadosAlmacen[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: EncargadosAlmacen[] }>('/almacenes/encargados')
      .then(({ data }) => setAlmacenes(data.data ?? []))
      .catch((e: unknown) => setError(mensajeError(e, 'No se pudo cargar la lista de encargados.')));
  }, []);

  return (
    <Modal titulo="Encargados por almacén" icono="ti-users" ancho={560} onClose={onClose}>
      <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 14px' }}>
        Usuarios que pueden registrar traspasos desde cada almacén. Se asignan en Administración → Asignar Rol.
      </p>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}
      {!almacenes && !error && <p style={{ fontSize: 13, color: BRAND.gray600 }}>Cargando…</p>}
      {almacenes && almacenes.length === 0 && (
        <p style={{ fontSize: 13, color: BRAND.gray600 }}>Todavía no hay almacenes con encargados asignados.</p>
      )}
      {almacenes && almacenes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
          {almacenes.map((a) => (
            <div key={a.codSuc} style={{ border: `1px solid ${BRAND.gray200}`, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {a.nomSuc} <span style={{ fontWeight: 400, color: BRAND.gray600 }}>({a.codSuc})</span>
              </div>
              {a.encargados.map((e) => (
                <div key={e.codUsu} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '4px 0', fontSize: 13 }}>
                  <span>
                    {e.nombre || e.alias}
                    <span style={{ color: BRAND.gray600, fontSize: 12 }}> · @{e.alias} · {e.codUsu}</span>
                  </span>
                  <span style={badgeStyle(e.rol === 'Administrador' ? 'gray' : 'blue')}>
                    {e.rol === 'Administrador' ? 'Administrador' : 'Encargado'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
