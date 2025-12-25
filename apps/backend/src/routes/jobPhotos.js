const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
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
        empresa: { userId: req.user.userId }
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
        empresa: { userId: req.user.userId }
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

    // Validar que se proporcione facturaId o proformaId (pero no ambos)
    if ((!facturaId && !proformaId) || (facturaId && proformaId)) {
      return res.status(400).json({ error: 'Debe proporcionar facturaId o proformaId (no ambos)' });
    }

    // Verificar permisos
    if (facturaId) {
      const factura = await prisma.factura.findFirst({
        where: { id: facturaId, empresa: { userId: req.user.userId } }
      });
      if (!factura) {
        return res.status(404).json({ error: 'Factura no encontrada' });
      }
    }

    if (proformaId) {
      const proforma = await prisma.proforma.findFirst({
        where: { id: proformaId, empresa: { userId: req.user.userId } }
      });
      if (!proforma) {
        return res.status(404).json({ error: 'Proforma no encontrada' });
      }
    }

    // Crear la URL relativa del archivo
    const fileUrl = `/uploads/photos/${req.file.filename}`;

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
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
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
    const fs = require('fs');

    const existingPhoto = await prisma.jobPhoto.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
        ]
      }
    });

    if (!existingPhoto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }

    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../..', existingPhoto.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
