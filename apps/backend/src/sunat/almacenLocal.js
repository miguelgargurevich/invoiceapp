const fs = require('node:fs/promises');
const path = require('node:path');

// Solo para desarrollo (SUNAT_ALMACEN_DIR): XML y CDR en disco en lugar del bucket R2 privado.
function crearAlmacenLocal(dir) {
  const raiz = path.resolve(dir);
  // Ninguna clave puede salir de la carpeta: ni `../`, ni rutas absolutas, ni la carpeta misma.
  const ruta = (key) => {
    const destino = path.resolve(raiz, key);
    if (!destino.startsWith(raiz + path.sep)) throw new Error('Clave de archivo inválida');
    return destino;
  };

  return {
    async guardar(key, cuerpo) {
      const destino = ruta(key);
      await fs.mkdir(path.dirname(destino), { recursive: true });
      await fs.writeFile(destino, cuerpo);
      return key;
    },
    async leer(key) {
      return fs.readFile(ruta(key));
    },
    async urlFirmada() {
      throw new Error('El almacén local no genera URL firmadas');
    },
  };
}

module.exports = { crearAlmacenLocal };
