// Catálogo de planes de Perú (mismo que components/landing/PricingSection.tsx y backend/prisma/seed_plans_pe.sql).
// Va del más barato al más caro: planMasBarato devuelve el primero que incluye la función.

export type FuncionPlan =
  | 'reportes'
  | 'proformas'
  | 'firmaDigital'
  | 'regimenesSunat'
  | 'logo'
  | 'reportesAvanzados'
  | 'multimoneda'
  | 'api'
  | 'soporte';

export interface PlanPe {
  slug: string;
  nombre: string;
  funciones: FuncionPlan[];
}

// Cada plan incluye lo de los anteriores.
const EMPRENDEDOR: FuncionPlan[] = ['reportes'];
const NEGOCIO: FuncionPlan[] = [...EMPRENDEDOR, 'proformas', 'firmaDigital', 'regimenesSunat', 'logo'];
const EMPRESA: FuncionPlan[] = [...NEGOCIO, 'reportesAvanzados', 'multimoneda', 'api', 'soporte'];

export const PLANES_PE: PlanPe[] = [
  { slug: 'pe-emprendedor', nombre: 'Emprendedor', funciones: EMPRENDEDOR },
  { slug: 'pe-negocio', nombre: 'Negocio', funciones: NEGOCIO },
  { slug: 'pe-empresa', nombre: 'Empresa', funciones: EMPRESA },
];

export const ETIQUETA_FUNCION: Record<FuncionPlan, string> = {
  reportes: 'Reportes',
  proformas: 'Proformas',
  firmaDigital: 'Firma digital de documentos',
  regimenesSunat: 'Detracción y percepción',
  logo: 'Tu logo en los comprobantes',
  reportesAvanzados: 'Reportes avanzados',
  multimoneda: 'Multimoneda',
  api: 'Acceso por API',
  soporte: 'Soporte prioritario',
};

/** El plan más barato que incluye la función, o null si ninguno la incluye. */
export function planMasBarato(funcion: FuncionPlan): PlanPe | null {
  return PLANES_PE.find((plan) => plan.funciones.includes(funcion)) ?? null;
}
