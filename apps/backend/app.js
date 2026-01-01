require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar middleware de autenticación
const { authenticateToken } = require('./src/middleware/auth');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const empresaRoutes = require('./src/routes/empresa');
const clienteRoutes = require('./src/routes/clientes');
const productoRoutes = require('./src/routes/productos');
const facturaRoutes = require('./src/routes/facturas');
const proformaRoutes = require('./src/routes/proformas');
const reporteRoutes = require('./src/routes/reportes');
const dashboardRoutes = require('./src/routes/dashboard');
const workLogRoutes = require('./src/routes/workLogs');
const jobPhotoRoutes = require('./src/routes/jobPhotos');
const jobReceiptRoutes = require('./src/routes/jobReceipts');
const signaturesRoutes = require('./src/routes/signatures');
const signaturesPublicRoutes = require('./src/routes/signaturesPublic');
const preferencesRoutes = require('./src/routes/preferences');
const notificacionesRoutes = require('./src/routes/notificaciones');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy - Required for Render and other reverse proxies
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // máximo 300 requests por ventana (aumentado de 100)
  message: { error: 'Demasiadas peticiones, intente más tarde' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Separate rate limiter for auth endpoints (more permissive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 requests por ventana para auth
  message: { error: 'Demasiadas peticiones de autenticación, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(helmet());

// CORS configuration - Supports multiple domains and patterns
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  'https://invoiceapp.vercel.app',
  'https://invoice-app.vercel.app',
].filter(Boolean);

// Patterns to match (regex)
const allowedPatterns = [
  /^https:\/\/.*\.vercel\.app$/, // Any Vercel subdomain
  /^https:\/\/invoiceapp.*\.vercel\.app$/, // Any invoiceapp-* Vercel deployment
];

// Optional: Allow additional domains from environment variable (comma-separated)
if (process.env.ALLOWED_ORIGINS) {
  const extraOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  allowedOrigins.push(...extraOrigins);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    if (allowedPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    
    // Development mode: allow all localhost origins
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Increased limit for PDF signatures and large documents
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagnóstico de Prisma
app.get('/api/debug/prisma', async (req, res) => {
  try {
    const prisma = require('./src/utils/prisma');
    await prisma.$connect();
    const count = await prisma.empresa.count();
    res.json({ 
      status: 'ok', 
      prismaConnected: true,
      empresaCount: count,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlLength: process.env.DATABASE_URL?.length || 0,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlLength: process.env.DATABASE_URL?.length || 0,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

// Debug: obtener todos los datos sin auth (solo para debug)
app.get('/api/debug/data', async (req, res) => {
  try {
    const prisma = require('./src/utils/prisma');
    const empresas = await prisma.empresa.findMany();
    const facturas = await prisma.factura.count();
    const proformas = await prisma.proforma.count();
    const clientes = await prisma.cliente.count();
    const productos = await prisma.producto.count();
    
    res.json({ 
      empresas: empresas.map(e => ({ id: e.id, nombre: e.nombre, userId: e.userId })),
      counts: { facturas, proformas, clientes, productos }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de la API
app.use('/api/auth', authLimiter, authRoutes); // Auth routes with separate limiter

// Public signature routes (no authentication required)
app.use('/api/signatures/public', limiter, signaturesPublicRoutes);

// Protected routes (authentication required)
app.use('/api/empresas', limiter, authenticateToken, empresaRoutes);
app.use('/api/clientes', limiter, authenticateToken, clienteRoutes);
app.use('/api/productos', limiter, authenticateToken, productoRoutes);
app.use('/api/facturas', limiter, authenticateToken, facturaRoutes);
app.use('/api/proformas', limiter, authenticateToken, proformaRoutes);
app.use('/api/reportes', limiter, authenticateToken, reporteRoutes);
app.use('/api/dashboard', limiter, authenticateToken, dashboardRoutes);
app.use('/api/work-logs', limiter, authenticateToken, workLogRoutes);
app.use('/api/job-photos', limiter, authenticateToken, jobPhotoRoutes);
app.use('/api/job-receipts', limiter, authenticateToken, jobReceiptRoutes);
app.use('/api/signatures', limiter, authenticateToken, signaturesRoutes);
app.use('/api/preferences', limiter, authenticateToken, preferencesRoutes);
app.use('/api/notificaciones', limiter, authenticateToken, notificacionesRoutes);
app.use('/api/admin', limiter, authenticateToken, adminRoutes);

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
