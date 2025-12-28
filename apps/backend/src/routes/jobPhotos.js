const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { createClient } = require('@supabase/supabase-js');

// Lazy initialization of Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required for photo uploads');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

// Configurar multer para memoria (para subir a Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Obtener todas las fotos de una factura
router.get('/factura/:facturaId', authenticateToken, async (req, res) => {
  try {
    const { facturaId } = req.params;

    const factura = await prisma.factura.findFirst({
      where: {
        id: facturaId,
        empresa: { userId: req.user.id }
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const photos = await prisma.jobPhoto.findMany({
      where: { facturaId },
      orderBy: [{ orden: 'asc' }, { fecha: 'desc' }]
    });

    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
});

// Obtener todas las fotos de una proforma
router.get('/proforma/:proformaId', authenticateToken, async (req, res) => {
  try {
    const { proformaId } = req.params;

    const proforma = await prisma.proforma.findFirst({
      where: {
        id: proformaId,
        empresa: { userId: req.user.id }
      }
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma no encontrada' });
    }

    const photos = await prisma.jobPhoto.findMany({
      where: { proformaId },
      orderBy: [{ orden: 'asc' }, { fecha: 'desc' }]
    });

    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
});

// Subir una foto
router.post('/', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const { facturaId, proformaId, descripcion, orden } = req.body;
    const userId = req.user.id;

    // Validar que se proporcione facturaId o proformaId (pero no ambos)
    if ((!facturaId && !proformaId) || (facturaId && proformaId)) {
      return res.status(400).json({ error: 'Debe proporcionar facturaId o proformaId (no ambos)' });
    }

    // Verificar permisos
    if (facturaId) {
      const factura = await prisma.factura.findFirst({
        where: { id: facturaId, empresa: { userId: req.user.id } }
      });
      if (!factura) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
    }

    if (proformaId) {
      const proforma = await prisma.proforma.findFirst({
        where: { id: proformaId, empresa: { userId: req.user.id } }
      });
      if (!proforma) {
        return res.status(404).json({ error: 'Proforma no encontrada' });
      }
    }

    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname);
    const fileName = `photo-${uniqueSuffix}${ext}`;
    
    // Estructura: logos/{userId}/job-photos/{fileName}
    const storagePath = `${userId}/job-photos/${fileName}`;
    
    // Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await getSupabaseClient().storage
      .from('logos')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      return res.status(500).json({ error: 'Error al subir imagen a storage' });
    }

    // Obtener URL pública
    const { data: urlData } = getSupabaseClient().storage
      .from('logos')
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    const photo = await prisma.jobPhoto.create({
      data: {
        facturaId: facturaId || null,
        proformaId: proformaId || null,
        url: fileUrl,
        descripcion: descripcion || null,
        orden: orden ? parseInt(orden) : 0
      }
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Error al subir foto:', error);
    res.status(500).json({ error: 'Error al subir foto' });
  }
});

// Actualizar descripción/orden de una foto
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, orden } = req.body;

    const existingPhoto = await prisma.jobPhoto.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.id } } },
          { proforma: { empresa: { userId: req.user.id } } }
        ]
      }
    });

    if (!existingPhoto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    const photo = await prisma.jobPhoto.update({
      where: { id },
      data: {
        ...(descripcion !== undefined && { descripcion }),
        ...(orden !== undefined && { orden: parseInt(orden) })
      }
    });

    res.json(photo);
  } catch (error) {
    console.error('Error al actualizar foto:', error);
    res.status(500).json({ error: 'Error al actualizar foto' });
  }
});

// Eliminar una foto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existingPhoto = await prisma.jobPhoto.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.id } } },
          { proforma: { empresa: { userId: req.user.id } } }
        ]
      }
    });

    if (!existingPhoto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    // Extraer el path de la URL de Supabase para eliminarlo
    // URL format: https://xxx.supabase.co/storage/v1/object/public/logos/{userId}/job-photos/{fileName}
    const url = existingPhoto.url;
    if (url && url.includes('supabase.co')) {
      try {
        const pathMatch = url.match(/\/logos\/(.+)$/);
        if (pathMatch) {
          const storagePath = pathMatch[1];
          await getSupabaseClient().storage.from('logos').remove([storagePath]);
        }
      } catch (storageError) {
        console.error('Error deleting from Supabase storage:', storageError);
        // Continue with DB deletion even if storage deletion fails
      }
    }

    await prisma.jobPhoto.delete({
      where: { id }
    });

    res.json({ message: 'Foto eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
});

module.exports = router;
