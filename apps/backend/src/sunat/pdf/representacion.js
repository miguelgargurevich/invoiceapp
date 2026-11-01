const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const { fechaLima } = require('../fechas');
const { dos, aDecimal } = require('../numeros');
const { codigoDocIdentidad } = require('../catalogos');

const NOMBRES_COMPROBANTE = Object.freeze({
  '01': 'FACTURA ELECTRÓNICA',
  '03': 'BOLETA DE VENTA ELECTRÓNICA',
  '07': 'NOTA DE CRÉDITO ELECTRÓNICA',
  '08': 'NOTA DE DÉBITO ELECTRÓNICA',
});

// Las fuentes estándar de pdf-lib solo codifican WinAnsi (Latin-1).
const limpiar = (texto) => String(texto ?? '').replace(/[^\x20-\x7E -ÿ]/g, '-');

function textoQr(f) {
  return `${[
    f.empresa.ruc, f.tipoComprobante, f.serie, f.numero, dos(f.igv), dos(f.total), fechaLima(f.fechaEmision),
    codigoDocIdentidad(f.cliente.tipoDocumento), f.cliente.numeroDocumento || '-', f.hashSunat || '',
  ].join('|')}|`;
}

async function generarPdf(f) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const IZQ = 40;
  let pagina = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - 40;

  const texto = (t, x, opciones = {}) => pagina.drawText(limpiar(t), {
    x, y, size: opciones.size ?? 9, font: opciones.bold ? negrita : normal, color: rgb(0, 0, 0),
  });
  const bajar = (n = 12) => {
    y -= n;
    if (y < 180) { pagina = pdf.addPage([ANCHO, ALTO]); y = ALTO - 40; }
  };

  // Cabecera: emisor a la izquierda, recuadro del comprobante a la derecha.
  pagina.drawRectangle({ x: 380, y: ALTO - 112, width: 175, height: 80, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  const yCabecera = y;
  y = ALTO - 50; texto(`RUC ${f.empresa.ruc}`, 392, { bold: true, size: 10 });
  y = ALTO - 68; texto(NOMBRES_COMPROBANTE[f.tipoComprobante], 392, { bold: true });
  y = ALTO - 88; texto(`${f.serie}-${String(f.numero).padStart(8, '0')}`, 392, { bold: true, size: 12 });
  y = yCabecera;
  texto(f.empresa.razonSocial || f.empresa.nombre, IZQ, { bold: true, size: 12 }); bajar(16);
  texto(`RUC ${f.empresa.ruc}`, IZQ); bajar();
  texto(f.empresa.emisorSunat?.direccionFiscal, IZQ); bajar(40);

  texto(`Cliente: ${f.cliente.razonSocial}`, IZQ); bajar();
  texto(`Documento: ${f.cliente.numeroDocumento || '-'}`, IZQ); bajar();
  texto(`Fecha de emisión: ${fechaLima(f.fechaEmision)}   Moneda: ${f.moneda}   Forma de pago: ${f.formaPago}`, IZQ); bajar();
  if (f.docRelacionadoSerie) {
    texto(`Modifica: ${f.docRelacionadoSerie}-${f.docRelacionadoNumero}   Motivo: ${f.motivoDescripcion}`, IZQ); bajar();
  }
  bajar(10);

  texto('Cant.', IZQ, { bold: true }); texto('Unidad', 85, { bold: true }); texto('Descripción', 130, { bold: true });
  texto('V. unitario', 400, { bold: true }); texto('Valor venta', 480, { bold: true }); bajar(14);
  for (const d of [...f.detalles].sort((a, b) => a.orden - b.orden)) {
    texto(aDecimal(d.cantidad).toString(), IZQ);
    texto(d.codigoUnidadSunat, 85);
    texto(String(d.descripcion).slice(0, 55), 130);
    texto(aDecimal(d.valorUnitario).toFixed(2), 400);
    texto(dos(d.subtotal), 480);
    bajar();
  }
  bajar(10);

  const filas = [
    ['Op. gravadas', f.totalGravadas], ['Op. exoneradas', f.totalExoneradas], ['Op. inafectas', f.totalInafectas],
    ['Exportación', f.totalExportacion], ['IGV', f.igv], ['ICBPER', f.totalIcbper], ['IMPORTE TOTAL', f.total],
  ];
  if (f.percepcionMonto) filas.push(['Percepción', f.percepcionMonto]);
  if (f.retencionMonto) filas.push(['Retención', f.retencionMonto]);
  if (f.detraccionMonto) filas.push(['Detracción (S/)', f.detraccionMonto]);
  for (const [etiqueta, valor] of filas) {
    texto(etiqueta, 380, { bold: etiqueta === 'IMPORTE TOTAL' });
    texto(`${f.moneda} ${dos(valor)}`, 480, { bold: etiqueta === 'IMPORTE TOTAL' });
    bajar();
  }
  bajar(6);
  texto(f.montoEnLetras, IZQ, { bold: true }); bajar();
  if (f.detraccionCodigo) { texto('Operación sujeta al Sistema de Pago de Obligaciones Tributarias', IZQ); bajar(); }
  for (const c of f.cuotas || []) {
    texto(`Cuota ${c.numero}: ${f.moneda} ${dos(c.monto)} — vence ${fechaLima(c.fechaVencimiento)}`, IZQ); bajar();
  }

  const qr = await pdf.embedPng(await QRCode.toBuffer(textoQr(f), { width: 200, margin: 0 }));
  pagina.drawImage(qr, { x: IZQ, y: 50, width: 100, height: 100 });
  y = 120; texto(`Representación impresa de la ${NOMBRES_COMPROBANTE[f.tipoComprobante].toLowerCase()}`, 155);
  y = 106; texto(`Hash: ${f.hashSunat || ''}`, 155);

  return Buffer.from(await pdf.save());
}

module.exports = { generarPdf, textoQr, NOMBRES_COMPROBANTE };
