const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Crear pool de conexiones
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// Crear adapter
const adapter = new PrismaPg(pool);

// Crear cliente de Prisma con adapter
const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

console.log('✅ Prisma client initialized successfully');

module.exports = prisma;
