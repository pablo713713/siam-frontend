import type { ReactNode } from 'react';
import { BRAND, S } from './tokens';

interface Props {
  titulo: ReactNode;
  icono?: string;          // clase de icono Tabler, p. ej. "ti-edit"
  ancho?: number;
  onClose?: () => void;    // sin onClose no se muestra la X (operación en curso)
  children: ReactNode;
  etiqueta?: ReactNode;    // badge a la derecha del título
}

/** Panel flotante centrado, compartido por los formularios y confirmaciones. */
export function Modal({ titulo, icono, ancho = 480, onClose, children, etiqueta }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 600,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 16px', overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ ...S.card, width: ancho, maxWidth: '100%', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <h2 style={{ ...S.cardTitle, marginBottom: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            {icono && <i className={`ti ${icono}`} aria-hidden="true" />}
            {titulo}
          </h2>
          {etiqueta}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: BRAND.gray600, fontSize: 18, lineHeight: 1, padding: 4 }}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
