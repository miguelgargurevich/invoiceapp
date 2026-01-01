const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// ADMIN STATISTICS
// ==========================================

/**
 * GET /api/admin/stats
 * Get global system statistics (admin/super-admin only)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalEmpresas,
      totalFacturas,
      totalProformas,
      totalClientes,
      totalProductos,
      recentUsers,
      recentEmpresas
    ] = await Promise.all([
      // Total users
      prisma.userProfile.count(),
      
      // Active users
      prisma.userProfile.count({
        where: { isActive: true }
      }),
      
      // Total companies
      prisma.empresa.count(),
      
      // Total invoices
      prisma.factura.count(),
      
      // Total proposals
      prisma.proforma.count(),
      
      // Total clients
      prisma.cliente.count(),
      
      // Total products
      prisma.producto.count(),
      
      // Recent users (last 10)
      prisma.userProfile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      }),
      
      // Recent companies (last 10)
      prisma.empresa.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          nombre: true,
          ruc: true,
          email: true,
          createdAt: true,
          userId: true
        }
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalEmpresas,
        totalFacturas,
        totalProformas,
        totalClientes,
        totalProductos
      },
      recentUsers,
      recentEmpresas
    });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching admin statistics'
    });
  }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

/**
 * GET /api/admin/users
 * Get all users with pagination (admin/super-admin only)
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const isActive = req.query.isActive;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              ruc: true,
              email: true
            }
          }
        }
      }),
      prisma.userProfile.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching users'
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details by ID (admin/super-admin only)
 */
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.userProfile.findUnique({
      where: { id },
      include: {
        empresa: {
          include: {
            _count: {
              select: {
                facturas: true,
                proformas: true,
                clientes: true,
                productos: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('[Admin User Details] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching user details'
    });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (super-admin only)
 */
router.patch('/users/:id/role', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid role'
      });
    }

    // Prevent changing own role
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot change your own role'
      });
    }

    const user = await prisma.userProfile.update({
      where: { id },
      data: { role }
    });

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('[Admin Update Role] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error updating user role'
    });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user (admin/super-admin only)
 */
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'isActive must be a boolean'
      });
    }

    // Prevent deactivating yourself
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot change your own status'
      });
    }

    const user = await prisma.userProfile.update({
      where: { id },
      data: { isActive }
    });

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('[Admin Update Status] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error updating user status'
    });
  }
});

// ==========================================
// COMPANY MANAGEMENT
// ==========================================

/**
 * GET /api/admin/empresas
 * Get all companies with pagination (admin/super-admin only)
 */
router.get('/empresas', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [empresas, total] = await Promise.all([
      prisma.empresa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              facturas: true,
              proformas: true,
              clientes: true,
              productos: true
            }
          }
        }
      }),
      prisma.empresa.count({ where })
    ]);

    res.json({
      empresas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Admin Empresas] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching companies'
    });
  }
});

/**
 * GET /api/admin/empresas/:id
 * Get company details by ID (admin/super-admin only)
 */
router.get('/empresas/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            facturas: true,
            proformas: true,
            clientes: true,
            productos: true,
            pagos: true
          }
        }
      }
    });

    if (!empresa) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Company not found'
      });
    }

    res.json(empresa);
  } catch (error) {
    console.error('[Admin Empresa Details] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error fetching company details'
    });
  }
});

module.exports = router;
