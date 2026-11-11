// Graba las escenas de un video de marketing de Facturo con Playwright sobre la app LOCAL (base invoiceapp_videos; datos ficticios).
// Uso: node scripts/marketing/grabar-video.mjs <f1|f2|f3> <escritorio|celular>
//   f3 es solo celular. Tema claro, cursor berenjena (#6B2C6E).
// Lee la voz de cada escena en .claude/videos/<f>/voz/e<N>.wav (la duración de la escena la manda su audio) y deja un clip por escena
// en .claude/videos/<f>/<formato>/e<N>.webm más recortes.json (en qué segundo del clip la pantalla ya estaba lista).
// El montaje (voz + clips + cierre) lo hace scripts/marketing/montar-video.sh.
//
// Antes de grabar: source scripts/marketing/entorno-videos.sh; backend (4001) y frontend (3000) arriba; sembrar-videos.js corrido.
// Las acciones que tardan (emitir ante SUNAT) van en `antes`, fuera de cámara: el clip muestra solo el resultado.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? '/opt/homebrew/lib/node_modules/playwright');

const APP = process.env.APP_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:4001';
const RAIZ = process.cwd();
const [video = 'f1', formato = 'escritorio'] = process.argv.slice(2);
const BASE = join(RAIZ, '.claude/videos', video);
const SALIDA = join(BASE, formato);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const FORMATOS = {
  // Playwright graba al tamaño de la ventana; el montaje la agranda a 1920×1080 o 1080×1920 (lanczos).
  escritorio: { viewport: { width: 1600, height: 900 }, video: { width: 1600, height: 900 }, deviceScaleFactor: 1 },
  celular: {
    viewport: { width: 540, height: 960 }, video: { width: 540, height: 960 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    // Android: el navegador dispara «beforeinstallprompt» (el aviso de instalar); así se ve el botón de la portada.
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  },
};

if (!['f1', 'f2', 'f3'].includes(video)) throw new Error(`Video desconocido: ${video}`);
if (!FORMATOS[formato]) throw new Error(`Formato desconocido: ${formato}`);
if (video === 'f3' && formato !== 'celular') throw new Error('f3 es solo celular');

const duracion = (n) => {
  const f = join(BASE, 'voz', `e${n}.wav`);
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
};

// ---------- sesiones (token de la API en localStorage, como lo guarda la app) ----------
const CUENTAS = { demo: 'demo@facturo.example', nuevo: 'nuevo@facturo.example' };
const CLAVE = 'Facturo2026';
const CARPETA_SESIONES = join(RAIZ, '.claude/videos/sesiones');
async function tokenDe(rol) {
  const archivo = join(CARPETA_SESIONES, `${rol}.json`);
  if (existsSync(archivo)) {
    const { token } = JSON.parse(readFileSync(archivo, 'utf8'));
    if ((await fetch(`${API}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })).ok) return token;
  }
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: CUENTAS[rol], password: CLAVE }) });
  if (!r.ok) throw new Error(`login ${rol}: ${r.status}`);
  const { session } = await r.json();
  mkdirSync(CARPETA_SESIONES, { recursive: true, mode: 0o700 });
  writeFileSync(archivo, JSON.stringify({ token: session.access_token }), { mode: 0o600 });
  return session.access_token;
}
const apiGet = async (token, ruta) => (await fetch(`${API}${ruta}`, { headers: { authorization: `Bearer ${token}` } })).json();

/** Id del comprobante más reciente aceptado por SUNAT de una serie (para abrir su detalle en la escena). */
async function comprobanteAceptado(serie) {
  const lista = await apiGet(await tokenDe('demo'), '/api/comprobantes');
  const c = (Array.isArray(lista) ? lista : []).find((x) => x.serie === serie && x.estadoSunat === 'ACEPTADO');
  if (!c) throw new Error(`no hay comprobante aceptado de la serie ${serie}`);
  return c.id;
}

/** Emite una factura NUEVA ante SUNAT beta, fuera de cámara (tarda ~15 s). Devuelve su id cuando SUNAT la acepta. */
async function emitirAntes(rol, cuerpoLineas, { tipo = '01', serie = 'F001', cliente }) {
  const token = await tokenDe(rol);
  const clientes = await apiGet(token, '/api/clientes');
  const c = (clientes.data ?? clientes).find((x) => x.razonSocial === cliente);
  const productos = await apiGet(token, '/api/productos');
  const lista = productos.data ?? productos;
  const lineas = cuerpoLineas.map(([nombre, cantidad]) => {
    const p = lista.find((x) => x.nombre === nombre);
    return { productoId: p.id, descripcion: p.nombre, cantidad, unidad: p.unidadMedida, precio: Number(p.precioUnitario), precioIncluyeIgv: true, afectacion: '10' };
  });
  const post = async (ruta, cuerpo) => {
    const r = await fetch(`${API}/api${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(cuerpo ?? {}) });
    const j = await r.json();
    if (!r.ok) throw new Error(`POST ${ruta} ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
    return j;
  };
  const borrador = await post('/comprobantes', { tipoComprobante: tipo, serie, clienteId: c.id, lineas, formaPago: { tipo: 'Contado' } });
  const id = borrador.id ?? borrador.comprobante?.id ?? borrador.factura?.id;
  await post(`/comprobantes/${id}/emitir`);
  for (let i = 0; i < 60; i++) {
    const d = await apiGet(token, `/api/comprobantes/${id}`);
    const estado = d.estadoSunat ?? d.comprobante?.estadoSunat;
    if (estado === 'ACEPTADO' || estado === 'ACEPTADO_CON_OBS') return id;
    if (estado && estado !== 'PENDIENTE_ENVIO' && estado !== 'ENVIANDO') throw new Error(`SUNAT: ${estado}`);
    await pausa(1500);
  }
  throw new Error('SUNAT no respondió en 90 s');
}

// ---------- cursor, sesión y limpieza que van en cada página ----------
const initSesion = (token) => `try {
  ${token ? `localStorage.setItem('authToken', ${JSON.stringify(token)});` : ''}
  localStorage.setItem('theme', 'light');
} catch (e) {}`;

const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = '__cursor';
    Object.assign(c.style, { position: 'fixed', zIndex: 2147483647, width: '22px', height: '22px', marginLeft: '-11px', marginTop: '-11px', borderRadius: '50%',
      background: 'rgba(107,44,110,.28)', border: '2px solid rgba(107,44,110,.92)', pointerEvents: 'none', transition: 'transform .12s ease-out', left: '-50px', top: '-50px' });
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  });`;

// ---------- movimientos ----------
let raton = { x: 200, y: 200 };
async function ir(page, x, y, ms = 650) {
  const pasos = Math.max(6, Math.round(ms / 16));
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos, e = 1 - Math.pow(1 - t, 3);
    await page.mouse.move(raton.x + (x - raton.x) * e, raton.y + (y - raton.y) * e);
    await pausa(ms / pasos);
  }
  raton = { x, y };
}
/** Lleva el cursor al elemento y lo pulsa (o solo lo señala con `soloSenalar`). `rapido` acorta el recorrido para escenas cortas. */
async function tocar(page, locator, { soloSenalar = false, rapido = false } = {}) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const b = await el.boundingBox();
  if (!b) return false;
  await ir(page, b.x + b.width / 2, b.y + b.height / 2, rapido ? 340 : 650);
  await pausa(rapido ? 80 : 180);
  if (!soloSenalar) await el.click();
  return true;
}
async function desplazar(page, px, ms = 1400) {
  const pasos = 30;
  for (let i = 0; i < pasos; i++) { await page.mouse.wheel(0, px / pasos); await pausa(ms / pasos); }
}
const asentar = async (page) => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await pausa(350);
};
/** Elige un cliente en el buscador de «Nuevo comprobante». */
async function elegirCliente(page, nombre, opts = {}) {
  // Con `rapido` (escenas de 3 s) las pausas son mínimas: la elección tiene que caer dentro de la voz.
  const espera = opts.rapido ? 120 : 400;
  await tocar(page, page.getByRole('button', { name: /selecciona un cliente/i }), opts);
  await page.getByPlaceholder('Buscar cliente…').fill(nombre.split(' ')[0]).catch(() => {});
  await pausa(espera);
  await tocar(page, page.getByText(nombre, { exact: true }).first(), opts);
  // El buscador tarda un momento en cerrarse; sin esta pausa el select de producto a veces no recibía la elección.
  await pausa(opts.rapido ? 150 : 350);
  if (opts.rapido) await pausa(100); else await asentar(page);
}
/** Elige un producto en la primera línea (el select 5 de la pantalla, después del tipo, la serie, la operación y la moneda). */
async function elegirProducto(page, nombre, opts = {}) {
  await tocar(page, page.locator('select').nth(4), { ...opts, soloSenalar: true });
  await page.locator('select').nth(4).selectOption({ label: nombre }).catch((e) => console.warn(`  producto «${nombre}»: ${e.message.split('\n')[0]}`));
  if (opts.rapido) await pausa(100); else await asentar(page);
}

// ---------- cierre: tarjeta berenjena con el logo de Facturo ----------
const LOGO = `data:image/svg+xml;base64,${readFileSync(join(RAIZ, 'apps/frontend/public/marca/facturo-logotipo.svg')).toString('base64')}`;
const CIERRE = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#6B2C6E;color:#FFFFFF;font-family:Figtree,system-ui,-apple-system,sans-serif;display:grid;place-items:center}
  .c{text-align:center;padding:0 40px} .l{display:inline-block;background:#FFFFFF;border-radius:28px;padding:30px 44px}
  .l img{height:120px;display:block} p{font-size:46px;font-weight:600;margin:44px 0 0;line-height:1.2}
  small{display:block;margin-top:26px;font-size:30px;opacity:.85}
  @media (max-aspect-ratio:1/1){.l img{height:86px}p{font-size:36px}small{font-size:24px}}
</style><div class="c"><div class="l"><img src="${LOGO}" alt="Facturo"></div>
<p>Facturo. Tus comprobantes electrónicos, en minutos.</p><small>facturo.gargurevich.dev</small></div>`;

// ---------- escenas (texto en docs/marketing/guiones-videos.md) ----------
// rol: sesión de la escena (null = sin entrar); url: ruta o función; accion; antes: se corre antes de la escena (fuera de cámara).
const ESCENAS = {
  f1: [
    { rol: null, url: '/es/landing', accion: async (p) => { await pausa(500); await ir(p, 760, 330, 1200); } },
    { rol: 'demo', url: '/es/dashboard', accion: async (p) => { await pausa(600); await tocar(p, p.getByText('Últimos comprobantes').first(), { soloSenalar: true }); await pausa(500); await desplazar(p, 160, 1200); } },
    { rol: 'demo', url: '/es/comprobantes/nuevo', accion: async (p) => {
      await elegirCliente(p, 'Ferretería Los Andes S.A.C.', { rapido: true });
      await elegirProducto(p, 'Consultoría contable mensual', { rapido: true });
      await pausa(400); await tocar(p, p.getByText('Totales').first(), { soloSenalar: true, rapido: true });
    } },
    { rol: 'demo', url: async () => `/es/comprobantes/${await comprobanteAceptado('F001')}`, accion: async (p) => { await pausa(500); await tocar(p, p.getByText('Aceptado').first(), { soloSenalar: true }); await pausa(600); await tocar(p, p.getByText('Historial de envíos').first(), { soloSenalar: true }); } },
    { rol: 'demo', url: async () => `/es/comprobantes/${await comprobanteAceptado('F001')}`, accion: async (p) => {
      await pausa(300); await tocar(p, p.getByRole('button', { name: /^pdf$/i }), { soloSenalar: true }); await pausa(300);
      await tocar(p, p.getByRole('button', { name: /^xml$/i }), { soloSenalar: true }); await pausa(300);
      await tocar(p, p.getByRole('button', { name: /^cdr$/i }), { soloSenalar: true });
    } },
    { rol: 'demo', url: async () => `/es/proformas/${await proformaAceptada()}`, accion: async (p) => {
      // El botón dice «Convertir a Factura» (así lo muestra la app; el guion dice «Convertir en comprobante»).
      await pausa(500); await tocar(p, p.getByText('Totales').first(), { soloSenalar: true }); await pausa(400);
      await tocar(p, p.getByRole('button', { name: /convertir a factura/i }), { soloSenalar: true }); await pausa(500);
    } },
    { rol: null, url: null, cierre: true },
  ],
  f2: [
    { rol: null, url: '/es/register', accion: async (p) => {
      await tocar(p, p.locator('input[name=name]'), { rapido: true }); await p.locator('input[name=name]').fill('Sofía Herrera Ruiz');
      await tocar(p, p.locator('input[name=email]'), { rapido: true }); await p.locator('input[name=email]').fill('sofia.herrera@negocio.example');
      await tocar(p, p.locator('input[name=password]'), { rapido: true }); await p.locator('input[name=password]').fill('Facturo2026');
      // No se envía el formulario: la cuenta de ejemplo no se crea.
      await tocar(p, p.getByRole('button', { name: /crear cuenta/i }), { soloSenalar: true, rapido: true });
    } },
    { rol: 'nuevo', url: '/es/setup', accion: async (p) => {
      await tocar(p, p.getByRole('button', { name: /comenzar/i }), { rapido: true }); await asentar(p);
      await tocar(p, p.getByPlaceholder(/nombre de tu empresa/i), { rapido: true }); await p.getByPlaceholder(/nombre de tu empresa/i).fill('Comercial Ejemplo S.A.C.');
      await tocar(p, p.getByPlaceholder('20123456789'), { rapido: true }); await p.getByPlaceholder('20123456789').fill('20000000001');
      // No se pulsa «Continuar»: el asistente no guarda nada en esta grabación.
      await tocar(p, p.getByRole('button', { name: /continuar/i }), { soloSenalar: true, rapido: true });
    } },
    { rol: 'demo', url: '/es/configuracion', accion: async (p) => {
      await pausa(150); await tocar(p, p.getByRole('button', { name: 'SUNAT', exact: true }).first(), { rapido: true }); await asentar(p);
      await tocar(p, p.getByText('Credenciales SOL y certificado').first(), { soloSenalar: true }); await pausa(700);
      await tocar(p, p.getByText('Usuario SOL secundario').first(), { soloSenalar: true }); await pausa(900);
    } },
    { rol: 'demo', url: '/es/configuracion', accion: async (p) => {
      await pausa(150); await tocar(p, p.getByRole('button', { name: 'SUNAT', exact: true }).first(), { rapido: true }); await asentar(p);
      await p.getByText('Series', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {}); await asentar(p);
      await tocar(p, p.getByText('F001', { exact: true }).first(), { soloSenalar: true }); await pausa(300);
      await tocar(p, p.getByText('B001', { exact: true }).first(), { soloSenalar: true }); await pausa(500);
    } },
    { rol: 'demo', url: '/es/productos/nuevo', accion: async (p) => {
      await tocar(p, p.getByRole('button', { name: 'Producto', exact: true }), { rapido: true }); await pausa(150);
      await tocar(p, p.getByPlaceholder('Nombre del producto o servicio'), { rapido: true }); await p.getByPlaceholder('Nombre del producto o servicio').fill('Cable HDMI de 2 metros');
      await tocar(p, p.locator('input[type=number], input[inputmode=decimal]').first(), { rapido: true }); await p.locator('input[type=number], input[inputmode=decimal]').first().fill('35.00');
      await pausa(300); await tocar(p, p.getByRole('button', { name: /^guardar$/i }), { soloSenalar: true, rapido: true });
    } },
    { rol: 'demo', url: '/es/clientes', accion: async (p) => {
      await pausa(400); await tocar(p, p.getByText('Constructora Pacífico S.A.C.').first(), { soloSenalar: true }); await pausa(400);
      await tocar(p, p.getByText('María Elena Quispe Huamán').first(), { soloSenalar: true }); await pausa(400);
      await desplazar(p, 160, 900);
    } },
    { rol: 'demo', antes: async () => { globalThis.__f2 = await emitirAntes('demo', [['Consultoría contable mensual', 1]], { cliente: 'Constructora Pacífico S.A.C.' }); },
      url: () => `/es/comprobantes/${globalThis.__f2}`, accion: async (p) => {
      await pausa(400); await tocar(p, p.getByText('Aceptado').first(), { soloSenalar: true }); await pausa(700);
      await tocar(p, p.getByText('Historial de envíos').first(), { soloSenalar: true }); await pausa(600);
    } },
    { rol: 'demo', url: '/es/configuracion', accion: async (p) => {
      await pausa(300); await p.getByText('Color de tu marca').first().scrollIntoViewIfNeeded().catch(() => {}); await asentar(p);
      await tocar(p, p.getByRole('button', { name: /^verde$/i }).first()); await pausa(700);
      await tocar(p, p.getByText('Color de tu marca').first(), { soloSenalar: true }); await pausa(600);
    } },
    { rol: null, url: null, cierre: true },
  ],
  f3: [
    { rol: null, url: '/es/landing', accion: async (p) => {
      // Aviso de instalar (Android): el navegador lo dispara solo al cargar; aquí se simula para ver el botón de la portada.
      await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); dispatchEvent(e); });
      await pausa(400); await p.locator('#instalar').scrollIntoViewIfNeeded().catch(() => {}); await asentar(p);
      await tocar(p, p.getByRole('button', { name: /instalar en tu celular/i }), { soloSenalar: true, rapido: true }); await pausa(500);
    } },
    { rol: 'demo', url: '/es/dashboard', accion: async (p) => { await pausa(500); await desplazar(p, 260, 1500); } },
    { rol: 'demo', url: '/es/comprobantes/nuevo', accion: async (p) => {
      await p.locator('select').nth(0).selectOption({ label: 'Boleta' }).catch(() => {});
      await asentar(p);
      // Primero el producto (un select corto) y después el cliente: así ambos quedan dentro de la ventana de la voz (2,8 s).
      await elegirProducto(p, 'Tinta para impresora', { rapido: true });
      await elegirCliente(p, 'María Elena Quispe Huamán', { rapido: true });
    } },
    { rol: 'demo', url: async () => `/es/comprobantes/${await comprobanteAceptado('B001')}`, accion: async (p) => {
      await pausa(400); await tocar(p, p.getByText('Aceptado').first(), { soloSenalar: true }); await pausa(500); await desplazar(p, 200, 1000);
    } },
    { rol: null, url: null, cierre: true },
  ],
};

async function proformaAceptada() {
  const lista = await apiGet(await tokenDe('demo'), '/api/proformas');
  const p = (Array.isArray(lista) ? lista : (lista.data ?? [])).find((x) => x.estado === 'aceptada');
  if (!p) throw new Error('no hay proforma aceptada');
  return p.id;
}

/** Pantalla de la escena: si la URL es función, se evalúa aquí (puede consultar la API). */
async function resolverUrl(e) {
  if (e.cierre) return null;
  return typeof e.url === 'function' ? await e.url() : e.url;
}

async function grabar() {
  const escenas = ESCENAS[video];
  const f = FORMATOS[formato];
  console.log(`grabando ${video} ${formato} → ${SALIDA}`);
  rmSync(SALIDA, { recursive: true, force: true });
  mkdirSync(SALIDA, { recursive: true });
  const browser = await chromium.launch();
  const recortes = {};
  try {
    for (const [i, e] of escenas.entries()) {
      const n = i + 1;
      const largo = duracion(n) * 1000 + 700;
      const tmp = join(SALIDA, `tmp-${n}`);
      const token = e.rol ? await tokenDe(e.rol) : null;
      if (e.antes) await e.antes().catch((err) => console.warn(`  escena ${n} (antes): ${err.message.split('\n')[0]}`));
      const ctx = await browser.newContext({
        userAgent: f.ua, viewport: f.viewport, deviceScaleFactor: f.deviceScaleFactor, isMobile: f.isMobile, hasTouch: f.hasTouch,
        colorScheme: 'light', locale: 'es-PE', recordVideo: { dir: tmp, size: f.video },
      });
      await ctx.addInitScript(initSesion(token));
      await ctx.addInitScript(CURSOR);
      const page = await ctx.newPage();
      page.setDefaultTimeout(8000);
      const abierta = Date.now();
      raton = { x: f.viewport.width * 0.55, y: f.viewport.height * 0.45 };
      const url = await resolverUrl(e);
      if (e.cierre) {
        // La tarjeta tiene que estar PINTADA antes de que empiece el clip: si no, el video sale en blanco
        // (visto en f3: el clip del cierre duraba 1 s y su único cuadro era blanco).
        await page.setContent(CIERRE);
        await page.waitForLoadState('load').catch(() => {});
        await page.evaluate(() => Promise.all([...document.images].map((im) => (im.complete ? null : im.decode().catch(() => null))))).catch(() => {});
        await pausa(400);
        await page.mouse.move(raton.x + 2, raton.y + 2);
        await pausa(200);
      }
      else { await page.goto(`${APP}${url}`, { waitUntil: 'domcontentloaded', timeout: 90000 }); await asentar(page); }
      await page.mouse.move(raton.x, raton.y);
      // Lo que tardó en cargar se recorta en el montaje: el clip empieza con la pantalla ya lista.
      const inicio = Date.now();
      recortes[`e${n}`] = (inicio - abierta) / 1000;
      if (e.accion) await e.accion(page).catch((err) => console.warn(`  escena ${n}: ${err.message.split('\n')[0]}`));
      const resto = largo - (Date.now() - inicio);
      if (resto > 0) await pausa(resto);
      const v = page.video();
      await ctx.close();
      renameSync(await v.path(), join(SALIDA, `e${n}.webm`));
      rmSync(tmp, { recursive: true, force: true });
      console.log(`escena ${n}: ${(largo / 1000).toFixed(1)} s`);
    }
  } finally {
    await browser.close();
    writeFileSync(join(SALIDA, 'recortes.json'), JSON.stringify(recortes, null, 1));
  }
  console.log('clips:', readdirSync(SALIDA).filter((x) => x.endsWith('.webm')).length);
}

grabar().catch((err) => { console.error(err); process.exit(1); });
