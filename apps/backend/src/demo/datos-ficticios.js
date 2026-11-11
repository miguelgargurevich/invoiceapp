// Datos de ejemplo de la demo. TODO es ficticio: nombres inventados, correos @*.example, celulares 9000xxxxx,
// RUC con dígito verificador válido (empiezan en 20 o 10) y DNI inventados. Nada de esto identifica a una persona real.
// Sin dependencias de base de datos: son funciones puras y se prueban solas (test/unit/demo-datos.test.js).
const { fechaLima } = require('../sunat/fechas');

// Pesos del dígito verificador del RUC (módulo 11) sobre los 10 primeros dígitos.
const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function digitoVerificadorRuc(diez) {
  const suma = PESOS_RUC.reduce((acc, peso, i) => acc + peso * Number(diez[i]), 0);
  const resto = 11 - (suma % 11);
  if (resto === 10) return 0;
  if (resto === 11) return 1;
  return resto;
}

// prefijo '20' (empresas) o '10' (personas con negocio) + 8 dígitos de cuerpo.
function rucFicticio(prefijo, cuerpo) {
  const diez = `${prefijo}${String(cuerpo).padStart(8, '0')}`;
  return `${diez}${digitoVerificadorRuc(diez)}`;
}

// Celular ficticio: 9000 + 5 dígitos (formato 9000xxxxx).
function celularFicticio(n) {
  return `9000${String(n).padStart(5, '0')}`;
}

// Generador pseudoaleatorio determinista (mulberry32): la misma semilla da los mismos datos en cada siembra.
function generadorAleatorio(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// «AAAA-MM-DD» de hoy en Lima menos `hace` días.
function diaLimaHace(ahora, hace) {
  const hoy = fechaLima(ahora);
  const d = new Date(`${hoy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - hace);
  return d.toISOString().slice(0, 10);
}

// Punto de partida de los correlativos: cada día de la siembra empieza en otro millar. Así, dos siembras en días
// distintos no repiten números que SUNAT beta ya registró para el mismo RUC (eso daría el código 1033).
function correlativoBase(ahora) {
  const hoy = fechaLima(ahora);
  return Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / 864e5) * 1000;
}

// Fecha y hora del comprobante: mediodía de Lima del día dado (así fechaLima() devuelve siempre ese día).
function fechaDeDia(diaYmd, hora = 12) {
  return new Date(`${diaYmd}T${String(hora).padStart(2, '0')}:00:00-05:00`);
}

// Suma `dias` a un «AAAA-MM-DD».
function sumarDias(diaYmd, dias) {
  const d = new Date(`${diaYmd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const CORREO_EJEMPLO = (usuario, dominio) => `${usuario}@${dominio}.example`;

const CLIENTES_BOLETA = [
  { nombre: 'Rosa Ejemplo Huamán', dni: '47100001' },
  { nombre: 'Carlos Muestra Quispe', dni: '47100002' },
  { nombre: 'Lucía Prueba Ramírez', dni: '47100003' },
  { nombre: 'Jorge Modelo Torres', dni: '47100004' },
  { nombre: 'Ana Demo Vásquez', dni: '47100005' },
  { nombre: 'Luis Ficticio Mendoza', dni: '47100006' },
];

const PRODUCTOS_BODEGA = [
  { codigo: 'BOD-001', nombre: 'Gaseosa 500 ml', precio: 3.5 },
  { codigo: 'BOD-002', nombre: 'Pan francés (unidad)', precio: 0.3 },
  { codigo: 'BOD-003', nombre: 'Arroz superior 1 kg', precio: 5.2 },
  { codigo: 'BOD-004', nombre: 'Aceite vegetal 1 L', precio: 9.8 },
  { codigo: 'BOD-005', nombre: 'Leche evaporada 400 g', precio: 4.1 },
  { codigo: 'BOD-006', nombre: 'Azúcar rubia 1 kg', precio: 4.6 },
  { codigo: 'BOD-007', nombre: 'Fideos spaghetti 1 kg', precio: 4.9 },
];

const PRODUCTOS_SERVICIOS = [
  { codigo: 'SRV-001', nombre: 'Consultoría de sistemas (hora)', precio: 180, tipo: 'SERVICIO', unidad: 'HUR' },
  { codigo: 'SRV-002', nombre: 'Mantenimiento mensual de software', precio: 650, tipo: 'SERVICIO', unidad: 'ZZ' },
  { codigo: 'SRV-003', nombre: 'Implementación de módulo', precio: 1200, tipo: 'SERVICIO', unidad: 'ZZ' },
  { codigo: 'SRV-004', nombre: 'Capacitación presencial (día)', precio: 480, tipo: 'SERVICIO', unidad: 'ZZ' },
];

const CLIENTES_EMPRESA = [
  { ruc: rucFicticio('20', 51234001), razonSocial: 'Minera Ejemplo Norte S.A.C.', dominio: 'minera-ejemplo', direccion: 'Av. Ejemplo 100, San Isidro' },
  { ruc: rucFicticio('20', 51234002), razonSocial: 'Constructora Demo Sur E.I.R.L.', dominio: 'constructora-demo', direccion: 'Jr. Muestra 245, Miraflores' },
  { ruc: rucFicticio('20', 51234003), razonSocial: 'Agro Prueba Oriente S.A.C.', dominio: 'agro-prueba', direccion: 'Calle Modelo 12, La Molina' },
  { ruc: rucFicticio('20', 51234004), razonSocial: 'Clínica Modelo Costa S.A.C.', dominio: 'clinica-modelo', direccion: 'Av. Ficticia 890, Surco' },
];

const CLIENTE_EMPRESA_ERRONEO = { ruc: '20512340049', razonSocial: 'Transportes Muestra Central S.R.L.' };

module.exports = {
  digitoVerificadorRuc,
  rucFicticio,
  celularFicticio,
  generadorAleatorio,
  diaLimaHace,
  correlativoBase,
  fechaDeDia,
  sumarDias,
  CORREO_EJEMPLO,
  CLIENTES_BOLETA,
  PRODUCTOS_BODEGA,
  PRODUCTOS_SERVICIOS,
  CLIENTES_EMPRESA,
  CLIENTE_EMPRESA_ERRONEO,
};
