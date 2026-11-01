// Errores del módulo SUNAT. Las rutas los traducen a códigos HTTP en src/sunat/http.js.
class ErrorValidacion extends Error {
  constructor(errores) {
    super(errores.join('. '));
    this.name = 'ErrorValidacion';
    this.errores = errores;
  }
}

class ErrorEstado extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorEstado'; }
}

class ErrorFueraDePlazo extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorFueraDePlazo'; }
}

class ErrorBorrador extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorBorrador'; }
}

class ErrorEngineNoDisponible extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'ErrorEngineNoDisponible'; }
}

class ErrorConstruccion extends Error {
  constructor(mensaje, detalle) { super(mensaje); this.name = 'ErrorConstruccion'; this.detalle = detalle; }
}

class ErrorPlan extends Error {
  constructor(mensaje, { status = 402, codigo = 'LIMIT_REACHED' } = {}) {
    super(mensaje); this.name = 'ErrorPlan'; this.status = status; this.codigo = codigo;
  }
}

module.exports = {
  ErrorValidacion,
  ErrorEstado,
  ErrorFueraDePlazo,
  ErrorBorrador,
  ErrorEngineNoDisponible,
  ErrorConstruccion,
  ErrorPlan,
};
