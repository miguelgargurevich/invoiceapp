#!/usr/bin/env node
// Crea en Culqi los planes recurrentes de Perú y guarda sus ids. Idempotente: no repite los que ya tienen id.
// Uso: CULQI_SECRET_KEY=sk_test_… DATABASE_URL=… node scripts/culqi-crear-planes.js
const prisma = require('../src/utils/prisma');
const { crearClienteCulqi, aCentimos } = require('../src/pagos/culqi/cliente');

const INTERVALOS = [
  { campo: 'culqiPlanIdMensual', precio: 'priceMonthly', unidad: 3, sufijo: 'mensual' },
  { campo: 'culqiPlanIdAnual', precio: 'priceYearly', unidad: 4, sufijo: 'anual' },
];

async function main() {
  const culqi = crearClienteCulqi();
  const planes = await prisma.plan.findMany({ where: { pais: 'PE', isActive: true }, orderBy: { displayOrder: 'asc' } });
  for (const plan of planes) {
    for (const i of INTERVALOS) {
      const monto = aCentimos(plan[i.precio]);
      if (monto === 0) continue;
      if (plan[i.campo]) { console.log(`= ${plan.slug} ${i.sufijo}: ya existe ${plan[i.campo]}`); continue; }
      const creado = await culqi.crearPlan({
        name: `Facturo ${plan.name} ${i.sufijo}`,
        short_name: `facturo-${plan.slug}-${i.sufijo}`,
        description: plan.description || `Plan ${plan.name}`,
        amount: monto,
        currency: 'PEN',
        interval_unit_time: i.unidad,
        interval_count: 0, // cobro indefinido (verificar en sandbox: Tarea 6)
        initial_cycles: { count: 0, has_initial_charge: false, amount: 0, interval_unit_time: i.unidad },
        metadata: { slug: plan.slug },
      });
      await prisma.plan.update({ where: { id: plan.id }, data: { [i.campo]: creado.id } });
      console.log(`+ ${plan.slug} ${i.sufijo}: ${creado.id} (S/ ${(monto / 100).toFixed(2)})`);
    }
  }
}

main().catch((e) => { console.error('Error:', e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
