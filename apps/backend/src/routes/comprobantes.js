const express = require('express');
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const {
  guardarBorrador, previsualizar, datosDesdeFactura, INCLUDE_COMPROBANTE, INCLUDE_RESPUESTA,
} = require('../sunat/emision/borradores');
const { responderError, soloPeru } = require('../sunat/http');
const { ErrorEstado } = require('../sunat/errores');
const { generarPdf } = require('../sunat/pdf/representacion');
const { nombreBase } = require('../sunat/engine/mapper');
const { crearLimiteDiario } = require('../demo/limite');

function crearRouterComprobantes({
  prisma,
  obtenerSunat,
  auth = [authenticateToken, getEmpresaFromUser],
  // El cupo del plan se cobra al EMITIR (planes/cupo.js), no al crear el borrador.
  limites = { verificar: (_req, _res, next) => next(), incrementar: async () => {} },
  ahora = () => new Date(),
}) {
  const router = express.Router();
  router.use(...auth, soloPeru);

  const manejar = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) { responderError(res, error); }
  };
  const servicios = async (res) => {
    const sunat = await obtenerSunat();
    if (!sunat) res.status(503).json({ error: 'El módulo SUNAT no está disponible' });
    return sunat;
  };
  const buscar = (req, include = INCLUDE_RESPUESTA) => prisma.factura.findFirst({
    where: { id: req.params.id, empresaId: req.empresa.id, estadoSunat: { not: null } },
    include,
  });

  // Toda ruta con :id exige que el comprobante sea electrónico y de la empresa del usuario (404 si no):
  // los servicios responden con otros códigos y no deben decidir qué existe para quién.
  router.param('id', async (req, res, next, id) => {
    try {
      const f = await prisma.factura.findFirst({
        where: { id, empresaId: req.empresa.id, estadoSunat: { not: null } },
        select: { id: true },
      });
      if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
      return next();
    } catch (error) {
      return next(error);
    }
  });

  router.post('/preview', manejar(async (req, res) => {
    res.json(await previsualizar({ prisma, empresa: req.empresa, datos: req.body }));
  }));

  router.get('/', manejar(async (req, res) => {
    const where = { empresaId: req.empresa.id, estadoSunat: req.query.estadoSunat ? String(req.query.estadoSunat) : { not: null } };
    if (req.query.tipoComprobante) where.tipoComprobante = String(req.query.tipoComprobante);
    res.json(await prisma.factura.findMany({ where, include: { cliente: true }, orderBy: { createdAt: 'desc' }, take: 100 }));
  }));

  router.get('/:id', manejar(async (req, res) => {
    const f = await buscar(req, { ...INCLUDE_RESPUESTA, envios: { orderBy: { createdAt: 'desc' } } });
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    return res.json(f);
  }));

  router.post('/', limites.verificar, manejar(async (req, res) => {
    const f = await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: req.body });
    await limites.incrementar(req.empresa.id, 'invoice');
    res.status(201).json(f);
  }));

  router.put('/:id', manejar(async (req, res) => {
    res.json(await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: req.body, facturaId: req.params.id }));
  }));

  router.delete('/:id', manejar(async (req, res) => {
    const f = await buscar(req);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (f.estadoSunat !== 'BORRADOR') throw new ErrorEstado('Solo se puede eliminar un borrador: un comprobante emitido se anula');
    await prisma.factura.delete({ where: { id: f.id } });
    return res.status(204).end();
  }));

  // Demo: máximo 30 comprobantes emitidos por empresa y por día (no hace nada fuera de la demo).
  router.post('/:id/emitir', crearLimiteDiario({ prisma, ahora }), manejar(async (req, res) => {
    const sunat = await servicios(res);
    if (!sunat) return;
    res.json(await sunat.servicioEmision.emitir(req.params.id, req.empresa.id));
  }));

  router.post('/:id/anular', manejar(async (req, res) => {
    const sunat = await servicios(res);
    if (!sunat) return;
    const procesoId = await sunat.servicioAnulacion.solicitarAnulacion(req.params.id, req.empresa.id, req.body?.motivo);
    res.status(202).json({ procesoId });
  }));

  router.post('/:id/corregir', manejar(async (req, res) => {
    const f = await buscar(req, INCLUDE_COMPROBANTE);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (f.estadoSunat !== 'RECHAZADO') throw new ErrorEstado('Solo se corrige un comprobante rechazado por SUNAT');
    const nuevo = await guardarBorrador({ prisma, empresa: req.empresa, userId: req.user.id, datos: datosDesdeFactura(f) });
    return res.status(201).json(nuevo);
  }));

  // El backend lee el archivo y lo envía: el fetch autenticado del navegador no sigue bien una
  // redirección a otro dominio, y así no se expone ninguna URL del bucket privado.
  const ARCHIVOS = {
    xml: { campo: 'xmlKey', tipo: 'application/xml', extension: 'xml' },
    cdr: { campo: 'cdrKey', tipo: 'application/zip', extension: 'cdr.zip' },
  };
  for (const [ruta, archivo] of Object.entries(ARCHIVOS)) {
    router.get(`/:id/${ruta}`, manejar(async (req, res) => {
      const f = await buscar(req, INCLUDE_COMPROBANTE);
      if (!f?.[archivo.campo]) return res.status(404).json({ error: 'Archivo no disponible' });
      const sunat = await servicios(res);
      if (!sunat) return undefined;
      const contenido = await sunat.almacen.leer(f[archivo.campo]);
      return res
        .type(archivo.tipo)
        .set('Content-Disposition', `attachment; filename="${nombreBase(f.empresa, f)}.${archivo.extension}"`)
        .send(contenido);
    }));
  }

  router.get('/:id/pdf', manejar(async (req, res) => {
    const f = await buscar(req, INCLUDE_COMPROBANTE);
    if (!f) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (!f.xmlKey) return res.status(409).json({ error: 'El PDF está disponible cuando el comprobante ya fue emitido' });
    const pdf = await generarPdf(f);
    return res
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename="${nombreBase(f.empresa, f)}.pdf"`)
      .send(pdf);
  }));

  return router;
}

module.exports = { crearRouterComprobantes };
