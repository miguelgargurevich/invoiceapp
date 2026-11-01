const test = require('node:test');
const assert = require('node:assert/strict');
const { crearClienteCulqi, ErrorCulqi } = require('../../../src/pagos/culqi/cliente');

function fetchFalso(respuestas) {
  const llamadas = [];
  const fn = async (url, opciones) => {
    llamadas.push({ url, opciones });
    const r = respuestas.shift();
    return { status: r.status, ok: r.status < 300, text: async () => JSON.stringify(r.cuerpo) };
  };
  fn.llamadas = llamadas;
  return fn;
}

test('envía la sk como Bearer y el cuerpo en JSON', async () => {
  const f = fetchFalso([{ status: 201, cuerpo: { id: 'cus_test_1' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  const r = await c.crearCliente({ first_name: 'Ana' });
  assert.equal(r.id, 'cus_test_1');
  assert.equal(f.llamadas[0].url, 'https://api.culqi.com/v2/customers');
  assert.equal(f.llamadas[0].opciones.method, 'POST');
  assert.equal(f.llamadas[0].opciones.headers.Authorization, 'Bearer sk_test_x');
  assert.deepEqual(JSON.parse(f.llamadas[0].opciones.body), { first_name: 'Ana' });
});

test('un error de tarjeta se convierte en ErrorCulqi con el mensaje para el usuario', async () => {
  const f = fetchFalso([{ status: 402, cuerpo: { object: 'error', type: 'card_error', merchant_message: 'Fondos', user_message: 'Su tarjeta no tiene fondos suficientes.' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  await assert.rejects(c.crearTarjeta({ customer_id: 'c', token_id: 't' }), (e) => {
    assert.ok(e instanceof ErrorCulqi);
    assert.equal(e.status, 402);
    assert.equal(e.tipo, 'card_error');
    assert.equal(e.mensajeUsuario, 'Su tarjeta no tiene fondos suficientes.');
    return true;
  });
});

test('crearTarjeta devuelve requiere3DS cuando Culqi pide autenticación', async () => {
  const f = fetchFalso([{ status: 200, cuerpo: { action_code: 'REVIEW', user_message: 'El usuario necesita autenticarse' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_x', fetch: f });
  assert.deepEqual(await c.crearTarjeta({ customer_id: 'c', token_id: 't' }), { requiere3DS: true });
});

test('el mensaje de error nunca incluye la sk', async () => {
  const f = fetchFalso([{ status: 401, cuerpo: { object: 'error', type: 'authentication_error', merchant_message: 'Llave inválida' } }]);
  const c = crearClienteCulqi({ secretKey: 'sk_test_secreta', fetch: f });
  await assert.rejects(c.consultarSuscripcion('sxn_test_1'), (e) => !String(e.message).includes('sk_test_secreta') && !JSON.stringify(e).includes('sk_test_secreta'));
});

test('sin sk no se puede crear el cliente', () => {
  assert.throws(() => crearClienteCulqi({ secretKey: '' }), /CULQI_SECRET_KEY/);
});
