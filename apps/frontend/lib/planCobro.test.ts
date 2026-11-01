import test from 'node:test';
import assert from 'node:assert/strict';
import { planMostrado } from './planCobro.ts';
import type { Plan } from './subscriptions.ts';

const gratis = { id: 'pe-gratis', name: 'Gratis', priceMonthly: 0 } as Plan;
const pro = { id: 'pe-pro', name: 'Pro', priceMonthly: 59 } as Plan;

test('con cobro fallido (PAST_DUE) muestra el plan contratado y avisa', () => {
  const r = planMostrado({ status: 'PAST_DUE', plan: gratis, planContratado: pro });
  assert.equal(r.plan, pro);
  assert.equal(r.cobroFallido, true);
});

test('sin cobro fallido muestra el plan de la API tal cual', () => {
  const r = planMostrado({ status: 'ACTIVE', plan: gratis, planContratado: pro });
  assert.equal(r.plan, gratis);
  assert.equal(r.cobroFallido, false);
});

test('PAST_DUE sin plan contratado no inventa uno', () => {
  const r = planMostrado({ status: 'PAST_DUE', plan: gratis });
  assert.equal(r.plan, gratis);
  assert.equal(r.cobroFallido, false);
});

test('una suscripción activa no se trata como cobro fallido aunque traiga planContratado', () => {
  const r = planMostrado({ status: 'ACTIVE', plan: pro, planContratado: pro });
  assert.equal(r.plan, pro);
  assert.equal(r.cobroFallido, false);
});
