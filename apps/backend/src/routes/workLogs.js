const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Obtener todos los work logs de una factura
router.get('/factura/:facturaId', authenticateToken, async (req, res) => {
  try {
    const { facturaId } = req.params;

    // Verificar que la factura pertenezca a la empresa del usuario
    const factura = await prisma.factura.findFirst({
      where: {
        id: facturaId,
        empresa: { userId: req.user.userId }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const workLogs = await prisma.workLog.findMany({
      where: { facturaId },
      orderBy: { fecha: 'desc' }
    });

    res.json(workLogs);
  } catch (error) {
    console.error('Error al obtener work logs:', error);
    res.status(500).json({ error: 'Error al obtener registros de trabajo' });
  }
});

// Obtener todos los work logs de una proforma
router.get('/proforma/:proformaId', authenticateToken, async (req, res) => {
  try {
    const { proformaId } = req.params;

    // Verificar que la proforma pertenezca a la empresa del usuario
    const proforma = await prisma.proforma.findFirst({
      where: {
        id: proformaId,
        empresa: { userId: req.user.userId }
      }
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    const workLogs = await prisma.workLog.findMany({
      where: { proformaId },
      orderBy: { fecha: 'desc' }
    });

    res.json(workLogs);
  } catch (error) {
    console.error('Error al obtener work logs:', error);
    res.status(500).json({ error: 'Error al obtener registros de trabajo' });
  }
});

// Crear un work log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { facturaId, proformaId, fecha, descripcion, horasTrabajadas, trabajador, observaciones } = req.body;

    // Validar que se proporcione facturaId o proformaId (pero no ambos)
    if ((!facturaId && !proformaId) || (facturaId && proformaId)) {
      return res.status(400).json({ error: 'Debe proporcionar facturaId o proformaId (no ambos)' });
    }

    // Verificar permisos según el tipo
    if (facturaId) {
      const factura = await prisma.factura.findFirst({
        where: {
          id: facturaId,
          empresa: { userId: req.user.userId }
        }
      });
      if (!factura) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
    }

    if (proformaId) {
      const proforma = await prisma.proforma.findFirst({
        where: {
          id: proformaId,
          empresa: { userId: req.user.userId }
        }
      });
      if (!proforma) {
        return res.status(404).json({ error: 'Proforma no encontrada' });
      }
    }

    const workLog = await prisma.workLog.create({
      data: {
        facturaId: facturaId || null,
        proformaId: proformaId || null,
        fecha: new Date(fecha),
        descripcion,
        horasTrabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : null,
        trabajador,
        observaciones
      }
    });

    res.status(201).json(workLog);
  } catch (error) {
    console.error('Error al crear work log:', error);
    res.status(500).json({ error: 'Error al crear registro de trabajo' });
  }
});

// Actualizar un work log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, horasTrabajadas, trabajador, observaciones } = req.body;

    // Verificar que el work log existe y pertenece al usuario
    const existingWorkLog = await prisma.workLog.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
        ]
      }
    });

    if (!existingWorkLog) {
      return res.status(404).json({ error: 'Registro de trabajo no encontrado' });
    }

    const workLog = await prisma.workLog.update({
      where: { id },
      data: {
        ...(fecha && { fecha: new Date(fecha) }),
        ...(descripcion && { descripcion }),
        ...(horasTrabajadas !== undefined && { horasTrabajadas: horasTrabajadas ? parseFloat(horasTrabajadas) : null }),
        ...(trabajador !== undefined && { trabajador }),
        ...(observaciones !== undefined && { observaciones })
      }
    });

    res.json(workLog);
  } catch (error) {
    console.error('Error al actualizar work log:', error);
    res.status(500).json({ error: 'Error al actualizar registro de trabajo' });
  }
});

// Eliminar un work log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el work log existe y pertenece al usuario
    const existingWorkLog = await prisma.workLog.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
        ]
      }
    });

    if (!existingWorkLog) {
      return res.status(404).json({ error: 'Registro de trabajo no encontrado' });
    }

    await prisma.workLog.delete({
      where: { id }
    });

    res.json({ message: 'Registro de trabajo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar work log:', error);
    res.status(500).json({ error: 'Error al eliminar registro de trabajo' });
  }
});

module.exports = router;
