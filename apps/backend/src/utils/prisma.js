const { PrismaClient } = require('@prisma/client');

// Validar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Para Supabase con PgBouncer, usar Prisma directamente sin adapter
// El adapter PrismaPg no es necesario cuando usas la URL de pooler
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

console.log('✅ Prisma client initialized successfully');

module.exports = prisma;
