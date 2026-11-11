// Modo demo, piezas sin base de datos: el interruptor, el candado de /api/auth, la normalización del WhatsApp y el motor siempre en BETA.
const test = require('node:test');
const assert = require('node:assert/strict');
const { esDemo, LIMITE_DIARIO } = require('../../src/demo/modo');
const { bloquearEnDemo, bloquearAuthEnDemo } = require('../../src/demo/candado');
const { rangoDiaLima } = require('../../src/demo/limite');
const { normalizarCelularPe, normalizarDatosLegales } = require('../../src/sitio/legal');
const { armarEmisor } = require('../../src/sunat/engine/mapper');

test.afterEach(() => { delete process.env.MODO_DEMO; });

const respuesta = () => ({ status(c) { this.codigo = c; return this; }, json(c) { this.cuerpo = c; return this; } });
const correr = (mw, req) => { const res = respuesta(); let siguio = false; mw(req, res, () => { siguio = true; }); return { res, siguio }; };

test('esDemo solo es verdadero con MODO_DEMO exactamente «si»', () => {
  delete process.env.MODO_DEMO;
  assert.equal(esDemo(), false);
  for (const v of ['', 'no', 'SI', 'Si', 'true', '1', 'si ', ' si']) { process.env.MODO_DEMO = v; assert.equal(esDemo(), false, `"${v}"`); }
  process.env.MODO_DEMO = 'si';
  assert.equal(esDemo(), true);
  assert.equal(LIMITE_DIARIO, 30);
});

test('bloquearEnDemo: sin MODO_DEMO deja pasar; con él responde 403 DEMO_BLOQUEADO con el mensaje', () => {
  const mw = bloquearEnDemo('Mensaje de prueba');
  delete process.env.MODO_DEMO;
  assert.equal(correr(mw, {}).siguio, true);
  process.env.MODO_DEMO = 'si';
  const { res, siguio } = correr(mw, {});
  assert.equal(siguio, false);
  assert.equal(res.codigo, 403);
  assert.deepEqual(res.cuerpo, { error: 'Mensaje de prueba', codigo: 'DEMO_BLOQUEADO' });
});

test('bloquearAuthEnDemo: sin MODO_DEMO no toca nada; con él solo deja login, logout y /me', () => {
  delete process.env.MODO_DEMO;
  assert.equal(correr(bloquearAuthEnDemo, { method: 'POST', path: '/register' }).siguio, true);
  process.env.MODO_DEMO = 'si';
  for (const [method, path] of [['POST', '/login'], ['POST', '/logout'], ['GET', '/me']]) {
    assert.equal(correr(bloquearAuthEnDemo, { method, path }).siguio, true, `${method} ${path}`);
  }
  for (const [method, path] of [['POST', '/register'], ['PUT', '/password'], ['POST', '/me'], ['GET', '/login'], ['DELETE', '/me']]) {
    const { res, siguio } = correr(bloquearAuthEnDemo, { method, path });
    assert.equal(siguio, false, `${method} ${path}`);
    assert.equal(res.codigo, 403);
    assert.equal(res.cuerpo.codigo, 'DEMO_BLOQUEADO');
  }
});

test('rangoDiaLima: el día va de las 05:00 UTC a las 05:00 UTC siguientes', () => {
  const { inicio, fin } = rangoDiaLima(new Date('2026-11-15T04:59:59Z'));
  assert.equal(inicio.toISOString(), '2026-11-14T05:00:00.000Z');
  assert.equal(fin.toISOString(), '2026-11-15T05:00:00.000Z');
  assert.equal(rangoDiaLima(new Date('2026-11-15T05:00:00Z')).inicio.toISOString(), '2026-11-15T05:00:00.000Z');
});

test('normalizarCelularPe: 9 dígitos que empiezan en 9, con o sin +51; todo lo demás es null', () => {
  for (const ok of ['987654321', '+51987654321', '51987654321', '+51 987 654 321', '(+51) 987-654-321']) {
    assert.equal(normalizarCelularPe(ok), '+51987654321', ok);
  }
  for (const mal of ['', '98765432', '8987654321', '887654321', '9876543210', '+52987654321', '+5198765432', 'abc', '+51+51987654321', '0051987654321']) {
    assert.equal(normalizarCelularPe(mal), null, mal);
  }
});

test('normalizarDatosLegales: demoWhatsapp ausente no aparece en los datos (no pisa lo guardado)', () => {
  assert.equal(Object.hasOwn(normalizarDatosLegales({ legalMarca: 'M' }).datos, 'demoWhatsapp'), false);
  assert.equal(normalizarDatosLegales({ demoWhatsapp: '987654321' }).datos.demoWhatsapp, '+51987654321');
  assert.equal(normalizarDatosLegales({ demoWhatsapp: '  ' }).datos.demoWhatsapp, null);
  assert.match(normalizarDatosLegales({ demoWhatsapp: '123' }).error, /WhatsApp/);
});

test('el motor usa BETA en la demo aunque el emisor guardado diga PRODUCCION; sin demo respeta lo guardado', () => {
  const empresa = { ruc: '20000000001', razonSocial: 'X SAC', nombre: 'X' };
  const emisor = {
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA', direccionFiscal: 'AV 1', codigoEstablecimiento: '0000',
    ambiente: 'PRODUCCION', solUsuario: 'MODDATOS', solClaveCifrada: 'a', certificadoCifrado: 'b', certificadoClaveCifrada: 'c',
  };
  const descifrar = () => Buffer.from('x');
  delete process.env.MODO_DEMO;
  assert.equal(armarEmisor(empresa, emisor, descifrar).ambiente, 'PRODUCCION');
  process.env.MODO_DEMO = 'si';
  assert.equal(armarEmisor(empresa, emisor, descifrar).ambiente, 'BETA');
  assert.equal(armarEmisor(empresa, { ...emisor, ambiente: 'BETA' }, descifrar).ambiente, 'BETA');
});
