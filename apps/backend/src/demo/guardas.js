// Guardas de la siembra y del reinicio de la demo: ninguno de los dos corre fuera de una instalación demo.
// Son funciones puras (reciben el entorno) para poder probarlas sin tocar nada.

const PREFIJOS_BD_LOCAL = ['invoiceapp_demo', 'invoiceapp_test'];

function nombreBaseDeUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

// null = se puede sembrar; texto = el motivo, en español, por el que no.
function motivoNoSembrar(env = process.env) {
  if (env.MODO_DEMO !== 'si') {
    return 'La siembra solo corre con MODO_DEMO=si (instalación de demostración).';
  }
  // En el contenedor de producción (NODE_ENV=production) el nombre de la base lo decide Coolify.
  // En local, la base tiene que ser de demo o de pruebas: así una siembra no cae sobre la base de trabajo.
  if (env.NODE_ENV !== 'production') {
    const base = nombreBaseDeUrl(env.DATABASE_URL || '');
    if (!base || !PREFIJOS_BD_LOCAL.some((prefijo) => base.startsWith(prefijo))) {
      return `En local, DATABASE_URL debe apuntar a una base que empiece con invoiceapp_demo o invoiceapp_test (ahora: «${base || 'sin base'}»).`;
    }
  }
  return null;
}

module.exports = { motivoNoSembrar, nombreBaseDeUrl, PREFIJOS_BD_LOCAL };
