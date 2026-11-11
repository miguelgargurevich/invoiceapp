// Demo: datos ficticios, guardas de la siembra y el arranque condicionado. Sin base de datos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const datos = require('../../src/demo/datos-ficticios');
const { motivoNoSembrar } = require('../../src/demo/guardas');
const { PERFILES, CORREOS_DEMO } = require('../../src/demo/perfiles');
const { fechaLima } = require('../../src/sunat/fechas');

const RAIZ_BACKEND = path.join(__dirname, '..', '..');
const LOCAL = { NODE_ENV: 'development' };

test('RUC ficticio: dígito verificador módulo 11 (20000000001 es el RUC de pruebas de SUNAT beta)', () => {
  assert.equal(datos.rucFicticio('20', 0), '20000000001');
  assert.equal(datos.rucFicticio('10', 48213765), '10482137658');
  assert.equal(datos.digitoVerificadorRuc('2051234001'), 7);
});

test('todos los RUC de clientes de la demo son válidos, salvo el de rechazo de muestra (a propósito)', () => {
  for (const c of datos.CLIENTES_EMPRESA) {
    assert.equal(c.ruc.length, 11);
    assert.equal(c.ruc.slice(0, 2), '20');
    assert.equal(Number(c.ruc[10]), datos.digitoVerificadorRuc(c.ruc.slice(0, 10)), c.ruc);
  }
  const malo = datos.CLIENTE_EMPRESA_ERRONEO.ruc;
  assert.notEqual(Number(malo[10]), datos.digitoVerificadorRuc(malo.slice(0, 10)), 'el RUC de muestra debe tener el dígito mal');
});

test('celulares ficticios con formato 9000xxxxx', () => {
  assert.equal(datos.celularFicticio(7), '900000007');
  assert.match(datos.celularFicticio(12345), /^9000\d{5}$/);
});

test('los correos de la demo son de dominio .example y las cuentas de demo tienen su correo', () => {
  for (const correo of CORREOS_DEMO) assert.match(correo, /@[a-z.]+\.example$/);
  assert.equal(PERFILES.emprendedor.email, 'emprendedor@demo.facturo.example');
  assert.equal(PERFILES.servicios.email, 'servicios@demo.facturo.example');
  assert.match(datos.CORREO_EJEMPLO('cliente1', 'bodega-don-lucho'), /@bodega-don-lucho\.example$/);
});

test('fechas relativas a hoy en hora de Lima', () => {
  // 03:00 UTC del 11 de noviembre = 22:00 del 10 de noviembre en Lima.
  const ahora = new Date('2026-11-11T03:00:00Z');
  assert.equal(fechaLima(ahora), '2026-11-10');
  assert.equal(datos.diaLimaHace(ahora, 0), '2026-11-10');
  assert.equal(datos.diaLimaHace(ahora, 1), '2026-11-09');
  assert.equal(datos.diaLimaHace(ahora, 31), '2026-10-10');
  assert.equal(fechaLima(datos.fechaDeDia('2026-11-09')), '2026-11-09');
  assert.equal(datos.sumarDias('2026-11-30', 30), '2026-12-30');
});

test('correlativos: cada día empieza en otro millar (sin choques con números que SUNAT ya registró)', () => {
  assert.equal(datos.correlativoBase(new Date('2026-11-11T15:00:00Z')), 314000);
  assert.equal(datos.correlativoBase(new Date('2026-11-12T15:00:00Z')), 315000);
});

test('el generador aleatorio es determinista con la misma semilla', () => {
  const a = datos.generadorAleatorio(20261111);
  const b = datos.generadorAleatorio(20261111);
  const serieA = [a(), a(), a()];
  assert.deepEqual(serieA, [b(), b(), b()]);
  assert.ok(serieA.every((n) => n >= 0 && n < 1));
});

test('guardas: la siembra solo corre con MODO_DEMO=si', () => {
  assert.match(motivoNoSembrar({ ...LOCAL, DATABASE_URL: 'postgresql://u:p@h:5436/invoiceapp_test_demo' }), /MODO_DEMO=si/);
  assert.match(motivoNoSembrar({ MODO_DEMO: 'no', NODE_ENV: 'production' }), /MODO_DEMO=si/);
  assert.equal(motivoNoSembrar({ MODO_DEMO: 'si', NODE_ENV: 'production' }), null, 'en el contenedor la base la decide Coolify');
});

test('guardas: en local, DATABASE_URL debe ser una base de demo o de pruebas', () => {
  const con = (url) => motivoNoSembrar({ ...LOCAL, MODO_DEMO: 'si', DATABASE_URL: url });
  assert.equal(con('postgresql://postgres:postgres@localhost:5435/invoiceapp_demo'), null);
  assert.equal(con('postgresql://postgres:test@localhost:5436/invoiceapp_test_demo?schema=public'), null);
  assert.match(con('postgresql://postgres:postgres@localhost:5435/invoiceapp'), /invoiceapp_demo o invoiceapp_test/);
  assert.match(con('postgresql://postgres:postgres@localhost:5435/invoiceapp_videos'), /invoiceapp_demo o invoiceapp_test/);
  assert.match(con(''), /sin base/);
});

test('arranque: el sembrado condicionado solo existe con MODO_DEMO=si y va antes de arrancar la API', () => {
  const script = path.join(RAIZ_BACKEND, 'scripts', 'arranque-produccion.sh');
  const texto = fs.readFileSync(script, 'utf8');
  assert.match(texto, /if \[ "\$\{MODO_DEMO:-\}" = "si" \]; then\s+node scripts\/demo\/sembrar-demo\.js --si-falta/);
  const posSiembra = texto.indexOf('sembrar-demo.js');
  assert.ok(posSiembra > texto.indexOf('seed_sitio.sql'), 'la demo se siembra después de los planes y de los datos legales');
  assert.ok(posSiembra < texto.indexOf('exec node app.js'), 'la demo se siembra antes de arrancar la API');
  execFileSync('sh', ['-n', script]); // sintaxis válida: lanza si el script está roto
});
