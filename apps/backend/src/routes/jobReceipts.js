const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png)|application\/pdf/.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG) o PDF'));
    }
  }
});

// Obtener todos los recibos de una factura
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

    const receipts = await prisma.jobReceipt.findMany({
      where: { facturaId },
      orderBy: { fecha: 'desc' }
    });

    res.json(receipts);
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    res.status(500).json({ error: 'Error al obtener recibos' });
  }
});

// Obtener todos los recibos de una proforma
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

    const receipts = await prisma.jobReceipt.findMany({
      where: { proformaId },
      orderBy: { fecha: 'desc' }
    });

    res.json(receipts);
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    res.status(500).json({ error: 'Error al obtener recibos' });
  }
});

// Crear un recibo (con o sin archivo)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { facturaId, proformaId, fecha, descripcion, monto, categoria, proveedor, numeroRecibo } = req.body;

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

    // URL del archivo si se subió
    const fileUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;

    const receipt = await prisma.jobReceipt.create({
      data: {
        facturaId: facturaId || null,
        proformaId: proformaId || null,
        fecha: new Date(fecha),
        descripcion,
        monto: parseFloat(monto),
        categoria: categoria || null,
        proveedor: proveedor || null,
        numeroRecibo: numeroRecibo || null,
        url: fileUrl
      }
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error('Error al crear recibo:', error);
    res.status(500).json({ error: 'Error al crear recibo' });
  }
});

// Actualizar un recibo
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, monto, categoria, proveedor, numeroRecibo } = req.body;

    const existingReceipt = await prisma.jobReceipt.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
        ]
      }
    });

    if (!existingReceipt) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }

    const receipt = await prisma.jobReceipt.update({
      where: { id },
      data: {
        ...(fecha && { fecha: new Date(fecha) }),
        ...(descripcion !== undefined && { descripcion }),
        ...(monto !== undefined && { monto: parseFloat(monto) }),
        ...(categoria !== undefined && { categoria }),
        ...(proveedor !== undefined && { proveedor }),
        ...(numeroRecibo !== undefined && { numeroRecibo })
      }
    });

    res.json(receipt);
  } catch (error) {
    console.error('Error al actualizar recibo:', error);
    res.status(500).json({ error: 'Error al actualizar recibo' });
  }
});

// Eliminar un recibo
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');

    const existingReceipt = await prisma.jobReceipt.findFirst({
      where: {
        id,
        OR: [
          { factura: { empresa: { userId: req.user.userId } } },
          { proforma: { empresa: { userId: req.user.userId } } }
        ]
      }
    });

    if (!existingReceipt) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }

    // Eliminar archivo físico si existe
    if (existingReceipt.url) {
      const filePath = path.join(__dirname, '../..', existingReceipt.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.jobReceipt.delete({
      where: { id }
    });

    res.json({ message: 'Recibo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar recibo:', error);
    res.status(500).json({ error: 'Error al eliminar recibo' });
  }
});

// Obtener resumen de gastos por categoría
router.get('/resumen/:documentType/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentType, documentId } = req.params;

    // Validar tipo de documento
    if (!['factura', 'proforma'].includes(documentType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Verificar permisos
    const whereClause = documentType === 'factura' 
      ? { facturaId: documentId }
      : { proformaId: documentId };

    const document = await prisma[documentType].findFirst({
      where: {
        id: documentId,
        empresa: { userId: req.user.userId }
      }
    });

    if (!document) {
      return res.status(404).json({ error: `${documentType} no encontrada` });
    }

    // Obtener todos los recibos
    const receipts = await prisma.jobReceipt.findMany({
      where: whereClause
    });

    // Calcular resumen por categoría
    const resumen = receipts.reduce((acc, receipt) => {
      const cat = receipt.categoria || 'sin_categoria';
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0 };
      }
      acc[cat].total += parseFloat(receipt.monto);
      acc[cat].count += 1;
      return acc;
    }, {});

    // Calcular total general
    const totalGeneral = receipts.reduce((sum, receipt) => sum + parseFloat(receipt.monto), 0);

    res.json({
      porCategoria: resumen,
      totalGeneral,
      cantidadRecibos: receipts.length
    });
  } catch (error) {
    console.error('Error al obtener resumen de gastos:', error);
    res.status(500).json({ error: 'Error al obtener resumen de gastos' });
  }
});

module.exports = router;
