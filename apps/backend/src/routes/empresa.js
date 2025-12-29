const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken, getSupabaseClient } = require('../middleware/auth');
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
      razonSocial: empresa.razonSocial || empresa.nombre,
      nombreComercial: empresa.nombreComercial || empresa.nombre
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

// PUT /api/empresas/mi-empresa/config - Actualizar configuración de facturación
router.put('/mi-empresa/config', authenticateToken, async (req, res) => {
  try {
    console.log('[EMPRESA CONFIG] Update request from user:', req.user.id);
    console.log('[EMPRESA CONFIG] Request body:', JSON.stringify(req.body, null, 2));
    
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      console.log('[EMPRESA CONFIG] Empresa not found for user:', req.user.id);
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('[EMPRESA CONFIG] Current empresa:', empresa.id);

    // Map invoice config fields
    const updateData = {
      serieFactura: req.body.serieFactura,
      serieProforma: req.body.serieBoleta, // Map serieBoleta to serieProforma
      moneda: req.body.moneda,
      taxRate: req.body.igv !== undefined && req.body.igv !== null ? parseFloat(req.body.igv) : undefined
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    console.log('[EMPRESA CONFIG] Updating with data:', JSON.stringify(updateData, null, 2));

    const updatedEmpresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: updateData
    });

    console.log('[EMPRESA CONFIG] Updated successfully:', updatedEmpresa.id);

    res.json({
      serieFactura: updatedEmpresa.serieFactura,
      serieBoleta: updatedEmpresa.serieProforma,
      moneda: updatedEmpresa.moneda,
      igv: updatedEmpresa.taxRate ? parseFloat(updatedEmpresa.taxRate) : 18
    });
  } catch (error) {
    console.error('[EMPRESA CONFIG] Error updating config:', error);
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

    // Always save as logo.png for consistency
    const fileName = `${empresa.id}/images/logo.png`;
    
    console.log('[LOGO] Uploading to Supabase Storage as:', fileName);
    console.log('[LOGO] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'NOT SET');
    console.log('[LOGO] Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');

    // Subir a Supabase Storage
    const { data, error } = await getSupabaseClient().storage
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
    const { data: publicUrl } = getSupabaseClient().storage
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

// POST /api/empresas/firma - Upload company signature
router.post('/firma', authenticateToken, async (req, res) => {
  try {
    console.log('[FIRMA] Starting signature upload process...');
    console.log('[FIRMA] User ID:', req.user.id);
    
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      console.log('[FIRMA] Empresa not found for user:', req.user.id);
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    console.log('[FIRMA] Empresa found:', empresa.id);

    const { signatureDataUrl } = req.body;

    if (!signatureDataUrl) {
      console.log('[FIRMA] No signature data provided');
      return res.status(400).json({ error: 'No se proporcionó la firma' });
    }

    console.log('[FIRMA] Signature data received');

    let firmaUrl;

    // Upload signature to Supabase Storage
    if (getSupabaseClient()) {
      try {
        const signatureBuffer = Buffer.from(signatureDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const fileName = `${empresa.id}/signatures/company-signature.png`;
        
        console.log('[FIRMA] Uploading to Supabase Storage as:', fileName);

        const { error: uploadError } = await getSupabaseClient().storage
          .from('logos')
          .upload(fileName, signatureBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('[FIRMA] Supabase upload error:', uploadError);
          firmaUrl = signatureDataUrl; // Fallback to data URL
        } else {
          const { data: publicUrl } = getSupabaseClient().storage
            .from('logos')
            .getPublicUrl(fileName);
          firmaUrl = publicUrl.publicUrl;
          console.log('[FIRMA] Upload successful:', firmaUrl);
        }
      } catch (error) {
        console.error('[FIRMA] Error with Supabase upload:', error);
        firmaUrl = signatureDataUrl; // Fallback to data URL
      }
    } else {
      console.log('[FIRMA] Storing signature as data URL (Supabase not configured)');
      firmaUrl = signatureDataUrl;
    }

    // Update empresa with signature URL
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { firmaEmpresa: firmaUrl }
    });

    console.log('[FIRMA] Signature URL updated in database');

    res.json({ firmaEmpresa: firmaUrl });
  } catch (error) {
    console.error('[FIRMA] Error uploading signature:', error);
    res.status(500).json({ error: 'Error al subir firma: ' + error.message });
  }
});

// DELETE /api/empresas/firma - Delete company signature
router.delete('/firma', authenticateToken, async (req, res) => {
  try {
    console.log('[FIRMA DELETE] Starting signature deletion...');
    console.log('[FIRMA DELETE] User ID:', req.user.id);
    
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    // Delete from Supabase if it's stored there
    if (empresa.firmaEmpresa && !empresa.firmaEmpresa.startsWith('data:') && getSupabaseClient()) {
      const fileName = `${empresa.id}/signatures/company-signature.png`;
      await getSupabaseClient().storage
        .from('logos')
        .remove([fileName]);
      console.log('[FIRMA DELETE] Signature deleted from Supabase');
    }

    // Update empresa to remove signature
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { firmaEmpresa: null }
    });

    console.log('[FIRMA DELETE] Signature removed from database');

    res.json({ success: true });
  } catch (error) {
    console.error('[FIRMA DELETE] Error deleting signature:', error);
    res.status(500).json({ error: 'Error al eliminar firma: ' + error.message });
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
