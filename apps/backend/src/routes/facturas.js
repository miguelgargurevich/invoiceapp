const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { sendInvoiceEmail } = require('../services/emailService');

// Esquema de validación para detalle
const detalleSchema = z.object({
  productoId: z.string().uuid().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  unidadMedida: z.string().default('UND'),
  precioUnitario: z.number().positive(),
  descuento: z.number().min(0).default(0)
});

// Esquema de validación para factura
const facturaSchema = z.object({
  clienteId: z.string().uuid(),
  fechaEmision: z.string().datetime().optional(),
  fechaVencimiento: z.string().datetime().optional(),
  formaPago: z.string().optional(),
  moneda: z.string().default('PEN'),
  tipoCambio: z.number().positive().optional(),
  observaciones: z.string().optional(),
  detalles: z.array(detalleSchema).min(1)
});

// Calcular montos de factura
function calcularMontos(detalles, taxRate = 18) {
  const TAX_RATE = parseFloat(taxRate) / 100; // Convert percentage to decimal
  let subtotalSinIgv = 0;
  let totalDescuento = 0;

  const detallesCalculados = detalles.map((detalle, index) => {
    const subtotalLinea = detalle.cantidad * detalle.precioUnitario;
    const descuentoLinea = detalle.descuento || 0;
    const baseImponible = subtotalLinea - descuentoLinea;
    const igvLinea = baseImponible * TAX_RATE;
    const totalLinea = baseImponible + igvLinea;

    subtotalSinIgv += baseImponible;
    totalDescuento += descuentoLinea;

    return {
      ...detalle,
      subtotal: parseFloat(baseImponible.toFixed(2)),
      igv: parseFloat(igvLinea.toFixed(2)),
      total: parseFloat(totalLinea.toFixed(2)),
      orden: index
    };
  });

  const igvTotal = subtotalSinIgv * TAX_RATE;
  const total = subtotalSinIgv + igvTotal;

  return {
    detalles: detallesCalculados,
    subtotal: parseFloat(subtotalSinIgv.toFixed(2)),
    descuento: parseFloat(totalDescuento.toFixed(2)),
    igv: parseFloat(igvTotal.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

// Obtener siguiente número de serie
async function obtenerSiguienteNumero(empresaId, serie) {
  const config = await prisma.configuracionSeries.findFirst({
    where: {
      empresaId,
      tipoDocumento: 'factura',
      serie,
      activa: true
    }
  });

  if (config) {
    await prisma.configuracionSeries.update({
      where: { id: config.id },
      data: { ultimoNumero: config.ultimoNumero + 1 }
    });
    return config.ultimoNumero + 1;
  }

  // Crear configuración si no existe
  await prisma.configuracionSeries.create({
    data: {
      empresaId,
      tipoDocumento: 'factura',
      serie,
      ultimoNumero: 1
    }
  });

  return 1;
}

// GET /api/facturas - Listar facturas
router.get('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { page = 1, limit = 20, search, estado, clienteId, fechaInicio, fechaFin } = req.query;

  try {
    const where = {
      empresaId: req.empresa.id,
      ...(estado && { estado }),
      ...(clienteId && { clienteId }),
      ...(fechaInicio && fechaFin && {
        fechaEmision: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      }),
      ...(search && {
        OR: [
          { serie: { contains: search } },
          { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    const [facturas, total] = await Promise.all([
      prisma.factura.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true
            }
          },
          signatureRequests: {
            select: {
              status: true,
              token: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { detalles: true, pagos: true }
          }
        },
        orderBy: { fechaEmision: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.factura.count({ where })
    ]);

    // Map facturas to include signatureStatus
    const facturasWithSignatureStatus = facturas.map(factura => {
      const signatureRequest = factura.signatureRequests?.[0];
      return {
        ...factura,
        signatureStatus: signatureRequest?.status || null
      };
    });

    res.json({
      data: facturasWithSignatureStatus,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando facturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/facturas/:id - Obtener factura por ID
router.get('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        cliente: true,
        empresa: true,
        detalles: {
          include: {
            producto: {
              select: { id: true, codigo: true, nombre: true }
            }
          },
          orderBy: { orden: 'asc' }
        },
        pagos: {
          orderBy: { fecha: 'desc' }
        },
        proformaOrigen: {
          select: { id: true, serie: true, numero: true }
        },
        signatureRequests: {
          include: {
            signature: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Calcular total pagado
    const totalPagado = factura.pagos.reduce((acc, pago) => acc + parseFloat(pago.monto), 0);
    const saldoPendiente = parseFloat(factura.total) - totalPagado;

    // Get signature status
    const signatureRequest = factura.signatureRequests?.[0] || null;
    const signatureStatus = signatureRequest 
      ? signatureRequest.status 
      : null;

    res.json({
      ...factura,
      totalPagado,
      saldoPendiente,
      signatureRequest,
      signatureStatus
    });
  } catch (error) {
    console.error('Error obteniendo factura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/facturas - Crear factura
router.post('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = facturaSchema.parse(req.body);
    const { detalles, ...facturaData } = validatedData;

    // Calcular montos usando el taxRate de la empresa
    const montosCalculados = calcularMontos(detalles, req.empresa.taxRate || 18);

    // Obtener siguiente número
    const numero = await obtenerSiguienteNumero(req.empresa.id, req.empresa.serieFactura);

    const factura = await prisma.factura.create({
      data: {
        ...facturaData,
        serie: req.empresa.serieFactura,
        numero,
        fechaEmision: facturaData.fechaEmision ? new Date(facturaData.fechaEmision) : new Date(),
        fechaVencimiento: facturaData.fechaVencimiento ? new Date(facturaData.fechaVencimiento) : null,
        subtotal: montosCalculados.subtotal,
        descuento: montosCalculados.descuento,
        igv: montosCalculados.igv,
        total: montosCalculados.total,
        empresaId: req.empresa.id,
        userId: req.user.id,
        detalles: {
          create: montosCalculados.detalles
        }
      },
      include: {
        cliente: true,
        detalles: true
      }
    });

    res.status(201).json(factura);
  } catch (error) {
    console.error('Error creando factura:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    // Handle unique constraint violation (duplicate serie-numero)
    if (error.code === 'P2002' && error.meta?.target?.includes('numero')) {
      return res.status(409).json({ 
        error: 'Ya existe una factura con este número de serie y correlativo',
        code: 'DUPLICATE_INVOICE_NUMBER'
      });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/facturas/:id - Actualizar factura (solo si está emitida)
router.put('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingFactura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingFactura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (existingFactura.estado !== 'emitida') {
      return res.status(400).json({ error: 'Solo se pueden editar facturas en estado "emitida"' });
    }

    const { detalles, ...updateData } = req.body;

    // Si se actualizan detalles, recalcular
    let montosActualizados = {};
    if (detalles) {
      const montosCalculados = calcularMontos(detalles, req.empresa.taxRate || 18);
      montosActualizados = {
        subtotal: montosCalculados.subtotal,
        descuento: montosCalculados.descuento,
        igv: montosCalculados.igv,
        total: montosCalculados.total
      };

      // Eliminar detalles anteriores y crear nuevos
      await prisma.detalleFactura.deleteMany({
        where: { facturaId: req.params.id }
      });

      await prisma.detalleFactura.createMany({
        data: montosCalculados.detalles.map(d => ({
          ...d,
          facturaId: req.params.id
        }))
      });
    }

    const factura = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...montosActualizados,
        fechaVencimiento: updateData.fechaVencimiento ? new Date(updateData.fechaVencimiento) : undefined
      },
      include: {
        cliente: true,
        detalles: true
      }
    });

    res.json(factura);
  } catch (error) {
    console.error('Error actualizando factura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/facturas/:id - Anular factura
router.delete('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingFactura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingFactura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (existingFactura.estado === 'anulada') {
      return res.status(400).json({ error: 'La factura ya está anulada' });
    }

    await prisma.factura.update({
      where: { id: req.params.id },
      data: { estado: 'anulada' }
    });

    res.json({ message: 'Factura anulada exitosamente' });
  } catch (error) {
    console.error('Error anulando factura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/facturas/:id/pagos - Registrar pago
router.post('/:id/pagos', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { monto, metodoPago, fecha, referencia, observaciones } = req.body;

    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        pagos: true
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    if (factura.estado === 'anulada') {
      return res.status(400).json({ error: 'No se pueden registrar pagos en facturas anuladas' });
    }

    const totalPagado = factura.pagos.reduce((acc, pago) => acc + parseFloat(pago.monto), 0);
    const saldoPendiente = parseFloat(factura.total) - totalPagado;

    if (monto > saldoPendiente) {
      return res.status(400).json({ 
        error: `El monto excede el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})` 
      });
    }

    const pago = await prisma.pagoFactura.create({
      data: {
        facturaId: req.params.id,
        monto,
        metodoPago,
        fecha: fecha ? new Date(fecha) : new Date(),
        referencia,
        observaciones
      }
    });

    // Si el total pagado alcanza el total, marcar como pagada
    const nuevoTotalPagado = totalPagado + monto;
    if (nuevoTotalPagado >= parseFloat(factura.total)) {
      await prisma.factura.update({
        where: { id: req.params.id },
        data: { estado: 'pagada' }
      });
    }

    res.status(201).json(pago);
  } catch (error) {
    console.error('Error registrando pago:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/facturas/:id/dates - Actualizar fechas de factura
router.put('/:id/dates', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { fechaEmision, fechaVencimiento } = req.body;

    // Verificar que la factura existe y pertenece a la empresa
    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // No permitir editar facturas anuladas
    if (factura.estado === 'ANULADA') {
      return res.status(400).json({ error: 'No se pueden editar facturas anuladas' });
    }

    // Validar fechas
    if (new Date(fechaEmision) > new Date(fechaVencimiento)) {
      return res.status(400).json({ error: 'La fecha de vencimiento debe ser posterior a la fecha de emisión' });
    }

    // Actualizar fechas
    const facturaActualizada = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: new Date(fechaVencimiento)
      }
    });

    res.json(facturaActualizada);
  } catch (error) {
    console.error('Error actualizando fechas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/facturas/:id/pdf - Generar PDF (placeholder)
router.get('/:id/pdf', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        cliente: true,
        empresa: true,
        detalles: true
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // TODO: Implementar generación de PDF real
    // Por ahora retornamos los datos para generar en frontend
    res.json({
      message: 'Datos para generar PDF',
      factura
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

// POST /api/facturas/:id/send-email - Enviar factura por email
router.post('/:id/send-email', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { to, subject, message, locale = 'es' } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'El email del destinatario es requerido' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'El formato del email es inválido' });
    }

    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        cliente: true,
        empresa: true,
        detalles: {
          include: {
            producto: {
              select: { id: true, codigo: true, nombre: true }
            }
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Send email using Resend
    const result = await sendInvoiceEmail({
      to,
      subject: subject || `Factura ${factura.serie}-${factura.numero} - ${factura.cliente.razonSocial || factura.cliente.nombre}`,
      message: message || `Estimado cliente,\n\nAdjunto encontrará la factura ${factura.serie}-${factura.numero}.\n\nGracias por su preferencia.`,
      factura: {
        ...factura,
        cliente: {
          nombre: factura.cliente.razonSocial || factura.cliente.nombreComercial,
          tipoDocumento: factura.cliente.tipoDocumento,
          documento: factura.cliente.numeroDocumento,
        }
      },
      empresa: {
        nombre: factura.empresa.razonSocial || factura.empresa.nombreComercial,
        ruc: factura.empresa.ruc,
        email: factura.empresa.email,
        direccion: factura.empresa.direccion,
      },
      locale,
      // Note: PDF generation would happen here in production
      // pdfBuffer: generatedPdfBuffer
    });

    res.json({ 
      success: true, 
      message: 'Email enviado exitosamente',
      emailId: result.data?.id 
    });
  } catch (error) {
    console.error('Error enviando email:', error);
    res.status(500).json({ error: error.message || 'Error enviando email' });
  }
});

module.exports = router;
