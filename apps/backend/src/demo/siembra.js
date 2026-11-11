// Siembra de la demo: dos cuentas (emprendedor y servicios) con sus datos y sus comprobantes.
// Los comprobantes se emiten con los servicios del backend (guardarBorrador + crearServicioEmision) y el motor SUNAT
// real firma el XML. Los que caen dentro del plazo de envío (3 días) van de verdad a SUNAT beta; los más viejos no
// se pueden enviar, así que se guardan como aceptados de ejemplo, sin CDR. Todo se recibe por parámetro: el script
// real y las pruebas usan las mismas piezas (las pruebas ponen un motor simulado).
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { guardarBorrador } = require('../sunat/emision/borradores');
const { crearServicioEmision } = require('../sunat/emision/servicio');
const { motivoNoSembrar } = require('./guardas');
const { borrarDatosDemo } = require('./borrado');
const { PERFILES, CORREOS_DEMO } = require('./perfiles');
const ficticios = require('./datos-ficticios');

const SIN_COLA = Object.freeze({ encolarEnvio: async () => {}, encolarTicket: async () => {} });
const DIAS_HISTORIA = 118; // unos 4 meses de comprobantes
const SEMILLA = 20261111;
// Rechazo de muestra: SUNAT beta acepta todo lo que se le manda (probado), así que no se puede provocar un rechazo
// real. Se marca como ejemplo para que nadie lo tome por una respuesta de SUNAT.
const CODIGO_RECHAZO_EJEMPLO = '2800';
const MENSAJE_RECHAZO_EJEMPLO = 'Rechazo de ejemplo de la demostración: el RUC del cliente no figura en el padrón de SUNAT. Corrige el RUC y vuelve a emitir.';
const SERIES = [['01', 'F001'], ['03', 'B001'], ['07', 'FC01'], ['08', 'FD01'], ['07', 'BC01']];
const COLOR_SERVICIOS = '#0F766E';
const CUENTA_DETRACCIONES = '00-000-000001';

const EMPRENDEDOR = Object.freeze({
  id: 'emprendedor',
  plan: 'pe-emprendedor',
  empresa: {
    nombre: 'Bodega Don Lucho',
    razonSocial: 'BODEGA DON LUCHO E.I.R.L.',
    ruc: ficticios.rucFicticio('10', 48213765),
    dominio: 'bodega-don-lucho',
    colorPrimario: null,
    detracciones: null,
  },
});

const SERVICIOS = Object.freeze({
  id: 'servicios',
  plan: 'pe-negocio',
  empresa: {
    nombre: 'Soluciones Andinas S.A.C.',
    razonSocial: 'SOLUCIONES ANDINAS S.A.C.',
    // RUC de pruebas de SUNAT beta: MODDATOS solo lo acepta con este RUC.
    ruc: '20000000001',
    dominio: 'soluciones-andinas',
    colorPrimario: COLOR_SERVICIOS,
    detracciones: CUENTA_DETRACCIONES,
  },
});

// ¿Está la demo completa? Las dos cuentas y la solicitud de firma pendiente (la última parte que se siembra).
// Si una siembra se cortó a medias, falta algo de esto y el arranque la vuelve a hacer.
async function cuentasDemoExisten(prisma) {
  const n = await prisma.userProfile.count({ where: { email: { in: [...CORREOS_DEMO] } } });
  if (n !== CORREOS_DEMO.size) return false;
  const firmas = await prisma.signatureRequest.count({
    where: { status: 'PENDING', empresa: { user: { email: PERFILES[SERVICIOS.id].email } } },
  });
  return firmas > 0;
}

async function cargarPlanes(prisma) {
  const planes = await prisma.plan.findMany({ where: { pais: 'PE', slug: { in: [EMPRENDEDOR.plan, SERVICIOS.plan] } } });
  const porSlug = Object.fromEntries(planes.map((p) => [p.slug, p]));
  for (const slug of [EMPRENDEDOR.plan, SERVICIOS.plan]) {
    if (!porSlug[slug]) throw new Error(`Falta el plan ${slug}: carga prisma/seed_plans_pe.sql antes de sembrar la demo`);
  }
  return porSlug;
}

