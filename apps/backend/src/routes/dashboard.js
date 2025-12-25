const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// GET /api/dashboard/resumen - Resumen general
router.get('/resumen', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

    // Métricas del mes
    const [
      facturasDelMes,
      facturasDelAnio,
      proformasPendientes,
      clientesActivos,
      facturasVencidas
    ] = await Promise.all([
      // Facturas del mes
      prisma.factura.findMany({
        where: {
          empresaId: req.empresa.id,
          estado: { not: 'anulada' },
          fechaEmision: {
            gte: inicioMes,
            lte: finMes
          }
        },
        include: {
          pagos: true
        }
      }),
      // Facturas del año
      prisma.factura.findMany({
        where: {
          empresaId: req.empresa.id,
          estado: { not: 'anulada' },
          fechaEmision: {
            gte: inicioAnio,
            lte: hoy
          }
        }
      }),
      // Proformas pendientes
      prisma.proforma.count({
        where: {
          empresaId: req.empresa.id,
          estado: 'pendiente'
        }
      }),
      // Clientes activos
      prisma.cliente.count({
        where: {
          empresaId: req.empresa.id,
          activo: true
        }
      }),
      // Facturas vencidas
      prisma.factura.findMany({
        where: {
          empresaId: req.empresa.id,
          estado: 'emitida',
          fechaVencimiento: {
            lt: hoy
          }
        }
      })
    ]);

    // Calcular totales del mes
    const ventasDelMes = facturasDelMes.reduce((acc, f) => acc + parseFloat(f.total), 0);
    const cobradoDelMes = facturasDelMes
      .filter(f => f.estado === 'pagada')
      .reduce((acc, f) => acc + parseFloat(f.total), 0);
    const pendienteDelMes = facturasDelMes
      .filter(f => f.estado === 'emitida')
      .reduce((acc, f) => {
        const pagado = f.pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        return acc + (parseFloat(f.total) - pagado);
      }, 0);

    // Calcular totales del año
    const ventasDelAnio = facturasDelAnio.reduce((acc, f) => acc + parseFloat(f.total), 0);

    // Total vencido
    const totalVencido = facturasVencidas.reduce((acc, f) => acc + parseFloat(f.total), 0);

    res.json({
      mes: {
        ventas: parseFloat(ventasDelMes.toFixed(2)),
        cobrado: parseFloat(cobradoDelMes.toFixed(2)),
        pendiente: parseFloat(pendienteDelMes.toFixed(2)),
        cantidadFacturas: facturasDelMes.length
      },
      anio: {
        ventas: parseFloat(ventasDelAnio.toFixed(2)),
        cantidadFacturas: facturasDelAnio.length
      },
      alertas: {
        facturasVencidas: facturasVencidas.length,
        totalVencido: parseFloat(totalVencido.toFixed(2)),
        proformasPendientes
      },
      totales: {
        clientesActivos
      }
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/dashboard/graficos - Datos para gráficos
router.get('/graficos', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const hoy = new Date();
    const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

    const facturas = await prisma.factura.findMany({
      where: {
        empresaId: req.empresa.id,
        estado: { not: 'anulada' },
        fechaEmision: {
          gte: hace6Meses,
          lte: hoy
        }
      }
    });

    // Agrupar por mes
    const meses = {};
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const nombreMes = fecha.toLocaleString('es-ES', { month: 'short' });
      meses[key] = {
        mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
        ventas: 0,
        cobrado: 0
      };
    }

    facturas.forEach(factura => {
      const fecha = new Date(factura.fechaEmision);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (meses[key]) {
        meses[key].ventas += parseFloat(factura.total);
        if (factura.estado === 'pagada') {
          meses[key].cobrado += parseFloat(factura.total);
        }
      }
    });

    // Convertir a array
    const ventasPorMes = Object.values(meses).map(m => ({
      ...m,
      ventas: parseFloat(m.ventas.toFixed(2)),
      cobrado: parseFloat(m.cobrado.toFixed(2))
    }));

    // Top 5 clientes del mes actual
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const facturasDelMes = await prisma.factura.findMany({
      where: {
        empresaId: req.empresa.id,
        estado: { not: 'anulada' },
        fechaEmision: { gte: inicioMes }
      },
      include: {
        cliente: {
          select: { razonSocial: true }
        }
      }
    });

    const porCliente = {};
    facturasDelMes.forEach(f => {
      if (!porCliente[f.clienteId]) {
        porCliente[f.clienteId] = {
          nombre: f.cliente.razonSocial,
          total: 0
        };
      }
      porCliente[f.clienteId].total += parseFloat(f.total);
    });

    const topClientes = Object.values(porCliente)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(c => ({
        ...c,
        total: parseFloat(c.total.toFixed(2))
      }));

    res.json({
      ventasPorMes,
      topClientes
    });
  } catch (error) {
    console.error('Error obteniendo datos de gráficos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/dashboard/ultimas-facturas - Últimas facturas
router.get('/ultimas-facturas', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const facturas = await prisma.factura.findMany({
      where: {
        empresaId: req.empresa.id
      },
      include: {
        cliente: {
          select: {
            razonSocial: true,
            numeroDocumento: true
          }
        }
      },
      orderBy: { fechaEmision: 'desc' },
      take: 10
    });

    res.json(facturas);
  } catch (error) {
    console.error('Error obteniendo últimas facturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
