import test from 'node:test';
import assert from 'node:assert/strict';
import {
  interpretarEstado,
  crearCargaEstado,
  detectarBloqueoDemo,
  pasosDemo,
  hrefDemo,
  leerPasosHechos,
  alternarPasoHecho,
  perfilDeCuenta,
  enlaceWhatsapp,
  validarWhatsappDemo,
  esDemo,
  mensajeEntrarDemo,
  perfilParaPanel,
  type AlmacenLocal,
} from './demo.ts';

const estadoValido = {
  activa: true,
  whatsapp: '900000001',
  limiteDiario: 30,
  perfiles: [
    { id: 'emprendedor', nombre: 'Emprendedor con boletas', descripcion: 'x' },
    { id: 'servicios', nombre: 'Empresa de servicios', descripcion: 'y' },
    { id: 'cliente', nombre: 'Tu cliente', descripcion: 'z', enlaceFirma: '/es/sign/abc' },
  ],
};

function almacenEnMemoria(): AlmacenLocal & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => (datos.has(k) ? datos.get(k)! : null),
    setItem: (k, v) => { datos.set(k, v); },
  };
}

// --- Estado del servidor -------------------------------------------------

test('interpretarEstado acepta la respuesta del contrato y normaliza el WhatsApp', () => {
  const e = interpretarEstado(estadoValido);
  assert.ok(e);
  assert.equal(e.activa, true);
  assert.equal(e.whatsapp, '900000001');
  assert.equal(e.perfiles.length, 3);
  assert.equal(e.perfiles[2].enlaceFirma, '/es/sign/abc');
  assert.equal(interpretarEstado({ ...estadoValido, whatsapp: undefined })?.whatsapp, null);
});

test('interpretarEstado rechaza cuerpos que no son el estado de la demo', () => {
  assert.equal(interpretarEstado(null), null);
  assert.equal(interpretarEstado(undefined), null);
  assert.equal(interpretarEstado({ ...estadoValido, activa: false }), null);
  assert.equal(interpretarEstado({ activa: true }), null);
  assert.equal(interpretarEstado('<html>404</html>'), null);
});

test('crearCargaEstado pide el estado UNA sola vez aunque se llame muchas veces', async () => {
  let llamadas = 0;
  const cargar = crearCargaEstado(async () => { llamadas++; return estadoValido; });
  const [a, b, c] = await Promise.all([cargar(), cargar(), cargar()]);
  await cargar();
  assert.equal(llamadas, 1);
  assert.equal(a?.activa, true);
  assert.equal(b, a);
  assert.equal(c, a);
});

test('crearCargaEstado: un 404 o un error de red significa "no es demo" (null)', async () => {
  const con404 = crearCargaEstado(async () => { throw Object.assign(new Error('Not found'), { status: 404 }); });
  assert.equal(await con404(), null);
  const sinRed = crearCargaEstado(async () => { throw new TypeError('Failed to fetch'); });
  assert.equal(await sinRed(), null);
});

test('esDemo solo es verdadero con un estado activo', () => {
  assert.equal(esDemo(null), false);
  assert.equal(esDemo(interpretarEstado(estadoValido)), true);
});

// --- Errores del candado -------------------------------------------------

test('detectarBloqueoDemo reconoce DEMO_BLOQUEADO y muestra su mensaje', () => {
  const r = detectarBloqueoDemo({ error: 'En la demo no se cambia el plan.', codigo: 'DEMO_BLOQUEADO' });
  assert.deepEqual(r, { codigo: 'DEMO_BLOQUEADO', mensaje: 'En la demo no se cambia el plan.' });
});

test('detectarBloqueoDemo reconoce DEMO_LIMITE', () => {
  const r = detectarBloqueoDemo({ error: 'Llegaste al límite de la demo por hoy.', codigo: 'DEMO_LIMITE' });
  assert.equal(r?.codigo, 'DEMO_LIMITE');
  assert.equal(r?.mensaje, 'Llegaste al límite de la demo por hoy.');
});

test('detectarBloqueoDemo ignora otros errores y cuerpos vacíos', () => {
  assert.equal(detectarBloqueoDemo({ error: 'Otro', codigo: 'OTRO' }), null);
  assert.equal(detectarBloqueoDemo({ error: 'Sin código' }), null);
  assert.equal(detectarBloqueoDemo(null), null);
  assert.equal(detectarBloqueoDemo('texto'), null);
});

test('detectarBloqueoDemo usa un mensaje por defecto si el cuerpo no trae error', () => {
  assert.equal(
    detectarBloqueoDemo({ codigo: 'DEMO_BLOQUEADO' })?.mensaje,
    'Esta función no está disponible en la demo.',
  );
});

// --- Pasos de «Qué probar» -----------------------------------------------

