const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Crear pool de conexiones con configuración para Supabase Pooler
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reducir para pooler
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
  // SSL es requerido para Supabase
  ssl: { rejectUnauthorized: false },
});

// Manejar errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
});

// Crear adapter con configuración para PgBouncer
const adapter = new PrismaPg(pool, {
  schema: 'public',
});

// Crear cliente de Prisma con adapter
const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

console.log('✅ Prisma client initialized successfully with Supabase Pooler');

module.exports = prisma;
