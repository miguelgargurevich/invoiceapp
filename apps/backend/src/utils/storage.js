const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Dos proveedores:
// - r2: Cloudflare R2 (producción). Requiere R2_* y R2_PUBLIC_URL.
// - local: disco del backend (desarrollo). Escribe en LOCAL_UPLOADS_DIR (por defecto ./uploads)
//   y lo sirve app.js en /uploads.
let r2Client = null;

function getStorageProvider() {
  return (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
}

// Un valor desconocido (p. ej. un STORAGE_PROVIDER heredado) falla en vez de caer en silencio al disco.
function proveedorActivo() {
  const proveedor = getStorageProvider();
  if (proveedor !== 'r2' && proveedor !== 'local') {
    throw new Error(`STORAGE_PROVIDER desconocido: "${proveedor}". Usa "r2" o "local".`);
  }
  return proveedor;
}

function getR2Client() {
  if (!r2Client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for R2 storage');
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: String(process.env.R2_PATH_STYLE).toLowerCase() === 'true',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

function getLocalUploadsDir() {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOADS_DIR || 'uploads');
}

function getBackendPublicBase() {
  const base = process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
  return base.replace(/\/$/, '');
}

// Ruta en disco de una clave; rechaza cualquier clave que salga de la carpeta de uploads.
function rutaLocal(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Clave de almacenamiento vacía');
  }

  const base = getLocalUploadsDir();
  const ruta = path.resolve(base, key);
  if (!ruta.startsWith(base + path.sep)) {
    throw new Error(`Clave de almacenamiento fuera de la carpeta de uploads: "${key}"`);
  }

  return ruta;
}

function codificarClave(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function decodificarClave(texto) {
  try {
    return decodeURIComponent(texto);
  } catch {
    return null;
  }
}

function getBucketName() {
  return process.env.R2_BUCKET;
}

function getPublicUrl(key) {
  if (proveedorActivo() === 'r2') {
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!publicBase) {
      throw new Error('R2_PUBLIC_URL is required to build public file URLs');
    }

    return `${publicBase.replace(/\/$/, '')}/${key}`;
  }

  rutaLocal(key); // valida la clave antes de construir una URL con ella
  return `${getBackendPublicBase()}/uploads/${codificarClave(key)}`;
}

async function uploadFile(key, body, options = {}) {
  const { contentType = 'application/octet-stream' } = options;

  if (proveedorActivo() === 'r2') {
    await getR2Client().send(new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    return { publicUrl: getPublicUrl(key) };
  }

  const ruta = rutaLocal(key);
  await fs.promises.mkdir(path.dirname(ruta), { recursive: true });
  await fs.promises.writeFile(ruta, body);

  return { publicUrl: getPublicUrl(key) };
}

async function deleteFile(key) {
  if (proveedorActivo() === 'r2') {
    await getR2Client().send(new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }));
    return;
  }

  // force: borrar un archivo que ya no está no es un error (igual que en R2).
  await fs.promises.rm(rutaLocal(key), { force: true });
}

function extractStorageKeyFromUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const r2Base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (r2Base && url.startsWith(`${r2Base}/`)) {
    return url.slice(r2Base.length + 1);
  }

  const localBases = [`${getBackendPublicBase()}/uploads/`, '/uploads/'];
  const base = localBases.find((b) => url.startsWith(b));
  if (base) {
    return decodificarClave(url.slice(base.length));
  }

  return null;
}

module.exports = {
  getStorageProvider,
  getR2Client,
  uploadFile,
  deleteFile,
  getPublicUrl,
  extractStorageKeyFromUrl,
};
