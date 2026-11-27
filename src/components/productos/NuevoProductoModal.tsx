import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { Modal } from '../ui/Modal';
import { BRAND, S, btnStyle } from '../ui/tokens';
import { mensajeError } from '../../utils/errores';
import type { CatalogosProducto, Producto } from '../../types';
import { ProductoForm } from './ProductoForm';
import {
  CAMPOS_PRECIO,
  PRODUCTO_VACIO,
  validarProducto,
  type ProductoFormValues,
} from './productoFormUtils';

interface Props {
  onClose: () => void;
  /** Recibe el producto creado, con la misma forma que un resultado de búsqueda */
  onCreado: (producto: Producto) => void;
}

/**
 * Registro de un producto nuevo. Se abre desde "Actualizar mercadería" cuando
 * llega un producto que todavía no existe en el sistema.
 */
export function NuevoProductoModal({ onClose, onCreado }: Props) {
  const [catalogos, setCatalogos] = useState<CatalogosProducto | null>(null);
  const [valores, setValores] = useState<ProductoFormValues>(PRODUCTO_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Mientras no se edite a mano, el código de producto copia al de fábrica
  const codProManual = useRef(false);

  useEffect(() => {
    api.get<CatalogosProducto>('/productos/catalogos')
      .then(({ data }) => setCatalogos(data))
      .catch((e: unknown) => setError(mensajeError(e, 'No se pudieron cargar las marcas, tipos y modelos.')));
  }, []);

  const cambiar = (nuevos: ProductoFormValues) => {
    setValores(
      !codProManual.current && nuevos.codFab !== valores.codFab
        ? { ...nuevos, codPro: nuevos.codFab }
        : nuevos,
    );
  };

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const problema = validarProducto(valores, true);
    if (problema) { setError(problema); return; }

    setError('');
    setGuardando(true);
    try {
      const precios = Object.fromEntries(
        CAMPOS_PRECIO.filter((c) => valores[c].trim() !== '').map((c) => [c, Number(valores[c])]),
      );
      const { data } = await api.post<{ producto: Producto }>('/productos', {
        descPro: valores.descPro.trim(),
        codPro: valores.codPro.trim(),
        codFab: valores.codFab.trim(),
        codProv: valores.codProv,
        ...(valores.codMod ? { codMod: Number(valores.codMod) } : {}),
        codigoTipo: valores.codigoTipo,
        ...(valores.unidad.trim() ? { unidad: valores.unidad.trim() } : {}),
        ...(valores.barra.trim() ? { barra: valores.barra.trim() } : {}),
        ...(valores.codAnt.trim() ? { codAnt: valores.codAnt.trim() } : {}),
        ...(valores.comentario.trim() ? { comentario: valores.comentario.trim() } : {}),
        ...precios,
      });
      onCreado(data.producto);
    } catch (e) {
      setError(mensajeError(e, 'No se pudo registrar el producto.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Registrar nuevo producto" icono="ti-package" ancho={760} onClose={guardando ? undefined : onClose}>
      <p style={{ fontSize: 12, color: BRAND.gray600, margin: '0 0 14px' }}>
        El producto queda registrado sin stock. Después de guardarlo se agrega a este ingreso de mercadería.
      </p>
      {error && <div style={S.errorBanner} role="alert">{error}</div>}

      {!catalogos ? (
        !error && <p style={{ fontSize: 13, color: BRAND.gray600 }}>Cargando…</p>
      ) : (
        <form onSubmit={guardar} autoComplete="off">
          <ProductoForm
            valores={valores}
            onChange={cambiar}
            catalogos={catalogos}
            disabled={guardando}
            onCodProEditado={() => { codProManual.current = true; }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" style={btnStyle('ghost')} onClick={onClose} disabled={guardando}>Cancelar</button>
            <button type="submit" style={btnStyle('primary')} disabled={guardando}>
              <i className="ti ti-device-floppy" aria-hidden="true" />
              {guardando ? 'Guardando…' : 'Registrar producto'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
