import api from '../api/axios';

/**
 * Boleta de crédito en formato ticket para impresoras térmicas (las de
 * facturación rápida, como en las gasolineras): rollo de 80 mm o de 58 mm.
 *
 * Se imprime con el diálogo del navegador sobre una hoja del ancho del rollo,
 * así funciona con cualquier térmica instalada en Windows (Epson TM, Xprinter,
 * Bixolon…). En el diálogo hay que elegir la térmica y, la primera vez,
 * márgenes "Ninguno".
 */
export type AnchoTicket = 80 | 58;

export interface CupoCredito {
  limite: number;
  fuente: 'PERFIL' | 'LEGACY';
  deuda: number;
  disponible: number;
  habilitado: boolean;
}

export interface CreditoBoleta {
  codCre: string;
  codCli: number;
  nomCliente: string | null;
  apeCliente: string | null;
  razonSocial: string | null;
  numCiNit: string | null;
  fecInicio: string;
  fecFin: string;
  total: number;
  saldo: number;
  descuento: number | null;
  nomVendedor: string | null;
  codUsu: string;
  obs: string | null;
  items: {
    idFab: number;
    codFab: string;
    descPro: string;
    cantidadOriginal: number;
    precioCre: number;
  }[];
  cupo: CupoCredito | null;
}

const CLAVE_ANCHO = 'siam.boleta.ancho';

export function anchoGuardado(): AnchoTicket {
  try {
    return localStorage.getItem(CLAVE_ANCHO) === '58' ? 58 : 80;
  } catch {
    return 80;
  }
}

export function guardarAncho(ancho: AnchoTicket) {
  try {
    localStorage.setItem(CLAVE_ANCHO, String(ancho));
  } catch {
    /* sin almacenamiento: se usa 80 mm */
  }
}

const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const bs = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const fecha = (v: string, conHora = false) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

export function htmlBoleta(c: CreditoBoleta, ancho: AnchoTicket): string {
  // Área imprimible real: ~72 mm en rollos de 80 mm, ~48 mm en los de 58 mm
  const util = ancho === 80 ? 72 : 48;
  const fuente = ancho === 80 ? 11.5 : 9.5;
  const cliente = c.razonSocial || `${c.nomCliente ?? ''} ${c.apeCliente ?? ''}`.trim() || `Cliente ${c.codCli}`;
  const bruto = c.items.reduce((s, it) => s + Number(it.cantidadOriginal) * Number(it.precioCre), 0);
  const desc = Number(c.descuento ?? 0);

  const filas = c.items.map((it) => `
    <div class="item">
      <div class="desc">${esc(it.descPro)}</div>
      <div class="cod">${esc(it.codFab)}</div>
      <div class="fila"><span>${esc(it.cantidadOriginal)} x ${bs(it.precioCre)}</span><span>${bs(Number(it.cantidadOriginal) * Number(it.precioCre))}</span></div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Crédito ${esc(c.codCre)}</title>
<style>
  @page { size: ${ancho}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: ${util}mm; margin: 0 auto; padding: 3mm 0 6mm;
         font: ${fuente}px/1.35 "Courier New", ui-monospace, monospace; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .t { font-size: 1.25em; font-weight: 700; letter-spacing: .5px; }
  .sep { border-top: 1px dashed #000; margin: 2mm 0; }
  .fila { display: flex; justify-content: space-between; gap: 2mm; }
  .fila span:last-child { text-align: right; white-space: nowrap; }
  .kv span:last-child { white-space: normal; word-break: break-word; }
  .item { margin-bottom: 1.5mm; }
  .desc { font-weight: 700; word-break: break-word; }
  .cod { font-size: .85em; }
  .total { font-size: 1.2em; font-weight: 700; }
  .firma { margin-top: 12mm; border-top: 1px solid #000; text-align: center; padding-top: 1mm; }
  .pie { font-size: .8em; text-align: center; margin-top: 3mm; }
</style></head>
<body>
  <div class="c t">MAXIMPORT</div>
  <div class="c">SIAM · Área de créditos</div>
  <div class="sep"></div>
  <div class="c b">BOLETA DE CRÉDITO</div>
  <div class="c">N° ${esc(c.codCre)}</div>
  <div class="sep"></div>
  <div class="fila kv"><span>Fecha</span><span>${esc(fecha(c.fecInicio, true))}</span></div>
  <div class="fila kv"><span>Vence</span><span>${esc(fecha(c.fecFin))}</span></div>
  <div class="fila kv"><span>Vendedor</span><span>${esc(c.nomVendedor || c.codUsu)}</span></div>
  <div class="sep"></div>
  <div class="b">${esc(cliente)}</div>
  ${c.numCiNit ? `<div>CI/NIT: ${esc(c.numCiNit)}</div>` : ''}
  <div class="sep"></div>
  ${filas}
  <div class="sep"></div>
  <div class="fila"><span>Subtotal</span><span>${bs(bruto)}</span></div>
  ${desc > 0 ? `<div class="fila"><span>Descuento ${Number.isInteger(desc) ? desc : bs(desc)}%</span><span>-${bs(bruto - Number(c.total))}</span></div>` : ''}
  <div class="fila total"><span>TOTAL Bs</span><span>${bs(c.total)}</span></div>
  <div class="fila"><span>Saldo pendiente</span><span>${bs(c.saldo)}</span></div>
  ${c.cupo ? `
  <div class="sep"></div>
  <div class="fila"><span>Límite de crédito</span><span>${bs(c.cupo.limite)}</span></div>
  <div class="fila"><span>Deuda total</span><span>${bs(c.cupo.deuda)}</span></div>
  <div class="fila"><span>Disponible</span><span>${bs(c.cupo.disponible)}</span></div>` : ''}
  ${c.obs ? `<div class="sep"></div><div>Obs: ${esc(c.obs)}</div>` : ''}
  <div class="firma">Firma del cliente</div>
  <div class="pie">Documento interno de crédito · sin valor fiscal</div>
</body></html>`;
}

/** Imprime el ticket en un iframe oculto (sin ventanas emergentes). */
export function imprimirHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const quitar = () => setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = quitar;
  // Esperar a que el documento esté listo antes de abrir el diálogo
  setTimeout(() => {
    win.focus();
    win.print();
    quitar();
  }, 250);
}

/** Trae el crédito completo y abre el diálogo de impresión del ticket. */
export async function imprimirBoletaCredito(codCre: string, ancho: AnchoTicket = anchoGuardado()) {
  const { data } = await api.get<CreditoBoleta>(`/creditos/${codCre}`);
  imprimirHtml(htmlBoleta(data, ancho));
}
