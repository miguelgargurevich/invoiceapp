// Borra SOLO los datos de las cuentas de demo (sus empresas, comprobantes, clientes, productos, proformas…).
// No toca planes, configuracion_sitio ni ninguna otra cuenta. El orden respeta las claves foráneas que no
// cascadean (ProcesoSunatItem → Factura, Factura → Empresa/Cliente, Empresa → UserProfile).
const { CORREOS_DEMO } = require('./perfiles');

// Devuelve cuántas empresas y cuentas se borraron (0 si no había nada).
async function borrarDatosDemo(prisma) {
  const usuarios = await prisma.userProfile.findMany({
    where: { email: { in: [...CORREOS_DEMO] } },
    select: { id: true },
  });
  const idsUsuarios = usuarios.map((u) => u.id);
  const empresas = await prisma.empresa.findMany({
    where: { userId: { in: idsUsuarios } },
    select: { id: true },
  });
  const idsEmpresas = empresas.map((e) => e.id);
  if (idsUsuarios.length === 0 && idsEmpresas.length === 0) return { empresas: 0, usuarios: 0 };

  await prisma.$transaction(async (tx) => {
    await tx.procesoSunatItem.deleteMany({ where: { factura: { empresaId: { in: idsEmpresas } } } });
    await tx.factura.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    await tx.proforma.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    // Sin relación en el esquema: no cascadean con la empresa.
    await tx.configuracionSeries.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    await tx.usageEvent.deleteMany({ where: { empresaId: { in: idsEmpresas } } });
    await tx.empresa.deleteMany({ where: { id: { in: idsEmpresas } } });
    await tx.userProfile.deleteMany({ where: { id: { in: idsUsuarios } } });
  });

  return { empresas: idsEmpresas.length, usuarios: idsUsuarios.length };
}

module.exports = { borrarDatosDemo };
