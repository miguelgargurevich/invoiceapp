// /api/demo — solo existe con MODO_DEMO=si (sin la variable responde 404, como cualquier ruta inexistente).
// Contrato con el frontend: docs/superpowers/specs/2026-11-11-demo-facturo-design.md (Anexo).
const express = require('express');
const rateLimit = require('express-rate-limit');
const { generateAccessToken, sanitizeUser } = require('../middleware/auth');
const { esDemo, LIMITE_DIARIO, limitesPeticiones } = require('./modo');
const { PERFILES, PERFIL_CLIENTE, CORREOS_DEMO } = require('./perfiles');

// Entrar sin contraseña es lo más delicado de la demo: límite propio y más estricto que el general.
function crearLimitadorEntrar() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: limitesPeticiones().entrarDemo,
    message: { error: 'Demasiados intentos de entrar a la demo, intenta más tarde' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// `perfiles` solo se inyecta en pruebas; el guardián de abajo no depende de él.
function crearRouterDemo({ prisma, limitadorEntrar = crearLimitadorEntrar(), perfiles = PERFILES }) {
  const router = express.Router();

  // Sin MODO_DEMO esta ruta no existe.
  router.use((req, res, next) => (esDemo() ? next() : res.status(404).json({ error: 'Ruta no encontrada' })));

  // Solicitud de firma PENDIENTE (y vigente) más reciente de la empresa de «servicios».
  async function enlaceFirma() {
    const usuario = await prisma.userProfile.findUnique({ where: { email: PERFILES.servicios.email }, select: { id: true } });
    if (!usuario) return null;
    const empresa = await prisma.empresa.findFirst({ where: { userId: usuario.id }, select: { id: true } });
    if (!empresa) return null;
    const solicitud = await prisma.signatureRequest.findFirst({
      where: { empresaId: empresa.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { token: true },
    });
    return solicitud ? `/es/sign/${solicitud.token}` : null;
  }

  router.get('/estado', async (req, res) => {
    try {
      const sitio = await prisma.configuracionSitio.findUnique({ where: { id: 'global' }, select: { demoWhatsapp: true } });
      res.json({
        activa: true,
        whatsapp: sitio?.demoWhatsapp || null,
        limiteDiario: LIMITE_DIARIO,
        perfiles: [
          { id: PERFILES.emprendedor.id, nombre: PERFILES.emprendedor.nombre, descripcion: PERFILES.emprendedor.descripcion },
          { id: PERFILES.servicios.id, nombre: PERFILES.servicios.nombre, descripcion: PERFILES.servicios.descripcion },
          { ...PERFIL_CLIENTE, enlaceFirma: await enlaceFirma() },
        ],
      });
    } catch (error) {
      console.error('[DEMO] Error en /estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Devuelve lo mismo que /api/auth/login. Solo las cuentas de demo, y solo si existen y están activas.
  router.post('/entrar', limitadorEntrar, async (req, res) => {
    const perfil = req.body?.perfil;
    // Object.hasOwn: «__proto__», «constructor»… no son perfiles.
    if (typeof perfil !== 'string' || !Object.hasOwn(perfiles, perfil)) {
      return res.status(400).json({ error: 'Perfil inválido. Elige «emprendedor» o «servicios».' });
    }
    try {
      const usuario = await prisma.userProfile.findUnique({ where: { email: perfiles[perfil].email } });
      // Guardián: aunque la tabla de perfiles se corrompiera, esta ruta jamás entrega la sesión de una cuenta
      // que no sea de demo, ni la de una de demo que alguien haya subido de rol.
      if (!usuario || !usuario.isActive || !CORREOS_DEMO.has(usuario.email) || usuario.role !== 'USER') {
        return res.status(503).json({ error: 'La cuenta de esta demo no está disponible por ahora. Intenta en unos minutos.' });
      }
      await prisma.userProfile.update({ where: { id: usuario.id }, data: { lastLogin: new Date() } });
      return res.json({
        user: sanitizeUser(usuario),
        session: { access_token: generateAccessToken(usuario), token_type: 'Bearer' },
      });
    } catch (error) {
      console.error('[DEMO] Error en /entrar:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}

module.exports = { crearRouterDemo };
