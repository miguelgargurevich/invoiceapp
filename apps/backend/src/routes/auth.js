const express = require('express');
const router = express.Router();
const { supabase } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// POST /api/auth/login - No necesario, Supabase maneja login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name, empresaData } = req.body;

  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Crear empresa asociada al usuario
    if (empresaData) {
      await prisma.empresa.create({
        data: {
          nombre: empresaData.nombre,
          ruc: empresaData.ruc,
          direccion: empresaData.direccion,
          telefono: empresaData.telefono,
          email: empresaData.email || email,
          userId: authData.user.id
        }
      });
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: authData.user
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    // Supabase maneja logout en el cliente
    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Obtener empresa del usuario
    const empresa = await prisma.empresa.findFirst({
      where: { userId: user.id }
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name
      },
      empresa
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
