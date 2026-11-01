import test from 'node:test';
import assert from 'node:assert/strict';
import {
  intervaloCulqi,
  montoCentimos,
  validarFacturacion,
  interpretarMensaje3DS,
  leerContratarDeUrl,
  configCheckout,
  opciones3DS,
  MONTO_CAMBIO_TARJETA_CENTIMOS,
} from './culqi.ts';

const facturacionOk = {
  nombre: 'María José',
  apellido: 'Ñañez Peña',
  telefono: '987654321',
  direccion: 'Av. Larco 123',
  ciudad: 'Lima',
};

test('intervaloCulqi traduce mensual y anual a lo que espera el backend', () => {
  assert.equal(intervaloCulqi('monthly'), 'MONTH');
  assert.equal(intervaloCulqi('yearly'), 'YEAR');
});

test('montoCentimos pasa soles a céntimos sin errores de punto flotante', () => {
  assert.equal(montoCentimos(59), 5900);
  assert.equal(montoCentimos(1149), 114900);
  assert.equal(montoCentimos(19.99), 1999);
  assert.equal(montoCentimos(0.29), 29);
});

test('el cambio de tarjeta se autentica con S/ 3.00', () => {
  assert.equal(MONTO_CAMBIO_TARJETA_CENTIMOS, 300);
});

test('validarFacturacion acepta datos completos con tildes y eñes', () => {
  assert.deepEqual(validarFacturacion(facturacionOk), {});
});

test('validarFacturacion exige todos los campos (también los de solo espacios)', () => {
  const errores = validarFacturacion({ nombre: '', apellido: '   ', telefono: '', direccion: '', ciudad: '' });
  assert.deepEqual(Object.keys(errores).sort(), ['apellido', 'ciudad', 'direccion', 'nombre', 'telefono']);
  assert.equal(errores.nombre, 'requerido');
  assert.equal(errores.apellido, 'requerido');
});

test('validarFacturacion rechaza números y símbolos en nombre y apellido', () => {
  const errores = validarFacturacion({ ...facturacionOk, nombre: 'Juan2', apellido: 'Pérez-Gil' });
  assert.equal(errores.nombre, 'soloLetras');
  assert.equal(errores.apellido, 'soloLetras');
  assert.equal(errores.ciudad, undefined);
});

test('validarFacturacion respeta los largos que acepta el backend', () => {
  const corto = validarFacturacion({ ...facturacionOk, telefono: '123', direccion: 'ab', ciudad: 'L' });
  assert.equal(corto.telefono, 'largo');
  assert.equal(corto.direccion, 'largo');
  assert.equal(corto.ciudad, 'largo');
  assert.equal(validarFacturacion({ ...facturacionOk, ciudad: 'x'.repeat(31) }).ciudad, 'largo');
  assert.equal(validarFacturacion({ ...facturacionOk, nombre: 'a'.repeat(51) }).nombre, 'largo');
  assert.deepEqual(validarFacturacion({ ...facturacionOk, telefono: '123456', direccion: 'abc', ciudad: 'Ica' }), {});
});

test('interpretarMensaje3DS devuelve los parámetros cuando vienen del mismo origen', () => {
  const parametros = { eci: '05', xid: 'x', cavv: 'c', protocolVersion: '2.1.0', directoryServerTransactionId: 'd' };
  const r = interpretarMensaje3DS({ parameters3DS: parametros }, 'https://app.test', 'https://app.test');
  assert.deepEqual(r, { tipo: 'ok', parametros });
});

test('interpretarMensaje3DS ignora mensajes de otro origen', () => {
  const r = interpretarMensaje3DS({ parameters3DS: { eci: '05' } }, 'https://malo.test', 'https://app.test');
  assert.equal(r, null);
});

test('interpretarMensaje3DS reporta el error con su texto, o uno por defecto', () => {
  assert.deepEqual(interpretarMensaje3DS({ error: 'Tarjeta rechazada' }, 'https://app.test', 'https://app.test'), {
    tipo: 'error',
    mensaje: 'Tarjeta rechazada',
  });
  assert.deepEqual(interpretarMensaje3DS({ error: { code: 1 } }, 'https://app.test', 'https://app.test'), {
    tipo: 'error',
    mensaje: 'No se pudo autenticar la tarjeta',
  });
});

test('interpretarMensaje3DS ignora mensajes que no son de Culqi', () => {
  assert.equal(interpretarMensaje3DS(undefined, 'https://app.test', 'https://app.test'), null);
  assert.equal(interpretarMensaje3DS({ otra: 1 }, 'https://app.test', 'https://app.test'), null);
});

test('leerContratarDeUrl lee plan e intervalo de la redirección del asistente', () => {
  assert.deepEqual(leerContratarDeUrl(new URLSearchParams('tab=suscripcion&contratar=pe-negocio&intervalo=YEAR')), {
    planSlug: 'pe-negocio',
    intervalo: 'YEAR',
  });
  assert.deepEqual(leerContratarDeUrl(new URLSearchParams('contratar=pe-negocio')), {
    planSlug: 'pe-negocio',
    intervalo: 'MONTH',
  });
});

test('leerContratarDeUrl devuelve null sin plan y no se deja engañar por un intervalo raro', () => {
  assert.equal(leerContratarDeUrl(new URLSearchParams('tab=suscripcion')), null);
  assert.equal(leerContratarDeUrl(new URLSearchParams('contratar=')), null);
  assert.equal(leerContratarDeUrl(new URLSearchParams('contratar=pe-negocio&intervalo=WEEK'))?.intervalo, 'MONTH');
});

test('configCheckout: solo tarjeta, en soles, con los datos del cliente y sin verde', () => {
  const c = configCheckout({ titulo: 'Plan Negocio', email: 'a@b.pe', nombre: 'Ana', apellido: 'Paz' });
  assert.equal(c.settings.currency, 'PEN');
  assert.equal(c.settings.title, 'Plan Negocio');
  assert.deepEqual(c.client, { email: 'a@b.pe', firstName: 'Ana', lastName: 'Paz' });
  assert.deepEqual(c.options.paymentMethods, { tarjeta: true });
  assert.deepEqual(c.options.paymentMethodsSort, ['tarjeta']);
  assert.doesNotMatch(JSON.stringify(c).toLowerCase(), /1d9e75/);
});

test('opciones3DS usa el color primario berenjena de Facturo', () => {
  const o = opciones3DS();
  assert.equal(o.style.btnColor, '#6B2C6E');
  assert.equal(o.showModal, true);
});
