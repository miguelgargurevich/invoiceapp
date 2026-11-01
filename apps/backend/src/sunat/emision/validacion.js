const { codigoDocIdentidad, TIPO_OPERACION } = require('../catalogos');
const { parametro } = require('../catalogos/parametros');
const { aDecimal } = require('../numeros');

// Reglas previas a pedir la firma. Mensajes para el usuario, no códigos de SUNAT.
function validarParaEmision(f, emisor, ahora = new Date()) {
  if (!emisor) return ['Configura los datos del emisor SUNAT antes de emitir'];
  const errores = [];

  if (!emisor.solUsuario || !emisor.solClaveCifrada) errores.push('Falta el usuario o la clave SOL del emisor');
  if (!emisor.certificadoCifrado) errores.push('Falta el certificado digital del emisor');
  else if (!emisor.certificadoVence || new Date(emisor.certificadoVence) <= ahora) errores.push('El certificado digital está vencido');

  const tipoDoc = codigoDocIdentidad(f.cliente?.tipoDocumento);
  const numero = f.cliente?.numeroDocumento || '';
  const prefijo = f.serie[0];
  const esExportacion = f.tipoOperacion === TIPO_OPERACION.EXPORTACION;

  if (tipoDoc === '6' && !/^(10|15|17|20)\d{9}$/.test(numero)) errores.push('El RUC del cliente no es válido');
  if (tipoDoc === '1' && !/^\d{8}$/.test(numero)) errores.push('El DNI del cliente debe tener 8 dígitos');

  if (f.tipoComprobante === '01') {
    if (tipoDoc !== '6' && !esExportacion) errores.push('Una factura requiere que el cliente tenga RUC');
    if (prefijo !== 'F') errores.push('La serie de una factura debe empezar con F');
  }

  if (f.tipoComprobante === '03') {
    if (prefijo !== 'B') errores.push('La serie de una boleta debe empezar con B');
    const umbral = parametro('BOLETA_UMBRAL_IDENTIFICACION', ahora);
    if (aDecimal(f.total).gt(umbral) && (tipoDoc === '0' || !numero)) {
      errores.push(`Una boleta mayor a S/ ${umbral} debe identificar al cliente con DNI, RUC u otro documento`);
    }
  }

  if (f.tipoComprobante === '07' || f.tipoComprobante === '08') {
    if (!f.docRelacionadoId) errores.push('La nota debe indicar el comprobante que modifica');
    else if (prefijo !== f.docRelacionadoSerie?.[0]) {
      errores.push('La serie de la nota debe empezar con la misma letra que el comprobante que modifica');
    }
    if (!f.motivoCodigo) errores.push('Indica el motivo de la nota');
  }

  if (f.formaPago === 'Credito' && !f.cuotas?.length) errores.push('Una venta al crédito debe tener cuotas');
  if (!f.detalles?.length) errores.push('El comprobante no tiene líneas');
  if (f.tipoOperacion === TIPO_OPERACION.DETRACCION && !emisor.cuentaDetracciones) {
    errores.push('Configura la cuenta de detracciones del Banco de la Nación');
  }

  return errores;
}

module.exports = { validarParaEmision };
