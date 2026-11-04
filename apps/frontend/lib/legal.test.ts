import test from 'node:test';
import assert from 'node:assert/strict';
import { POR_CONFIRMAR, valorOPorConfirmar, lineaPie, datosLegalesDesdeRespuesta, cargarDatosLegales } from './legal.ts';

const completos = {
  legalMarca: 'Ing. Miguel F. Gargurevich', legalRazonSocial: null, legalRuc: '10409241862',
  legalDomicilio: 'Av. Las Gaviotas 2121, Santiago de Surco, Lima, Perú', legalCorreo: null,
};

test('valorOPorConfirmar: vacío, null, solo espacios y undefined dicen «por confirmar»', () => {
  assert.equal(POR_CONFIRMAR, 'por confirmar');
  for (const v of [null, undefined, '', '   ']) assert.equal(valorOPorConfirmar(v), 'por confirmar');
  assert.equal(valorOPorConfirmar('  10409241862 '), '10409241862');
});

test('lineaPie arma «Facturo · por marca · RUC …» con marca y RUC de la BD', () => {
  assert.equal(lineaPie(completos), 'Facturo · por Ing. Miguel F. Gargurevich · RUC 10409241862');
});

test('lineaPie omite lo que falta y se oculta si no hay datos', () => {
  assert.equal(lineaPie({ ...completos, legalRuc: null }), 'Facturo · por Ing. Miguel F. Gargurevich');
  assert.equal(lineaPie({ ...completos, legalMarca: ' ' }), 'Facturo · RUC 10409241862');
  assert.equal(lineaPie({ ...completos, legalMarca: null, legalRuc: null }), null);
  assert.equal(lineaPie(null), null);
  assert.equal(lineaPie(undefined), null);
});

test('datosLegalesDesdeRespuesta: acepta la forma de la API y descarta lo demás', () => {
  assert.deepEqual(datosLegalesDesdeRespuesta(completos), completos);
  assert.equal(datosLegalesDesdeRespuesta(null), null);
  assert.equal(datosLegalesDesdeRespuesta('x'), null);
  assert.deepEqual(datosLegalesDesdeRespuesta({ legalMarca: 5 }), {
    legalMarca: null, legalRazonSocial: null, legalRuc: null, legalDomicilio: null, legalCorreo: null,
  });
});

test('cargarDatosLegales no lanza si la API falla (red caída o error HTTP)', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => { throw new Error('sin red'); }) as typeof fetch;
    assert.equal(await cargarDatosLegales(), null);
    globalThis.fetch = (async () => new Response('x', { status: 500 })) as typeof fetch;
    assert.equal(await cargarDatosLegales(), null);
    globalThis.fetch = (async () => new Response(JSON.stringify(completos), { status: 200 })) as typeof fetch;
    assert.deepEqual(await cargarDatosLegales(), completos);
  } finally {
    globalThis.fetch = original;
  }
});
