const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// GET /api/reportes/ventas - Reporte de ventas
router.get('/ventas', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { fechaInicio, fechaFin, agrupacion = 'mes' } = req.query;

  try {
    const where = {
      empresaId: req.empresa.id,
      estado: { not: 'anulada' },
      ...(fechaInicio && fechaFin && {
        fechaEmision: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      })
    };

    const facturas = await prisma.factura.findMany({
      where,
      select: {
        id: true,
        fechaEmision: true,
        total: true,
        estado: true,
        moneda: true
      },
      orderBy: { fechaEmision: 'asc' }
    });

    // Agrupar por período
    const grouped = {};
    facturas.forEach(factura => {
      let key;
      const fecha = new Date(factura.fechaEmision);
      
      if (agrupacion === 'dia') {
        key = fecha.toISOString().split('T')[0];
      } else if (agrupacion === 'semana') {
        const week = getWeekNumber(fecha);
        key = `${fecha.getFullYear()}-W${week}`;
      } else {
        key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { periodo: key, total: 0, cantidad: 0, pagado: 0, pendiente: 0 };
      }
      
      const total = parseFloat(factura.total);
      grouped[key].total += total;
      grouped[key].cantidad += 1;
      
      if (factura.estado === 'pagada') {
        grouped[key].pagado += total;
      } else if (factura.estado === 'emitida') {
        grouped[key].pendiente += total;
      }
    });

    // Calcular totales
    const totalVentas = facturas.reduce((acc, f) => acc + parseFloat(f.total), 0);
    const totalPagado = facturas.filter(f => f.estado === 'pagada').reduce((acc, f) => acc + parseFloat(f.total), 0);
    const totalPendiente = facturas.filter(f => f.estado === 'emitida').reduce((acc, f) => acc + parseFloat(f.total), 0);

    res.json({
      resumen: {
        totalVentas: parseFloat(totalVentas.toFixed(2)),
        totalPagado: parseFloat(totalPagado.toFixed(2)),
        totalPendiente: parseFloat(totalPendiente.toFixed(2)),
        cantidadFacturas: facturas.length
      },
      datos: Object.values(grouped).map(g => ({
        ...g,
        total: parseFloat(g.total.toFixed(2)),
        pagado: parseFloat(g.pagado.toFixed(2)),
        pendiente: parseFloat(g.pendiente.toFixed(2))
      }))
    });
  } catch (error) {
    console.error('Error generando reporte de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/clientes - Reporte por cliente
router.get('/clientes', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { fechaInicio, fechaFin, limite = 10 } = req.query;

  try {
    const where = {
      empresaId: req.empresa.id,
      estado: { not: 'anulada' },
      ...(fechaInicio && fechaFin && {
        fechaEmision: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      })
    };

    const facturas = await prisma.factura.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            razonSocial: true,
            numeroDocumento: true
          }
        }
      }
    });

    // Agrupar por cliente
    const porCliente = {};
    facturas.forEach(factura => {
      const clienteId = factura.cliente.id;
      if (!porCliente[clienteId]) {
        porCliente[clienteId] = {
          cliente: factura.cliente,
          totalVentas: 0,
          cantidadFacturas: 0,
          pagado: 0,
          pendiente: 0
        };
      }
      
      const total = parseFloat(factura.total);
      porCliente[clienteId].totalVentas += total;
      porCliente[clienteId].cantidadFacturas += 1;
      
      if (factura.estado === 'pagada') {
        porCliente[clienteId].pagado += total;
      } else if (factura.estado === 'emitida') {
        porCliente[clienteId].pendiente += total;
      }
    });

    // Ordenar por total y limitar
    const datos = Object.values(porCliente)
      .map(c => ({
        ...c,
        totalVentas: parseFloat(c.totalVentas.toFixed(2)),
        pagado: parseFloat(c.pagado.toFixed(2)),
        pendiente: parseFloat(c.pendiente.toFixed(2))
      }))
      .sort((a, b) => b.totalVentas - a.totalVentas)
      .slice(0, parseInt(limite));

    res.json({
      datos,
      totalClientes: Object.keys(porCliente).length
    });
  } catch (error) {
    console.error('Error generando reporte de clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/productos - Productos más vendidos
router.get('/productos', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { fechaInicio, fechaFin, limite = 10 } = req.query;

  try {
    const where = {
      factura: {
        empresaId: req.empresa.id,
        estado: { not: 'anulada' },
        ...(fechaInicio && fechaFin && {
          fechaEmision: {
            gte: new Date(fechaInicio),
            lte: new Date(fechaFin)
          }
        })
      }
    };

    const detalles = await prisma.detalleFactura.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true
          }
        }
      }
    });

    // Agrupar por producto
    const porProducto = {};
    detalles.forEach(detalle => {
      const key = detalle.productoId || detalle.descripcion;
      if (!porProducto[key]) {
        porProducto[key] = {
          producto: detalle.producto || { nombre: detalle.descripcion },
          cantidadVendida: 0,
          totalVentas: 0,
          vecesVendido: 0
        };
      }
      
      porProducto[key].cantidadVendida += parseFloat(detalle.cantidad);
      porProducto[key].totalVentas += parseFloat(detalle.total);
      porProducto[key].vecesVendido += 1;
    });

    // Ordenar por total y limitar
    const datos = Object.values(porProducto)
      .map(p => ({
        ...p,
        cantidadVendida: parseFloat(p.cantidadVendida.toFixed(2)),
        totalVentas: parseFloat(p.totalVentas.toFixed(2))
      }))
      .sort((a, b) => b.totalVentas - a.totalVentas)
      .slice(0, parseInt(limite));

    res.json({ datos });
  } catch (error) {
    console.error('Error generando reporte de productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/cuentas-por-cobrar - Facturas pendientes
router.get('/cuentas-por-cobrar', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      where: {
        empresaId: req.empresa.id,
        estado: 'emitida'
      },
      include: {
        cliente: {
          select: {
            id: true,
            razonSocial: true,
            numeroDocumento: true
          }
        },
        pagos: true
      },
      orderBy: { fechaVencimiento: 'asc' }
    });

    const hoy = new Date();
    const datos = facturas.map(factura => {
      const totalPagado = factura.pagos.reduce((acc, p) => acc + parseFloat(p.monto), 0);
      const saldoPendiente = parseFloat(factura.total) - totalPagado;
      const fechaVencimiento = factura.fechaVencimiento ? new Date(factura.fechaVencimiento) : null;
      const diasVencido = fechaVencimiento ? Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: factura.id,
        serie: factura.serie,
        numero: factura.numero,
        cliente: factura.cliente,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        total: parseFloat(factura.total),
        totalPagado,
        saldoPendiente,
        diasVencido: Math.max(0, diasVencido),
        vencida: diasVencido > 0
      };
    });

    // Calcular resumen
    const totalPendiente = datos.reduce((acc, d) => acc + d.saldoPendiente, 0);
    const totalVencido = datos.filter(d => d.vencida).reduce((acc, d) => acc + d.saldoPendiente, 0);

    res.json({
      resumen: {
        totalFacturas: datos.length,
        totalPendiente: parseFloat(totalPendiente.toFixed(2)),
        totalVencido: parseFloat(totalVencido.toFixed(2)),
        facturasVencidas: datos.filter(d => d.vencida).length
      },
      datos
    });
  } catch (error) {
    console.error('Error generando reporte de cuentas por cobrar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función auxiliar para obtener número de semana
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = router;
