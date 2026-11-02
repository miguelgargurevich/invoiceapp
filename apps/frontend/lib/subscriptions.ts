import api from './api';

export { formatPrice, esPlanGratis } from './precios';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  pais: 'US' | 'PE';
  isPopular?: boolean;
  features: string[];
  maxInvoices: number | null;
  maxClients: number | null;
  maxUsers: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  proveedorPago?: 'stripe' | 'culqi';
  billingInterval?: 'MONTH' | 'YEAR';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  plan: Plan;
  // Culqi en PAST_DUE: `plan` es el gratis efectivo y aquí va el plan que la empresa contrató.
  planContratado?: Plan;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  empresa: {
    id: string;
    nombre: string;
  };
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface UsageResponse {
  currentPeriod: {
    start: string;
    end: string;
  };
  usage: {
    invoices: number;
    clients: number;
    users: number;
  };
  limits: {
    maxInvoices: number | null;
    maxClients: number | null;
    maxUsers: number | null;
  };
  percentages: {
    invoices: number | null;
    clients: number | null;
    users: number | null;
  };
}

// API Functions
export async function getPlans(pais: 'US' | 'PE' = 'US'): Promise<Plan[]> {
  // Use direct fetch for this public endpoint to avoid auth issues
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  const response = await fetch(`${apiUrl}/subscriptions/plans?pais=${pais}`);

  if (!response.ok) {
    throw new Error('No se pudieron cargar los planes');
  }
  
  return response.json();
}

export async function getCurrentSubscription(): Promise<SubscriptionResponse> {
  return api.get<SubscriptionResponse>('/subscriptions/current');
}

export async function createCheckoutSession(planId: string, billingInterval: 'monthly' | 'yearly', locale: string = 'es'): Promise<CheckoutSessionResponse> {
  return api.post<CheckoutSessionResponse>('/subscriptions/create-checkout-session', {
    planId,
    billingInterval,
    locale,
  });
}

export async function createPortalSession(locale: string = 'es'): Promise<PortalSessionResponse> {
  return api.post<PortalSessionResponse>('/subscriptions/create-portal-session', {
    locale,
  });
}

export async function cancelSubscription(): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/cancel');
}

export async function reactivateSubscription(): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/reactivate');
}

export async function switchToFreePlan(): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/switch-to-free');
}

export async function syncSubscriptionFromSession(sessionId: string): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/sync-from-session', {
    sessionId
  });
}

export async function getUsage(): Promise<UsageResponse> {
  return api.get<UsageResponse>('/subscriptions/usage');
}

// Culqi (Perú): la contratación la usa Configuración › Suscripción (Tarea 5)
export interface Facturacion {
  nombre: string;
  apellido: string;
  telefono: string;
  direccion: string;
  ciudad: string;
}

export interface Autenticacion3DS {
  eci?: string;
  xid?: string;
  cavv?: string;
  protocolVersion?: string;
  directoryServerTransactionId?: string;
}

export type RespuestaCulqi = { subscription?: Subscription; requiere3DS?: boolean; ok?: boolean };

export async function suscribirCulqi(datos: {
  planSlug: string;
  intervalo: 'MONTH' | 'YEAR';
  tokenId: string;
  facturacion: Facturacion;
  authentication3DS?: Autenticacion3DS;
}): Promise<RespuestaCulqi> {
  return api.post<RespuestaCulqi>('/subscriptions/culqi/suscribir', datos);
}

export async function cambiarTarjetaCulqi(datos: { tokenId: string; authentication3DS?: Autenticacion3DS }): Promise<RespuestaCulqi> {
  return api.post<RespuestaCulqi>('/subscriptions/culqi/tarjeta', datos);
}

// Helper functions

export function getStatusColor(status: Subscription['status']): string {
  switch (status) {
    case 'ACTIVE':
    case 'TRIALING':
      return 'text-green-600 bg-green-100';
    case 'PAST_DUE':
    case 'UNPAID':
      return 'text-yellow-600 bg-yellow-100';
    case 'CANCELED':
    case 'INCOMPLETE':
    case 'INCOMPLETE_EXPIRED':
    case 'PAUSED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusLabel(status: Subscription['status'], t: (key: string) => string): string {
  return t(`status.${status.toLowerCase()}`);
}
