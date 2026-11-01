const { INCLUDE_COMPROBANTE } = require('./emision/borradores');
const { generarPdf, NOMBRES_COMPROBANTE } = require('./pdf/representacion');
const { nombreBase } = require('./engine/mapper');
const { dos } = require('./numeros');

function crearNotificador({ prisma, almacen, enviarCorreo, generar = generarPdf }) {
  return {
    async comprobanteAceptado(facturaId) {
      const f = await prisma.factura.findUnique({ where: { id: facturaId }, include: INCLUDE_COMPROBANTE });
      if (!f?.cliente?.email) return { enviado: false };
      const nombre = nombreBase(f.empresa, f);
      const tipo = NOMBRES_COMPROBANTE[f.tipoComprobante];
      const [pdf, xml] = await Promise.all([generar(f), almacen.leer(f.xmlKey)]);
      await enviarCorreo({
        to: f.cliente.email,
        subject: `${tipo} ${f.serie}-${f.numero} — ${f.empresa.razonSocial || f.empresa.nombre}`,
        text: `Adjuntamos la ${tipo.toLowerCase()} ${f.serie}-${f.numero} por ${f.moneda} ${dos(f.total)}.`,
        attachments: [
          { filename: `${nombre}.pdf`, content: pdf },
          { filename: `${nombre}.xml`, content: xml },
        ],
      });
      return { enviado: true };
    },
  };
}

module.exports = { crearNotificador };
