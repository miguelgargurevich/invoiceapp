const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { sendInvoiceEmail, sendInvoiceCreationEmail, sendPaymentConfirmationEmail } = require('../services/emailService');

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
  orderType: z.string().optional().nullable(),
  jobName: z.string().optional().nullable(),
  jobLocation: z.string().optional().nullable(),
  workDescription: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  totalMaterials: z.number().min(0).optional(),
  totalLabor: z.number().min(0).optional(),
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
    console.log('[FACTURAS] Query params:', { estado, search, clienteId, fechaInicio, fechaFin });
    
    // Build where clause
    const where = {
      empresaId: req.empresa.id,
    };

    // Check if vencida filter is requested
    const estadosArray = estado ? (Array.isArray(estado) ? estado : [estado]) : [];
    const needsVencidaFilter = estadosArray.some(e => e.toLowerCase() === 'vencida');
    const onlyVencida = estadosArray.length === 1 && needsVencidaFilter;

    // Handle estado filter
    if (estado) {
      const estados = Array.isArray(estado) ? estado : [estado];
      console.log('[FACTURAS] Estados to filter:', estados);
      
      // Separate vencida from other estados since it's calculated, not stored
      const estadosDB = estados.filter(e => e.toLowerCase() !== 'vencida');
      const includeVencida = estados.some(e => e.toLowerCase() === 'vencida');
      
      const conditions = [];
      
      // Add DB estados
      if (estadosDB.length > 0) {
        conditions.push(...estadosDB.map(e => ({ estado: { equals: e, mode: 'insensitive' } })));
      }
      
      // Add vencida condition (emitida + past due date)
      // Note: We'll filter by montoPendiente > 0 after calculating payments
      if (includeVencida) {
        conditions.push({
          AND: [
            { estado: { equals: 'emitida', mode: 'insensitive' } },
            { fechaVencimiento: { lt: new Date() } }
          ]
        });
      }
      
      // Apply conditions
      if (conditions.length === 1) {
        // If it's only vencida, use the AND condition directly
        if (includeVencida && estadosDB.length === 0) {
          where.AND = conditions[0].AND;
        } else {
          // Single DB estado
          where.estado = estadosDB.length > 0 ? { equals: estadosDB[0], mode: 'insensitive' } : conditions[0].estado;
        }
      } else if (conditions.length > 1) {
        where.OR = conditions;
      }
      
      console.log('[FACTURAS] Final estado filter:', JSON.stringify(conditions, null, 2));
    }

    // Add other filters
    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (fechaInicio && fechaFin) {
      where.fechaEmision = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    if (search) {
      where.OR = [
        { serie: { contains: search } },
        { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } }
      ];
    }

    console.log('[FACTURAS] Final where clause:', JSON.stringify(where, null, 2));

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
          pagos: {
            select: {
              id: true,
              monto: true,
              fecha: true,
              metodoPago: true,
              referencia: true
            }
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

    console.log('[FACTURAS] Results count:', facturas.length, 'Total:', total);
    console.log('[FACTURAS] All facturas with dates:', facturas.map(f => ({ 
      numero: f.numero, 
      estado: f.estado, 
      fechaVencimiento: f.fechaVencimiento,
      total: f.total,
      pagosCount: f.pagos.length
    })));

    // Map facturas to include signatureStatus and calculate payment status
    let facturasWithSignatureStatus = facturas.map(factura => {
      const signatureRequest = factura.signatureRequests?.[0];
      const totalPagado = factura.pagos.reduce((sum, pago) => sum + parseFloat(pago.monto), 0);
      const montoPendiente = parseFloat(factura.total) - totalPagado;
      
      // Determine correct status based on payments
      let estado = factura.estado;
      if (factura.estado !== 'anulada') {
        if (montoPendiente <= 0) {
          estado = 'pagada';
        } else if (factura.fechaVencimiento && new Date(factura.fechaVencimiento) < new Date() && montoPendiente > 0) {
          estado = 'vencida';
        }
      }
      
      return {
        ...factura,
        estado,
        montoPendiente,
        totalPagado,
        signatureStatus: signatureRequest?.status || null
      };
    });

    console.log('[FACTURAS] After estado calculation:', facturasWithSignatureStatus.map(f => ({
      numero: f.numero,
      estadoDB: facturas.find(db => db.numero === f.numero)?.estado,
      estadoCalculated: f.estado,
      fechaVencimiento: f.fechaVencimiento,
      montoPendiente: f.montoPendiente
    })));

    // If filtering ONLY by vencida, we need to filter out facturas with montoPendiente <= 0
    // Because vencida means: emitida + past due + has pending amount
    if (onlyVencida) {
      facturasWithSignatureStatus = facturasWithSignatureStatus.filter(f => f.montoPendiente > 0);
      console.log('[FACTURAS] After vencida filter, count:', facturasWithSignatureStatus.length);
    }

    // Recalculate total if we filtered by vencida
    const finalTotal = onlyVencida ? facturasWithSignatureStatus.length : total;

    res.json({
      data: facturasWithSignatureStatus,
      pagination: {
        total: finalTotal,
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

    // Get signature status - try from factura first, then from proforma origen
    let signatureRequest = factura.signatureRequests?.[0] || null;
    
    // If no signature request on factura, get it from proforma origen
    if (!signatureRequest && factura.proformaOrigenId) {
      const proformaWithSignature = await prisma.proforma.findUnique({
        where: { id: factura.proformaOrigenId },
        include: {
          signatureRequests: {
            where: {
              status: { in: ['PENDING', 'SIGNED'] }
            },
            include: {
              signature: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });
      
      signatureRequest = proformaWithSignature?.signatureRequests?.[0] || null;
    }
    
    const signatureStatus = signatureRequest 
      ? signatureRequest.status 
      : null;

    res.json({
      ...factura,
      totalPagado,
      saldoPendiente,
      signatureRequest,
      signatureStatus,
      proformaOrigenId: factura.proformaOrigenId
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
    const { detalles, totalMaterials, totalLabor, ...facturaData } = validatedData;

    // Si se proporcionan totalMaterials y totalLabor, usar esos valores
    let subtotal, igv, total;
    
    if (totalMaterials !== undefined || totalLabor !== undefined) {
      // Use provided materials and labor
      const materials = totalMaterials || 0;
      const labor = totalLabor || 0;
      subtotal = materials + labor;
      const taxRate = req.empresa.taxRate ? parseFloat(req.empresa.taxRate) / 100 : 0.18;
      igv = subtotal * taxRate;
      total = subtotal + igv;
    } else {
      // Calcular montos desde detalles usando el taxRate de la empresa
      const montosCalculados = calcularMontos(detalles, req.empresa.taxRate || 18);
      subtotal = montosCalculados.subtotal;
      igv = montosCalculados.igv;
      total = montosCalculados.total;
    }

    // Calcular detalles para guardar
    const montosCalculados = calcularMontos(detalles, req.empresa.taxRate || 18);

    // Obtener siguiente número
    const numero = await obtenerSiguienteNumero(req.empresa.id, req.empresa.serieFactura);

    const factura = await prisma.factura.create({
      data: {
        clienteId: facturaData.clienteId,
        serie: req.empresa.serieFactura,
        numero,
        fechaEmision: facturaData.fechaEmision ? new Date(facturaData.fechaEmision) : new Date(),
        fechaVencimiento: facturaData.fechaVencimiento ? new Date(facturaData.fechaVencimiento) : null,
        formaPago: facturaData.formaPago,
        moneda: facturaData.moneda,
        tipoCambio: facturaData.tipoCambio,
        observaciones: facturaData.observaciones,
        orderType: facturaData.orderType || null,
        jobName: facturaData.jobName || null,
        jobLocation: facturaData.jobLocation || null,
        workDescription: facturaData.workDescription || null,
        paymentTerms: facturaData.paymentTerms || null,
        totalMaterials: totalMaterials || null,
        totalLabor: totalLabor || null,
        subtotal: subtotal,
        descuento: montosCalculados.descuento,
        igv: igv,
        total: total,
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

    // Send automatic email notification if enabled in user preferences
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: req.user.id }
      });

      if (preferences?.emailFactura && factura.cliente?.email) {
        console.log('[INVOICE] Sending automatic invoice creation email to:', factura.cliente.email);
        await sendInvoiceCreationEmail({
          factura,
          empresa: req.empresa,
          locale: preferences.locale || 'en'
        });
        console.log('[INVOICE] ✅ Automatic email sent successfully');
      } else {
        console.log('[INVOICE] Email notification skipped:', {
          emailFacturaEnabled: preferences?.emailFactura,
          hasClientEmail: !!factura.cliente?.email
        });
      }
    } catch (emailError) {
      // Don't fail the invoice creation if email fails
      console.error('[INVOICE] ❌ Failed to send automatic email:', emailError);
    }

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

    // Use cents comparison to avoid floating point precision issues
    const montoEnCentavos = Math.round(parseFloat(monto) * 100);
    const saldoEnCentavos = Math.round(saldoPendiente * 100);
    
    if (montoEnCentavos > saldoEnCentavos) {
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
    const nuevoTotalPagado = totalPagado + parseFloat(monto);
    const nuevoTotalEnCentavos = Math.round(nuevoTotalPagado * 100);
    const totalFacturaEnCentavos = Math.round(parseFloat(factura.total) * 100);
    
    if (nuevoTotalEnCentavos >= totalFacturaEnCentavos) {
      await prisma.factura.update({
        where: { id: req.params.id },
        data: { estado: 'pagada' }
      });
    }

    // Send automatic payment confirmation email if enabled in user preferences
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: req.user.id }
      });

      if (preferences?.emailPago && factura.cliente?.email) {
        console.log('[PAYMENT] Sending automatic payment confirmation email to:', factura.cliente.email);
        
        // Reload factura with full cliente data for email
        const facturaCompleta = await prisma.factura.findUnique({
          where: { id: req.params.id },
          include: { cliente: true }
        });

        await sendPaymentConfirmationEmail({
          pago: {
            ...pago,
            monto: parseFloat(pago.monto)
          },
          factura: facturaCompleta,
          empresa: req.empresa,
          locale: preferences.locale || 'en'
        });
        console.log('[PAYMENT] ✅ Automatic email sent successfully');
      } else {
        console.log('[PAYMENT] Email notification skipped:', {
          emailPagoEnabled: preferences?.emailPago,
          hasClientEmail: !!factura.cliente?.email
        });
      }
    } catch (emailError) {
      // Don't fail the payment registration if email fails
      console.error('[PAYMENT] ❌ Failed to send automatic email:', emailError);
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

// PUT /api/facturas/:id/observations - Actualizar observaciones de factura
router.put('/:id/observations', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { observaciones } = req.body;

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

    // Actualizar observaciones
    const facturaActualizada = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        observaciones: observaciones || null
      }
    });

    res.json(facturaActualizada);
  } catch (error) {
    console.error('Error actualizando observaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/facturas/:id/order-type - Actualizar tipo de orden de factura
router.put('/:id/order-type', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { orderType } = req.body;

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

    // Validar valores permitidos
    const validTypes = ['day_work', 'contract', 'extra', null];
    if (orderType !== null && orderType !== undefined && orderType !== '' && !validTypes.includes(orderType)) {
      return res.status(400).json({ error: 'Tipo de orden no válido' });
    }

    // Actualizar order type
    const facturaActualizada = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        orderType: orderType || null
      }
    });

    res.json(facturaActualizada);
  } catch (error) {
    console.error('Error actualizando order type:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/facturas/:id/job-info - Actualizar información del trabajo
router.put('/:id/job-info', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { jobName, jobLocation, workDescription, paymentTerms } = req.body;

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

    // Actualizar job info
    const facturaActualizada = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        jobName: jobName || null,
        jobLocation: jobLocation || null,
        workDescription: workDescription || null,
        paymentTerms: paymentTerms || null
      }
    });

    res.json(facturaActualizada);
  } catch (error) {
    console.error('Error actualizando job info:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/facturas/:id/payment-summary - Actualizar resumen de pago
router.put('/:id/payment-summary', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { totalMaterials, totalLabor } = req.body;

    // Verificar que la factura existe y pertenece a la empresa
    const factura = await prisma.factura.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        empresa: true
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // No permitir editar facturas anuladas
    if (factura.estado === 'ANULADA') {
      return res.status(400).json({ error: 'No se pueden editar facturas anuladas' });
    }

    // Calcular nuevos totales
    const materials = parseFloat(totalMaterials) || 0;
    const labor = parseFloat(totalLabor) || 0;
    const subtotal = materials + labor;
    const taxRate = factura.empresa.taxRate ? parseFloat(factura.empresa.taxRate) / 100 : 0.18;
    const igv = subtotal * taxRate;
    const total = subtotal + igv;

    // Actualizar payment summary y totales
    const facturaActualizada = await prisma.factura.update({
      where: { id: req.params.id },
      data: {
        totalMaterials: materials,
        totalLabor: labor,
        subtotal: subtotal,
        igv: igv,
        total: total
      }
    });

    res.json(facturaActualizada);
  } catch (error) {
    console.error('Error actualizando payment summary:', error);
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
