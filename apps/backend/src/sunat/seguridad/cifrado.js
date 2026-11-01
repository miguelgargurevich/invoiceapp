const crypto = require('node:crypto');

// Secretos del emisor (clave SOL, .pfx y su contraseña) cifrados con AES-256-GCM.
// Formato: v1:<iv base64>:<tag base64>:<datos base64>
const VERSION = 'v1';
const LARGO_IV = 12;
const LARGO_TAG = 16;

// Llave derivada de SUNAT_MASTER_SECRET (alternativa a SUNAT_MASTER_KEY para plataformas que generan textos
// aleatorios y no 32 bytes en base64, como Coolify). La sal es FIJA a propósito: la llave tiene que ser la
// misma en cada arranque o los certificados ya cifrados dejarían de abrirse. No cambiar la sal ni el secreto.
const SAL_LLAVE_DERIVADA = 'facturo-sunat-v1';
const MIN_LARGO_SECRETO = 32;
let derivada = null; // { secreto, llave }: scrypt es lento a propósito, se calcula una sola vez

function derivarLlave(secreto) {
  if (derivada && derivada.secreto === secreto) return derivada.llave;
  const llave = crypto.scryptSync(secreto, SAL_LLAVE_DERIVADA, 32);
  derivada = { secreto, llave };
  return llave;
}

// SUNAT_MASTER_KEY (32 bytes en base64) manda; si no existe se usa SUNAT_MASTER_SECRET (mínimo 32 caracteres).
function obtenerLlave(env = process.env) {
  const base64 = env.SUNAT_MASTER_KEY;
  if (base64) {
    const llave = Buffer.from(base64, 'base64');
    if (llave.length !== 32) throw new Error('SUNAT_MASTER_KEY debe tener 32 bytes en base64');
    return llave;
  }
  const secreto = env.SUNAT_MASTER_SECRET;
  if (!secreto) {
    throw new Error(`Falta SUNAT_MASTER_KEY (32 bytes en base64) o SUNAT_MASTER_SECRET (mínimo ${MIN_LARGO_SECRETO} caracteres)`);
  }
  if (secreto.length < MIN_LARGO_SECRETO) {
    throw new Error(`SUNAT_MASTER_SECRET debe tener al menos ${MIN_LARGO_SECRETO} caracteres`);
  }
  return derivarLlave(secreto);
}

function cifrar(dato, llave = obtenerLlave()) {
  const iv = crypto.randomBytes(LARGO_IV);
  const cifrador = crypto.createCipheriv('aes-256-gcm', llave, iv, { authTagLength: LARGO_TAG });
  const plano = Buffer.isBuffer(dato) ? dato : Buffer.from(String(dato), 'utf8');
  const datos = Buffer.concat([cifrador.update(plano), cifrador.final()]);
  return [VERSION, iv.toString('base64'), cifrador.getAuthTag().toString('base64'), datos.toString('base64')].join(':');
}

function descifrar(texto, llave = obtenerLlave()) {
  const partes = String(texto).split(':');
  if (partes.length !== 4 || partes[0] !== VERSION || !partes[1] || !partes[2]) {
    throw new Error('Formato de dato cifrado inválido');
  }
  const iv = Buffer.from(partes[1], 'base64');
  const tag = Buffer.from(partes[2], 'base64');
  if (iv.length !== LARGO_IV || tag.length !== LARGO_TAG) throw new Error('Formato de dato cifrado inválido');
  const descifrador = crypto.createDecipheriv('aes-256-gcm', llave, iv, { authTagLength: LARGO_TAG });
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(Buffer.from(partes[3], 'base64')), descifrador.final()]);
}

module.exports = { cifrar, descifrar, obtenerLlave };
