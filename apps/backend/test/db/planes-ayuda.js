// Siembra los planes de Perú desde prisma/seed_plans_pe.sql (el mismo archivo que se usa en producción).
const fs = require('node:fs');
const path = require('node:path');
const { prisma } = require('./ayuda');

async function sembrarPlanesPe() {
  const sql = fs.readFileSync(path.join(__dirname, '../../prisma/seed_plans_pe.sql'), 'utf8');
  await prisma.$executeRawUnsafe(sql);
  const planes = await prisma.plan.findMany({ where: { pais: 'PE' } });
  return Object.fromEntries(planes.map((p) => [p.slug, p]));
}

module.exports = { sembrarPlanesPe };
