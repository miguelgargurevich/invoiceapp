const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, supabase } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Configuración de multer para upload temporal
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/empresas/mi-empresa - Obtener empresa del usuario
router.get('/mi-empresa', authenticateToken, async (req, res) => {
  try {
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: {
            clientes: true,
            productos: true,
            facturas: true,
            proformas: true
          }
        }
      }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Return with frontend field names
    const empresaResponse = {
      ...empresa,
      razonSocial: empresa.nombre,
      nombreComercial: empresa.nombre
    };

    res.json(empresaResponse);
  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/empresas/mi-empresa - Actualizar empresa
router.put('/mi-empresa', authenticateToken, async (req, res) => {
  try {
    console.log('[EMPRESA] Update request from user:', req.user.id);
    console.log('[EMPRESA] Request body:', JSON.stringify(req.body, null, 2));
    
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      console.log('[EMPRESA] Empresa not found for user:', req.user.id);
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('[EMPRESA] Current empresa:', empresa.id, empresa.nombre);

    // Map frontend fields to backend schema
    const updateData = {
      nombre: req.body.nombre || req.body.razonSocial,
      razonSocial: req.body.razonSocial,
      nombreComercial: req.body.nombreComercial,
      ruc: req.body.ruc,
      direccion: req.body.direccion,
      telefono: req.body.telefono,
      email: req.body.email,
      web: req.body.web,
      moneda: req.body.moneda,
      serieFactura: req.body.serieFactura,
      serieProforma: req.body.serieProforma,
      licencia: req.body.licencia
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    console.log('[EMPRESA] Updating with data:', JSON.stringify(updateData, null, 2));

    const updatedEmpresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: updateData
    });

    console.log('[EMPRESA] Updated successfully:', updatedEmpresa.id);

    // Return with frontend field names
    const empresaResponse = {
      ...updatedEmpresa,
      razonSocial: updatedEmpresa.razonSocial || updatedEmpresa.nombre,
      nombreComercial: updatedEmpresa.nombreComercial || updatedEmpresa.nombre
    };

    res.json(empresaResponse);
  } catch (error) {
    console.error('[EMPRESA] Error updating empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// POST /api/empresas/logo - Subir logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    console.log('[LOGO] Starting upload process...');
    console.log('[LOGO] User ID:', req.user.id);
    
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      console.log('[LOGO] Empresa not found for user:', req.user.id);
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('[LOGO] Empresa found:', empresa.id);

    if (!req.file) {
      console.log('[LOGO] No file provided');
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    console.log('[LOGO] File received:', req.file.originalname, req.file.mimetype, req.file.size, 'bytes');

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${empresa.id}/logo.${fileExt}`;
    
    console.log('[LOGO] Uploading to Supabase Storage as:', fileName);
    console.log('[LOGO] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'NOT SET');
    console.log('[LOGO] Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('[LOGO] Supabase upload error:', error);
      return res.status(500).json({ error: 'Error al subir logo: ' + error.message });
    }

    console.log('[LOGO] Upload successful:', data);

    // Obtener URL pública
    const { data: publicUrl } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    console.log('[LOGO] Public URL:', publicUrl.publicUrl);

    // Actualizar empresa con URL del logo
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { logoUrl: publicUrl.publicUrl }
    });

    console.log('[LOGO] Logo URL updated in database');

    res.json({ logoUrl: publicUrl.publicUrl });
  } catch (error) {
    console.error('[LOGO] Error uploading logo:', error);
    res.status(500).json({ error: 'Error al subir logo: ' + error.message });
  }
});

// POST /api/empresas - Crear empresa (solo si no tiene una)
router.post('/', authenticateToken, async (req, res) => {
  const { nombre, ruc, direccion, telefono, email, moneda } = req.body;

  try {
    // Verificar que no tenga empresa
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (existingEmpresa) {
      return res.status(400).json({ error: 'Ya tienes una empresa registrada' });
    }

    const empresa = await prisma.empresa.create({
      data: {
        nombre,
        ruc,
        direccion,
        telefono,
        email,
        moneda: moneda || 'PEN',
        userId: req.user.id
      }
    });

    res.status(201).json(empresa);
  } catch (error) {
    console.error('Error creando empresa:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El RUC ya está registrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
