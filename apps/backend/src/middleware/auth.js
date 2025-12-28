const { createClient } = require('@supabase/supabase-js');
const prisma = require('../utils/prisma');

// Lazy initialization of Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('[AUTH] Checking token...');
  console.log('[AUTH] SUPABASE_URL configured:', !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL));
  console.log('[AUTH] SERVICE_KEY configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[AUTH] Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  if (!token) {
    console.log('[AUTH] No token provided');
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);
    
    console.log('[AUTH] Supabase response - User:', user?.email, '| Error:', error?.message);
    
    if (error || !user) {
      console.log('[AUTH] Token validation failed:', error?.message || 'No user returned');
      return res.status(403).json({ error: 'Token inválido', details: error?.message });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email
    };

    console.log('[AUTH] User authenticated:', user.email);
    next();
  } catch (error) {
    console.error('[AUTH] Exception during authentication:', error.message);
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

module.exports = { authenticateToken, getEmpresaFromUser, getSupabaseClient };
