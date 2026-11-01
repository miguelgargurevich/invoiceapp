const test = require('node:test');
const assert = require('node:assert/strict');
const { crearClienteEngine } = require('../../../src/sunat/engine/cliente');
const { ErrorEngineNoDisponible, ErrorConstruccion } = require('../../../src/sunat/errores');

const respuesta = (status, cuerpo) => async () => ({ status, ok: status < 400, json: async () => cuerpo });

test('envía token y cuerpo JSON', async () => {
  let llamada;
  const engine = crearClienteEngine({
    url: 'http://engine', token: 't0k',
    fetchImpl: async (url, opciones) => { llamada = { url, ...opciones }; return { status: 200, ok: true, json: async () => ({ hash: 'h' }) }; },
  });
  assert.deepEqual(await engine.firmar({ ruc: '1' }, { serie: 'F001' }), { hash: 'h' });
  assert.equal(llamada.url, 'http://engine/comprobantes/firmar');
  assert.equal(llamada.headers['x-engine-token'], 't0k');
  assert.deepEqual(JSON.parse(llamada.body), { emisor: { ruc: '1' }, comprobante: { serie: 'F001' } });
});

test('422 es ErrorConstruccion; 500 y red son ErrorEngineNoDisponible', async () => {
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: respuesta(422, { error: 'Falta emisor.ruc' }) }).firmar({}, {}), ErrorConstruccion);
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: respuesta(500, {}) }).firmar({}, {}), ErrorEngineNoDisponible);
  await assert.rejects(crearClienteEngine({ url: 'x', token: 't', fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }).firmar({}, {}), ErrorEngineNoDisponible);
});
