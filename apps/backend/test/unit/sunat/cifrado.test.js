const test = require('node:test');
const assert = require('node:assert/strict');
const { cifrar, descifrar, obtenerLlave } = require('../../../src/sunat/seguridad/cifrado');

const LLAVE = Buffer.alloc(32, 7);
const OTRA_LLAVE = Buffer.alloc(32, 9);

test('cifra y descifra textos y buffers', () => {
  assert.equal(descifrar(cifrar('moddatos', LLAVE), LLAVE).toString('utf8'), 'moddatos');
  const binario = Buffer.from([0, 1, 2, 250]);
  assert.deepEqual(descifrar(cifrar(binario, LLAVE), LLAVE), binario);
});

test('dos cifrados del mismo texto son distintos', () => {
  assert.notEqual(cifrar('x', LLAVE), cifrar('x', LLAVE));
});

test('un dato alterado no se descifra', () => {
  const partes = cifrar('secreto', LLAVE).split(':');
  partes[3] = Buffer.from('otro').toString('base64');
  assert.throws(() => descifrar(partes.join(':'), LLAVE));
});

test('obtenerLlave exige 32 bytes en base64', () => {
  assert.throws(() => obtenerLlave({}), /Falta SUNAT_MASTER_KEY/);
  assert.throws(() => obtenerLlave({ SUNAT_MASTER_KEY: Buffer.alloc(16).toString('base64') }), /32 bytes/);
  assert.equal(obtenerLlave({ SUNAT_MASTER_KEY: LLAVE.toString('base64') }).length, 32);
});

test('cada cifrado usa un IV aleatorio de 12 bytes y un tag de 16', () => {
  const ivs = new Set();
  for (let i = 0; i < 20; i += 1) {
    const [version, iv, tag] = cifrar('x', LLAVE).split(':');
    assert.equal(version, 'v1');
    assert.equal(Buffer.from(iv, 'base64').length, 12);
    assert.equal(Buffer.from(tag, 'base64').length, 16);
    ivs.add(iv);
  }
  assert.equal(ivs.size, 20);
});

test('un tag alterado, truncado o con otro IV no se descifra', () => {
  const [version, iv, tag, datos] = cifrar('secreto', LLAVE).split(':');
  const tagBytes = Buffer.from(tag, 'base64');

  const tagAlterado = Buffer.from(tagBytes);
  tagAlterado[0] ^= 0xff;
  assert.throws(() => descifrar([version, iv, tagAlterado.toString('base64'), datos].join(':'), LLAVE));

  const tagCorto = tagBytes.subarray(0, 4).toString('base64');
  assert.throws(() => descifrar([version, iv, tagCorto, datos].join(':'), LLAVE), /inválido/);

  const ivAlterado = Buffer.from(iv, 'base64');
  ivAlterado[0] ^= 0xff;
  assert.throws(() => descifrar([version, ivAlterado.toString('base64'), tag, datos].join(':'), LLAVE));

  const ivCorto = Buffer.alloc(8, 1).toString('base64');
  assert.throws(() => descifrar([version, ivCorto, tag, datos].join(':'), LLAVE), /inválido/);
});

test('con otra llave no se descifra', () => {
  assert.throws(() => descifrar(cifrar('secreto', LLAVE), OTRA_LLAVE));
});

test('rechaza versión desconocida y formatos incompletos', () => {
  const [, iv, tag, datos] = cifrar('secreto', LLAVE).split(':');
  assert.throws(() => descifrar(['v2', iv, tag, datos].join(':'), LLAVE), /inválido/);
  assert.throws(() => descifrar(['v1', iv, tag].join(':'), LLAVE), /inválido/);
  assert.throws(() => descifrar('', LLAVE), /inválido/);
});

test('un texto vacío se cifra y se descifra', () => {
  assert.equal(descifrar(cifrar('', LLAVE), LLAVE).toString('utf8'), '');
});

test('rechaza llaves que no son de 32 bytes', () => {
  assert.throws(() => cifrar('x', Buffer.alloc(16, 1)));
  const cifrado = cifrar('x', LLAVE);
  assert.throws(() => descifrar(cifrado, Buffer.alloc(16, 7)));
});

test('los mensajes de error no filtran la llave ni el texto plano', () => {
  const secreto = 'clave-sol-ultra-secreta-12345';
  const llaveBase64 = OTRA_LLAVE.toString('base64');
  const llaveHex = OTRA_LLAVE.toString('hex');
  const cifrado = cifrar(secreto, LLAVE);
  const partes = cifrado.split(':');
  partes[3] = Buffer.from('otro').toString('base64');

  const intentos = [
    () => descifrar(cifrado, OTRA_LLAVE),
    () => descifrar(partes.join(':'), LLAVE),
    () => descifrar('v1:a:b', LLAVE),
    () => obtenerLlave({ SUNAT_MASTER_KEY: llaveBase64.slice(0, 20) }),
  ];
  for (const intento of intentos) {
    try {
      intento();
      assert.fail('debía lanzar un error');
    } catch (error) {
      const texto = `${error.message}\n${error.stack}`;
      for (const prohibido of [secreto, llaveBase64, llaveHex, llaveBase64.slice(0, 20)]) {
        assert.ok(!texto.includes(prohibido), 'el error filtra un secreto');
      }
    }
  }
});
