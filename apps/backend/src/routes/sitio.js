const express = require('express');
const prisma = require('../utils/prisma');
const { leerDatosLegales } = require('../sitio/legal');

const router = express.Router();

/**
 * GET /api/sitio/legal
 * Pública, sin sesión: quién presta el servicio (marca, razón social, RUC, domicilio, correo).
 * Devuelve solo esos 5 campos; los vacíos van en null y el frontend muestra «por confirmar».
 */
router.get('/legal', async (_req, res) => {
  try {
    res.json(await leerDatosLegales(prisma));
  } catch (error) {
    console.error('[Sitio] Error al leer los datos legales:', error);
    res.status(500).json({ error: 'No se pudieron leer los datos legales' });
  }
});

module.exports = router;