async function crearPerfil(ctx, def) {
  const { prisma, cifrar, cifradoCert } = ctx;
  const cuenta = PERFILES[def.id];
  // Contraseña aleatoria y larga: nadie la conoce ni se imprime. La demo entra solo por /api/demo/entrar.
  const clave = crypto.randomBytes(32).toString('base64url');
  const usuario = await prisma.userProfile.create({
    data: {
      email: cuenta.email, name: cuenta.nombre, role: 'USER', isActive: true,
      passwordHash: await bcrypt.hash(clave, 10),
    },
  });
  const e = def.empresa;
  const empresa = await prisma.empresa.create({
    data: {
      nombre: e.nombre, razonSocial: e.razonSocial, nombreComercial: e.nombre, ruc: e.ruc,
      direccion: 'Jr. Huallaga 410, Cercado de Lima', telefono: ficticios.celularFicticio(ctx.siguiente()),
      email: ficticios.CORREO_EJEMPLO(`contacto-${def.id}`, e.dominio),
      moneda: 'PEN', currency: 'PEN', locale: 'es', taxRate: 18, taxName: 'IGV',
      serieFactura: 'F001', serieProforma: 'P001', setupCompleted: true, pais: 'PE',
      colorPrimario: e.colorPrimario, userId: usuario.id,
    },
  });
  const base = ficticios.correlativoBase(ctx.ahora());
  await prisma.emisorSunat.create({
    data: {
      empresaId: empresa.id, ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
      direccionFiscal: 'Jr. Huallaga 410, Cercado de Lima', ambiente: 'BETA',
      solUsuario: 'MODDATOS', solClaveCifrada: cifrar('moddatos'),
      certificadoCifrado: cifradoCert.pfx, certificadoClaveCifrada: cifradoCert.clave, certificadoVence: cifradoCert.vence,
      cuentaDetracciones: e.detracciones,
    },
  });
  await prisma.configuracionSeries.createMany({
    data: SERIES.map(([tipoDocumento, serie]) => ({ empresaId: empresa.id, tipoDocumento, serie, ultimoNumero: base, activa: true })),
  });
  const ahora = ctx.ahora();
  await prisma.subscription.create({
    data: {
      empresaId: empresa.id, planId: ctx.planes[def.plan].id, status: 'ACTIVE', billingInterval: 'MONTH',
      proveedorPago: 'culqi',
      currentPeriodStart: new Date(ahora.getTime() - 15 * 864e5), currentPeriodEnd: new Date(ahora.getTime() + 15 * 864e5),
    },
  });
  return { def, usuario, empresa };
}

async function crearCliente(ctx, perfil, { tipoDocumento, numeroDocumento, razonSocial, dominio }) {
  const n = ctx.siguiente();
  return ctx.prisma.cliente.create({
    data: {
      empresaId: perfil.empresa.id, tipoDocumento, numeroDocumento, razonSocial,
      email: ficticios.CORREO_EJEMPLO(`cliente${n}`, dominio),
      telefono: ficticios.celularFicticio(n),
      direccion: 'Av. Brasil 1550, Jesús María',
    },
  });
}

async function crearProductos(ctx, perfil, lista) {
  await ctx.prisma.producto.createMany({
    data: lista.map((p) => ({
      empresaId: perfil.empresa.id, codigo: p.codigo, nombre: p.nombre, tipo: p.tipo || 'PRODUCTO',
      unidadMedida: p.unidad || 'NIU', precioUnitario: p.precio, precioConIgv: true, activo: true,
    })),
  });
  return lista;
}

