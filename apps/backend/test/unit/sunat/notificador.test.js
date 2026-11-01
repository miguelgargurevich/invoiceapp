const test = require('node:test');
const assert = require('node:assert/strict');
const { crearNotificador } = require('../../../src/sunat/notificador');

const prismaCon = (factura) => ({ factura: { findUnique: async () => factura } });
const base = {
  id: 'f1', tipoComprobante: '01', serie: 'F001', numero: 3, moneda: 'PEN', total: '118.00', xmlKey: 'k.xml',
  empresa: { ruc: '20000000001', razonSocial: 'EMPRESA BETA SAC' }, cliente: { email: 'cliente@test.pe' },
};

test('envía PDF y XML al correo del cliente', async () => {
  const enviados = [];
  const n = crearNotificador({
    prisma: prismaCon(base), almacen: { leer: async () => Buffer.from('<xml/>') },
    enviarCorreo: async (c) => enviados.push(c), generar: async () => Buffer.from('%PDF'),
  });
  assert.deepEqual(await n.comprobanteAceptado('f1'), { enviado: true });
  assert.equal(enviados[0].to, 'cliente@test.pe');
  assert.deepEqual(enviados[0].attachments.map((a) => a.filename), ['20000000001-01-F001-3.pdf', '20000000001-01-F001-3.xml']);
});

test('sin correo del cliente no envía nada', async () => {
  const n = crearNotificador({
    prisma: prismaCon({ ...base, cliente: { email: null } }), almacen: {},
    enviarCorreo: async () => { throw new Error('no debería'); },
  });
  assert.deepEqual(await n.comprobanteAceptado('f1'), { enviado: false });
});
