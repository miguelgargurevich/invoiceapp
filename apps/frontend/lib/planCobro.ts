// Qué plan mostrar en Configuración › Suscripción cuando el cobro falla.
// Sin dependencias de la app (sin `api`): así se prueba con node --test.
import type { Plan, Subscription } from './subscriptions';

export interface PlanMostrado {
  plan: Plan;
  cobroFallido: boolean;
}

// Con Culqi en PAST_DUE, la API devuelve `plan` = el gratis efectivo y `planContratado` = el pagado.
// Se muestra el contratado (con aviso) porque es lo que la empresa eligió y pagaba.
export function planMostrado(sub: Pick<Subscription, 'status' | 'plan' | 'planContratado'>): PlanMostrado {
  if (sub.status === 'PAST_DUE' && sub.planContratado) {
    return { plan: sub.planContratado, cobroFallido: true };
  }
  return { plan: sub.plan, cobroFallido: false };
}
