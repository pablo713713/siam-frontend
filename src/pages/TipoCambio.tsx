import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle } from '../components/ui/tokens';
import css from './TipoCambio.module.css';

interface TipoCambio {
  fecha: string;
  tipoCambio: number;
  codEmp: string;
}

export function TipoCambio() {
  const { usuario } = useAuth();
  const [vigente, setVigente]             = useState<TipoCambio | null>(null);
  const [nuevoValor, setNuevoValor]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [loadingVigente, setLoadingVigente] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5000);
  };

  const cargarVigente = async () => {
    setLoadingVigente(true);
    try {
      const { data } = await api.get('/ventas/dolar-paralelo/vigente', {
        params: { cod_emp: usuario?.cod_emp ?? '001' },
      });
      setVigente(data);
      setNuevoValor(String(data.tipoCambio));
    } catch {
      setVigente(null);
    } finally {
      setLoadingVigente(false);
    }
  };

  useEffect(() => { cargarVigente(); }, []);

  const guardar = async () => {
    const valor = parseFloat(nuevoValor);
    if (isNaN(valor) || valor <= 0) {
      flash('Ingresa un valor valido mayor a 0.', 'err');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/ventas/dolar-paralelo', {
        tipo_cambio: valor,
        cod_usu: usuario?.cod_usu,
        cod_emp: usuario?.cod_emp ?? '001',
      });
      flash(data.message);
      cargarVigente();
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      flash(m ?? 'Error al guardar el tipo de cambio.', 'err');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={css.page}>
      {}
      <div className={css.header}>
        <h1 className={css.title}>Tipo de Cambio</h1>
        <p className={css.subtitle}>Dolar paralelo — Maximport</p>
      </div>

      {}
      <div className={css.vigente}>
        <div className={css.vigsLabel}>Valor vigente</div>
        {loadingVigente ? (
          <div style={{ fontSize: 13, color: BRAND.gray600 }}>Cargando...</div>
        ) : vigente ? (
          <>
            <div className={css.vigsValue}>
              Bs {vigente.tipoCambio.toFixed(2)}
              <span className={css.vigsUnit}>/ USD</span>
            </div>
            <div className={css.vigsMeta}>
              Ultima actualizacion: {formatFecha(vigente.fecha)}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: BRAND.gray600 }}>
            No hay tipo de cambio registrado.
          </div>
        )}
      </div>

      {}
      <div className={css.formCard}>
        <div style={S.cardTitle}>Actualizar valor</div>

        {msg && (
          <div className={`${css.banner} ${msg.type === 'ok' ? css.bannerOk : css.bannerErr}`} role="alert">
            <i className={`ti ${msg.type === 'ok' ? 'ti-check' : 'ti-alert-circle'}`} aria-hidden="true" />
            {msg.text}
          </div>
        )}

        <div style={S.formGroup}>
          <label className={css.formLabel} htmlFor="nuevo-tc">Nuevo valor (Bs por 1 USD)</label>
          <div className={css.inputRow}>
            <span className={css.prefix}>Bs</span>
            <input
              id="nuevo-tc"
              style={{ ...S.input, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
              type="number" step="0.01" min="0"
              value={nuevoValor}
              onChange={(e) => setNuevoValor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              placeholder="0.00"
            />
            <button style={btnStyle('primary')} onClick={guardar} disabled={loading}>
              <i className="ti ti-device-floppy" aria-hidden="true" />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: BRAND.gray600, marginTop: 6 }}>
            Si ya existe un valor para hoy, se actualizara automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}