test('emprendedor tiene 6 pasos con el texto del diseño y su ruta', () => {
  const pasos = pasosDemo('emprendedor');
  assert.deepEqual(pasos.map((p) => p.texto), [
    'Mira tus ventas del mes en el dashboard.',
    'Emite una boleta a un cliente con DNI.',
    'Abre la boleta y descarga su PDF.',
    'Anula una boleta con una nota de crédito.',
    'Agrega un producto nuevo.',
    'Instala Facturo en tu celular.',
  ]);
  assert.equal(pasos[0].ruta, '/dashboard');
  assert.equal(pasos[5].ruta, '/landing#instalar');
});

test('servicios tiene 6 pasos con el texto del diseño', () => {
  const pasos = pasosDemo('servicios');
  assert.deepEqual(pasos.map((p) => p.texto), [
    'Revisa la factura rechazada y su motivo.',
    'Emite una factura con detracción.',
    'Crea una proforma y envíale el enlace de firma a tu cliente.',
    'Convierte una proforma aceptada en factura.',
    'Cambia el color de tu marca y mira el PDF.',
    'Descarga el XML y el CDR de SUNAT.',
  ]);
});

test('cliente tiene 3 pasos; los dos primeros llevan al enlace de firma', () => {
  const pasos = pasosDemo('cliente', '/es/sign/abc');
  assert.equal(pasos.length, 3);
  assert.equal(pasos[0].ruta, '/es/sign/abc');
  assert.equal(pasos[1].ruta, '/es/sign/abc');
  assert.equal(pasos[2].texto, 'Mira cómo queda «Aceptada» del lado de la empresa.');
});

test('hrefDemo antepone el idioma una sola vez', () => {
  assert.equal(hrefDemo('es', '/dashboard'), '/es/dashboard');
  assert.equal(hrefDemo('es', '/landing#instalar'), '/es/landing#instalar');
  assert.equal(hrefDemo('es', '/es/sign/abc'), '/es/sign/abc');
});

test('marcar y desmarcar un paso se guarda por perfil', () => {
  const almacen = almacenEnMemoria();
  assert.deepEqual(alternarPasoHecho(almacen, 'emprendedor', 'p1'), ['p1']);
  assert.deepEqual(leerPasosHechos(almacen, 'emprendedor'), ['p1']);
  assert.deepEqual(leerPasosHechos(almacen, 'servicios'), []);
  assert.deepEqual(alternarPasoHecho(almacen, 'emprendedor', 'p1'), []);
  assert.deepEqual(leerPasosHechos(almacen, 'emprendedor'), []);
});

test('si el almacenamiento falla o no existe, no se rompe y no hay pasos marcados', () => {
  const roto: AlmacenLocal = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceeded'); },
  };
  assert.deepEqual(leerPasosHechos(roto, 'emprendedor'), []);
  assert.deepEqual(alternarPasoHecho(roto, 'emprendedor', 'p1'), ['p1']);
  assert.deepEqual(leerPasosHechos(null, 'emprendedor'), []);
  assert.deepEqual(alternarPasoHecho(undefined, 'emprendedor', 'p1'), ['p1']);
});

// --- Perfil de la cuenta, WhatsApp y mensajes ----------------------------

test('perfilDeCuenta reconoce solo las cuentas de demo del contrato', () => {
  assert.equal(perfilDeCuenta('emprendedor@demo.facturo.example'), 'emprendedor');
  assert.equal(perfilDeCuenta('Servicios@demo.facturo.example'), 'servicios');
  assert.equal(perfilDeCuenta('otro@gmail.com'), null);
  assert.equal(perfilDeCuenta(null), null);
});

test('enlaceWhatsapp arma wa.me con código de Perú y no sale sin número', () => {
  assert.equal(enlaceWhatsapp(null), null);
  assert.equal(enlaceWhatsapp(''), null);
  assert.equal(enlaceWhatsapp('900 000 001'), 'https://wa.me/51900000001');
  assert.equal(enlaceWhatsapp('+51 900000001'), 'https://wa.me/51900000001');
});

test('validarWhatsappDemo acepta vacío o celular peruano y rechaza el resto', () => {
  assert.equal(validarWhatsappDemo(''), null);
  assert.equal(validarWhatsappDemo('900000001'), null);
  assert.equal(validarWhatsappDemo('+51 900 000 001'), null);
  assert.notEqual(validarWhatsappDemo('800000001'), null);
  assert.notEqual(validarWhatsappDemo('9000'), null);
});

test('mensajeEntrarDemo: 503 y 429 en español, otro error con mensaje genérico', () => {
  assert.match(mensajeEntrarDemo(503), /no está disponible/);
  assert.match(mensajeEntrarDemo(429), /demasiados intentos/);
  assert.match(mensajeEntrarDemo(500), /No pudimos abrir la demo/);
});

test('sin MODO_DEMO no hay panel ni perfil, aunque el correo sea de una cuenta de demo', () => {
  const correo = 'emprendedor@demo.facturo.example';
  assert.equal(perfilParaPanel(null, correo), null);
  assert.equal(perfilParaPanel(interpretarEstado(estadoValido), correo), 'emprendedor');
  assert.equal(perfilParaPanel(interpretarEstado(estadoValido), 'otro@gmail.com'), null);
});
