// Tipos de documento del cliente que se ofrecen en los selectores (Perú).
// Las claves se traducen con `sunat.clientes.tiposDoc` en messages/es.json.
export const TIPOS_DOCUMENTO_PERU = ['RUC', 'DNI', 'CE', 'PASAPORTE', 'OTHER'] as const;

// Códigos de EE. UU. que ya no se ofrecen. Un registro antiguo que los tenga
// sigue mostrando su etiqueta en el selector (para que no se vea vacío).
const ETIQUETAS_HEREDADAS: Record<string, string> = {
  SSN: 'SSN (Social Security Number)',
  EIN: 'EIN (Employer ID Number)',
  ITIN: 'ITIN (Individual Tax ID)',
  DRIVER_LICENSE: "Driver's License",
  STATE_ID: 'State ID',
  PASSPORT: 'Pasaporte',
};

/**
 * Devuelve la opción extra que hay que mostrar para un código que ya no se ofrece,
 * o null si el código es de Perú (o está vacío). Un código desconocido se muestra tal cual.
 */
export function opcionTipoDocumentoHeredado(
  codigo: string | null | undefined,
): { valor: string; etiqueta: string } | null {
  if (!codigo) return null;
  if ((TIPOS_DOCUMENTO_PERU as readonly string[]).includes(codigo)) return null;
  return { valor: codigo, etiqueta: ETIQUETAS_HEREDADAS[codigo] ?? codigo };
}

// Código SUNAT del tipo de documento de identidad (catálogo 06) → etiqueta para mostrar.
// Los clientes guardan a veces el código («6») y a veces la sigla («RUC»): ambos salen igual.
const ETIQUETAS_SUNAT: Record<string, string> = {
  '0': 'Doc.',
  '1': 'DNI',
  '4': 'CE',
  '6': 'RUC',
  '7': 'Pasaporte',
  A: 'Cédula diplomática',
};

export function etiquetaTipoDocumento(tipo: string | null | undefined): string {
  const t = String(tipo ?? '').trim();
  if (!t) return '';
  return ETIQUETAS_SUNAT[t] ?? (t.toUpperCase() === 'PASAPORTE' ? 'Pasaporte' : t.toUpperCase());
}
