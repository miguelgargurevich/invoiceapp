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
const sitioRoutes = require('./src/routes/sitio');
const webhooksRoutes = require('./src/routes/webhooks');
const { crearRouterDemo } = require('./src/demo/rutas');
const { limitesPeticiones } = require('./src/demo/modo');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy - Required for Render and other reverse proxies
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: limitesPeticiones().general, // producción 300, desarrollo 1000, demo pública 3000 (src/demo/modo.js)
  message: { error: 'Demasiadas peticiones, intente más tarde' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Separate rate limiter for auth endpoints (more permissive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: limitesPeticiones().auth, // producción 50, desarrollo 200, demo pública 500 (src/demo/modo.js)
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
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Patterns to match (regex). Ninguno por defecto: los dominios se listan en FRONTEND_URL o CORS_ORIGINS.
const allowedPatterns = [];

// Dominios extra separados por comas: CORS_ORIGINS (ALLOWED_ORIGINS, el nombre anterior, sigue aceptándose)
const origenesExtra = [process.env.CORS_ORIGINS, process.env.ALLOWED_ORIGINS].filter(Boolean).join(',');
if (origenesExtra) {
  allowedOrigins.push(...origenesExtra.split(',').map(o => o.trim()).filter(Boolean));
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

// IMPORTANT: Webhook routes MUST be defined BEFORE express.json()
// Stripe webhooks need raw body for signature verification
app.use('/api/webhooks', webhooksRoutes);

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

// Public subscription plans (no authentication required - for landing page)
const subscriptionsRoutes = require('./src/routes/subscriptions');
app.get('/api/subscriptions/plans', limiter, async (req, res) => {
  try {
    const prisma = require('./src/utils/prisma');
    const { planPublico } = require('./src/planes/catalogo');
    const pais = req.query.pais === 'PE' ? 'PE' : 'US';
    const plans = await prisma.plan.findMany({
      where: { isActive: true, pais },
      orderBy: { displayOrder: 'asc' }
    });
    res.json(plans.map(planPublico));
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Error fetching plans' });
  }
});

// Demo pública de Facturo: existe solo con MODO_DEMO=si (sin la variable responde 404 como cualquier ruta inexistente)
app.use('/api/demo', limiter, crearRouterDemo({ prisma: require('./src/utils/prisma') }));

// Datos legales del servicio (públicos, sin sesión: los leen Términos, Privacidad, Contacto y el pie)
app.use('/api/sitio', limiter, sitioRoutes);

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
// Pagos de Perú con Culqi (el servicio se crea al usarse: sin CULQI_SECRET_KEY la app arranca igual)
const { crearRouterCulqi } = require('./src/routes/subscriptionsCulqi');
const { obtenerServicioCulqi } = require('./src/pagos/culqi');
app.use('/api/subscriptions/culqi', limiter, crearRouterCulqi({ prisma: require('./src/utils/prisma'), obtenerServicio: obtenerServicioCulqi }));
app.use('/api/subscriptions', limiter, authenticateToken, subscriptionsRoutes);

// 🇵🇪 Facturación electrónica SUNAT (se activa con SUNAT_ENGINE_URL)
const prismaSunat = require('./src/utils/prisma');
const { iniciarSunat } = require('./src/sunat');
const { crearRouterComprobantes } = require('./src/routes/comprobantes');
const { crearRouterSunat } = require('./src/routes/sunat');

const sunatListo = iniciarSunat({ prisma: prismaSunat }).catch((error) => {
  console.error('[SUNAT] No se pudo iniciar el módulo:', error.message);
  return null;
});
const obtenerSunat = () => sunatListo;
app.use('/api/comprobantes', limiter, crearRouterComprobantes({ prisma: prismaSunat, obtenerSunat }));
app.use('/api/sunat', limiter, crearRouterSunat({ prisma: prismaSunat, obtenerSunat }));

// Servir archivos estáticos (uploads)
// Misma carpeta que escribe el proveedor local de utils/storage.js (LOCAL_UPLOADS_DIR, por defecto ./uploads)
// helmet pone Cross-Origin-Resource-Policy: same-origin; la web vive en otro origen (facturo.… vs api.facturo.…),
// así que sin esto el navegador bloquea el logo y las fotos. Solo afecta a /uploads.
app.use('/uploads', express.static(process.env.LOCAL_UPLOADS_DIR || 'uploads', {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

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
