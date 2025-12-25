require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const empresaRoutes = require('./src/routes/empresa');
const clienteRoutes = require('./src/routes/clientes');
const productoRoutes = require('./src/routes/productos');
const categoriaRoutes = require('./src/routes/categorias');
const facturaRoutes = require('./src/routes/facturas');
const proformaRoutes = require('./src/routes/proformas');
const reporteRoutes = require('./src/routes/reportes');
const dashboardRoutes = require('./src/routes/dashboard');
const workLogRoutes = require('./src/routes/workLogs');
const jobPhotoRoutes = require('./src/routes/jobPhotos');
const jobReceiptRoutes = require('./src/routes/jobReceipts');

const app = express();
const PORT = process.env.PORT || 4000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: { error: 'Demasiadas peticiones, intente más tarde' }
});

// Middlewares
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://invoiceapp.vercel.app',
  'https://*.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como apps móviles o curl)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista o coincide con el patrón de Vercel
    if (allowedOrigins.some(allowed => 
      origin === allowed || 
      (allowed.includes('*') && origin.includes('vercel.app'))
    )) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/proformas', proformaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/job-photos', jobPhotoRoutes);
app.use('/api/job-receipts', jobReceiptRoutes);

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
