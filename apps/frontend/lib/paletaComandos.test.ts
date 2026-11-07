import test from 'node:test';
import assert from 'node:assert/strict';
import { claveEtiquetaComando, rutaDeComando, type ComandoPaleta } from './paletaComandos.ts';

const TODOS: ComandoPaleta[] = [
  'dashboard', 'invoices', 'quotes', 'clients', 'products', 'reports', 'settings',
  'new-invoice', 'new-quote', 'new-client', 'new-product',
];

test('todas las rutas llevan el idioma al inicio', () => {
  for (const comando of TODOS) {
    assert.match(rutaDeComando(comando, 'es', false), /^\/es\/./, `sin locale: ${comando}`);
    assert.match(rutaDeComando(comando, 'es', true), /^\/es\/./, `sin locale (PE): ${comando}`);
  }
  assert.equal(rutaDeComando('dashboard', 'en', false), '/en/dashboard');
});

test('fuera de Perú las rutas no cambian', () => {
  assert.equal(rutaDeComando('new-invoice', 'es', false), '/es/facturas/nueva');
  assert.equal(rutaDeComando('invoices', 'es', false), '/es/facturas');
  assert.equal(rutaDeComando('quotes', 'es', false), '/es/proformas');
});

test('en Perú facturas apuntan a comprobantes', () => {
  assert.equal(rutaDeComando('new-invoice', 'es', true), '/es/comprobantes/nuevo');
  assert.equal(rutaDeComando('invoices', 'es', true), '/es/comprobantes');
  // El resto sigue igual.
  assert.equal(rutaDeComando('new-quote', 'es', true), '/es/proformas/nueva');
  assert.equal(rutaDeComando('dashboard', 'es', true), '/es/dashboard');
});

test('etiquetas de Perú solo cambian factura y listado de facturas', () => {
  assert.equal(claveEtiquetaComando('new-invoice', false), 'commands.newInvoice');
  assert.equal(claveEtiquetaComando('invoices', false), 'commands.viewInvoices');
  assert.equal(claveEtiquetaComando('new-invoice', true), 'commands.newVoucher');
  assert.equal(claveEtiquetaComando('invoices', true), 'commands.viewVouchers');
  assert.equal(claveEtiquetaComando('new-quote', true), 'commands.newQuote');
});
