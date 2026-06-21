import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { BRAND, S, btnStyle } from '../components/ui/tokens';

interface TipoCambio {
  fecha: string;
  tipoCambio: number;
  codEmp: string;
}

export function TipoCambio() {
  const { usuario } = useAuth();

  const [vigente, setVigente]     = useState<TipoCambio | null>(null);
  const [nuevoValor, setNuevoValor] = useState('');
  const [loading, setLoading]     = useState(false);
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
      flash('Ingresá un valor válido mayor a 0.', 'err');
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

  const formatFecha = (f: string) => new Date(f).toLocaleDateString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{ maxWidth: 480 }}>
      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Tipo de cambio paralelo vigente</div>
        {loadingVigente ? (
          <div style={{ fontSize: 13, color: BRAND.gray600 }}>Cargando…</div>
        ) : vigente ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px', borderRadius: 10,
              background: '#e6f9ee', border: '1px solid #b2dfc6',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1a7a40', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Valor actual
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#1a7a40', lineHeight: 1.2 }}>
                  Bs {vigente.tipoCambio.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#1a7a40', marginTop: 2 }}>
                  por 1 USD
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: BRAND.gray600 }}>Última actualización</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.black }}>
                  {formatFecha(vigente.fecha)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: BRAND.gray600 }}>
            No hay tipo de cambio registrado aún.
          </div>
        )}
      </div>

      {}
      <div style={S.card}>
        <div style={S.cardTitle}>Actualizar valor del dólar paralelo</div>
        <div style={S.formGroup}>
          <label style={S.label}>Nuevo valor (Bs por 1 USD)</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.gray600 }}>Bs</span>
            <input
              style={{ ...S.input, width: 160, fontSize: 18, fontWeight: 700, textAlign: 'center' }}
              type="number"
              step="0.01"
              min="0"
              value={nuevoValor}
              onChange={(e) => setNuevoValor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              placeholder="0.00"
            />
            <button style={btnStyle('primary')} onClick={guardar} disabled={loading}>
              <i className="ti ti-device-floppy" aria-hidden="true" />
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: BRAND.gray600, marginTop: 6 }}>
            Si ya existe un valor para hoy, se actualizará automáticamente.
          </div>
        </div>

        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginTop: 8,
            background: msg.type === 'ok' ? '#e6f9ee' : '#ffeaea',
            color: msg.type === 'ok' ? '#1a7a40' : BRAND.red,
            fontSize: 13, fontWeight: 600,
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}