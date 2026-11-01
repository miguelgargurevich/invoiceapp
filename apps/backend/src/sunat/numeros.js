const Decimal = require('decimal.js');

// Prisma devuelve sus propios Decimal: se convierten por string para no depender de la instancia.
function aDecimal(valor) {
  if (valor === null || valor === undefined || valor === '') return new Decimal(0);
  return new Decimal(String(valor));
}

function dos(valor) {
  return aDecimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

module.exports = { aDecimal, dos };