// Emite un comprobante fechado `dias` días atrás (mediodía de Lima) y lo envía a SUNAT beta, de verdad.
// Nunca fechado hoy: así no gasta el límite diario de la demo. `rechazada` deja el comprobante como rechazo de
// muestra (ver CODIGO_RECHAZO_EJEMPLO): firmado y con su número, pero sin envío.
async function emitir(ctx, perfil, { dias, cuerpo, rechazada = false }) {
  const { prisma, emision, reloj, ahora } = ctx;
  const dia = ficticios.diaLimaHace(ahora(), dias);
  reloj.fn = () => ficticios.fechaDeDia(dia);
  try {
    const borrador = await guardarBorrador({ prisma, empresa: perfil.empresa, userId: perfil.usuario.id, datos: cuerpo });
    await emision.emitir(borrador.id, perfil.empresa.id);
    reloj.fn = ahora;
    if (rechazada) {
      await prisma.factura.update({
        where: { id: borrador.id },
        data: { estadoSunat: 'RECHAZADO', codigoRespuestaSunat: CODIGO_RECHAZO_EJEMPLO, mensajeRespuestaSunat: MENSAJE_RECHAZO_EJEMPLO },
      });
    } else {
      await emision.procesarEnvio(borrador.id);
    }
    return borrador.id;
  } finally {
    reloj.fn = ahora;
  }
}

// Elige entre 1 y `max` productos al azar, con cantidades pequeñas.
function lineasAlAzar(ctx, productos, max) {
  const n = 1 + Math.floor(ctx.rnd() * max);
  const lineas = [];
  for (let i = 0; i < n; i += 1) {
    const p = productos[Math.floor(ctx.rnd() * productos.length)];
    lineas.push({ descripcion: p.nombre, cantidad: 1 + Math.floor(ctx.rnd() * 3), unidad: p.unidad || 'NIU', precio: p.precio, precioIncluyeIgv: true });
  }
  return lineas;
}

function boleta(clienteId, lineas) {
  return { tipoComprobante: '03', serie: 'B001', clienteId, lineas, formaPago: { tipo: 'Contado' } };
}

// Programa los comprobantes de un perfil como eventos y los emite del más viejo al más nuevo (correlativos en orden).
async function emitirPrograma(ctx, perfil, eventos) {
  const refs = {};
  const ordenados = [...eventos].sort((a, b) => b.dias - a.dias);
  for (const evento of ordenados) {
    const id = await emitir(ctx, perfil, { dias: evento.dias, cuerpo: evento.armar(refs), rechazada: evento.rechazada });
    if (evento.guardar) refs[evento.guardar] = id;
  }
  return refs;
}

async function sembrarEmprendedor(ctx, perfil) {
  const dni = [];
  for (const c of ficticios.CLIENTES_BOLETA) {
    dni.push(await crearCliente(ctx, perfil, { tipoDocumento: '1', numeroDocumento: c.dni, razonSocial: c.nombre, dominio: perfil.def.empresa.dominio }));
  }
  const ruc = [];
  for (const c of ficticios.CLIENTES_EMPRESA.slice(0, 2)) {
    ruc.push(await crearCliente(ctx, perfil, { tipoDocumento: '6', numeroDocumento: c.ruc, razonSocial: c.razonSocial, dominio: perfil.def.empresa.dominio }));
  }
  const productos = await crearProductos(ctx, perfil, ficticios.PRODUCTOS_BODEGA);

  const eventos = [];
  for (let dias = DIAS_HISTORIA; dias >= 1; dias -= 1) {
    const cuantas = (ctx.rnd() < 0.45 ? 1 : 0) + (ctx.rnd() < 0.15 ? 1 : 0);
    for (let k = 0; k < cuantas; k += 1) {
      const cliente = dni[Math.floor(ctx.rnd() * dni.length)];
      const lineas = lineasAlAzar(ctx, productos, 3);
      eventos.push({ dias, armar: () => boleta(cliente.id, lineas) });
    }
  }
  // Una boleta que se anula con una nota de crédito (BC01 modifica la boleta B001).
  const lineasAnulada = lineasAlAzar(ctx, productos, 2);
  eventos.push({ dias: 24, guardar: 'boletaAnulada', armar: () => boleta(dni[0].id, lineasAnulada) });
  eventos.push({
    dias: 21,
    armar: (refs) => ({
      tipoComprobante: '07', serie: 'BC01', clienteId: dni[0].id, lineas: lineasAnulada, formaPago: { tipo: 'Contado' },
      documentoAfectado: { facturaId: refs.boletaAnulada, motivoCodigo: '01' },
    }),
  });
  // Facturas a empresas con RUC.
  [96, 71, 52, 33, 14].forEach((dias, i) => {
    const cliente = ruc[i % ruc.length];
    const lineas = lineasAlAzar(ctx, productos, 2);
    eventos.push({ dias, armar: () => ({ tipoComprobante: '01', serie: 'F001', clienteId: cliente.id, lineas, formaPago: { tipo: 'Contado' } }) });
  });

  await emitirPrograma(ctx, perfil, eventos);
}

