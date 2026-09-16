import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import type { AlertaCredito, ClienteCredito, CreditoActivo, CreditoClienteResponse, PagoMultipleResponse } from '../types';
import css from './Creditos.module.css';

const money = (value: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);
const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }); };
const clientName = (client: Pick<ClienteCredito, 'nomCliente' | 'apeCliente' | 'razonSocial'>) => client.razonSocial || [client.nomCliente, client.apeCliente].filter(Boolean).join(' ') || 'Cliente sin nombre';
const alertaLabel: Record<AlertaCredito, string> = { ok: 'En plazo', proximo: 'Próximo a vencer', vencido: 'Vencido' };

export function Creditos() {
  const [activos, setActivos] = useState<CreditoActivo[]>([]);
  const [clientes, setClientes] = useState<ClienteCredito[]>([]);
  const [detalle, setDetalle] = useState<CreditoClienteResponse | null>(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCredito | null>(null);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    setCargando(true); setError('');
    try { const [creditosResponse, clientesResponse] = await Promise.all([api.get<CreditoActivo[]>('/creditos/activos'), api.get<ClienteCredito[]>('/creditos/clientes-habilitados')]); setActivos(creditosResponse.data); setClientes(clientesResponse.data); }
    catch { setError('No se pudieron cargar los créditos. Verifica la conexión con el servidor.'); }
    finally { setCargando(false); }
  };
  useEffect(() => { void cargar(); }, []);

  const seleccionarCliente = async (cliente: ClienteCredito) => {
    setClienteSeleccionado(cliente); setDetalle(null); setSeleccionados([]); setError('');
    try { const response = await api.get<CreditoClienteResponse>(`/creditos/cliente/${cliente.codCli}`); setDetalle(response.data); }
    catch { setError('No se pudo cargar el detalle de créditos del cliente.'); }
  };
  const clientesFiltrados = useMemo(() => { const term = busqueda.trim().toLowerCase(); return clientes.filter((cliente) => !term || `${clientName(cliente)} ${cliente.codCli}`.toLowerCase().includes(term)); }, [busqueda, clientes]);
  const creditosSeleccionados = detalle?.creditos.filter((credito) => seleccionados.includes(credito.codCre)) ?? [];
  const totalSeleccionado = creditosSeleccionados.reduce((sum, credito) => sum + credito.saldo, 0);
  const alternarCredito = (codCre: string) => setSeleccionados((actuales) => actuales.includes(codCre) ? actuales.filter((codigo) => codigo !== codCre) : [...actuales, codCre]);
  const pagarSeleccionados = async () => {
    if (!clienteSeleccionado || seleccionados.length === 0) return;
    if (!window.confirm(`¿Confirmar el pago de ${money(totalSeleccionado)} en ${seleccionados.length} crédito(s)?`)) return;
    setError(''); setMensaje('');
    try { const response = await api.post<PagoMultipleResponse>(`/creditos/cliente/${clienteSeleccionado.codCli}/pago-multiple`, { cod_cre: seleccionados }); setMensaje(response.data.message || `Pago registrado por ${money(response.data.totalAbonado)}.`); await cargar(); await seleccionarCliente(clienteSeleccionado); }
    catch { setError('No se pudo registrar el pago. Los créditos pueden haber cambiado, intenta actualizar.'); }
  };

  const saldoActivo = activos.reduce((sum, credito) => sum + credito.saldo, 0);
  return <section className={css.page}>
    <header className={css.pageHeader}><div><h1 className={css.title}>Créditos</h1><p className={css.subtitle}>Consulta saldos pendientes y registra pagos completos.</p></div><button className={css.refresh} onClick={() => void cargar()} disabled={cargando}><i className="ti ti-refresh" aria-hidden="true" /> Actualizar</button></header>
    {error && <div className={`${css.message} ${css.error}`} role="alert">{error}</div>}{mensaje && <div className={`${css.message} ${css.success}`} role="status">{mensaje}</div>}
    <div className={css.summary}><div className={css.metric}><span className={css.metricLabel}>Créditos activos</span><strong className={css.metricValue}>{activos.length}</strong></div><div className={css.metric}><span className={css.metricLabel}>Saldo pendiente</span><strong className={css.metricValue}>{money(saldoActivo)}</strong></div><div className={css.metric}><span className={css.metricLabel}>Clientes habilitados</span><strong className={css.metricValue}>{clientes.length}</strong></div></div>
    <div className={css.content}>
      <section className={css.panel}><div className={css.panelHeader}><h2 className={css.panelTitle}>Clientes habilitados</h2><p className={css.panelHint}>Selecciona un cliente para ver sus créditos.</p><input className={css.search} value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o código" aria-label="Buscar cliente" /></div><div className={css.clientList}>{clientesFiltrados.map((cliente) => <button key={cliente.codCli} className={`${css.client} ${clienteSeleccionado?.codCli === cliente.codCli ? css.selected : ''}`} onClick={() => void seleccionarCliente(cliente)}><span><span className={css.clientName}>{cliente.alerta && <i className={`${css.alerta} ${css[cliente.alerta]}`} title={alertaLabel[cliente.alerta]} />} {clientName(cliente)}</span><span className={css.clientMeta}>Código {cliente.codCli}</span></span><span className={css.clientAmount}>{money(cliente.usado)}<span className={css.clientAvailable}>Disponible {money(cliente.disponible)}</span></span></button>)}{!cargando && clientesFiltrados.length === 0 && <div className={css.empty}>No hay clientes que coincidan.</div>}</div></section>
      <section className={css.panel}>{!clienteSeleccionado ? <div className={css.empty}>Selecciona un cliente para consultar sus créditos activos.</div> : <div className={css.detail}><div className={css.detailHeader}><div><h2 className={css.detailName}>{clientName(clienteSeleccionado)}</h2><p className={css.detailMeta}>Cupo {money(clienteSeleccionado.creditoMaximo)} · Usado {money(clienteSeleccionado.usado)}</p></div><div className={css.total}><span className={css.totalLabel}>Total seleccionado</span><strong className={css.totalValue}>{money(totalSeleccionado)}</strong></div></div>{detalle?.creditos.length ? <><div className={css.tableWrap}><table className={css.table}><thead><tr><th aria-label="Seleccionar" /><th>Crédito</th><th>Vencimiento</th><th>Estado</th><th>Saldo</th></tr></thead><tbody>{detalle.creditos.map((credito) => <tr key={credito.codCre}><td><input className={css.check} type="checkbox" checked={seleccionados.includes(credito.codCre)} onChange={() => alternarCredito(credito.codCre)} aria-label={`Seleccionar crédito ${credito.codCre}`} /></td><td>{credito.codCre}</td><td>{date(credito.fecFin)}</td><td><span className={css.status}><i className={`${css.alerta} ${css[credito.alerta]}`} />{alertaLabel[credito.alerta]}</span></td><td>{money(credito.saldo)}</td></tr>)}</tbody></table></div><div className={css.payBar}><span className={css.panelHint}>{seleccionados.length} seleccionado(s)</span><button className={css.payButton} onClick={() => void pagarSeleccionados()} disabled={!seleccionados.length}>Registrar pago</button></div></> : <div className={css.empty}>{detalle ? 'Este cliente no tiene créditos activos.' : 'Cargando créditos...'}</div>}</div>}</section>
    </div>
  </section>;
}