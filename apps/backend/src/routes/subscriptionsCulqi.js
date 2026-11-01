// /api/subscriptions/culqi — contratar y cambiar tarjeta (empresas de Perú).
const express = require('express');
const { z } = require('zod');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const { ErrorCulqi } = require('../pagos/culqi/cliente');
const { ErrorContratacion } = require('../pagos/culqi/suscripciones');

const tresDS = z.object({
  eci: z.string(), xid: z.string(), cavv: z.string(), protocolVersion: z.string(), directoryServerTransactionId: z.string(),
}).partial().optional();

const suscribirSchema = z.object({
  planSlug: z.string().min(1),
  intervalo: z.enum(['MONTH', 'YEAR']),
  tokenId: z.string().regex(/^tkn_(test|live)_/),
  facturacion: z.object({
    nombre: z.string().trim().min(1).max(50),
    apellido: z.string().trim().min(1).max(50),
    telefono: z.string().trim().min(6).max(20),
    direccion: z.string().trim().min(3).max(100),
    ciudad: z.string().trim().min(2).max(30),
  }),
  authentication3DS: tresDS,
});
const tarjetaSchema = z.object({ tokenId: z.string().regex(/^tkn_(test|live)_/), authentication3DS: tresDS });

function crearRouterCulqi({ prisma, obtenerServicio, auth = [authenticateToken, getEmpresaFromUser] }) {
  const router = express.Router();
  router.use(...auth, (req, res, next) => (req.empresa?.pais === 'PE'
    ? next()
    : res.status(403).json({ error: 'El pago con Culqi solo está disponible para empresas de Perú' })));

  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Datos inválidos', detalles: error.issues });
      if (error instanceof ErrorContratacion) return res.status(400).json({ error: error.message });
      if (error instanceof ErrorCulqi) {
        console.error('[CULQI]', error.status, error.tipo, error.message);
        return res.status(error.tipo === 'card_error' ? 402 : 502).json({ error: error.mensajeUsuario });
      }
      console.error('[CULQI]', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  router.post('/suscribir', manejar(async (req, res) => {
    const d = suscribirSchema.parse(req.body);
    const usuario = await prisma.userProfile.findUnique({ where: { id: req.user.id }, select: { email: true } });
    res.json(await obtenerServicio().suscribir({ empresa: req.empresa, email: usuario.email, ...d }));
  }));

  router.post('/tarjeta', manejar(async (req, res) => {
    const d = tarjetaSchema.parse(req.body);
    res.json(await obtenerServicio().cambiarTarjeta({ empresaId: req.empresa.id, ...d }));
  }));

  return router;
}

module.exports = { crearRouterCulqi };
