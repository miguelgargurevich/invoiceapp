const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { sendProformaEmail } = require('../services/emailService');

// Esquema de validación para detalle
const detalleSchema = z.object({
  productoId: z.string().uuid().optional(),
  descripcion: z.string().min(1),
  cantidad: z.number().positive(),
  unidadMedida: z.string().default('UND'),
  precioUnitario: z.number().positive(),
  descuento: z.number().min(0).default(0)
});

// Esquema de validación para proforma
const proformaSchema = z.object({
  clienteId: z.string().uuid(),
  fechaEmision: z.string().datetime().optional(),
  fechaValidez: z.string().datetime().optional(),
  condiciones: z.string().optional(),
  moneda: z.string().default('PEN'),
  tipoCambio: z.number().positive().optional(),
  observaciones: z.string().optional(),
  // Contractor proposal fields
  jobName: z.string().optional().nullable(),
  jobLocation: z.string().optional().nullable(),
  workDescription: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  arquitectoNombre: z.string().optional().nullable(),
  fechaPlanos: z.string().datetime().optional().nullable(),
  telefonoTrabajo: z.string().optional().nullable(),
  diasValidez: z.number().int().positive().optional().nullable(),
  detalles: z.array(detalleSchema).min(1)
});

// Calcular montos
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
async function obtenerSiguienteNumero(empresaId, serie, prismaClient = prisma) {
  // Buscar el último número usado directamente en las proformas
  const ultimaProforma = await prismaClient.proforma.findFirst({
    where: {
      empresaId,
      serie
    },
    orderBy: {
      numero: 'desc'
    },
    select: {
      numero: true
    }
  });

  const siguienteNumero = ultimaProforma ? ultimaProforma.numero + 1 : 1;

  // Actualizar o crear la configuración (para mantener el registro)
  const config = await prismaClient.configuracionSeries.findFirst({
    where: {
      empresaId,
      tipoDocumento: 'proforma',
      serie,
      activa: true
    }
  });

  if (config) {
    await prismaClient.configuracionSeries.update({
      where: { id: config.id },
      data: { ultimoNumero: siguienteNumero }
    });
  } else {
    await prismaClient.configuracionSeries.create({
      data: {
        empresaId,
        tipoDocumento: 'proforma',
        serie,
        ultimoNumero: siguienteNumero
      }
    });
  }

  return siguienteNumero;
}

