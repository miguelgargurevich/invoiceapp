const { PrismaClient } = require('@prisma/client');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Crear cliente de Prisma - tomará DATABASE_URL del entorno automáticamente
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

console.log('✅ Prisma client initialized successfully');

module.exports = prisma;
