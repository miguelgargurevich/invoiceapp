// Rutas y etiquetas de la paleta de comandos (Ctrl+K). Lógica pura, sin React ni next-intl,
// para poder probarla con node:test.
export type ComandoPaleta =
  | 'dashboard'
  | 'invoices'
  | 'quotes'
  | 'clients'
  | 'products'
  | 'reports'
  | 'settings'
  | 'new-invoice'
  | 'new-quote'
  | 'new-client'
  | 'new-product';

// Ruta dentro del panel, sin el prefijo del idioma.
const RUTAS: Record<ComandoPaleta, string> = {
  dashboard: '/dashboard',
  invoices: '/facturas',
  quotes: '/proformas',
  clients: '/clientes',
  products: '/productos',
  reports: '/reportes',
  settings: '/configuracion',
  'new-invoice': '/facturas/nueva',
  'new-quote': '/proformas/nueva',
  'new-client': '/clientes/nuevo',
  'new-product': '/productos/nuevo',
};

// Empresas de Perú: «Nueva factura» y «Ver facturas» van a los comprobantes electrónicos (SUNAT).
const RUTAS_PERU: Partial<Record<ComandoPaleta, string>> = {
  invoices: '/comprobantes',
  'new-invoice': '/comprobantes/nuevo',
};

// Clave dentro de «commandPalette.commands».
const ETIQUETAS: Record<ComandoPaleta, string> = {
  dashboard: 'goToDashboard',
  invoices: 'viewInvoices',
  quotes: 'viewQuotes',
  clients: 'viewClients',
  products: 'viewProducts',
  reports: 'viewReports',
  settings: 'openSettings',
  'new-invoice': 'newInvoice',
  'new-quote': 'newQuote',
  'new-client': 'newClient',
  'new-product': 'newProduct',
};

// Etiquetas propias de Perú (comprobantes en vez de facturas).
const ETIQUETAS_PERU: Partial<Record<ComandoPaleta, string>> = {
  invoices: 'viewVouchers',
  'new-invoice': 'newVoucher',
};

// Ruta completa con el idioma: siempre empieza por /{locale}/.
export function rutaDeComando(comando: ComandoPaleta, locale: string, esPeru: boolean): string {
  const ruta = (esPeru ? RUTAS_PERU[comando] : undefined) ?? RUTAS[comando];
  return `/${locale}${ruta}`;
}

// Clave i18n (dentro del namespace «commandPalette») para la etiqueta del comando.
export function claveEtiquetaComando(comando: ComandoPaleta, esPeru: boolean): string {
  return `commands.${(esPeru ? ETIQUETAS_PERU[comando] : undefined) ?? ETIQUETAS[comando]}`;
}
