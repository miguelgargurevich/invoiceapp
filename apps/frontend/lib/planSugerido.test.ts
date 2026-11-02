import test from 'node:test';
import assert from 'node:assert/strict';
import { planMasBarato, PLANES_PE, ETIQUETA_FUNCION, type FuncionPlan } from './planSugerido.ts';

test('reportes básicos los da el plan más barato, Emprendedor', () => {
  assert.equal(planMasBarato('reportes')?.nombre, 'Emprendedor');
});

test('proformas, firma digital, detracción y logo se sugieren Negocio', () => {
  for (const funcion of ['proformas', 'firmaDigital', 'regimenesSunat', 'logo'] as FuncionPlan[]) {
    assert.equal(planMasBarato(funcion)?.nombre, 'Negocio', funcion);
  }
});

test('reportes avanzados, multimoneda, API y soporte se sugieren Empresa', () => {
  for (const funcion of ['reportesAvanzados', 'multimoneda', 'api', 'soporte'] as FuncionPlan[]) {
    assert.equal(planMasBarato(funcion)?.nombre, 'Empresa', funcion);
  }
});

test('el catálogo va del más barato al más caro y cada plan incluye lo del anterior', () => {
  assert.deepEqual(PLANES_PE.map((p) => p.slug), ['pe-emprendedor', 'pe-negocio', 'pe-empresa']);
  for (let i = 1; i < PLANES_PE.length; i++) {
    for (const funcion of PLANES_PE[i - 1].funciones) {
      assert.ok(PLANES_PE[i].funciones.includes(funcion), `${PLANES_PE[i].nombre} debe incluir ${funcion}`);
    }
  }
});

test('todas las funciones tienen etiqueta y al menos un plan', () => {
  for (const funcion of Object.keys(ETIQUETA_FUNCION) as FuncionPlan[]) {
    assert.ok(ETIQUETA_FUNCION[funcion].length > 0);
    assert.ok(planMasBarato(funcion), funcion);
  }
});
