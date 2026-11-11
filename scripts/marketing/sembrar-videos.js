// Datos de prueba FICTICIOS para los videos de Facturo. Idempotente: lo que ya existe no se duplica.
// Uso: source scripts/marketing/entorno-videos.sh && node scripts/marketing/sembrar-videos.js
//
// Guardas: aborta si DATABASE_URL no es localhost/invoiceapp_videos (la base invoiceapp tiene datos reales) o si la API
// no es local. Los datos entran por la API del backend (la misma que usa la app: registro, emisor con certificado cifrado,
// clientes, productos, comprobantes y envío real a SUNAT beta). Solo se escribe en la base directo para el plan y la
// proforma aceptada, que son datos administrativos o de estado.
//
// Cuentas de prueba (solo local, dominio .example):
//   demo@facturo.example     → empresa «Comercial Ejemplo S.A.C.», RUC 20000000001 (el RUC de pruebas de SUNAT beta), PE, setupCompleted
//   nuevo@facturo.example    → usuario sin empresa ni setupCompleted: para el asistente de f2
'use strict';
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
const API = process.env.API_URL || 'http://localhost:4001';
const CLAVE_PRUEBA = 'Facturo2026';
const CARPETA_CERT = path.join(RAIZ, '.claude/videos/cert');

// ---------- guardas ----------
const dbUrl = process.env.DATABASE_URL || '';
const mDb = dbUrl.match(/^postgres(?:ql)?:\/\/[^@]+@([^:/]+)(?::\d+)?\/([^?]+)/);
if (!mDb || !['localhost', '127.0.0.1'].includes(mDb[1]) || mDb[2] !== 'invoiceapp_videos') {
  console.error('Aborto: DATABASE_URL debe apuntar a localhost y a la base invoiceapp_videos (nunca a la base de datos real).');
  process.exit(1);
}
if (!/^http:\/\/localhost:\d+$/.test(API)) {
  console.error(`Aborto: la API debe ser local (localhost), no ${API}`);
  process.exit(1);
}

