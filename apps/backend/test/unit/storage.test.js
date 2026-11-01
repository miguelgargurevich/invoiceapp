const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const storage = require('../../src/utils/storage');

const VARIABLES = ['STORAGE_PROVIDER', 'LOCAL_UPLOADS_DIR', 'PUBLIC_BACKEND_URL', 'PORT', 'R2_PUBLIC_URL'];

// Cada prueba trabaja en una carpeta temporal propia y restaura el entorno al terminar.
function prepararEntorno(t, extra = {}) {
  const previo = Object.fromEntries(VARIABLES.map((k) => [k, process.env[k]]));
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
  const uploads = path.join(raiz, 'uploads');

  for (const k of VARIABLES) delete process.env[k];
  process.env.LOCAL_UPLOADS_DIR = uploads;
  Object.assign(process.env, extra);

  t.after(() => {
    for (const k of VARIABLES) {
      if (previo[k] === undefined) delete process.env[k];
      else process.env[k] = previo[k];
    }
    fs.rmSync(raiz, { recursive: true, force: true });
  });

  return { raiz, uploads };
}

test('sin STORAGE_PROVIDER el proveedor por defecto es local', (t) => {
  prepararEntorno(t);
  assert.equal(storage.getStorageProvider(), 'local');
});

test('uploadFile local escribe el archivo en LOCAL_UPLOADS_DIR y devuelve la URL pública', async (t) => {
  const { uploads } = prepararEntorno(t, { PUBLIC_BACKEND_URL: 'https://api.ejemplo.test/' });

  const { publicUrl } = await storage.uploadFile('empresa-1/images/logo.png', Buffer.from('png-bytes'), {
    contentType: 'image/png',
  });

  assert.equal(publicUrl, 'https://api.ejemplo.test/uploads/empresa-1/images/logo.png');
  const contenido = fs.readFileSync(path.join(uploads, 'empresa-1', 'images', 'logo.png'));
  assert.equal(contenido.toString(), 'png-bytes');
});

test('sin PUBLIC_BACKEND_URL la URL local usa localhost y PORT (4000 por defecto)', (t) => {
  prepararEntorno(t);
  assert.equal(storage.getPublicUrl('a/b.png'), 'http://localhost:4000/uploads/a/b.png');

  process.env.PORT = '4123';
  assert.equal(storage.getPublicUrl('a/b.png'), 'http://localhost:4123/uploads/a/b.png');
});

test('deleteFile local borra el archivo y no falla si ya no existe', async (t) => {
  const { uploads } = prepararEntorno(t);
  await storage.uploadFile('empresa-2/recibo.pdf', Buffer.from('pdf'));
  const ruta = path.join(uploads, 'empresa-2', 'recibo.pdf');
  assert.equal(fs.existsSync(ruta), true);

  await storage.deleteFile('empresa-2/recibo.pdf');
  assert.equal(fs.existsSync(ruta), false);

  await assert.doesNotReject(storage.deleteFile('empresa-2/recibo.pdf'));
});

test('el proveedor local rechaza claves que salen de la carpeta (../)', async (t) => {
  const { raiz, uploads } = prepararEntorno(t);
  // El objetivo cae DENTRO de la carpeta temporal: si la prueba falla, no escribe nada real.
  const objetivo = path.join(raiz, 'secreto.txt');

  await assert.rejects(storage.uploadFile('../secreto.txt', Buffer.from('x')), /fuera de la carpeta/);
  await assert.rejects(storage.uploadFile('a/../../secreto.txt', Buffer.from('x')), /fuera de la carpeta/);
  // Ruta absoluta FUERA de uploads pero dentro de la carpeta temporal (nunca un archivo del sistema).
  await assert.rejects(storage.uploadFile(path.join(raiz, 'absoluta.txt'), Buffer.from('x')), /fuera de la carpeta/);
  await assert.rejects(storage.deleteFile('../secreto.txt'), /fuera de la carpeta/);

  assert.equal(fs.existsSync(objetivo), false);
  assert.equal(fs.existsSync(uploads), false);
});

test('un STORAGE_PROVIDER desconocido (p. ej. un valor heredado) falla en vez de escribir en disco', async (t) => {
  prepararEntorno(t, { STORAGE_PROVIDER: 'proveedor-heredado' });
  await assert.rejects(storage.uploadFile('x.png', Buffer.from('x')), /STORAGE_PROVIDER desconocido/);
});

test('extractStorageKeyFromUrl reconoce las URLs locales (absolutas y relativas)', (t) => {
  prepararEntorno(t, { PUBLIC_BACKEND_URL: 'https://api.ejemplo.test' });

  assert.equal(
    storage.extractStorageKeyFromUrl('https://api.ejemplo.test/uploads/empresa-1/images/logo.png'),
    'empresa-1/images/logo.png',
  );
  assert.equal(storage.extractStorageKeyFromUrl('/uploads/empresa-1/a%20b.png'), 'empresa-1/a b.png');
  assert.equal(storage.extractStorageKeyFromUrl('https://otro.ejemplo.test/uploads/x.png'), null);
});

test('extractStorageKeyFromUrl reconoce las URLs de R2 con R2_PUBLIC_URL', (t) => {
  prepararEntorno(t, { STORAGE_PROVIDER: 'r2', R2_PUBLIC_URL: 'https://pub.ejemplo.r2.dev/' });

  assert.equal(
    storage.extractStorageKeyFromUrl('https://pub.ejemplo.r2.dev/empresa-9/recibos/r1.pdf'),
    'empresa-9/recibos/r1.pdf',
  );
});

test('extractStorageKeyFromUrl devuelve null para URLs vacías o ajenas', (t) => {
  prepararEntorno(t);

  assert.equal(storage.extractStorageKeyFromUrl(null), null);
  assert.equal(storage.extractStorageKeyFromUrl(''), null);
  assert.equal(
    storage.extractStorageKeyFromUrl('https://otro.ejemplo.test/storage/v1/object/public/logos/x.png'),
    null,
  );
});
