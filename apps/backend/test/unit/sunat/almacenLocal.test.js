const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { crearAlmacenLocal } = require('../../../src/sunat/almacenLocal');

test('guarda y lee archivos dentro de la carpeta', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  const almacen = crearAlmacenLocal(dir);
  await almacen.guardar('sunat/x/a.xml', Buffer.from('<xml/>'), 'application/xml');
  assert.equal((await almacen.leer('sunat/x/a.xml')).toString(), '<xml/>');
  assert.ok(fs.existsSync(path.join(dir, 'sunat/x/a.xml')));
});

test('rechaza claves que salen de la carpeta', async () => {
  const almacen = crearAlmacenLocal(fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-')));
  await assert.rejects(almacen.guardar('../fuera.xml', Buffer.from('x')), /inválida/);
  await assert.rejects(almacen.leer('../../etc/passwd'), /inválida/);
  await assert.rejects(almacen.leer('sunat/../../fuera.xml'), /inválida/);
  await assert.rejects(almacen.leer('/etc/passwd'), /inválida/);
  await assert.rejects(almacen.leer(''), /inválida/);
});

test('crearAlmacen usa el local en desarrollo y se niega en producción', () => {
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_prueba';
  const { crearAlmacen } = require('../../../src/sunat');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almacen-'));
  assert.equal(typeof crearAlmacen({ SUNAT_ALMACEN_DIR: dir }).leer, 'function');
  assert.throws(() => crearAlmacen({ SUNAT_ALMACEN_DIR: dir, NODE_ENV: 'production' }), /producción/);
  assert.throws(() => crearAlmacen({ SUNAT_ALMACEN_DIR: dir, NODE_ENV: 'production', SUNAT_ALMACEN_PERSISTENTE: '1' }), /producción/);
  assert.equal(typeof crearAlmacen({ SUNAT_ALMACEN_DIR: dir, NODE_ENV: 'production', SUNAT_ALMACEN_PERSISTENTE: 'si' }).leer, 'function');
  assert.throws(() => crearAlmacen({}), /R2_PRIVATE_BUCKET/);
});
