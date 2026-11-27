import { ahoraBolivia, cargarPdf, encabezado, fechaLegible, piePaginas } from './traspasoPdf';

export interface RegistroAuditoria {
  id: number;
  fecha: string;
  hora: string;
  modulo: string;
  accion: string;
  documento: string | null;
  descripcion: string;
  codUsu: string;
  alias: string | null;
  nombreUsuario: string | null;
  antes: unknown;
  despues: unknown;
}

export const MODULO_TEXTO: Record<string, string> = {
  VENTA: 'Venta', CREDITO: 'Crédito', PAGO: 'Pago', DEVOLUCION: 'Devolución', TIPO_CAMBIO: 'Tipo de cambio',
  ROL: 'Rol', ALMACEN: 'Almacén', CLIENTE: 'Cliente', USUARIO: 'Usuario',
};

/** Listado de auditoría con los filtros aplicados (horizontal). */
export async function exportarAuditoria(registros: RegistroAuditoria[], filtrosTexto: string) {
  const { jsPDF, autoTable } = await cargarPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  encabezado(doc, 'Auditoría del sistema', `${registros.length} registro${registros.length === 1 ? '' : 's'}`);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text(`Filtros: ${filtrosTexto}`, 14, 34);

  autoTable(doc, {
    startY: 38,
    head: [['Fecha', 'Hora', 'Usuario', 'Módulo', 'Acción', 'Documento', 'Descripción']],
    body: registros.map((r) => [
      fechaLegible(r.fecha), r.hora, r.nombreUsuario || r.alias || r.codUsu,
      MODULO_TEXTO[r.modulo] ?? r.modulo, r.accion, r.documento ?? '', r.descripcion,
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.6, textColor: [17, 17, 17], overflow: 'linebreak' },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 14 }, 2: { cellWidth: 38 }, 3: { cellWidth: 22 }, 4: { cellWidth: 24 }, 5: { cellWidth: 28 } },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  piePaginas(doc, `SIAM · Auditoría · Generado el ${ahoraBolivia()} (hora de Bolivia)`);
  doc.save('auditoria_siam.pdf');
}
