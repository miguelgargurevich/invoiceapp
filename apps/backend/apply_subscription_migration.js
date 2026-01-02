require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function applyMigration() {
  // Usar la URL directa, no la del pooler
  const client = new Client({
    connectionString: process.env.DIRECT_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL de migración
    const sql = fs.readFileSync('./prisma/migrations/20250101_add_subscription_system.sql', 'utf8');
    
    console.log('📦 Aplicando migración de suscripciones...');
    await client.query(sql);
    
    console.log('✅ Migración aplicada exitosamente');

    // Ahora insertar los planes
    console.log('📦 Insertando planes...');
    const seedSql = fs.readFileSync('./prisma/seed_plans.sql', 'utf8');
    await client.query(seedSql);
    
    console.log('✅ Planes insertados exitosamente');

    // Verificar
    const result = await client.query('SELECT name, slug, price_monthly, stripe_product_id FROM plans ORDER BY display_order');
    console.log('\n📋 Planes en la base de datos:');
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.slug}): $${row.price_monthly}/mes - Product: ${row.stripe_product_id || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Las tablas ya existen. Intentando solo insertar planes...');
      try {
        const seedSql = fs.readFileSync('./prisma/seed_plans.sql', 'utf8');
        await client.query(seedSql);
        console.log('✅ Planes actualizados exitosamente');
      } catch (seedError) {
        console.error('❌ Error al insertar planes:', seedError.message);
      }
    }
  } finally {
    await client.end();
  }
}

applyMigration();
