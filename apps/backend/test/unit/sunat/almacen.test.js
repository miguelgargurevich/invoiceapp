const test = require('node:test');
const assert = require('node:assert/strict');
const { crearAlmacenPrivado } = require('../../../src/sunat/almacen');

function clienteFalso() {
  const objetos = new Map();
  return {
    objetos,
    async send(comando) {
      const { Bucket, Key, Body } = comando.input;
      if (comando.constructor.name === 'PutObjectCommand') { objetos.set(`${Bucket}/${Key}`, Body); return {}; }
      const cuerpo = objetos.get(`${Bucket}/${Key}`);
      return { Body: { transformToByteArray: async () => new Uint8Array(cuerpo) } };
    },
  };
}

test('guarda y lee en el bucket privado', async () => {
  const client = clienteFalso();
  const almacen = crearAlmacenPrivado({ client, bucket: 'privado' });
  await almacen.guardar('sunat/a.xml', Buffer.from('<xml/>'), 'application/xml');
  assert.ok(client.objetos.has('privado/sunat/a.xml'));
  assert.equal((await almacen.leer('sunat/a.xml')).toString(), '<xml/>');
});

test('la URL firmada usa el bucket privado y el tiempo pedido', async () => {
  let recibido;
  const almacen = crearAlmacenPrivado({
    client: clienteFalso(), bucket: 'privado',
    firmar: async (_c, comando, opciones) => { recibido = { ...comando.input, ...opciones }; return 'https://firmada'; },
  });
  assert.equal(await almacen.urlFirmada('sunat/a.xml', 60), 'https://firmada');
  assert.deepEqual(recibido, { Bucket: 'privado', Key: 'sunat/a.xml', expiresIn: 60 });
});

test('sin bucket privado no arranca', () => {
  assert.throws(() => crearAlmacenPrivado({ client: clienteFalso(), bucket: '' }), /R2_PRIVATE_BUCKET/);
});
