const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

let prisma;

try {
  // Crear pool de conexiones
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
  });

  // Crear adapter
  const adapter = new PrismaPg(pool);

  // Crear cliente de Prisma con adapter
  prisma = new PrismaClient({ 
    adapter: adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  console.log('✅ Prisma client initialized with PrismaPg adapter');
} catch (error) {
  console.error('❌ Error initializing Prisma with adapter:', error.message);
  
  // Fallback: intentar sin adapter (conexión directa)
  console.log('⚠️ Attempting fallback without adapter...');
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  console.log('✅ Prisma client initialized with direct connection');
}

module.exports = prisma;
