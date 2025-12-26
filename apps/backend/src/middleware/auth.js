const { createClient } = require('@supabase/supabase-js');
const prisma = require('../utils/prisma');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email
    };

    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(403).json({ error: 'Token inválido' });
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

module.exports = { authenticateToken, getEmpresaFromUser, supabase };
