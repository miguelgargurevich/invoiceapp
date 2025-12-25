const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');

// Esquema de validación
const productoSchema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().min(2).max(200),
  descripcion: z.string().optional(),
  unidadMedida: z.string().default('UND'),
  precioUnitario: z.number().positive(),
  precioConIgv: z.boolean().default(true),
  categoriaId: z.string().uuid().optional(),
  stockActual: z.number().int().optional(),
  stockMinimo: z.number().int().optional()
});

// GET /api/productos - Listar productos
router.get('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { page = 1, limit = 20, search, categoriaId, activo } = req.query;

  try {
    const where = {
      empresaId: req.empresa.id,
      ...(activo !== undefined && { activo: activo === 'true' }),
      ...(categoriaId && { categoriaId }),
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { codigo: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: {
          categoria: {
            select: { id: true, nombre: true, color: true }
          }
        },
        orderBy: { nombre: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.producto.count({ where })
    ]);

    res.json({
      data: productos,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const producto = await prisma.producto.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        categoria: true
      }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/productos - Crear producto
router.post('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = productoSchema.parse(req.body);

    const producto = await prisma.producto.create({
      data: {
        ...validatedData,
        empresaId: req.empresa.id
      },
      include: {
        categoria: true
      }
    });

    res.status(201).json(producto);
  } catch (error) {
    console.error('Error creando producto:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un producto con ese código' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = productoSchema.partial().parse(req.body);

    const existingProducto = await prisma.producto.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingProducto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = await prisma.producto.update({
      where: { id: req.params.id },
      data: validatedData,
      include: {
        categoria: true
      }
    });

    res.json(producto);
  } catch (error) {
    console.error('Error actualizando producto:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/productos/:id - Eliminar producto (soft delete)
router.delete('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingProducto = await prisma.producto.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingProducto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await prisma.producto.update({
      where: { id: req.params.id },
      data: { activo: false }
    });

    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/productos/importar - Importar desde Excel
router.post('/importar', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar un array de productos' });
    }

    const createdProducts = [];
    const errors = [];

    for (let i = 0; i < productos.length; i++) {
      try {
        const validatedData = productoSchema.parse(productos[i]);
        const producto = await prisma.producto.create({
          data: {
            ...validatedData,
            empresaId: req.empresa.id
          }
        });
        createdProducts.push(producto);
      } catch (error) {
        errors.push({
          index: i,
          data: productos[i],
          error: error.message
        });
      }
    }

    res.json({
      message: `Se importaron ${createdProducts.length} productos`,
      created: createdProducts.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Error importando productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
