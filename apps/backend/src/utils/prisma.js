const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

console.log('🔄 Starting Prisma initialization...');

// Validar que DATABASE_URL existe
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')));
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('📍 DATABASE_URL found, length:', databaseUrl.length);

let prisma;

try {
  // Crear pool de conexiones con configuración para Supabase Pooler
  console.log('🔗 Creating pg Pool...');
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('✅ Pool created');

  // Crear adapter
  console.log('🔗 Creating PrismaPg adapter...');
  const adapter = new PrismaPg(pool);
  console.log('✅ Adapter created:', typeof adapter);

  // Verificar que el adapter es válido
  if (!adapter) {
    throw new Error('PrismaPg adapter is null or undefined');
  }

  // Crear cliente de Prisma con adapter
  console.log('🔗 Creating PrismaClient with adapter...');
  const options = { adapter };
  console.log('Options:', JSON.stringify({ hasAdapter: !!options.adapter }));
  
  prisma = new PrismaClient(options);
  console.log('✅ Prisma client initialized successfully');

} catch (error) {
  console.error('❌ Error during Prisma initialization:', error);
  console.error('Stack:', error.stack);
  throw error;
}

module.exports = prisma;
