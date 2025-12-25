const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Crear pool de conexiones con configuración optimizada para Supabase
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reducir conexiones concurrentes
  idleTimeoutMillis: 60000, // 60 segundos antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 10000, // 10 segundos para establecer conexión
  allowExitOnIdle: false,
});

// Manejar errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
});

// Crear adapter
const adapter = new PrismaPg(pool);

// Crear cliente de Prisma con adapter
const prisma = new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Manejar desconexión al cerrar la aplicación
const cleanup = async () => {
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log('✅ Base de datos desconectada correctamente');
  } catch (error) {
    console.error('❌ Error al desconectar:', error);
  }
};

process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = prisma;
