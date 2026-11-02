const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { getOrCreateSubscription } = require('../middleware/subscription');
const { uploadFile, deleteFile, getStorageProvider } = require('../utils/storage');

// Configuración de multer para upload temporal
const upload = multer({ storage: multer.memoryStorage() });

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

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

// PUT /api/empresas/mi-empresa - Crear o actualizar empresa (upsert)
router.put('/mi-empresa', authenticateToken, async (req, res) => {
  try {
    console.log('[EMPRESA] Upsert request from user:', req.user.id);
    console.log('[EMPRESA] Request body:', JSON.stringify(req.body, null, 2));
    
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { userId: req.user.id }
    });

    // Campos que vienen en el cuerpo (frontend → esquema). Solo lo enviado se escribe: un formulario parcial
    // (p. ej. Configuración › Empresa) no debe pisar el resto con valores por defecto.
    const b = req.body;

    // Color de marca: solo se escribe si viene en el cuerpo; null lo quita (siempre permitido).
    let colorNuevo; // undefined = no enviado
    if (b.colorPrimario !== undefined) {
      if (b.colorPrimario !== null && !(typeof b.colorPrimario === 'string' && HEX_COLOR.test(b.colorPrimario))) {
        return res.status(400).json({ error: 'El color debe ser un código hexadecimal como #1E40AF' });
      }
      colorNuevo = b.colorPrimario === null ? null : b.colorPrimario.toUpperCase();
      // Poner un color distinto del guardado exige el plan con marca propia. Empresa nueva: aún no hay plan, se ignora.
      if (existingEmpresa && colorNuevo !== null && colorNuevo !== existingEmpresa.colorPrimario) {
        const sub = await getOrCreateSubscription(existingEmpresa.id);
        if (!sub?.plan?.hasCustomBranding) {
          return res.status(403).json({
            error: 'Los colores de tu marca están disponibles desde el plan Negocio',
            code: 'FEATURE_NOT_AVAILABLE',
          });
        }
      }
    }

    const moneda = b.currency || b.moneda;
    const empresaData = {
      colorPrimario: colorNuevo,
      nombre: b.nombre || b.razonSocial,
      razonSocial: b.razonSocial || b.nombre,
      nombreComercial: b.nombreComercial,
      ruc: b.ruc || undefined,
      direccion: b.direccion,
      telefono: b.telefono,
      email: b.email,
      web: b.web,
      logoUrl: b.logoUrl,
      moneda: moneda || undefined,
      currency: moneda || undefined,
      locale: b.locale || undefined,
      taxRate: b.taxRate !== undefined && b.taxRate !== null && b.taxRate !== '' ? parseFloat(b.taxRate) : undefined,
      taxName: b.taxName || undefined,
      serieFactura: b.serieFactura || undefined,
      serieProforma: b.serieProforma || undefined,
      licencia: b.licencia,
      setupCompleted: typeof b.setupCompleted === 'boolean' ? b.setupCompleted : undefined,
      pais: ['US', 'PE'].includes(b.pais) ? b.pais : undefined,
    };

    // Empresa nueva: valores por defecto de Perú (la app es para Perú) para lo que no venga.
    if (!existingEmpresa) {
      delete empresaData.colorPrimario; // sin plan todavía: el color se pone después, con plan
      Object.assign(empresaData, {
        nombre: empresaData.nombre || 'Mi Empresa',
        razonSocial: empresaData.razonSocial || empresaData.nombre || 'Mi Empresa',
        ruc: empresaData.ruc || 'TEMP-' + Date.now(), // RUC temporal si no se indica
        moneda: empresaData.moneda || 'PEN',
        currency: empresaData.currency || 'PEN',
        locale: empresaData.locale || 'es',
        taxRate: empresaData.taxRate ?? 18,
        taxName: empresaData.taxName || 'IGV',
        serieFactura: empresaData.serieFactura || 'F001',
        serieProforma: empresaData.serieProforma || 'P001',
        setupCompleted: empresaData.setupCompleted ?? false,
        pais: empresaData.pais || 'PE',
        userId: req.user.id,
      });
    }

    // Remove undefined values
    Object.keys(empresaData).forEach(key => 
      empresaData[key] === undefined && delete empresaData[key]
    );

    if (existingEmpresa && empresaData.pais && empresaData.pais !== existingEmpresa.pais) {
      const emisor = await prisma.emisorSunat.findUnique({ where: { empresaId: existingEmpresa.id }, select: { id: true } });
      if (emisor) delete empresaData.pais; // ya factura en SUNAT: el país no cambia desde el asistente
    }

    let resultEmpresa;

    if (existingEmpresa) {
      // Update existing empresa
      console.log('[EMPRESA] Updating existing empresa:', existingEmpresa.id);
      resultEmpresa = await prisma.empresa.update({
        where: { id: existingEmpresa.id },
        data: empresaData
      });
      console.log('[EMPRESA] Updated successfully:', resultEmpresa.id);
      // Cambio de país: la suscripción pasa al plan gratis del país nuevo.
      if (resultEmpresa.pais !== existingEmpresa.pais) await getOrCreateSubscription(resultEmpresa.id);
    } else {
      // Create new empresa
      console.log('[EMPRESA] Creating new empresa for user:', req.user.id);
      resultEmpresa = await prisma.empresa.create({
        data: empresaData
      });
      console.log('[EMPRESA] Created successfully:', resultEmpresa.id);
    }

    // Return with frontend field names
    const empresaResponse = {
      ...resultEmpresa,
      razonSocial: resultEmpresa.razonSocial || resultEmpresa.nombre,
      nombreComercial: resultEmpresa.nombreComercial || resultEmpresa.nombre
    };

    res.json(empresaResponse);
  } catch (error) {
    console.error('[EMPRESA] Error upserting empresa:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ese RUC ya está registrado en otra empresa' });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
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
    
    const provider = getStorageProvider();
    console.log(`[LOGO] Uploading to ${provider} Storage as:`, fileName);

    const { publicUrl } = await uploadFile(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

    console.log('[LOGO] Public URL:', publicUrl);

    // Actualizar empresa con URL del logo
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { logoUrl: publicUrl }
    });

    console.log('[LOGO] Logo URL updated in database');

    res.json({ logoUrl: publicUrl });
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

    try {
      const signatureBuffer = Buffer.from(signatureDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const fileName = `${empresa.id}/signatures/company-signature.png`;

      const { publicUrl } = await uploadFile(fileName, signatureBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

      firmaUrl = publicUrl;
      console.log('[FIRMA] Upload successful:', firmaUrl);
    } catch (error) {
      console.error('[FIRMA] Error uploading signature to storage:', error);
      firmaUrl = signatureDataUrl; // Fallback to data URL
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

    // Delete from storage if it's stored as URL
    if (empresa.firmaEmpresa && !empresa.firmaEmpresa.startsWith('data:')) {
      const fileName = `${empresa.id}/signatures/company-signature.png`;
      await deleteFile(fileName);
      console.log('[FIRMA DELETE] Signature deleted from storage');
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
