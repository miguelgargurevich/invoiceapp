// Perfiles de la demo. Las cuentas las crea la siembra (fase B); aquí solo se nombran.
// El correo sale SIEMPRE de esta tabla, nunca de lo que mande el cliente.
const PERFILES = Object.freeze({
  emprendedor: Object.freeze({
    id: 'emprendedor',
    email: 'emprendedor@demo.facturo.example',
    nombre: 'Emprendedor con boletas',
    descripcion: 'Emite boletas en segundos y mira tus ventas del día.',
  }),
  servicios: Object.freeze({
    id: 'servicios',
    email: 'servicios@demo.facturo.example',
    nombre: 'Empresa de servicios',
    descripcion: 'Facturas con detracción, proformas que tu cliente firma y tu marca en el PDF.',
  }),
});

// «Tu cliente» no inicia sesión: abre el enlace público de firma de una proforma de «servicios».
const PERFIL_CLIENTE = Object.freeze({
  id: 'cliente',
  nombre: 'Tu cliente',
  descripcion: 'Así recibe y firma tu cliente una proforma, sin crear cuenta.',
});

const CORREOS_DEMO = new Set(Object.values(PERFILES).map((p) => p.email));

module.exports = { PERFILES, PERFIL_CLIENTE, CORREOS_DEMO };
