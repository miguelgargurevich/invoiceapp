#!/usr/bin/env node
// Siembra la demo pública de Facturo: las cuentas de demostración con sus datos ficticios y sus comprobantes.
// Uso (solo en una instalación demo):
//   MODO_DEMO=si node scripts/demo/sembrar-demo.js            → borra la demo anterior y siembra
//   MODO_DEMO=si node scripts/demo/sembrar-demo.js --si-falta → no hace nada si la demo ya está sembrada
// La contraseña de las cuentas es aleatoria y no se imprime: la demo entra solo por /api/demo/entrar.
const { ejecutarSiembra } = require('../../src/demo/ejecutar');

async function main() {
  const siFalta = process.argv.includes('--si-falta');
  const resultado = await ejecutarSiembra({ siFalta });
  if (resultado.omitida) return 0;
  console.log('[DEMO] Conteos por perfil:');
  console.table(resultado.conteos);
  return 0;
}

main()
  .then(async (codigo) => {
    const prisma = require('../../src/utils/prisma');
    await prisma.$disconnect();
    process.exit(codigo);
  })
  .catch(async (error) => {
    console.error(`[DEMO] La siembra no se completó: ${error.message}`);
    const prisma = require('../../src/utils/prisma');
    await prisma.$disconnect();
    process.exit(1);
  });