const { PrismaClient } = require(path.join(RAIZ, 'apps/backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

// ---------- utilidades ----------
const log = (...a) => console.log(...a);

async function api(metodo, ruta, { token, cuerpo } = {}) {
  const r = await fetch(`${API}/api${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos;
  try { datos = JSON.parse(texto); } catch { datos = texto; }
  if (!r.ok) {
    const detalle = typeof datos === 'string' ? datos : JSON.stringify(datos);
    throw new Error(`${metodo} ${ruta} → ${r.status}: ${detalle.slice(0, 300)}`);
  }
  return datos;
}

/** RUC de 11 dígitos con su dígito verificador (módulo 11, como lo valida el backend). */
function rucConDigito(base10) {
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = [...base10].reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  let dv = 11 - (suma % 11);
  if (dv === 10) dv = 0;
  if (dv === 11) dv = 1;
  return `${base10}${dv}`;
}

async function asegurarUsuario(email, nombre) {
  const existe = await prisma.userProfile.findUnique({ where: { email } });
  if (!existe) {
    await api('POST', '/auth/register', { cuerpo: { email, password: CLAVE_PRUEBA, name: nombre } });
    log(`usuario creado: ${email}`);
  }
  const sesion = await api('POST', '/auth/login', { cuerpo: { email, password: CLAVE_PRUEBA } });
  return sesion.session.access_token;
}

/** Certificado de PRUEBA autofirmado (no es de SUNAT). El RUC va en el sujeto: el motor lo lee de ahí. Fuera del repo. */
function asegurarCertificado() {
  fs.mkdirSync(CARPETA_CERT, { recursive: true, mode: 0o700 });
  const pfx = path.join(CARPETA_CERT, 'demo.pfx');
  const archivoClave = path.join(CARPETA_CERT, 'clave.txt');
  if (fs.existsSync(pfx) && fs.existsSync(archivoClave)) {
    return { pfx, clave: fs.readFileSync(archivoClave, 'utf8').trim() };
  }
  const clave = crypto.randomBytes(12).toString('hex');
  const llave = path.join(CARPETA_CERT, 'key.pem');
  const crt = path.join(CARPETA_CERT, 'cert.pem');
  const sujeto = '/C=PE/O=COMERCIAL EJEMPLO S.A.C./CN=COMERCIAL EJEMPLO S.A.C./serialNumber=20000000001';
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', llave, '-out', crt, '-days', '730', '-subj', sujeto], { stdio: 'ignore' });
  execFileSync('openssl', ['pkcs12', '-export', '-in', crt, '-inkey', llave, '-out', pfx, '-passout', `pass:${clave}`, '-name', 'demo'], { stdio: 'ignore' });
  fs.writeFileSync(archivoClave, clave, { mode: 0o600 });
  for (const f of [llave, crt]) fs.rmSync(f, { force: true }); // la llave no queda suelta en disco
  return { pfx, clave };
}

// ---------- datos ficticios ----------
const EMPRESA = {
  nombre: 'Comercial Ejemplo S.A.C.',
  razonSocial: 'COMERCIAL EJEMPLO S.A.C.',
  nombreComercial: 'Comercial Ejemplo',
  ruc: '20000000001',
  direccion: 'Av. Ejemplo 123, Lima',
  telefono: '01 555 0101',
  email: 'facturacion@comercial.example',
  pais: 'PE',
  moneda: 'PEN',
  currency: 'PEN',
  locale: 'es',
  taxRate: 18,
  taxName: 'IGV',
  serieFactura: 'F001',
  serieProforma: 'P001',
  setupCompleted: true,
};

const CLIENTES = [
  { tipoDocumento: 'RUC', numeroDocumento: rucConDigito('2060512341'), razonSocial: 'Ferretería Los Andes S.A.C.', direccion: 'Jr. Lima 455, Arequipa', email: 'compras@losandes.example' },
  { tipoDocumento: 'RUC', numeroDocumento: rucConDigito('2045871203'), razonSocial: 'Distribuidora Norte E.I.R.L.', direccion: 'Av. Los Olivos 80, Trujillo', email: 'pagos@norte.example' },
  { tipoDocumento: 'RUC', numeroDocumento: rucConDigito('2038820457'), razonSocial: 'Inversiones del Sur S.R.L.', direccion: 'Calle Real 210, Cusco', email: 'administracion@delsur.example' },
  { tipoDocumento: 'RUC', numeroDocumento: rucConDigito('2071133920'), razonSocial: 'Constructora Pacífico S.A.C.', direccion: 'Av. Costanera 1500, Lima', email: 'obras@pacifico.example' },
  { tipoDocumento: 'DNI', numeroDocumento: '70112233', razonSocial: 'María Elena Quispe Huamán', direccion: 'Psje. Las Flores 12, Lima', email: 'maria.quispe@cliente.example' },
  { tipoDocumento: 'DNI', numeroDocumento: '70445566', razonSocial: 'Carlos Ramírez Vega', direccion: 'Av. Brasil 900, Lima', email: 'carlos.ramirez@cliente.example' },
];

const PRODUCTOS = [
  { codigo: 'SRV-001', nombre: 'Consultoría contable mensual', tipo: 'SERVICIO', unidadMedida: 'ZZ', precioUnitario: 850, precioConIgv: true },
  { codigo: 'SRV-002', nombre: 'Mantenimiento de equipos', tipo: 'SERVICIO', unidadMedida: 'ZZ', precioUnitario: 180, precioConIgv: true },
  { codigo: 'PRD-001', nombre: 'Mouse inalámbrico', tipo: 'PRODUCTO', unidadMedida: 'NIU', precioUnitario: 45, precioConIgv: true },
  { codigo: 'PRD-002', nombre: 'Cuaderno A4 de 100 hojas', tipo: 'PRODUCTO', unidadMedida: 'NIU', precioUnitario: 12.5, precioConIgv: true },
  { codigo: 'PRD-003', nombre: 'Tinta para impresora', tipo: 'PRODUCTO', unidadMedida: 'NIU', precioUnitario: 79.9, precioConIgv: true },
];

// Comprobantes que se envían de verdad a SUNAT beta (se ven en el dashboard y en la lista).
const EMITIDOS = [
  { tipo: '01', serie: 'F001', cliente: 'Ferretería Los Andes S.A.C.', lineas: [['SRV-001', 1]] },
  { tipo: '01', serie: 'F001', cliente: 'Distribuidora Norte E.I.R.L.', lineas: [['PRD-001', 4], ['PRD-002', 10]] },
  { tipo: '01', serie: 'F001', cliente: 'Inversiones del Sur S.R.L.', lineas: [['SRV-002', 2]] },
  { tipo: '03', serie: 'B001', cliente: 'María Elena Quispe Huamán', lineas: [['PRD-003', 1]] },
  { tipo: '03', serie: 'B001', cliente: 'Carlos Ramírez Vega', lineas: [['PRD-001', 1]] },
];

// ---------- siembra ----------
async function main() {
  log('== Facturo · datos de los videos (base local invoiceapp_videos)');
  await asegurarUsuario('nuevo@facturo.example', 'Sofía Herrera');
  const token = await asegurarUsuario('demo@facturo.example', 'Rosa Vidal Salas');

  // Empresa
  await api('PUT', '/empresas/mi-empresa', { token, cuerpo: EMPRESA });
  const empresa = await prisma.empresa.findFirst({ where: { ruc: EMPRESA.ruc } });
  log(`empresa: ${empresa.nombre} (${empresa.pais}, setupCompleted=${empresa.setupCompleted})`);

  // Emisor SUNAT: certificado de prueba + usuario SOL de SUNAT beta. Crea las series F001, B001, FC01, FD01 y BC01.
  const cert = asegurarCertificado();
  await api('PUT', '/sunat/emisor', {
    token,
    cuerpo: {
      ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
      direccionFiscal: EMPRESA.direccion, codigoEstablecimiento: '0000', ambiente: 'BETA',
      solUsuario: 'MODDATOS', solClave: 'moddatos',
      certificado: { pfxBase64: fs.readFileSync(cert.pfx).toString('base64'), clave: cert.clave },
    },
  });
  log('emisor SUNAT (BETA) configurado con certificado de prueba');

  // El plan se fija en la base: el emisor ya creó la suscripción con el plan de Perú.
  const plan = await prisma.plan.findUnique({ where: { slug: 'pe-negocio' } });
  const hoy = new Date();
  const fin = new Date(hoy.getTime() + 30 * 86400000);
  await prisma.subscription.update({
    where: { empresaId: empresa.id },
    data: { planId: plan.id, status: 'ACTIVE', currentPeriodStart: hoy, currentPeriodEnd: fin },
  });
  log('plan pe-negocio activo');

  // Clientes
  for (const c of CLIENTES) {
    const ya = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, numeroDocumento: c.numeroDocumento } });
    // El backend exige teléfono en cada cliente (ruta de clientes): va un número ficticio.
    if (!ya) await api('POST', '/clientes', { token, cuerpo: { telefono: '01 555 0100', ...c } });
  }
  log(`clientes: ${await prisma.cliente.count({ where: { empresaId: empresa.id } })}`);

  // Productos y servicios
  for (const p of PRODUCTOS) {
    const ya = await prisma.producto.findFirst({ where: { empresaId: empresa.id, codigo: p.codigo } });
    if (!ya) await api('POST', '/productos', { token, cuerpo: p });
  }
  const productos = await prisma.producto.findMany({ where: { empresaId: empresa.id } });
  log(`productos: ${productos.length}`);

  // Comprobantes reales a SUNAT beta (solo si todavía no hay)
  const enviados = await prisma.factura.count({ where: { empresaId: empresa.id, estadoSunat: { not: null } } });
  if (enviados === 0) {
    const clientes = await prisma.cliente.findMany({ where: { empresaId: empresa.id } });
    for (const e of EMITIDOS) {
      const cliente = clientes.find((c) => c.razonSocial === e.cliente);
      const lineas = e.lineas.map(([codigo, cantidad]) => {
        const p = productos.find((x) => x.codigo === codigo);
        return { productoId: p.id, descripcion: p.nombre, cantidad, unidad: p.unidadMedida === 'ZZ' ? 'ZZ' : 'NIU', precio: Number(p.precioUnitario), precioIncluyeIgv: true, afectacion: '10' };
      });
      const borrador = await api('POST', '/comprobantes', { token, cuerpo: { tipoComprobante: e.tipo, serie: e.serie, clienteId: cliente.id, lineas, formaPago: { tipo: 'Contado' } } });
      const id = borrador.id ?? borrador.comprobante?.id ?? borrador.factura?.id;
      const resultado = await api('POST', `/comprobantes/${id}/emitir`, { token });
      const estado = resultado.estadoSunat ?? resultado.comprobante?.estadoSunat ?? JSON.stringify(resultado).slice(0, 120);
      log(`  ${e.serie} → ${e.cliente}: ${estado}`);
    }
  } else {
    log(`comprobantes ya enviados: ${enviados} (no se reenvían)`);
  }

  // Proforma aceptada (para la escena «Convertir en comprobante»)
  const aceptada = await prisma.proforma.findFirst({ where: { empresaId: empresa.id, estado: 'aceptada' } });
  if (!aceptada) {
    const constructora = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, razonSocial: 'Constructora Pacífico S.A.C.' } });
    const creada = await api('POST', '/proformas', {
      token,
      cuerpo: {
        clienteId: constructora.id,
        jobName: 'Oficina central, piso 4',
        condiciones: 'Pago 50 % al inicio y 50 % al entregar',
        diasValidez: 15,
        detalles: [
          { descripcion: 'Remodelación de oficina (diseño y obra civil)', cantidad: 1, unidadMedida: 'ZZ', precioUnitario: 4800, descuento: 0 },
          { descripcion: 'Instalación de puntos de red', cantidad: 6, unidadMedida: 'NIU', precioUnitario: 95, descuento: 0 },
        ],
      },
    });
    const id = creada.id ?? creada.proforma?.id;
    await prisma.proforma.update({ where: { id }, data: { estado: 'aceptada', fechaAceptacion: new Date() } });
    log(`proforma P001 aceptada (${id.slice(0, 8)}…)`);
  } else {
    log('proforma aceptada ya existe');
  }

  const resumen = {
    clientes: await prisma.cliente.count({ where: { empresaId: empresa.id } }),
    productos: await prisma.producto.count({ where: { empresaId: empresa.id } }),
    comprobantes: await prisma.factura.count({ where: { empresaId: empresa.id, estadoSunat: { not: null } } }),
    proformas: await prisma.proforma.count({ where: { empresaId: empresa.id } }),
  };
  log('resumen:', JSON.stringify(resumen));
}

main()
  .catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
