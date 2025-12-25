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

    res.json(empresa);
  } catch (error) {
    console.error('Error obteniendo empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/empresas/mi-empresa - Actualizar empresa
router.put('/mi-empresa', authenticateToken, async (req, res) => {
  const { nombre, ruc, direccion, telefono, email, moneda, serieFactura, serieProforma } = req.body;

  try {
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const updatedEmpresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: {
        nombre,
        ruc,
        direccion,
        telefono,
        email,
        moneda,
        serieFactura,
        serieProforma
      }
    });

    res.json(updatedEmpresa);
  } catch (error) {
    console.error('Error actualizando empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/empresas/logo - Subir logo
router.post('/logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const empresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${empresa.id}/logo.${fileExt}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      throw error;
    }

    // Obtener URL pública
    const { data: publicUrl } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    // Actualizar empresa con URL del logo
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { logoUrl: publicUrl.publicUrl }
    });

    res.json({ logoUrl: publicUrl.publicUrl });
  } catch (error) {
    console.error('Error subiendo logo:', error);
    res.status(500).json({ error: 'Error al subir logo' });
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
