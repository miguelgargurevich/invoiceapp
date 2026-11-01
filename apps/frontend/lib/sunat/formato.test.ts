import test from 'node:test';
import assert from 'node:assert/strict';
import { fechaCorta, filasDesdeComprobante, filasDesdeVista, formatearMonto, nombreArchivo, numeroComprobante } from './formato.ts';

// Zona de la máquina en UTC: sin esto, quitar timeZone «America/Lima» pasa en una Mac en Lima.
process.env.TZ = 'UTC';

test('formatearMonto usa el formato peruano', () => {
  const soles = formatearMonto('1180', 'PEN');
  assert.match(soles, /S\//);
  assert.match(soles, /1,180\.00/);
  assert.match(formatearMonto(null, 'USD'), /0\.00/);
  assert.match(formatearMonto('abc', 'PEN'), /0\.00/);
});

test('fechaCorta usa la hora de Lima', () => {
  assert.equal(fechaCorta('2026-11-02T03:00:00.000Z'), '01/11/2026');
});

test('numeroComprobante y nombreArchivo', () => {
  assert.equal(numeroComprobante({ serie: 'F001', numero: 7 }), 'F001-7');
  assert.equal(numeroComprobante({ serie: 'F001', numero: null }), null);
  const c = { tipoComprobante: '01' as const, serie: 'F001', numero: 7 };
  assert.equal(nombreArchivo('20000000001', c, 'pdf'), '20000000001-01-F001-7.pdf');
  assert.equal(nombreArchivo('20000000001', c, 'xml'), '20000000001-01-F001-7.xml');
  assert.equal(nombreArchivo('20000000001', c, 'cdr'), '20000000001-01-F001-7.cdr.zip');
});

test('filasDesdeVista solo muestra lo que no es cero', () => {
  const filas = filasDesdeVista({
    totales: { gravadas: '1000.00', exoneradas: '0.00', inafectas: '0.00', exportacion: '0.00', igv: '180.00', icbper: '0.00' },
    detraccion: { monto: '142.00' }, percepcion: null, retencion: null, netoPendiente: '1038.00',
  });
  assert.deepEqual(filas, [
    { clave: 'gravadas', monto: '1000.00' },
    { clave: 'igv', monto: '180.00' },
    { clave: 'detraccion', monto: '142.00' },
    { clave: 'neto', monto: '1038.00' },
  ]);
});

test('filasDesdeComprobante lee los campos guardados', () => {
  const filas = filasDesdeComprobante({
    totalGravadas: '100', totalExoneradas: '50', totalInafectas: '0', totalExportacion: '0', igv: '18', totalIcbper: '0',
    detraccionMonto: null, percepcionMonto: null, retencionMonto: null, netoPendiente: '168',
  });
  assert.deepEqual(filas, [
    { clave: 'gravadas', monto: '100' },
    { clave: 'exoneradas', monto: '50' },
    { clave: 'igv', monto: '18' },
  ]);
});
