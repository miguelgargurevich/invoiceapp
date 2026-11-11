import test from 'node:test';
import assert from 'node:assert/strict';
import { opcionTipoDocumentoHeredado, TIPOS_DOCUMENTO_PERU } from './tiposDocumento.ts';

test('los tipos de Perú no generan opción extra', () => {
  for (const codigo of TIPOS_DOCUMENTO_PERU) {
    assert.equal(opcionTipoDocumentoHeredado(codigo), null, codigo);
  }
});

test('un registro de EE. UU. conserva la etiqueta original', () => {
  assert.deepEqual(opcionTipoDocumentoHeredado('SSN'), { valor: 'SSN', etiqueta: 'SSN (Social Security Number)' });
  assert.deepEqual(opcionTipoDocumentoHeredado('DRIVER_LICENSE'), { valor: 'DRIVER_LICENSE', etiqueta: "Driver's License" });
  assert.deepEqual(opcionTipoDocumentoHeredado('PASSPORT'), { valor: 'PASSPORT', etiqueta: 'Pasaporte' });
});

test('un código desconocido se muestra tal cual y vacío no genera nada', () => {
  assert.deepEqual(opcionTipoDocumentoHeredado('TAX_ID'), { valor: 'TAX_ID', etiqueta: 'TAX_ID' });
  assert.equal(opcionTipoDocumentoHeredado(''), null);
  assert.equal(opcionTipoDocumentoHeredado(undefined), null);
});

test('etiquetaTipoDocumento muestra la sigla del código SUNAT', async () => {
  const { etiquetaTipoDocumento } = await import('./tiposDocumento.ts');
  assert.equal(etiquetaTipoDocumento('6'), 'RUC');
  assert.equal(etiquetaTipoDocumento('1'), 'DNI');
  assert.equal(etiquetaTipoDocumento('RUC'), 'RUC');
  assert.equal(etiquetaTipoDocumento('pasaporte'), 'Pasaporte');
  assert.equal(etiquetaTipoDocumento(''), '');
});
