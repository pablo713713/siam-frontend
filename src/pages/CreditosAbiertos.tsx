import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { AlertaCredito } from '../types';
import css from './Creditos.module.css';

interface CreditoAbierto {
  codCre: string;
  codCli: number;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
  fecApertura: string;
  fecPlazo: string;
  diasEnCredito: number;
  totalCredito: number;
  devolucion: number;
  saldoXCobrar: number;
  estado: string;
  usuario: string;
  observacion: string | null;
  diasRestantes: number;
  alerta: AlertaCredito;
}

const money = (value: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);

const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const clientName = (c: Pick<CreditoAbierto, 'nomCliente' | 'apeCliente' | 'razonSocial'>) => {
  if (c.razonSocial && c.razonSocial.trim().toUpperCase() !== 'NINGUNO') {
    return c.razonSocial;
  }
  return [c.nomCliente, c.apeCliente].filter(Boolean).join(' ') || 'Cliente sin nombre';
};

const filaColor: Record<AlertaCredito, string> = {
  ok: '#eafaf0',
  proximo: '#fff9e6',
  vencido: '#fdecec',
};

export function CreditosAbiertos() {
  const navigate = useNavigate();
  const [creditos, setCreditos] = useState<CreditoAbierto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get<CreditoAbierto[]>('/creditos/abiertos');
      setCreditos(data);
    } catch {
      setError('No se pudieron cargar los créditos abiertos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const irAPerfilCliente = (codCli: number) => {
    navigate(`/creditos?cliente=${codCli}`);
  };

  return (
    <section className={css.page}>
      <header className={css.pageHeader}>
        <div>
          <h1 className={css.title}>Créditos abiertos</h1>
          <p className={css.subtitle}>Todos los créditos aún no pagados, ordenados por vencimiento más próximo.</p>
        </div>
        <button className={css.refresh} onClick={() => void cargar()} disabled={cargando}>
          <i className="ti ti-refresh" aria-hidden="true" /> Actualizar
        </button>
      </header>

      {error && <div className={`${css.message} ${css.error}`} role="alert">{error}</div>}

      <div className={css.panel}>
        {cargando ? (
          <div className={css.empty}>Cargando créditos...</div>
        ) : creditos.length === 0 ? (
          <div className={css.empty}>No hay créditos abiertos.</div>
        ) : (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Fecha apertura</th>
                  <th>Fecha plazo</th>
                  <th>Días en crédito</th>
                  <th>Total crédito</th>
                  <th>Devolución</th>
                  <th>Saldo x cobrar</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {creditos.map((c) => (
                  <tr
                    key={c.codCre}
                    onDoubleClick={() => irAPerfilCliente(c.codCli)}
                    style={{ background: filaColor[c.alerta], cursor: 'pointer' }}
                    title="Doble clic para ver el perfil del cliente"
                  >
                    <td>{c.codCre}</td>
                    <td>{clientName(c)}</td>
                    <td>{date(c.fecApertura)}</td>
                    <td>{date(c.fecPlazo)}</td>
                    <td>{c.diasEnCredito}</td>
                    <td>{money(c.totalCredito)}</td>
                    <td>{c.devolucion > 0 ? money(c.devolucion) : '—'}</td>
                    <td>{money(c.saldoXCobrar)}</td>
                    <td>{c.estado}</td>
                    <td>{c.usuario}</td>
                    <td>{c.observacion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}