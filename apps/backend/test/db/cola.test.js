const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { crearCola } = require('../../src/sunat/cola');

// Solo esta prueba usa la base de pruebas, y únicamente el esquema pgboss_prueba (no toca las tablas de la app).
const CONEXION = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5436/invoiceapp_test';
const ESQUEMA = 'pgboss_prueba';
const TOPE_ESPERA_MS = 20000;
const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

async function esperarA(condicion) {
  const limite = Date.now() + TOPE_ESPERA_MS;
  while (!condicion() && Date.now() < limite) await pausa(100);
}

// Borra solo el esquema de la prueba para que cada corrida empiece con las colas creadas de nuevo.
async function limpiarEsquema() {
  const cliente = new Client({ connectionString: CONEXION });
  await cliente.connect();
  try {
    await cliente.query(`DROP SCHEMA IF EXISTS ${ESQUEMA} CASCADE`);
  } finally {
    await cliente.end();
  }
}

// Dos envíos de f1 y uno de f2: cada comprobante debe ejecutarse exactamente una vez.
// Sin singletonKey la cola (policy short) descartaría también f2; con policy estándar f1 correría dos veces.
test('encolar dos veces el mismo comprobante ejecuta el envío una sola vez', async () => {
  await limpiarEsquema();
  const cola = crearCola({ connectionString: CONEXION, schema: ESQUEMA });
  const ejecuciones = [];
  try {
    await cola.iniciar();
    // Se encolan antes de arrancar el trabajador: así los envíos repetidos siempre encuentran el primero en espera.
    await cola.encolarEnvio('f1');
    await cola.encolarEnvio('f1');
    await cola.encolarEnvio('f2');
    await cola.trabajar({
      manejarEnvio: async (datos) => { ejecuciones.push(datos); },
      manejarTicket: async () => {},
    });
    await esperarA(() => ejecuciones.length >= 2);
    // Margen para que un trabajo repetido (si existiera) lo recoja el sondeo de pg-boss (2 s por defecto).
    await pausa(5000);
    const ids = ejecuciones.map((d) => d.facturaId).sort();
    assert.deepEqual(ids, ['f1', 'f2']);
  } finally {
    await cola.detener();
  }
});
