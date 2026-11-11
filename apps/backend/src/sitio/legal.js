// Datos legales del servicio (quien presta el servicio): una sola fila en `configuracion_sitio`.
const ID_FILA = 'global';
const CAMPOS = ['legalMarca', 'legalRazonSocial', 'legalRuc', 'legalDomicilio', 'legalCorreo'];
const MAX_LARGO = 200;
// Celular peruano: 9 dígitos que empiezan en 9, con o sin +51 (se guarda como «+51» y los 9 dígitos).
const CELULAR_PE = /^(?:\+?51)?(9\d{8})$/;
const ETIQUETAS = {
  legalMarca: 'La marca',
  legalRazonSocial: 'La razón social',
  legalRuc: 'El RUC',
  legalDomicilio: 'El domicilio',
  legalCorreo: 'El correo de contacto',
};

// RUC peruano: 11 dígitos; el último es el verificador (módulo 11 con pesos 5,4,3,2,7,6,5,4,3,2).
function rucValido(ruc) {
  if (typeof ruc !== 'string' || !/^\d{11}$/.test(ruc)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(ruc[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return verificador === Number(ruc[10]);
}

// Devuelve «+51XXXXXXXXX» o null si no es un celular peruano. Ignora espacios, guiones y paréntesis.
function normalizarCelularPe(valor) {
  const m = CELULAR_PE.exec(String(valor).replace(/[\s\-().]/g, ''));
  return m ? `+51${m[1]}` : null;
}

const correoValido = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

/**
 * Normaliza y valida el cuerpo del PUT. Devuelve { datos } o { error } (mensaje en español).
 * Recorta espacios; un string vacío pasa a null. Los campos ausentes también quedan en null
 * (el formulario siempre envía los cinco).
 */
function normalizarDatosLegales(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
    return { error: 'Envía los datos legales como un objeto.' };
  }
  const datos = {};
  for (const campo of CAMPOS) {
    const valor = cuerpo[campo];
    if (valor === undefined || valor === null) { datos[campo] = null; continue; }
    if (typeof valor !== 'string') return { error: `${ETIQUETAS[campo]} debe ser texto.` };
    const limpio = valor.trim();
    if (limpio.length > MAX_LARGO) return { error: `${ETIQUETAS[campo]} no puede pasar de ${MAX_LARGO} caracteres.` };
    datos[campo] = limpio === '' ? null : limpio;
  }
  if (datos.legalRuc !== null && !rucValido(datos.legalRuc)) {
    return { error: 'El RUC no es válido: debe tener 11 dígitos y un dígito verificador correcto.' };
  }
  if (datos.legalCorreo !== null && !correoValido(datos.legalCorreo)) {
    return { error: 'El correo de contacto no tiene un formato válido.' };
  }
  // WhatsApp de la demo: opcional. Ausente = no se toca lo guardado (el formulario de producción no lo envía);
  // vacío = null (borra el botón); si viene, debe ser un celular peruano.
  if (cuerpo.demoWhatsapp !== undefined) {
    if (cuerpo.demoWhatsapp === null || (typeof cuerpo.demoWhatsapp === 'string' && cuerpo.demoWhatsapp.trim() === '')) {
      datos.demoWhatsapp = null;
    } else {
      const celular = typeof cuerpo.demoWhatsapp === 'string' ? normalizarCelularPe(cuerpo.demoWhatsapp) : null;
      if (!celular) return { error: 'El WhatsApp debe ser un celular peruano de 9 dígitos que empieza en 9 (con o sin +51).' };
      datos.demoWhatsapp = celular;
    }
  }
  return { datos };
}

const seleccion = { legalMarca: true, legalRazonSocial: true, legalRuc: true, legalDomicilio: true, legalCorreo: true };

// Solo los 5 campos (nunca id ni fechas). Si no hay fila, devuelve los cinco en null.
async function leerDatosLegales(prisma) {
  const fila = await prisma.configuracionSitio.findUnique({ where: { id: ID_FILA }, select: seleccion });
  return fila || Object.fromEntries(CAMPOS.map((c) => [c, null]));
}

async function guardarDatosLegales(prisma, datos) {
  return prisma.configuracionSitio.upsert({
    where: { id: ID_FILA }, create: { id: ID_FILA, ...datos }, update: datos, select: seleccion,
  });
}

module.exports = { rucValido, correoValido, normalizarCelularPe, normalizarDatosLegales, leerDatosLegales, guardarDatosLegales, MAX_LARGO };
