const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken, generateAccessToken } = require('../middleware/auth');

const SUPER_ADMIN_EMAIL = 'miguel.gargurevich@gmail.com';

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const user = await prisma.userProfile.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateAccessToken(user);

    await prisma.userProfile.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    res.json({
      user: sanitizeUser(user),
      session: {
        access_token: token,
        token_type: 'Bearer',
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, empresaData } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const existingUser = await prisma.userProfile.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = email === SUPER_ADMIN_EMAIL ? 'SUPER_ADMIN' : 'USER';

    const user = await prisma.userProfile.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        role,
        isActive: true,
      }
    });

    if (empresaData) {
      await prisma.empresa.create({
        data: {
          nombre: empresaData.nombre || 'Mi Empresa',
          ruc: empresaData.ruc || `TEMP-${Date.now()}`,
          direccion: empresaData.direccion,
          telefono: empresaData.telefono,
          email: empresaData.email || email,
          userId: user.id
        }
      });
    }

    const token = generateAccessToken(user);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: sanitizeUser(user),
      session: {
        access_token: token,
        token_type: 'Bearer',
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const empresa = await prisma.empresa.findFirst({
      where: { userId: user.id }
    });

    res.json({
      user,
      empresa,
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