async function sembrarServicios(ctx, perfil) {
  const ruc = [];
  for (const c of ficticios.CLIENTES_EMPRESA) {
    ruc.push(await crearCliente(ctx, perfil, { tipoDocumento: '6', numeroDocumento: c.ruc, razonSocial: c.razonSocial, dominio: perfil.def.empresa.dominio }));
  }
  // Cliente con un RUC que SUNAT rechaza (dígito verificador incorrecto): da la factura rechazada de «Requiere atención».
  const conRucMal = await crearCliente(ctx, perfil, {
    tipoDocumento: '6', numeroDocumento: ficticios.CLIENTE_EMPRESA_ERRONEO.ruc,
    razonSocial: ficticios.CLIENTE_EMPRESA_ERRONEO.razonSocial, dominio: perfil.def.empresa.dominio,
  });
  const productos = await crearProductos(ctx, perfil, ficticios.PRODUCTOS_SERVICIOS);

  const eventos = [];
  for (let dias = 112; dias >= 4; dias -= 3) {
    if (ctx.rnd() < 0.8) {
      const cliente = ruc[Math.floor(ctx.rnd() * ruc.length)];
      const lineas = lineasAlAzar(ctx, productos, 2);
      eventos.push({ dias, armar: () => ({ tipoComprobante: '01', serie: 'F001', clienteId: cliente.id, lineas, formaPago: { tipo: 'Contado' } }) });
    }
  }
  // Factura con detracción (Banco de la Nación) y factura a crédito con dos cuotas.
  eventos.push({
    dias: 40, guardar: 'conDetraccion',
    armar: () => ({
      tipoComprobante: '01', serie: 'F001', clienteId: ruc[0].id, tipoOperacion: '1001', detraccion: { codigo: '037' },
      lineas: [{ descripcion: 'Mantenimiento mensual de software', cantidad: 1, unidad: 'ZZ', precio: 2360, precioIncluyeIgv: true }],
      formaPago: { tipo: 'Contado' },
    }),
  });
  eventos.push({
    dias: 25, guardar: 'aCredito',
    armar: () => {
      const emision = ficticios.diaLimaHace(ctx.ahora(), 25);
      return {
        tipoComprobante: '01', serie: 'F001', clienteId: ruc[1].id,
        lineas: [{ descripcion: 'Implementación de módulo', cantidad: 1, unidad: 'ZZ', precio: 1180, precioIncluyeIgv: true }],
        formaPago: {
          tipo: 'Credito',
          cuotas: [
            { monto: 590, fechaVencimiento: ficticios.sumarDias(emision, 30) },
            { monto: 590, fechaVencimiento: ficticios.sumarDias(emision, 60) },
          ],
        },
      };
    },
  });
  // Nota de crédito sobre una factura de hace 52 días, y nota de débito sobre la factura a crédito.
  const lineaNc = [{ descripcion: 'Capacitación presencial (día)', cantidad: 1, unidad: 'ZZ', precio: 480, precioIncluyeIgv: true }];
  eventos.push({ dias: 52, guardar: 'paraNc', armar: () => ({ tipoComprobante: '01', serie: 'F001', clienteId: ruc[2].id, lineas: lineaNc, formaPago: { tipo: 'Contado' } }) });
  eventos.push({
    dias: 45,
    armar: (refs) => ({
      tipoComprobante: '07', serie: 'FC01', clienteId: ruc[2].id, lineas: lineaNc, formaPago: { tipo: 'Contado' },
      documentoAfectado: { facturaId: refs.paraNc, motivoCodigo: '07' },
    }),
  });
  eventos.push({
    dias: 9,
    armar: (refs) => ({
      tipoComprobante: '08', serie: 'FD01', clienteId: ruc[1].id,
      lineas: [{ descripcion: 'Intereses por mora', cantidad: 1, unidad: 'ZZ', precio: 35.4, precioIncluyeIgv: true }],
      formaPago: { tipo: 'Contado' },
      documentoAfectado: { facturaId: refs.aCredito, motivoCodigo: '01' },
    }),
  });
  // Factura rechazada (de muestra) para «Requiere atención»: la de un cliente con RUC mal escrito.
  eventos.push({
    dias: 2, rechazada: true,
    armar: () => ({ tipoComprobante: '01', serie: 'F001', clienteId: conRucMal.id, lineas: lineasAlAzar(ctx, productos, 1), formaPago: { tipo: 'Contado' } }),
  });

  await emitirPrograma(ctx, perfil, eventos);
  // El primer cliente con RUC es el que recibe la proforma pendiente de «Tu cliente».
  return { clienteFirma: ruc[0] };
}

