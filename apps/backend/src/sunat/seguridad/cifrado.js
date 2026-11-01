const crypto = require('node:crypto');

// Secretos del emisor (clave SOL, .pfx y su contraseña) cifrados con AES-256-GCM.
// Formato: v1:<iv base64>:<tag base64>:<datos base64>
const VERSION = 'v1';
const LARGO_IV = 12;
const LARGO_TAG = 16;

function obtenerLlave(env = process.env) {
  const base64 = env.SUNAT_MASTER_KEY;
  if (!base64) throw new Error('Falta SUNAT_MASTER_KEY (32 bytes en base64)');
  const llave = Buffer.from(base64, 'base64');
  if (llave.length !== 32) throw new Error('SUNAT_MASTER_KEY debe tener 32 bytes en base64');
  return llave;
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
