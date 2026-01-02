require('dotenv').config();
const prisma = require('./src/utils/prisma');

async function testPlans() {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });

    console.log('✅ Endpoint de planes funcionando!');
    console.log('');
    console.log('📦 Planes disponibles:', plans.length);
    console.log('');
    
    plans.forEach(plan => {
      console.log(`${plan.isPopular ? '⭐' : '  '} ${plan.name}`);
      console.log(`   Slug: ${plan.slug}`);
      console.log(`   Precio: $${plan.priceMonthly}/mes | $${plan.priceYearly}/año`);
      console.log(`   Stripe Product: ${plan.stripeProductId}`);
      console.log(`   Monthly Price: ${plan.stripePriceIdMonthly}`);
      console.log(`   Yearly Price: ${plan.stripePriceIdYearly}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPlans();
