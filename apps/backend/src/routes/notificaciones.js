const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');

/**
 * GET /api/notificaciones
 * Obtiene notificaciones del usuario: facturas vencidas, próximas a vencer, proformas pendientes
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const empresaId = req.user.empresaId;
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // 1. Facturas vencidas (EMITIDA o PENDIENTE con fecha de vencimiento pasada)
    const facturasVencidas = await prisma.factura.findMany({
      where: {
        empresaId,
        estado: {
          in: ['EMITIDA', 'PENDIENTE'],
        },
        fechaVencimiento: {
          lt: now,
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaVencimiento: 'asc',
      },
      take: 10,
    });

    // 2. Facturas próximas a vencer (en los próximos 7 días)
    const facturasProximasVencer = await prisma.factura.findMany({
      where: {
        empresaId,
        estado: {
          in: ['EMITIDA', 'PENDIENTE'],
        },
        fechaVencimiento: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaVencimiento: 'asc',
      },
      take: 10,
    });

    // 3. Proformas pendientes (sin respuesta después de 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const proformasPendientes = await prisma.proforma.findMany({
      where: {
        empresaId,
        estado: 'pendiente',
        fechaEmision: {
          lt: sevenDaysAgo,
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaEmision: 'asc',
      },
      take: 10,
    });

    // 4. Facturas con pagos pendientes (estado EMITIDA o PENDIENTE)
    const facturasPagosPendientes = await prisma.factura.findMany({
      where: {
        empresaId,
        estado: {
          in: ['EMITIDA', 'PENDIENTE'],
        },
        fechaVencimiento: {
          gte: now, // No vencidas aún
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        fechaVencimiento: 'asc',
      },
      take: 5,
    });

    // Construir array de notificaciones
    const notificaciones = [];

    // Agregar facturas vencidas
    facturasVencidas.forEach((factura) => {
      const diasVencido = Math.floor((now - new Date(factura.fechaVencimiento)) / (1000 * 60 * 60 * 24));
      notificaciones.push({
        id: `overdue-${factura.id}`,
        type: 'overdue',
        title: 'Factura vencida',
        message: `${factura.serie}-${factura.numero} de ${factura.cliente.nombre}`,
        detail: `Vencida hace ${diasVencido} día${diasVencido !== 1 ? 's' : ''}`,
        amount: factura.total,
        date: factura.fechaVencimiento,
        link: `/facturas/${factura.id}`,
        priority: 'high',
      });
    });

    // Agregar facturas próximas a vencer
    facturasProximasVencer.forEach((factura) => {
      const diasRestantes = Math.ceil((new Date(factura.fechaVencimiento) - now) / (1000 * 60 * 60 * 24));
      notificaciones.push({
        id: `due-soon-${factura.id}`,
        type: 'due_soon',
        title: 'Factura próxima a vencer',
        message: `${factura.serie}-${factura.numero} de ${factura.cliente.nombre}`,
        detail: `Vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
        amount: factura.total,
        date: factura.fechaVencimiento,
        link: `/facturas/${factura.id}`,
        priority: 'medium',
      });
    });

    // Agregar proformas sin respuesta
    proformasPendientes.forEach((proforma) => {
      const diasSinRespuesta = Math.floor((now - new Date(proforma.fechaEmision)) / (1000 * 60 * 60 * 24));
      notificaciones.push({
        id: `proposal-pending-${proforma.id}`,
        type: 'proposal_pending',
        title: 'Proforma sin respuesta',
        message: `${proforma.numero} para ${proforma.cliente.nombre}`,
        detail: `Sin respuesta hace ${diasSinRespuesta} días`,
        amount: proforma.total,
        date: proforma.fechaEmision,
        link: `/proformas/${proforma.id}`,
        priority: 'low',
      });
    });

    // Agregar algunas facturas con pagos pendientes (no vencidas)
    facturasPagosPendientes.slice(0, 3).forEach((factura) => {
      const diasRestantes = Math.ceil((new Date(factura.fechaVencimiento) - now) / (1000 * 60 * 60 * 24));
      if (diasRestantes > 7) { // Solo si no está en la lista de próximas a vencer
        notificaciones.push({
          id: `pending-payment-${factura.id}`,
          type: 'pending_payment',
          title: 'Pago pendiente',
          message: `${factura.serie}-${factura.numero} de ${factura.cliente.nombre}`,
          detail: `Vence en ${diasRestantes} días`,
          amount: factura.total,
          date: factura.fechaVencimiento,
          link: `/facturas/${factura.id}`,
          priority: 'low',
        });
      }
    });

    // Ordenar por prioridad y fecha
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    notificaciones.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.date) - new Date(b.date);
    });

    res.json({
      notificaciones: notificaciones.slice(0, 20), // Limitar a 20 notificaciones
      total: notificaciones.length,
      unread: notificaciones.length, // Por ahora todas son "no leídas"
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

module.exports = router;
