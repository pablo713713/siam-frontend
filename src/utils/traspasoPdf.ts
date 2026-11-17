import type { jsPDF } from 'jspdf';
import type { EstadoTraspaso, TipoTraspaso, TraspasoHistorial } from '../types';

// Textos compartidos con la pantalla de historial
export const TIPO_TRASPASO_TEXTO: Record<TipoTraspaso, string> = {
  SALIDA_VENTA: 'Salida a venta',
  INGRESO_TIENDA: 'Ingreso a tienda',
  ENTRE_ALMACENES: 'Entre almacenes',
};

export const ESTADO_TRASPASO_TEXTO: Record<EstadoTraspaso, string> = {
  PENDIENTE: 'Pendiente de venta',
  COMPLETADO: 'Completado',
  VENDIDO: 'Vendido',
  DEVUELTO: 'Devuelto',
};

/** 2026-11-16 → 16/11/2026 */
export const fechaLegible = (iso: string) => {
  const [a, m, d] = iso.split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

const ROJO: [number, number, number] = [215, 38, 38];
const NEGRO: [number, number, number] = [17, 17, 17];
const GRIS: [number, number, number] = [102, 102, 102];
const GRIS_CLARO: [number, number, number] = [229, 229, 229];

const ahoraBolivia = () =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());

// jsPDF y autotable pesan: se cargan solo cuando el usuario exporta
async function cargarPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

function encabezado(doc: jsPDF, titulo: string, subtitulo: string) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ROJO);
  doc.rect(0, 0, ancho, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NEGRO);
  doc.text('SIAM', 14, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text('MAXIMPORT', 14, 23.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NEGRO);
  doc.text(titulo, ancho - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(subtitulo, ancho - 14, 23.5, { align: 'right' });

  doc.setDrawColor(...GRIS_CLARO);
  doc.line(14, 28, ancho - 14, 28);
}

function piePaginas(doc: jsPDF, texto: string) {
  const total = doc.getNumberOfPages();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(texto, 14, alto - 8);
    doc.text(`Página ${i} de ${total}`, ancho - 14, alto - 8, { align: 'right' });
  }
}

/** Comprobante de un traspaso: el equivalente digital a la hoja del talonario. */
export async function exportarComprobanteTraspaso(t: TraspasoHistorial) {
  const { jsPDF, autoTable } = await cargarPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = doc.internal.pageSize.getWidth();

  encabezado(doc, 'Comprobante de traspaso', `N° ${t.codRemSalida}`);

  // Datos del traspaso en dos columnas
  const campos: [string, string][] = [
    ['Fecha', fechaLegible(t.fecha)],
    ['Hora (Bolivia)', t.hora],
    ['Almacén de salida', `${t.nomSucOri} (${t.codSucOri})`],
    ['Almacén de destino', `${t.nomSucDes} (${t.codSucDes})`],
    ['Tipo', TIPO_TRASPASO_TEXTO[t.tipo] ?? t.tipo],
    ['Estado', ESTADO_TRASPASO_TEXTO[t.estado] ?? t.estado],
  ];
  let y = 37;
  campos.forEach(([etiqueta, valor], i) => {
    const x = i % 2 === 0 ? 14 : ancho / 2 + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NEGRO);
    doc.text(valor, x, y + 5);
    if (i % 2 === 1) y += 13;
  });

  autoTable(doc, {
    startY: y + 2,
    head: [['#', 'Código de fábrica', 'Producto', 'Observación', 'Cantidad']],
    body: t.items.map((it, i) => [
      String(i + 1),
      it.codFab,
      it.descPro ?? '—',
      it.obs ?? '',
      String(it.cantidad),
    ]),
    foot: [[
      '', '', '',
      { content: 'Total de unidades', styles: { halign: 'right' } },
      { content: String(t.totalUnidades), styles: { halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: NEGRO, lineColor: GRIS_CLARO },
    headStyles: { fillColor: NEGRO, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [246, 246, 246], textColor: NEGRO, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 38 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  // Bloque de firmas (salta de página si no entra)
  const finTabla = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const alto = doc.internal.pageSize.getHeight();
  let yFirma = finTabla + 10;
  const altoBloque = (t.obs ? 14 : 0) + 34;
  if (yFirma + altoBloque > alto - 16) {
    doc.addPage();
    yFirma = 20;
  }

  if (t.obs) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text('OBSERVACIÓN', 14, yFirma);
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(doc.splitTextToSize(t.obs, ancho - 28).slice(0, 2), 14, yFirma + 5);
    yFirma += 14;
  }

  const anchoCaja = (ancho - 28 - 6) / 2;
  const cajas: [string, string, string][] = [
    ['Registrado y autorizado por', t.nombreEncargado, `Usuario ${t.codUsuEncargado}`],
    ['Firmado digitalmente por', t.nombreFirmante, `Usuario ${t.codUsuFirmante}`],
  ];
  cajas.forEach(([etiqueta, nombre, usuario], i) => {
    const x = 14 + i * (anchoCaja + 6);
    doc.setDrawColor(...GRIS_CLARO);
    doc.roundedRect(x, yFirma, anchoCaja, 24, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(etiqueta.toUpperCase(), x + 4, yFirma + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text(nombre || '—', x + 4, yFirma + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS);
    doc.text(usuario, x + 4, yFirma + 19);
  });

  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(
    `Firma verificada con usuario y contraseña el ${fechaLegible(t.fecha)} a las ${t.hora} (hora de Bolivia, registrada por el servidor).`,
    14,
    yFirma + 30,
  );

  piePaginas(doc, `SIAM · Comprobante N° ${t.codRemSalida} · Generado el ${ahoraBolivia()}`);
  doc.save(`traspaso_${t.codRemSalida}.pdf`);
}

/** Listado de traspasos con los filtros aplicados. */
export async function exportarListadoTraspasos(traspasos: TraspasoHistorial[], filtrosTexto: string) {
  const { jsPDF, autoTable } = await cargarPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  encabezado(doc, 'Historial de traspasos', `${traspasos.length} traspaso${traspasos.length === 1 ? '' : 's'}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(`Filtros: ${filtrosTexto}`, 14, 34);

  autoTable(doc, {
    startY: 38,
    head: [['Fecha', 'Hora', 'N° remisión', 'Salida', 'Destino', 'Tipo', 'Registró', 'Firmó', 'Unid.', 'Estado']],
    body: traspasos.map((t) => [
      fechaLegible(t.fecha),
      t.hora,
      t.codRemSalida,
      t.nomSucOri,
      t.nomSucDes,
      TIPO_TRASPASO_TEXTO[t.tipo] ?? t.tipo,
      t.nombreEncargado,
      t.nombreFirmante,
      String(t.totalUnidades),
      ESTADO_TRASPASO_TEXTO[t.estado] ?? t.estado,
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: NEGRO },
    headStyles: { fillColor: NEGRO, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 8: { halign: 'right' } },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  piePaginas(doc, `SIAM · Historial de traspasos · Generado el ${ahoraBolivia()}`);
  doc.save('historial_traspasos.pdf');
}
