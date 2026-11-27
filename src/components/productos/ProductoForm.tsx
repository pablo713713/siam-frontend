import { useMemo, useState } from 'react';
import { BRAND, S } from '../ui/tokens';
import type { CatalogosProducto } from '../../types';
import { CAMPOS_PRECIO, ETIQUETA_CAMPO, type ProductoFormValues } from './productoFormUtils';

interface Props {
  valores: ProductoFormValues;
  onChange: (valores: ProductoFormValues) => void;
  catalogos: CatalogosProducto;
  disabled?: boolean;
  /** En edición los códigos no se pueden cambiar */
  codigosSoloLectura?: boolean;
  /** Mientras el usuario no lo toque, el código de producto copia al de fábrica */
  onCodProEditado?: () => void;
}

const rejilla = (min: number): React.CSSProperties => ({
  display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 12,
});
const titulo: React.CSSProperties = { ...S.sectionLabel, marginTop: 4 };
const soloLectura: React.CSSProperties = { ...S.input, background: BRAND.gray50, color: BRAND.gray600 };

export function ProductoForm({ valores, onChange, catalogos, disabled, codigosSoloLectura, onCodProEditado }: Props) {
  const [filtroModelo, setFiltroModelo] = useState('');
  const set = (campo: keyof ProductoFormValues, valor: string) => onChange({ ...valores, [campo]: valor });

  // Los modelos pueden ser miles: se muestran los que coinciden con el filtro
  // (máx. 200), y siempre el que ya está seleccionado
  const modelosVisibles = useMemo(() => {
    const texto = filtroModelo.trim().toLowerCase();
    const coinciden = texto
      ? catalogos.modelos.filter((m) => `${m.nomModelo} ${m.nomMarca ?? ''}`.toLowerCase().includes(texto))
      : catalogos.modelos;
    const lista = coinciden.slice(0, 200);
    const actual = catalogos.modelos.find((m) => String(m.codMod) === valores.codMod);
    if (actual && !lista.includes(actual)) lista.unshift(actual);
    return { lista, total: coinciden.length };
  }, [catalogos.modelos, filtroModelo, valores.codMod]);

  const precio = (campo: (typeof CAMPOS_PRECIO)[number]) => (
    <div key={campo}>
      <label htmlFor={`pf-${campo}`} style={S.label}>{ETIQUETA_CAMPO[campo]}</label>
      <input
        id={`pf-${campo}`} style={S.input} inputMode="decimal" placeholder="0.00"
        value={valores[campo]} disabled={disabled}
        onChange={(e) => set(campo, e.target.value.replace(',', '.'))}
      />
    </div>
  );

  return (
    <div>
      <div style={titulo}>Identificación</div>
      <div style={S.formGroup}>
        <label htmlFor="pf-descPro" style={S.label}>{ETIQUETA_CAMPO.descPro} *</label>
        <input
          id="pf-descPro" style={S.input} maxLength={150} autoFocus
          value={valores.descPro} disabled={disabled}
          onChange={(e) => set('descPro', e.target.value)}
        />
      </div>
      <div style={{ ...rejilla(170), marginBottom: 16 }}>
        <div>
          <label htmlFor="pf-codFab" style={S.label}>{ETIQUETA_CAMPO.codFab}{codigosSoloLectura ? '' : ' *'}</label>
          <input
            id="pf-codFab" style={codigosSoloLectura ? soloLectura : S.input} maxLength={50}
            value={valores.codFab} disabled={disabled} readOnly={codigosSoloLectura}
            onChange={(e) => set('codFab', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="pf-codPro" style={S.label}>{ETIQUETA_CAMPO.codPro}{codigosSoloLectura ? '' : ' *'}</label>
          <input
            id="pf-codPro" style={codigosSoloLectura ? soloLectura : S.input} maxLength={50}
            value={valores.codPro} disabled={disabled} readOnly={codigosSoloLectura}
            onChange={(e) => { onCodProEditado?.(); set('codPro', e.target.value); }}
          />
        </div>
        <div>
          <label htmlFor="pf-barra" style={S.label}>{ETIQUETA_CAMPO.barra}</label>
          <input
            id="pf-barra" style={S.input} maxLength={200}
            value={valores.barra} disabled={disabled}
            onChange={(e) => set('barra', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="pf-codAnt" style={S.label}>{ETIQUETA_CAMPO.codAnt}</label>
          <input
            id="pf-codAnt" style={S.input} maxLength={50}
            value={valores.codAnt} disabled={disabled}
            onChange={(e) => set('codAnt', e.target.value)}
          />
        </div>
      </div>
      {codigosSoloLectura && (
        <p style={{ fontSize: 11, color: BRAND.gray600, margin: '-8px 0 14px' }}>
          Los códigos de fábrica y de producto no se editan: los usan las ventas, remisiones y el kardex ya registrados.
        </p>
      )}

      <div style={titulo}>Clasificación</div>
      <div style={{ ...rejilla(200), marginBottom: 16 }}>
        <div>
          <label htmlFor="pf-codProv" style={S.label}>{ETIQUETA_CAMPO.codProv} *</label>
          <select
            id="pf-codProv" style={S.select}
            value={valores.codProv} disabled={disabled}
            onChange={(e) => set('codProv', e.target.value)}
          >
            <option value="">— Seleccione —</option>
            {catalogos.proveedores.map((p) => (
              <option key={p.codProv} value={p.codProv}>{p.nomProv}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-codigoTipo" style={S.label}>{ETIQUETA_CAMPO.codigoTipo}</label>
          <select
            id="pf-codigoTipo" style={S.select}
            value={valores.codigoTipo} disabled={disabled}
            onChange={(e) => set('codigoTipo', e.target.value)}
          >
            {catalogos.tipos.map((t) => (
              <option key={t.codigo} value={t.codigo}>{t.descripcion || t.codigo}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pf-unidad" style={S.label}>{ETIQUETA_CAMPO.unidad}</label>
          <input
            id="pf-unidad" style={S.input} maxLength={3}
            value={valores.unidad} disabled={disabled}
            onChange={(e) => set('unidad', e.target.value.toUpperCase())}
          />
        </div>
      </div>
      <div style={{ ...rejilla(200), marginBottom: 16 }}>
        <div>
          <label htmlFor="pf-filtroModelo" style={S.label}>Buscar modelo</label>
          <input
            id="pf-filtroModelo" style={S.input} placeholder="Filtrar por modelo o marca del vehículo"
            value={filtroModelo} disabled={disabled}
            onChange={(e) => setFiltroModelo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="pf-codMod" style={S.label}>{ETIQUETA_CAMPO.codMod}</label>
          <select
            id="pf-codMod" style={S.select}
            value={valores.codMod} disabled={disabled}
            onChange={(e) => set('codMod', e.target.value)}
          >
            {/* Sin elegir, la API asigna el modelo genérico */}
            <option value="">— Sin modelo específico —</option>
            {modelosVisibles.lista.map((m) => (
              <option key={m.codMod} value={m.codMod}>
                {m.nomModelo}{m.nomMarca ? ` — ${m.nomMarca}` : ''}
              </option>
            ))}
          </select>
          {modelosVisibles.total > modelosVisibles.lista.length && (
            <p style={{ fontSize: 11, color: BRAND.gray600, margin: '4px 0 0' }}>
              Mostrando 200 de {modelosVisibles.total}. Usa el filtro para encontrar el modelo.
            </p>
          )}
        </div>
      </div>

      <div style={titulo}>Precios</div>
      <div style={{ ...rejilla(140), marginBottom: 12 }}>
        {(['plisPro', 'pminPro', 'pmayPro'] as const).map(precio)}
      </div>
      <div style={{ ...rejilla(140), marginBottom: 12 }}>
        {(['plisBs', 'pminBs', 'pmayBs'] as const).map(precio)}
      </div>
      <div style={{ ...rejilla(140), marginBottom: 16 }}>
        {precio('cifCbba')}
        <div style={{ gridColumn: 'span 2' }}>
          <label htmlFor="pf-comentario" style={S.label}>{ETIQUETA_CAMPO.comentario}</label>
          <input
            id="pf-comentario" style={S.input} maxLength={256}
            value={valores.comentario} disabled={disabled}
            onChange={(e) => set('comentario', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
