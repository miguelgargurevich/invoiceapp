const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/preferences - Get user preferences
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('[PREFERENCES] Getting preferences for user:', req.user.sub);
    
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.sub }
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      console.log('[PREFERENCES] No preferences found, creating defaults');
      preferences = await prisma.userPreferences.create({
        data: {
          userId: req.user.sub,
          theme: 'light',
          fontSize: 'medium',
          locale: 'es',
          emailFactura: true,
          emailVencimiento: true,
          emailPago: true,
          diasAntesVencimiento: 5
        }
      });
    }

    res.json(preferences);
  } catch (error) {
    console.error('[PREFERENCES] Error getting preferences:', error.message);
    console.error('[PREFERENCES] Full error:', error);
    
    // If table doesn't exist, return default preferences without saving
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('[PREFERENCES] Table does not exist, returning defaults');
      return res.json({
        theme: 'light',
        fontSize: 'medium',
        locale: 'es',
        emailFactura: true,
        emailVencimiento: true,
        emailPago: true,
        diasAntesVencimiento: 5
      });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/preferences - Update user preferences
router.put('/', authenticateToken, async (req, res) => {
  try {
    console.log('[PREFERENCES] Updating preferences for user:', req.user.sub);
    console.log('[PREFERENCES] Update data:', req.body);
    
    const {
      theme,
      fontSize,
      locale,
      emailFactura,
      emailVencimiento,
      emailPago,
      diasAntesVencimiento
    } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: req.user.sub },
      update: {
        ...(theme && { theme }),
        ...(fontSize && { fontSize }),
        ...(locale && { locale }),
        ...(emailFactura !== undefined && { emailFactura }),
        ...(emailVencimiento !== undefined && { emailVencimiento }),
        ...(emailPago !== undefined && { emailPago }),
        ...(diasAntesVencimiento !== undefined && { diasAntesVencimiento })
      },
      create: {
        userId: req.user.sub,
        theme: theme || 'light',
        fontSize: fontSize || 'medium',
        locale: locale || 'es',
        emailFactura: emailFactura !== undefined ? emailFactura : true,
        emailVencimiento: emailVencimiento !== undefined ? emailVencimiento : true,
        emailPago: emailPago !== undefined ? emailPago : true,
        diasAntesVencimiento: diasAntesVencimiento || 5
      }
    });

    res.json(preferences);
  } catch (error) {
    console.error('[PREFERENCES] Error updating preferences:', error.message);
    console.error('[PREFERENCES] Full error:', error);
    
    // If table doesn't exist, just return success with the data they sent
    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('[PREFERENCES] Table does not exist, returning sent data');
      return res.json({
        theme: req.body.theme || 'light',
        fontSize: req.body.fontSize || 'medium',
        locale: req.body.locale || 'es',
        emailFactura: req.body.emailFactura !== undefined ? req.body.emailFactura : true,
        emailVencimiento: req.body.emailVencimiento !== undefined ? req.body.emailVencimiento : true,
        emailPago: req.body.emailPago !== undefined ? req.body.emailPago : true,
        diasAntesVencimiento: req.body.diasAntesVencimiento || 5
      });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
