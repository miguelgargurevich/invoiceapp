// Prueba de guardia: la app usa UN solo PrismaClient (src/utils/prisma.js).
// Cada cliente nuevo abre su propio pool (hasta 13 conexiones) contra el Postgres
// compartido del VPS, que solo admite 100. Esta prueba lee el código fuente y falla
// si alguien vuelve a crear un cliente en otro archivo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', '..'); // apps/backend

// Única excepción: el cliente compartido, que es donde se instancia PrismaClient.
const CLIENTE_COMPARTIDO = path.join('src', 'utils', 'prisma.js');

// Quita comentarios // y /* */ de un fuente JS. Respeta cadenas, para que una URL
// como 'https://…' no haga creer que el resto de la línea es un comentario.
function sinComentarios(codigo) {
  let salida = '';
  let i = 0;
  let cadena = null; // carácter que abre la cadena actual, o null
  while (i < codigo.length) {
    const c = codigo[i];
    const d = codigo[i + 1];
    if (cadena) {
      salida += c;
      if (c === '\\') {
        salida += d ?? '';
        i += 2;
        continue;
      }
      if (c === cadena) cadena = null;
      i++;
      continue;
    }
    if (c === '/' && d === '/') {
      while (i < codigo.length && codigo[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && d === '*') {
      const fin = codigo.indexOf('*/', i + 2);
      i = fin === -1 ? codigo.length : fin + 2;
      salida += ' ';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') cadena = c;
    salida += c;
    i++;
  }
  return salida;
}

// Rutas relativas a apps/backend de todo src/**/*.js y app.js.
function archivosFuente() {
  const encontrados = [];
  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (entrada.name.endsWith('.js')) encontrados.push(path.relative(RAIZ, ruta));
    }
  };
  recorrer(path.join(RAIZ, 'src'));
  encontrados.push('app.js');
  return encontrados;
}

const leerSinComentarios = (rel) => sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));

test('sinComentarios quita comentarios pero conserva URLs y código de la misma línea', () => {
  const entrada = "const u = 'https://x.y'; new PrismaClient() // new PrismaClient()\n/* new PrismaClient() */ const b = 1;";
  const salida = sinComentarios(entrada);
  assert.match(salida, /const u = 'https:\/\/x\.y'; new PrismaClient\(\)/);
  assert.doesNotMatch(salida, /\/\/ new PrismaClient/);
  assert.doesNotMatch(salida, /\/\* new PrismaClient/);
  assert.match(salida, /const b = 1;/);
});

// `new PrismaClient(` y también la forma en línea `new (require('@prisma/client').PrismaClient)(`, que es la que usaba el
// app.js de My Workspace para sus crons.
const CREA_CLIENTE = /\bnew\s+PrismaClient\s*\(|\.PrismaClient\s*\)\s*\(/;

test('la guardia reconoce las dos formas de crear un cliente', () => {
  assert.match('const p = new PrismaClient();', CREA_CLIENTE);
  assert.match("const p = new (require('@prisma/client').PrismaClient)();", CREA_CLIENTE);
  assert.doesNotMatch("const prisma = require('../utils/prisma');", CREA_CLIENTE);
});

test('ningún archivo de src/ ni app.js crea su propio PrismaClient (salvo utils/prisma.js)', () => {
  const culpables = archivosFuente()
    .filter((rel) => rel !== CLIENTE_COMPARTIDO)
    .filter((rel) => CREA_CLIENTE.test(leerSinComentarios(rel)));
  assert.deepEqual(culpables, [], `Crean un PrismaClient propio (usen require('../utils/prisma')): ${culpables.join(', ')}`);
});

test('el cliente compartido sigue siendo el único que instancia PrismaClient', () => {
  assert.match(leerSinComentarios(CLIENTE_COMPARTIDO), /new\s+PrismaClient\s*\(/);
});

test('nadie llama $disconnect: el cliente compartido vive mientras viva el proceso', () => {
  const culpables = archivosFuente().filter((rel) => /\$disconnect\s*\(/.test(leerSinComentarios(rel)));
  assert.deepEqual(culpables, [], `Llaman a $disconnect: ${culpables.join(', ')}`);
});