// Proformas de «servicios». La pendiente tiene su solicitud de firma vigente (la de «Tu cliente»); las demás
// muestran los estados aceptada, rechazada y vencida. Montos sin IGV + 18 %, como en el borrador de proforma.
async function sembrarProformas(ctx, perfil, clienteFirma) {
  const ahora = ctx.ahora();
  const dia = (n) => new Date(ahora.getTime() + n * 864e5);
  const filas = [
    { numero: 1, estado: 'pendiente', fechaEmision: dia(-2), fechaValidez: dia(13), firma: true },
    { numero: 2, estado: 'aceptada', fechaEmision: dia(-20), fechaValidez: dia(-6), firmaFirmada: true },
    { numero: 3, estado: 'rechazada', fechaEmision: dia(-12), fechaValidez: dia(3) },
    { numero: 4, estado: 'vencida', fechaEmision: dia(-60), fechaValidez: dia(-30) },
  ];
  let pendienteId = null;
  for (const fila of filas) {
    const cliente = clienteFirma;
    const lineas = lineasAlAzar(ctx, ficticios.PRODUCTOS_SERVICIOS, 2);
    const subtotal = Math.round(lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0) * 100) / 100;
    const igv = Math.round(subtotal * 0.18 * 100) / 100;
    const proforma = await ctx.prisma.proforma.create({
      data: {
        empresaId: perfil.empresa.id, clienteId: cliente.id, serie: 'P001', numero: fila.numero,
        fechaEmision: fila.fechaEmision, fechaValidez: fila.fechaValidez, estado: fila.estado,
        subtotal, igv, total: subtotal + igv, moneda: 'PEN', userId: perfil.usuario.id,
        detalles: {
          create: lineas.map((l, orden) => ({
            descripcion: l.descripcion, cantidad: l.cantidad, unidadMedida: l.unidad, precioUnitario: l.precio,
            subtotal: l.cantidad * l.precio, igv: Math.round(l.cantidad * l.precio * 0.18 * 100) / 100,
            total: Math.round(l.cantidad * l.precio * 1.18 * 100) / 100, orden,
          })),
        },
      },
    });
    if (fila.firma) pendienteId = proforma.id;
    if (fila.firma || fila.firmaFirmada) {
      await ctx.prisma.signatureRequest.create({
        data: {
          token: crypto.randomBytes(32).toString('hex'), documentType: 'PROFORMA', documentId: proforma.id,
          proformaId: proforma.id, signerEmail: cliente.email, signerName: cliente.razonSocial,
          // Pendiente: vigente 15 días. Aceptada: ya firmada.
          status: fila.firma ? 'PENDING' : 'SIGNED', expiresAt: fila.firma ? dia(15) : dia(-6),
          sentAt: fila.fechaEmision, requestedBy: perfil.usuario.id, empresaId: perfil.empresa.id,
        },
      });
    }
  }
  return pendienteId;
}

