const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('🔄 Initializing Prisma client...');
console.log('📍 Database URL prefix:', process.env.DATABASE_URL.substring(0, 30) + '...');

// Crear pool de conexiones con configuración para Supabase Pooler
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Crear adapter
const adapter = new PrismaPg(pool);

// Crear cliente de Prisma con adapter (REQUERIDO para Prisma 7.x)
const prisma = new PrismaClient({ 
  adapter,
});

console.log('✅ Prisma client initialized successfully');

module.exports = prisma;
