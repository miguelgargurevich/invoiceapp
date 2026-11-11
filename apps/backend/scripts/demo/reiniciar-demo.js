#!/usr/bin/env node
// Reinicia la demo: borra SOLO los datos de las cuentas de demostración (no planes, no configuración del sitio,
// no otras cuentas) y vuelve a sembrarla. Es idempotente: correrlo dos veces deja el mismo resultado.
// Uso: MODO_DEMO=si node scripts/demo/reiniciar-demo.js   (npm run demo:reiniciar)
// La tarea nocturna de Coolify lo corre a las 3:00 a. m. (hora de Lima).
const { ejecutarSiembra } = require('../../src/demo/ejecutar');

ejecutarSiembra({ reiniciar: true })
  .then(async (resultado) => {
    console.log('[DEMO] Conteos por perfil:');
    console.table(resultado.conteos);
    const prisma = require('../../src/utils/prisma');
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`[DEMO] El reinicio no se completó: ${error.message}`);
    const prisma = require('../../src/utils/prisma');
    await prisma.$disconnect();
    process.exit(1);
  });