// GET /api/proformas - Listar proformas
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

    const [proformas, total] = await Promise.all([
      prisma.proforma.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              razonSocial: true,
              numeroDocumento: true
            }
          },
          _count: {
            select: { detalles: true, facturasGeneradas: true }
          }
        },
        orderBy: { fechaEmision: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.proforma.count({ where })
    ]);

    res.json({
      data: proformas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando proformas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/proformas/:id - Obtener proforma por ID
router.get('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const proforma = await prisma.proforma.findFirst({
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
        facturasGeneradas: {
          select: { id: true, serie: true, numero: true, estado: true }
        }
      }
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    res.json(proforma);
  } catch (error) {
    console.error('Error obteniendo proforma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/proformas - Crear proforma
router.post('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = proformaSchema.parse(req.body);
    const { detalles, ...proformaData } = validatedData;

    // Calcular montos usando el taxRate de la empresa
    const montosCalculados = calcularMontos(detalles, req.empresa.taxRate || 18);

    // Obtener siguiente número
    const numero = await obtenerSiguienteNumero(req.empresa.id, req.empresa.serieProforma);

    const proforma = await prisma.proforma.create({
      data: {
        ...proformaData,
        serie: req.empresa.serieProforma,
        numero,
        fechaEmision: proformaData.fechaEmision ? new Date(proformaData.fechaEmision) : new Date(),
        fechaValidez: proformaData.fechaValidez ? new Date(proformaData.fechaValidez) : null,
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

    res.status(201).json(proforma);
  } catch (error) {
    console.error('Error creando proforma:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/proformas/:id - Actualizar proforma
router.put('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingProforma = await prisma.proforma.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingProforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    if (existingProforma.estado === 'facturada') {
      return res.status(400).json({ error: 'No se pueden editar proformas ya facturadas' });
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
      await prisma.detalleProforma.deleteMany({
        where: { proformaId: req.params.id }
      });

      await prisma.detalleProforma.createMany({
        data: montosCalculados.detalles.map(d => ({
          ...d,
          proformaId: req.params.id
        }))
      });
    }

    const proforma = await prisma.proforma.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...montosActualizados,
        fechaValidez: updateData.fechaValidez ? new Date(updateData.fechaValidez) : undefined
      },
      include: {
        cliente: true,
        detalles: true
      }
    });

    res.json(proforma);
  } catch (error) {
    console.error('Error actualizando proforma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/proformas/:id - Eliminar proforma
router.delete('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingProforma = await prisma.proforma.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingProforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    if (existingProforma.estado === 'facturada') {
      return res.status(400).json({ error: 'No se pueden eliminar proformas ya facturadas' });
    }

    await prisma.proforma.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Proforma eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando proforma:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/proformas/:id/convertir-factura - Convertir a factura
router.post('/:id/convertir-factura', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const proforma = await prisma.proforma.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        detalles: true
      }
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    if (proforma.estado === 'facturada') {
      return res.status(400).json({ error: 'Esta proforma ya fue facturada' });
    }

    // Obtener siguiente número de factura
    const config = await prisma.configuracionSeries.findFirst({
      where: {
        empresaId: req.empresa.id,
        tipoDocumento: 'factura',
        serie: req.empresa.serieFactura,
        activa: true
      }
    });

    let numeroFactura = 1;
    if (config) {
      await prisma.configuracionSeries.update({
        where: { id: config.id },
        data: { ultimoNumero: config.ultimoNumero + 1 }
      });
      numeroFactura = config.ultimoNumero + 1;
    } else {
      await prisma.configuracionSeries.create({
        data: {
          empresaId: req.empresa.id,
          tipoDocumento: 'factura',
          serie: req.empresa.serieFactura,
          ultimoNumero: 1
        }
      });
    }

    // Crear factura basada en la proforma
    const factura = await prisma.factura.create({
      data: {
        empresaId: req.empresa.id,
        clienteId: proforma.clienteId,
        serie: req.empresa.serieFactura,
        numero: numeroFactura,
        fechaEmision: new Date(),
        subtotal: proforma.subtotal,
        descuento: proforma.descuento,
        igv: proforma.igv,
        total: proforma.total,
        moneda: proforma.moneda,
        tipoCambio: proforma.tipoCambio,
        observaciones: proforma.observaciones,
        proformaOrigenId: proforma.id,
        userId: req.user.id,
        detalles: {
          create: proforma.detalles.map(d => ({
            productoId: d.productoId,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            unidadMedida: d.unidadMedida,
            precioUnitario: d.precioUnitario,
            descuento: d.descuento,
            subtotal: d.subtotal,
            igv: d.igv,
            total: d.total,
            orden: d.orden
          }))
        }
      },
      include: {
        cliente: true,
        detalles: true
      }
    });

    // Actualizar estado de proforma
    await prisma.proforma.update({
      where: { id: proforma.id },
      data: { estado: 'facturada' }
    });

    res.status(201).json({
      message: 'Factura generada exitosamente',
      factura
    });
  } catch (error) {
    console.error('Error convirtiendo proforma a factura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/proformas/:id/pdf - Generar PDF
router.get('/:id/pdf', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const proforma = await prisma.proforma.findFirst({
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

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    // TODO: Implementar generación de PDF real
    res.json({
      message: 'Datos para generar PDF',
      proforma
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

// POST /api/proformas/:id/send-email - Enviar proforma por email
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

    const proforma = await prisma.proforma.findFirst({
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

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    // Send email using Resend
    const result = await sendProformaEmail({
      to,
      subject: subject || `Proforma ${proforma.serie}-${proforma.numero} - ${proforma.cliente.razonSocial || proforma.cliente.nombre}`,
      message: message || `Estimado cliente,\n\nAdjunto encontrará la proforma/cotización ${proforma.serie}-${proforma.numero}.\n\nEsta cotización es válida por 30 días.\n\nQuedamos atentos a sus comentarios.`,
      proforma: {
        ...proforma,
        cliente: {
          nombre: proforma.cliente.razonSocial || proforma.cliente.nombreComercial,
          tipoDocumento: proforma.cliente.tipoDocumento,
          documento: proforma.cliente.numeroDocumento,
        }
      },
      empresa: {
        nombre: proforma.empresa.razonSocial || proforma.empresa.nombreComercial,
        ruc: proforma.empresa.ruc,
        email: proforma.empresa.email,
        direccion: proforma.empresa.direccion,
      },
      locale,
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
