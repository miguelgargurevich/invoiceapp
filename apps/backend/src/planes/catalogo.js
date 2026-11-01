// Planes por país: el plan gratis de cada país y la forma pública (landing, asistente y Configuración).
const SLUG_GRATIS = { PE: 'pe-gratis', US: 'free' };

async function planGratisDe(prisma, pais = 'US') {
  const slug = SLUG_GRATIS[pais] || SLUG_GRATIS.US;
  const plan = await prisma.plan.findUnique({ where: { slug } });
  if (plan) return plan;
  // Sin la semilla del país: el primer plan activo y gratis de ese país.
  return prisma.plan.findFirst({
    where: { pais: pais === 'PE' ? 'PE' : 'US', isActive: true, priceMonthly: 0 },
    orderBy: { displayOrder: 'asc' },
  });
}

function featuresPe(plan) {
  const f = [];
  f.push(plan.maxInvoicesPerMonth === -1 ? 'Comprobantes ilimitados' : `${plan.maxInvoicesPerMonth} comprobantes al mes`);
  f.push(plan.maxClients === -1 ? 'Clientes ilimitados' : `${plan.maxClients} clientes`);
  f.push('Factura, boleta y notas de crédito y débito');
  f.push('PDF y envío por correo');
  if (plan.hasReports) f.push('Reportes');
  if (plan.hasProposals) f.push('Proformas');
  if (plan.hasDigitalSignatures) f.push('Firma digital de documentos');
  if (plan.hasRegimenesSunat) f.push('Detracción y percepción');
  if (plan.hasCustomBranding) f.push('Tu logo en los comprobantes');
  if (plan.hasAdvancedReports) f.push('Reportes avanzados');
  if (plan.hasMultiCurrency) f.push('Multimoneda');
  if (plan.hasApiAccess) f.push('Acceso por API');
  if (plan.hasPrioritySupport) f.push('Soporte prioritario');
  return f;
}

function featuresUs(plan) {
  const f = [];
  f.push(plan.maxInvoicesPerMonth === -1 ? 'Unlimited invoices' : `${plan.maxInvoicesPerMonth} invoices per month`);
  f.push(plan.maxClients === -1 ? 'Unlimited clients' : `${plan.maxClients} clients`);
  f.push(plan.maxStorageMb >= 1000 ? `${(plan.maxStorageMb / 1024).toFixed(0)}GB storage` : `${plan.maxStorageMb}MB storage`);
  if (plan.hasProposals) f.push('Proposals');
  if (plan.hasDigitalSignatures) f.push('Digital signatures');
  if (plan.hasJobTracking) f.push('Job tracking');
  if (plan.hasReports) f.push('Reports');
  if (plan.hasAdvancedReports) f.push('Advanced reports');
  if (plan.hasCustomBranding) f.push('Custom branding');
  if (plan.hasMultiCurrency) f.push('Multi-currency');
  if (plan.hasApiAccess) f.push('API access');
  if (plan.hasPrioritySupport) f.push('Priority support');
  return f;
}

function planPublico(plan) {
  return {
    id: plan.slug,
    name: plan.name,
    description: plan.description,
    priceMonthly: parseFloat(plan.priceMonthly),
    priceYearly: parseFloat(plan.priceYearly),
    currency: plan.currency,
    pais: plan.pais,
    features: plan.pais === 'PE' ? featuresPe(plan) : featuresUs(plan),
    maxInvoices: plan.maxInvoicesPerMonth === -1 ? null : plan.maxInvoicesPerMonth,
    maxClients: plan.maxClients === -1 ? null : plan.maxClients,
    maxUsers: null,
    isActive: plan.isActive,
    sortOrder: plan.displayOrder,
    isPopular: plan.isPopular,
  };
}

module.exports = { planGratisDe, planPublico };
