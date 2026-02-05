const express = require('express');
const router = express.Router();
const { authenticateToken, getEmpresaFromUser } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { z } = require('zod');

// Esquema de validación
const categoriaSchema = z.object({
  nombre: z.string().min(2).max(100),
  descripcion: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

// GET /api/categorias - Listar categorías
router.get('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  const { activo } = req.query;

  try {
    const categorias = await prisma.categoria.findMany({
      where: {
        empresaId: req.empresa.id,
        ...(activo !== undefined && { activo: activo === 'true' })
      },
      include: {
        _count: {
          select: { productos: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    res.json(categorias);
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/categorias - Crear categoría
router.post('/', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = categoriaSchema.parse(req.body);

    const categoria = await prisma.categoria.create({
      data: {
        ...validatedData,
        empresaId: req.empresa.id
      }
    });

    res.status(201).json(categoria);
  } catch (error) {
    console.error('Error creando categoría:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/categorias/:id - Actualizar categoría
router.put('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const validatedData = categoriaSchema.partial().parse(req.body);

    const existingCategoria = await prisma.categoria.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      }
    });

    if (!existingCategoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const categoria = await prisma.categoria.update({
      where: { id: req.params.id },
      data: validatedData
    });

    res.json(categoria);
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Datos inválidos', details: error.errors });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/categorias/:id - Eliminar categoría
router.delete('/:id', authenticateToken, getEmpresaFromUser, async (req, res) => {
  try {
    const existingCategoria = await prisma.categoria.findFirst({
      where: {
        id: req.params.id,
        empresaId: req.empresa.id
      },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    if (!existingCategoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    if (existingCategoria._count.productos > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene productos asociados' 
      });
    }

    await prisma.categoria.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
