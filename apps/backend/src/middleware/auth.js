const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.userProfile.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Token inválido o usuario inactivo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      role: user.role,
    };

    // Fetch empresaId if exists
    const empresa = await prisma.empresa.findFirst({
      where: { userId: user.id },
      select: { id: true }
    });

    if (empresa) {
      req.user.empresaId = empresa.id;
    }

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido', details: error.message });
  }
};

// Middleware para obtener empresa del usuario autenticado
const getEmpresaFromUser = async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada para este usuario' });
    }

    req.empresa = empresa;
    next();
  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { authenticateToken, getEmpresaFromUser, generateAccessToken };
