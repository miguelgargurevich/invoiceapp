const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');

// Esquema de validación
const clienteSchema = z.object({
  tipoDocumento: z.enum(['RUC', 'DNI', 'CE']),
  numeroDocumento: z.string().min(8).max(11),
  razonSocial: z.string().min(2).max(200),
  nombreComercial: z.string().optional(),
  direccion: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional(),
  contacto: z.string().optional(),
  notas: z.string().optional()
});

// GET /api/clientes - Listar clientes
router.get('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { page = 1, limit = 20, search, activo } = req.query;

  try {
    const where = {
      empresaId: req.empresa.id,
      ...(activo !== undefined && { activo: activo === 'true' }),
      ...(search && {
        OR: [
          { razonSocial: { contains: search, mode: 'insensitive' } },
          { numeroDocumento: { contains: search } },
          { nombreComercial: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: { razonSocial: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.cliente.count({ where })
    ]);

    res.json({
      data: clientes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id - Obtener cliente por ID
router.get('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        facturas: {
          orderBy: { fechaEmision: 'desc' },
          take: 10,
          select: {
            id: true,
            serie: true,
            numero: true,
            fechaEmision: true,
            total: true,
            estado: true
          }
        },
        proformas: {
          orderBy: { fechaEmision: 'desc' },
          take: 10,
          select: {
            id: true,
            serie: true,
            numero: true,
            fechaEmision: true,
            total: true,
            estado: true
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clientes - Crear cliente
router.post('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = clienteSchema.parse(req.body);

    const cliente = await prisma.cliente.create({
      data: {
        ...validatedData,
        empresaId: req.empresa.id
      }
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Error creando cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de documento' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/clientes/:id - Actualizar cliente
router.put('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = clienteSchema.partial().parse(req.body);

    // Verificar que el cliente pertenece a la empresa
    const existingCliente = await prisma.cliente.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingCliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = await prisma.cliente.update({
      where: { id: req.params.id },
      data: validatedData
    });

    res.json(cliente);
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/clientes/:id - Eliminar cliente (soft delete)
router.delete('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingCliente = await prisma.cliente.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingCliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Soft delete
    await prisma.cliente.update({
      where: { id: req.params.id },
      data: { activo: false }
    });

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/buscar-ruc/:ruc - Consultar SUNAT (placeholder)
router.get('/buscar-ruc/:ruc', authenticateToken, async (req, res) => {
  try {
    const { ruc } = req.params;

    // TODO: Integrar con API de SUNAT real
    // Por ahora retornamos un placeholder
    if (ruc.length !== 11) {
      return res.status(400).json({ error: 'RUC debe tener 11 dígitos' });
    }

    // Simulación de respuesta de SUNAT
    res.json({
      ruc,
      razonSocial: `EMPRESA ${ruc}`,
      direccion: 'Dirección por consultar',
      estado: 'ACTIVO',
      condicion: 'HABIDO',
      message: 'Esta es una respuesta simulada. Integrar con API SUNAT real.'
    });
  } catch (error) {
    console.error('Error consultando RUC:', error);
    res.status(500).json({ error: 'Error consultando RUC' });
  }
});

module.exports = router;