// Cuenta lo sembrado por perfil (lo usan el resumen del script y las pruebas).
async function contarDemo(prisma) {
  const salida = {};
  for (const def of [EMPRENDEDOR, SERVICIOS]) {
    const usuario = await prisma.userProfile.findUnique({ where: { email: PERFILES[def.id].email }, select: { id: true } });
    const empresa = usuario ? await prisma.empresa.findUnique({ where: { userId: usuario.id }, select: { id: true } }) : null;
    if (!empresa) { salida[def.id] = null; continue; }
    const id = empresa.id;
    const [clientes, productos, proformas, comprobantes, aceptados, rechazados, enviados, notas] = await Promise.all([
      prisma.cliente.count({ where: { empresaId: id } }),
      prisma.producto.count({ where: { empresaId: id } }),
      prisma.proforma.count({ where: { empresaId: id } }),
      prisma.factura.count({ where: { empresaId: id } }),
      prisma.factura.count({ where: { empresaId: id, estadoSunat: 'ACEPTADO' } }),
      prisma.factura.count({ where: { empresaId: id, estadoSunat: 'RECHAZADO' } }),
      prisma.factura.count({ where: { empresaId: id, fechaEnvioSunat: { not: null } } }),
      prisma.factura.count({ where: { empresaId: id, tipoComprobante: { in: ['07', '08'] } } }),
    ]);
    salida[def.id] = { clientes, productos, proformas, comprobantes, notas, aceptados, rechazados, enviadosASunat: enviados };
  }
  return salida;
}

// Siembra completa. Todo comprobante se envía a SUNAT (el motor puede ser simulado en las pruebas).
async function sembrarDemo(deps) {
  const {
    prisma, engine, almacen, cifrar, descifrar, generarCertificado,
    env = process.env, ahora = () => new Date(), registrar = () => {},
  } = deps;
  const motivo = motivoNoSembrar(env);
  if (motivo) throw new Error(motivo);

  const borrados = await borrarDatosDemo(prisma);
  if (borrados.usuarios) registrar(`Se borraron ${borrados.usuarios} cuentas y ${borrados.empresas} empresas de la demo anterior.`);

  const planes = await cargarPlanes(prisma);
  const certificado = generarCertificado();
  const inspeccion = await engine.inspeccionarCertificado(certificado.pfx.toString('base64'), certificado.clave);
  const vence = inspeccion?.vence ? new Date(inspeccion.vence) : new Date(ahora().getTime() + 3650 * 864e5);

  let secuencia = 0;
  const reloj = { fn: ahora };
  const ctx = {
    prisma, planes, ahora, cifrar, registrar,
    emision: crearServicioEmision({ prisma, engine, almacen, descifrar, cola: SIN_COLA, ahora: () => reloj.fn() }),
    reloj,
    rnd: ficticios.generadorAleatorio(SEMILLA),
    cifradoCert: { pfx: cifrar(certificado.pfx), clave: cifrar(certificado.clave), vence },
    siguiente: () => { secuencia += 1; return secuencia; },
  };

  const emprendedor = await crearPerfil(ctx, EMPRENDEDOR);
  registrar('Cuenta de «emprendedor» creada.');
  await sembrarEmprendedor(ctx, emprendedor);
  registrar('Boletas y facturas de «emprendedor» emitidas.');

  const servicios = await crearPerfil(ctx, SERVICIOS);
  registrar('Cuenta de «servicios» creada.');
  const { clienteFirma } = await sembrarServicios(ctx, servicios);
  registrar('Facturas, notas y detracción de «servicios» emitidas.');
  const proformaPendienteId = await sembrarProformas(ctx, servicios, clienteFirma);
  registrar('Proformas y solicitud de firma pendiente creadas.');

  return { conteos: await contarDemo(prisma), proformaPendienteId };
}

module.exports = { sembrarDemo, cuentasDemoExisten, contarDemo, EMPRENDEDOR, SERVICIOS };
