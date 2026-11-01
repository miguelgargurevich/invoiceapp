// Punta a punta contra SUNAT beta: BD de pruebas + motor real + almacén en disco.
// Uso: SUNAT_ENGINE_URL=http://localhost:8089 SUNAT_ENGINE_TOKEN=prueba SUNAT_E2E_PFX=/ruta/cert.pfx SUNAT_E2E_CLAVE=clave123 node scripts/sunat-beta-e2e.js
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { prisma, limpiar, crearEmpresaPeru } = require('../test/db/ayuda');
const { cifrar, descifrar } = require('../src/sunat/seguridad/cifrado');
const { crearClienteEngine } = require('../src/sunat/engine/cliente');
const { crearServicioEmision } = require('../src/sunat/emision/servicio');
const { crearServicioAnulacion } = require('../src/sunat/emision/anulacion');
const { guardarBorrador } = require('../src/sunat/emision/borradores');

function almacenLocal(dir) {
  return {
    async guardar(key, cuerpo) { const r = path.join(dir, key); fs.mkdirSync(path.dirname(r), { recursive: true }); fs.writeFileSync(r, cuerpo); return key; },
    async leer(key) { return fs.readFileSync(path.join(dir, key)); },
    async urlFirmada(key) { return `file://${path.join(dir, key)}`; },
  };
}

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sunat-e2e-'));
  await limpiar();
  const ctx = await crearEmpresaPeru();
  await prisma.emisorSunat.update({
    where: { empresaId: ctx.empresa.id },
    data: { certificadoCifrado: cifrar(fs.readFileSync(process.env.SUNAT_E2E_PFX)), certificadoClaveCifrada: cifrar(process.env.SUNAT_E2E_CLAVE) },
  });
  const cola = { encolarEnvio: async () => {}, encolarTicket: async () => {} };
  const engine = crearClienteEngine();
  const almacen = almacenLocal(dir);
  const emision = crearServicioEmision({ prisma, engine, almacen, descifrar, cola });
  const anulacion = crearServicioAnulacion({ prisma, engine, almacen, descifrar, cola });
  const resultados = [];

  const emitirYEnviar = async (nombre, datos, esperado = /^ACEPTADO/) => {
    const b = await guardarBorrador({ prisma, empresa: ctx.empresa, userId: ctx.user.id, datos });
    await emision.emitir(b.id, ctx.empresa.id);
    const r = await emision.procesarEnvio(b.id);
    const f = await prisma.factura.findUnique({ where: { id: b.id } });
    resultados.push({ caso: nombre, estado: r.estado, codigo: f.codigoRespuestaSunat, mensaje: f.mensajeRespuestaSunat, ok: esperado.test(r.estado) });
    return f;
  };
  const anular = async (nombre, f) => {
    const procesoId = await anulacion.solicitarAnulacion(f.id, ctx.empresa.id, 'Prueba E2E');
    let r = { pendiente: true };
    for (let i = 0; i < 20 && r.pendiente; i += 1) { await new Promise((ok) => setTimeout(ok, 3000)); r = await anulacion.procesarTicket(procesoId); }
    resultados.push({ caso: nombre, estado: r.aceptado ? 'ANULADO' : 'NO ANULADO', ok: r.aceptado === true });
  };

  const linea = [{ descripcion: 'Servicio E2E', cantidad: 1, precio: 118, precioIncluyeIgv: true }];
  const factura = await emitirYEnviar('Factura contado', { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: linea });
  await emitirYEnviar('Factura crédito + detracción', {
    tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, tipoOperacion: '1001', detraccion: { codigo: '037' },
    lineas: [{ descripcion: 'Servicio', cantidad: 1, precio: 1000, precioIncluyeIgv: false }],
    formaPago: { tipo: 'Credito', cuotas: [{ monto: 1038, fechaVencimiento: '2030-12-31' }] },
  });
  const boleta = await emitirYEnviar('Boleta', { tipoComprobante: '03', serie: 'B001', clienteId: ctx.clienteDni.id, lineas: linea });
  await emitirYEnviar('Nota de crédito', { tipoComprobante: '07', serie: 'FC01', clienteId: ctx.cliente.id, lineas: linea, documentoAfectado: { facturaId: factura.id, motivoCodigo: '07' } });
  await emitirYEnviar('Nota de débito', { tipoComprobante: '08', serie: 'FD01', clienteId: ctx.cliente.id, lineas: linea, documentoAfectado: { facturaId: factura.id, motivoCodigo: '01' } });
  const paraBaja = await emitirYEnviar('Factura para baja', { tipoComprobante: '01', serie: 'F001', clienteId: ctx.cliente.id, lineas: linea });
  await anular('Baja de factura (RA)', paraBaja);
  await anular('Anulación de boleta (RC)', boleta);

  console.table(resultados);
  console.log(`Archivos en ${dir}`);
  await prisma.$disconnect();
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
}

main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
