// 🔥 Limpiar caché de Prisma para forzar recarga del cliente regenerado
delete require.cache[require.resolve('@prisma/client')];

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

console.log('✅ Prisma client initialized successfully');

module.exports = prisma;
