const PgBoss = require('pg-boss');

const COLAS = Object.freeze({ ENVIAR: 'sunat-enviar', TICKET: 'sunat-ticket' });

// pg-boss sobre el Postgres existente. Usar una conexión directa (no el pooler en modo transacción).
function crearCola({ connectionString }) {
  const boss = new PgBoss({ connectionString, schema: 'pgboss' });
  boss.on('error', (error) => console.error('[SUNAT] pg-boss:', error.message));

  return {
    async iniciar() {
      await boss.start();
      for (const nombre of Object.values(COLAS)) {
        if (!(await boss.getQueue(nombre))) await boss.createQueue(nombre);
      }
    },
    encolarEnvio: (facturaId, segundos = 0) => boss.send(COLAS.ENVIAR, { facturaId }, { startAfter: segundos, retryLimit: 0 }),
    encolarTicket: (procesoId, segundos = 30) => boss.send(COLAS.TICKET, { procesoId }, { startAfter: segundos, retryLimit: 0 }),
    async trabajar({ manejarEnvio, manejarTicket }) {
      await boss.work(COLAS.ENVIAR, async ([trabajo]) => manejarEnvio(trabajo.data));
      await boss.work(COLAS.TICKET, async ([trabajo]) => manejarTicket(trabajo.data));
    },
    detener: () => boss.stop(),
  };
}

module.exports = { crearCola, COLAS };
