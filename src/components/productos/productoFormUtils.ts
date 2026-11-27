import type { ProductoDetalle } from '../../types';

/** Valores del formulario: todo como texto, igual que lo escribe el usuario. */
export interface ProductoFormValues {
  descPro: string;
  codPro: string;
  codFab: string;
  codProv: string;
  codMod: string;
  codigoTipo: string;
  unidad: string;
  barra: string;
  codAnt: string;
  comentario: string;
  plisPro: string;
  pminPro: string;
  pmayPro: string;
  plisBs: string;
  pminBs: string;
  pmayBs: string;
  cifCbba: string;
}

export const PRODUCTO_VACIO: ProductoFormValues = {
  descPro: '', codPro: '', codFab: '', codProv: '', codMod: '', codigoTipo: '1', unidad: 'PZA',
  barra: '', codAnt: '', comentario: '',
  plisPro: '', pminPro: '', pmayPro: '', plisBs: '', pminBs: '', pmayBs: '', cifCbba: '',
};

export const CAMPOS_PRECIO = ['plisPro', 'pminPro', 'pmayPro', 'plisBs', 'pminBs', 'pmayBs', 'cifCbba'] as const;

/** Etiquetas de los campos (formulario e historial de cambios). */
export const ETIQUETA_CAMPO: Record<string, string> = {
  descPro: 'Descripción',
  codPro: 'Código de producto',
  codFab: 'Código de fábrica',
  codProv: 'Marca / proveedor',
  codMod: 'Modelo',
  codigoTipo: 'Tipo de producto',
  unidad: 'Unidad',
  barra: 'Código de barras',
  codAnt: 'Código anterior',
  comentario: 'Comentario',
  plisPro: 'Precio factura ($us)',
  pminPro: 'Precio detalle ($us)',
  pmayPro: 'Precio mayor ($us)',
  plisBs: 'Precio factura (Bs)',
  pminBs: 'Precio detalle (Bs)',
  pmayBs: 'Precio mayor (Bs)',
  cifCbba: 'Costo CIF ($us)',
};

export const desdeDetalle = (p: ProductoDetalle): ProductoFormValues => ({
  descPro: p.descPro ?? '',
  codPro: p.codPro ?? '',
  codFab: p.codFab ?? '',
  codProv: p.codProv ?? '',
  codMod: String(p.codMod ?? 1),
  codigoTipo: p.codigoTipo ?? '1',
  unidad: p.unidad ?? '',
  barra: p.barra === '0' ? '' : (p.barra ?? ''), // '0' = sin código de barras
  codAnt: p.codAnt ?? '',
  comentario: p.comentario ?? '',
  plisPro: String(p.plisPro ?? 0),
  pminPro: String(p.pminPro ?? 0),
  pmayPro: String(p.pmayPro ?? 0),
  plisBs: String(p.plisBs ?? 0),
  pminBs: String(p.pminBs ?? 0),
  pmayBs: String(p.pmayBs ?? 0),
  cifCbba: String(p.cifCbba ?? 0),
});

/** Devuelve el primer problema del formulario, o '' si está correcto. */
export function validarProducto(v: ProductoFormValues, exigirCodigos: boolean): string {
  if (!v.descPro.trim()) return 'Escribe la descripción del producto.';
  if (exigirCodigos && !v.codFab.trim()) return 'Escribe el código de fábrica.';
  if (exigirCodigos && !v.codPro.trim()) return 'Escribe el código de producto.';
  if (!v.codProv) return 'Selecciona la marca / proveedor.';
  for (const campo of CAMPOS_PRECIO) {
    const texto = v[campo].trim();
    if (texto === '') continue;
    const n = Number(texto);
    if (!Number.isFinite(n) || n < 0) return `${ETIQUETA_CAMPO[campo]}: escribe un número igual o mayor a 0.`;
  }
  return '';
}
