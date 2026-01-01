const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to check if user has admin privileges (ADMIN or SUPER_ADMIN role)
 */
async function requireAdmin(req, res, next) {
  try {
    console.log('[ADMIN_AUTH] Checking admin privileges...');
    console.log('[ADMIN_AUTH] req.user exists:', !!req.user);
    console.log('[ADMIN_AUTH] req.user.id:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.log('[ADMIN_AUTH] No user found in request');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get user profile with role
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: req.user.id },
      select: { role: true, isActive: true, email: true }
    });

    console.log('[ADMIN_AUTH] User profile found:', !!userProfile);
    console.log('[ADMIN_AUTH] User email:', userProfile?.email);
    console.log('[ADMIN_AUTH] User role:', userProfile?.role);
    console.log('[ADMIN_AUTH] User active:', userProfile?.isActive);

    if (!userProfile) {
      console.log('[ADMIN_AUTH] User profile not found in database');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User profile not found'
      });
    }

    if (!userProfile.isActive) {
      console.log('[ADMIN_AUTH] User account is inactive');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive'
      });
    }

    // Check if user has admin role
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPER_ADMIN') {
      console.log('[ADMIN_AUTH] User does not have admin privileges');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin privileges required'
      });
    }

    console.log('[ADMIN_AUTH] Access granted for', userProfile.role);
    // Add role to request object
    req.userRole = userProfile.role;
    next();
  } catch (error) {
    console.error('[AdminAuth] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error verifying admin privileges'
    });
  }
}

/**
 * Middleware to check if user has SUPER_ADMIN role only
 */
async function requireSuperAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Get user profile with role
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: req.user.id },
      select: { role: true, isActive: true }
    });

    if (!userProfile) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User profile not found'
      });
    }

    if (!userProfile.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive'
      });
    }

    // Check if user has super admin role
    if (userProfile.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin privileges required'
      });
    }

    req.userRole = userProfile.role;
    next();
  } catch (error) {
    console.error('[SuperAdminAuth] Error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error verifying super admin privileges'
    });
  }
}

module.exports = { requireAdmin, requireSuperAdmin };
