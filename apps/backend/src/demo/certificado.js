// Certificado de PRUEBA autofirmado para el emisor de la demo (SUNAT beta). Se genera al sembrar con openssl y
// vive solo en una carpeta temporal que se borra al terminar: ni el repo ni la base guardan la llave en claro.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Devuelve { pfx: Buffer, clave: string }. La clave viaja por variable de entorno, no por la línea de comandos.
function generarCertificadoPrueba({ dias = 3650 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facturo-demo-cert-'));
  try {
    const clave = crypto.randomBytes(16).toString('hex');
    const llave = path.join(dir, 'llave.pem');
    const cert = path.join(dir, 'cert.pem');
    const pfx = path.join(dir, 'cert.pfx');
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', llave, '-out', cert, '-days', String(dias),
      '-subj', '/C=PE/O=Facturo demostracion/CN=Certificado de prueba',
    ], { stdio: 'ignore' });
    execFileSync('openssl', [
      'pkcs12', '-export', '-inkey', llave, '-in', cert, '-out', pfx,
      '-passout', 'env:FACTURO_DEMO_CLAVE_PFX',
    ], { stdio: 'ignore', env: { ...process.env, FACTURO_DEMO_CLAVE_PFX: clave } });
    return { pfx: fs.readFileSync(pfx), clave };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { generarCertificadoPrueba };
