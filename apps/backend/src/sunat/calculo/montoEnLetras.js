const Decimal = require('decimal.js');

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIEZ_A_VEINTINUEVE = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE',
  'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS',
  'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
const MONEDAS = { PEN: 'SOLES', USD: 'DÓLARES AMERICANOS', EUR: 'EUROS' };

function decenas(n) {
  if (n < 10) return UNIDADES[n];
  if (n < 30) return DIEZ_A_VEINTINUEVE[n - 10];
  const unidad = n % 10;
  const decena = DECENAS[Math.floor(n / 10)];
  return unidad ? `${decena} Y ${UNIDADES[unidad]}` : decena;
}

function centenas(n) {
  if (n === 100) return 'CIEN';
  return [CENTENAS[Math.floor(n / 100)], decenas(n % 100)].filter(Boolean).join(' ');
}

// "VEINTIUNO MIL" se dice "VEINTIUN MIL"
function apocopar(texto) {
  return texto.replace(/UNO$/, 'UN');
}

function enteroEnLetras(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1e6);
  const miles = Math.floor((n % 1e6) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (millones) partes.push(millones === 1 ? 'UN MILLON' : `${apocopar(centenas(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${apocopar(centenas(miles))} MIL`);
  if (resto) partes.push(centenas(resto));
  return partes.join(' ');
}

function montoEnLetras(monto, moneda = 'PEN') {
  const [entero, centimos] = new Decimal(String(monto)).toFixed(2).split('.');
  const n = Number(entero);
  if (n >= 1e9) throw new Error('Monto fuera de rango para el monto en letras');
  return `SON: ${enteroEnLetras(n)} CON ${centimos}/100 ${MONEDAS[moneda] || moneda}`;
}

module.exports = { montoEnLetras };
