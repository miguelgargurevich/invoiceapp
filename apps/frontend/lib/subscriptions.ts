import api from './api';

// Types
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  priceMonthly: number;
  priceYearly: number;
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
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  plan: Plan;
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
export async function getPlans(): Promise<Plan[]> {
  return api.get<Plan[]>('/subscriptions/plans');
}

export async function getCurrentSubscription(): Promise<SubscriptionResponse> {
  return api.get<SubscriptionResponse>('/subscriptions/current');
}

export async function createCheckoutSession(planId: string, billingInterval: 'monthly' | 'yearly'): Promise<CheckoutSessionResponse> {
  return api.post<CheckoutSessionResponse>('/subscriptions/create-checkout-session', {
    planId,
    billingInterval,
  });
}

export async function createPortalSession(): Promise<PortalSessionResponse> {
  return api.post<PortalSessionResponse>('/subscriptions/create-portal-session');
}

export async function cancelSubscription(): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/cancel');
}

export async function reactivateSubscription(): Promise<{ message: string; subscription: Subscription }> {
  return api.post<{ message: string; subscription: Subscription }>('/subscriptions/reactivate');
}

export async function getUsage(): Promise<UsageResponse> {
  return api.get<UsageResponse>('/subscriptions/usage');
}

// Helper functions
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price / 100);
}

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
