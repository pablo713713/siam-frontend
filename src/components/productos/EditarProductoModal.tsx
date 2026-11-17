import { useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, btnStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';
import type { CatalogosProducto, ProductoDetalle } from '../../types';
import { ProductoForm } from './ProductoForm';
import {
  CAMPOS_PRECIO,
  ETIQUETA_CAMPO,
  desdeDetalle,
  validarProducto,
  type ProductoFormValues,
} from './productoFormUtils';

interface Props {
  idFab: number;
  descripcion: string;
  onClose: () => void;
  onGuardado: (producto: ProductoDetalle, mensaje: string) => void;
}

const CAMPOS_TEXTO = ['descPro', 'codProv', 'codigoTipo', 'unidad', 'barra', 'codAnt', 'comentario'] as const;

/**
 * Edición de un producto (solo Administrador).
 * Paso 1: el administrador confirma su identidad con su contraseña.
 * Paso 2: edita los datos. Al guardar, el backend vuelve a verificar la
 * contraseña y deja el rastro de auditoría (antes y después).
 */
export function EditarProductoModal({ idFab, descripcion, onClose, onGuardado }: Props) {
  const [password, setPassword] = useState('');
  const [original, setOriginal] = useState<ProductoFormValues | null>(null);
  const [valores, setValores] = useState<ProductoFormValues | null>(null);
  const [catalogos, setCatalogos] = useState<CatalogosProducto | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  // Paso 1: verificar la contraseña y cargar el producto
  const confirmarIdentidad = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setError('');
    setOcupado(true);
    try {
      await api.post('/usuarios/verificar-password', { password });
      const [{ data: producto }, { data: cats }] = await Promise.all([
        api.get<ProductoDetalle>(`/productos/fab/${idFab}`),
        api.get<CatalogosProducto>('/productos/catalogos'),
      ]);
      const form = desdeDetalle(producto);
      setCatalogos(cats);
      setOriginal(form);
      setValores(form);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo verificar la contraseña.'));
    } finally {
      setOcupado(false);
    }
  };

  // Solo se envían los campos que cambiaron
  const cambios = (): Record<string, string | number> => {
    if (!original || !valores) return {};
    const out: Record<string, string | number> = {};
    for (const c of CAMPOS_TEXTO) {
      if (valores[c].trim() !== original[c].trim()) out[c] = valores[c].trim();
    }
    if (valores.codMod !== original.codMod) out.codMod = Number(valores.codMod);
    for (const c of CAMPOS_PRECIO) {
      const nuevo = Number(valores[c].trim() || 0);
      if (nuevo !== Number(original[c] || 0)) out[c] = nuevo;
    }
    return out;
  };

  // Paso 2: guardar
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valores) return;
    const problema = validarProducto(valores, false);
    if (problema) { setError(problema); return; }
    const modificados = cambios();
    if (Object.keys(modificados).length === 0) {
      setError('No cambiaste ningún dato.');
      return;
    }
    setError('');
    setOcupado(true);
    try {
      const { data } = await api.put<{ producto: ProductoDetalle }>(
        `/productos/fab/${idFab}`,
        { password, ...modificados },
      );
      const lista = Object.keys(modificados).map((c) => ETIQUETA_CAMPO[c] ?? c).join(', ');
      onGuardado(data.producto, `Producto actualizado. Cambios: ${lista}.`);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo guardar el producto.'));
    } finally {
      setOcupado(false);
    }
  };

  if (!valores || !catalogos) {
    return (
      <Modal titulo="Editar información" icono="ti-lock" ancho={420} onClose={ocupado ? undefined : onClose}>
        <form onSubmit={confirmarIdentidad} autoComplete="off">
          <p style={{ fontSize: 13, color: BRAND.gray700, margin: '0 0 4px', fontWeight: 600 }}>{descripcion}</p>
          <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 14px' }}>
            Por favor, introduce tu contraseña para editar este producto. El cambio quedará registrado a tu nombre.
          </p>
          {error && <div style={S.errorBanner} role="alert">{error}</div>}
          <div style={S.formGroup}>
            <label htmlFor="ep-password" style={S.label}>Contraseña</label>
            <input
              id="ep-password" type="password" autoComplete="new-password" autoFocus
              style={S.input} value={password} disabled={ocupado}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={ocupado}>Cancelar</button>
            <button type="submit" style={btnStyle('primary')} disabled={ocupado || !password}>
              {ocupado ? 'Verificando…' : 'Continuar'}
            </button>
          </div>
        </form>
      </Modal>
    );
  }

  const nCambios = Object.keys(cambios()).length;
  return (
    <Modal titulo="Editar información del producto" icono="ti-edit" ancho={760} onClose={ocupado ? undefined : onClose}>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}
      <form onSubmit={guardar} autoComplete="off">
        <ProductoForm
          valores={valores}
          onChange={setValores}
          catalogos={catalogos}
          disabled={ocupado}
          codigosSoloLectura
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: BRAND.gray600 }}>
            {nCambios === 0 ? 'Sin cambios' : `${nCambios} campo${nCambios === 1 ? '' : 's'} modificado${nCambios === 1 ? '' : 's'}`}
            {' · se guardará quién lo cambió, la fecha y los datos anteriores'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={ocupado}>Cancelar</button>
            <button type="submit" style={btnStyle('primary')} disabled={ocupado || nCambios === 0}>
              <i className="ti ti-device-floppy" aria-hidden="true" />
              {ocupado ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
