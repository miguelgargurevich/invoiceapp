const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { authenticateToken } = require('../middleware/auth');

// GET /api/preferences - Get user preferences
router.get('/', authenticateToken, async (req, res) => {
  try {
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: req.user.sub }
    });

    // If no preferences exist, create default ones
    if (!preferences) {
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
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/preferences - Update user preferences
router.put('/', authenticateToken, async (req, res) => {
  try {
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
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
