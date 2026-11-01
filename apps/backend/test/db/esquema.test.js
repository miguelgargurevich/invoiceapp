const test = require('node:test');
const assert = require('node:assert/strict');
const { prisma, limpiar, crearEmpresaPeru } = require('./ayuda');

test.before(limpiar);
test.after(() => prisma.$disconnect());

test('dos borradores de la misma serie pueden convivir sin número', async () => {
  const { empresa, cliente } = await crearEmpresaPeru();
  const base = {
    empresaId: empresa.id, clienteId: cliente.id, userId: empresa.userId, serie: 'F001', numero: null,
    fechaEmision: new Date(), estadoSunat: 'BORRADOR', subtotal: 0, igv: 0, total: 0,
  };
  await prisma.factura.create({ data: base });
  await prisma.factura.create({ data: base });
  assert.equal(await prisma.factura.count({ where: { empresaId: empresa.id, numero: null } }), 2);
});

test('las empresas existentes quedan como US', async () => {
  const user = await prisma.userProfile.create({ data: { email: `us-${Date.now()}@test.com` } });
  const empresa = await prisma.empresa.create({ data: { nombre: 'Acme', ruc: `US-${Date.now()}`, userId: user.id } });
  assert.equal(empresa.pais, 'US');
});
