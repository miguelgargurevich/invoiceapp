const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// POST /api/auth/login - No necesario, Supabase maneja login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Crear o actualizar perfil de usuario si no existe
    const existingProfile = await prisma.userProfile.findUnique({
      where: { id: data.user.id }
    });

    if (!existingProfile) {
      // Determinar el rol basado en el email
      const role = data.user.email === 'miguel.gargurevich@gmail.com' ? 'SUPER_ADMIN' : 'USER';
      
      // Crear perfil si no existe
      await prisma.userProfile.create({
        data: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
          role: role,
          isActive: true
        }
      });
    } else {
      // Actualizar lastLogin
      await prisma.userProfile.update({
        where: { id: data.user.id },
        data: { lastLogin: new Date() }
      });
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
    const { data: authData, error: authError } = await getSupabaseClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Crear perfil de usuario en user_profiles
    // Determinar el rol basado en el email
    const role = email === 'miguel.gargurevich@gmail.com' ? 'SUPER_ADMIN' : 'USER';
    
    await prisma.userProfile.create({
      data: {
        id: authData.user.id,
        email: email,
        name: name || null,
        role: role, // SUPER_ADMIN para miguel.gargurevich@gmail.com, USER para el resto
        isActive: true
      }
    });

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
    const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Obtener empresa del usuario
    const empresa = await prisma.empresa.findFirst({
      where: { userId: user.id }
    });

    // Obtener perfil de usuario con rol
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id }
    });

    // Si no existe el perfil, crearlo (para usuarios existentes)
    if (!userProfile) {
      // Determinar el rol basado en el email
      const isSuperAdmin = user.email === 'miguel.gargurevich@gmail.com';
      
      userProfile = await prisma.userProfile.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
          role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
          isActive: true
        }
      });
    } else if (user.email === 'miguel.gargurevich@gmail.com' && userProfile.role !== 'SUPER_ADMIN') {
      // Actualizar a SUPER_ADMIN si es el email correcto pero tiene otro rol
      userProfile = await prisma.userProfile.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' }
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        role: userProfile.role,
        isActive: userProfile.isActive
      },
      empresa
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
