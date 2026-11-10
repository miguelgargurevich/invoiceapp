import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARCA_USER_AGENT,
  blobABase64,
  descargarArchivo,
  elegirCamino,
  nombreSeguro,
  type Dependencias,
} from './descargas.ts';

const NAVEGADOR = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';

test('elegirCamino: en navegador normal descarga con el enlace de siempre', () => {
  assert.equal(elegirCamino({ nativo: false, userAgent: NAVEGADOR }), 'navegador');
});

test('elegirCamino: con el puente nativo usa la app (Filesystem y Share)', () => {
  assert.equal(elegirCamino({ nativo: true, userAgent: NAVEGADOR }), 'aplicacion');
});

test('elegirCamino: el user agent de la app basta aunque el puente no responda', () => {
  const ua = `${NAVEGADOR} ${MARCA_USER_AGENT}/1.0`;
  assert.equal(elegirCamino({ nativo: false, userAgent: ua }), 'aplicacion');
});

test('nombreSeguro: deja el nombre igual cuando ya es válido', () => {
  assert.equal(nombreSeguro('Factura-F001-123.pdf'), 'Factura-F001-123.pdf');
});

test('nombreSeguro: quita separadores de ruta y caracteres prohibidos', () => {
  // Sin «/» no hay recorrido de rutas; los puntos iniciales se quitan.
  assert.equal(nombreSeguro('../../etc/passwd'), 'etc_passwd');
  assert.ok(!nombreSeguro('../../etc/passwd').includes('/'));
  assert.equal(nombreSeguro('Cliente: "Norte" <S.A.>?.csv'), 'Cliente_ _Norte_ _S.A.__.csv');
});

test('nombreSeguro: un nombre vacío o solo de puntos cae a «documento»', () => {
  assert.equal(nombreSeguro(''), 'documento');
  assert.equal(nombreSeguro('...'), 'documento');
  assert.equal(nombreSeguro('   '), 'documento');
});

test('nombreSeguro: no deja archivos ocultos ni espacios sobrantes', () => {
  assert.equal(nombreSeguro('  .oculto.pdf  '), 'oculto.pdf');
  assert.equal(nombreSeguro('Proforma   P001  1.pdf'), 'Proforma P001 1.pdf');
});

test('nombreSeguro: respeta el máximo y conserva la extensión', () => {
  const largo = 'a'.repeat(300) + '.pdf';
  const corto = nombreSeguro(largo, 50);
  assert.equal(corto.length, 50);
  assert.ok(corto.endsWith('.pdf'));
});

test('blobABase64: codifica texto conocido', async () => {
  assert.equal(await blobABase64(new Blob(['hola'])), 'aG9sYQ==');
  assert.equal(await blobABase64(new Blob([])), '');
});

test('blobABase64: ida y vuelta exacta con bytes binarios de más de un trozo', async () => {
  const bytes = new Uint8Array(100_000);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + 7) % 256;
  const base64 = await blobABase64(new Blob([bytes]));
  assert.deepEqual(Buffer.from(base64, 'base64'), Buffer.from(bytes));
});

interface Llamadas {
  navegador: Array<{ nombre: string; tamano: number }>;
  cache: Array<{ nombre: string; base64: string }>;
  compartidos: Array<{ titulo: string; archivo: string }>;
}

function dependenciasFalsas(entorno: { nativo: boolean; userAgent: string }, llamadas: Llamadas, fallaCache = false): Dependencias {
  return {
    entorno: () => entorno,
    descargarEnNavegador: (blob, nombre) => {
      llamadas.navegador.push({ nombre, tamano: blob.size });
    },
    guardarEnCache: async (nombre, base64) => {
      if (fallaCache) throw new Error('disco lleno');
      llamadas.cache.push({ nombre, base64 });
      return `file:///cache/${nombre}`;
    },
    compartir: async (opciones) => {
      llamadas.compartidos.push(opciones);
    },
  };
}

const vacias = (): Llamadas => ({ navegador: [], cache: [], compartidos: [] });

test('descargarArchivo en navegador: usa el enlace y no toca Filesystem ni Share', async () => {
  const llamadas = vacias();
  await descargarArchivo(new Blob(['x'.repeat(10)]), 'Clientes_2026-11-10.csv', dependenciasFalsas({ nativo: false, userAgent: NAVEGADOR }, llamadas));
  assert.deepEqual(llamadas.navegador, [{ nombre: 'Clientes_2026-11-10.csv', tamano: 10 }]);
  assert.equal(llamadas.cache.length, 0);
  assert.equal(llamadas.compartidos.length, 0);
});

test('descargarArchivo en la app: guarda en caché con el contenido en base64 y comparte esa URI', async () => {
  const llamadas = vacias();
  await descargarArchivo(new Blob(['hola']), 'Factura-F001-1.pdf', dependenciasFalsas({ nativo: true, userAgent: NAVEGADOR }, llamadas));
  assert.deepEqual(llamadas.cache, [{ nombre: 'Factura-F001-1.pdf', base64: 'aG9sYQ==' }]);
  assert.deepEqual(llamadas.compartidos, [{ titulo: 'Factura-F001-1.pdf', archivo: 'file:///cache/Factura-F001-1.pdf' }]);
  assert.equal(llamadas.navegador.length, 0);
});

test('descargarArchivo: el nombre sanitizado es el que llega a caché y a Share', async () => {
  const llamadas = vacias();
  await descargarArchivo(new Blob(['a']), '../Cliente/Norte.csv', dependenciasFalsas({ nativo: true, userAgent: NAVEGADOR }, llamadas));
  assert.equal(llamadas.cache[0].nombre, 'Cliente_Norte.csv');
  assert.equal(llamadas.compartidos[0].titulo, 'Cliente_Norte.csv');
});

test('descargarArchivo: si falla el guardado en la app, el error se propaga (no se traga)', async () => {
  const llamadas = vacias();
  await assert.rejects(
    descargarArchivo(new Blob(['a']), 'x.pdf', dependenciasFalsas({ nativo: true, userAgent: NAVEGADOR }, llamadas, true)),
    /disco lleno/,
  );
  assert.equal(llamadas.compartidos.length, 0);
});
