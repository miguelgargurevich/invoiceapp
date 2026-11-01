const PgBoss = require('pg-boss');

const COLAS = Object.freeze({ ENVIAR: 'sunat-enviar', TICKET: 'sunat-ticket' });

// pg-boss sobre el Postgres existente. Usar una conexión directa (no el pooler en modo transacción).
function crearCola({ connectionString, schema = 'pgboss' }) {
  const boss = new PgBoss({ connectionString, schema });
  boss.on('error', (error) => console.error('[SUNAT] pg-boss:', error.message));

  return {
    async iniciar() {
      await boss.start();
      // policy 'short': pg-boss descarta un segundo trabajo con la misma singletonKey mientras el primero espera.
      for (const nombre of Object.values(COLAS)) {
        if (!(await boss.getQueue(nombre))) await boss.createQueue(nombre, { policy: 'short' });
      }
    },
    // singletonKey: no se encolan dos trabajos del mismo comprobante (o ticket) mientras uno siga en espera.
    encolarEnvio: (facturaId, segundos = 0) => boss.send(COLAS.ENVIAR, { facturaId }, {
      startAfter: segundos, retryLimit: 0, singletonKey: 'envio:' + facturaId,
    }),
    encolarTicket: (procesoId, segundos = 30) => boss.send(COLAS.TICKET, { procesoId }, {
      startAfter: segundos, retryLimit: 0, singletonKey: 'ticket:' + procesoId,
    }),
    async trabajar({ manejarEnvio, manejarTicket }) {
      await boss.work(COLAS.ENVIAR, async ([trabajo]) => manejarEnvio(trabajo.data));
      await boss.work(COLAS.TICKET, async ([trabajo]) => manejarTicket(trabajo.data));
    },
    detener: () => boss.stop(),
  };
}

module.exports = { crearCola, COLAS };
