'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

// Types
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  // Allow both naming conventions from backend
  maxInvoicesPerMonth?: number;
  maxInvoices?: number;
  maxClients: number;
  maxProposalsPerMonth?: number;
  maxProposals?: number;
  maxStorageMb: number;
  hasProposals: boolean;
  hasDigitalSignatures: boolean;
  hasReports: boolean;
  hasCustomBranding: boolean;
  hasMultiCurrency: boolean;
  hasJobTracking: boolean;
  hasAdvancedReports: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  trialDays: number;
}

// Normalized plan interface for easy access
export interface NormalizedPlan extends Plan {
  maxInvoices: number;
  maxProposals: number;
}

interface Subscription {
  id: string;
  empresaId: string;
  planId: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED';
  billingInterval: 'MONTH' | 'YEAR';
  trialStart: string | null;
  trialEnd: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  invoicesUsed: number;
  proposalsUsed: number;
  storageUsedMb: number;
  plan: Plan;
}

export interface UsageInfo {
  invoicesCount: number;
  proposalsCount: number;
  clientsCount: number;
  storageUsedMb: number;
}

interface UsageData {
  invoices: { used: number; limit: number; percentage: number };
  proposals: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: UsageInfo | null;
  plan: NormalizedPlan | null;
  loading: boolean;
  error: string | null;
  // Feature checks
  hasFeature: (feature: keyof Plan) => boolean;
  canCreate: (resource: 'invoice' | 'proposal' | 'client') => boolean;
  // Usage info
  getUsageInfo: (resource: 'invoice' | 'proposal' | 'storage') => { used: number; limit: number; percentage: number; unlimited: boolean };
  // Plan info
  isTrialing: boolean;
  isActive: boolean;
  trialDaysRemaining: number | null;
  currentPlanSlug: string | null;
  // Actions
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [subResponse, usageResponse] = await Promise.all([
        api.get<{ subscription: Subscription; empresa: { id: string; nombre: string } }>('/subscriptions/current'),
        api.get<UsageInfo>('/subscriptions/usage')
      ]);

      setSubscription(subResponse.subscription);
      setUsage(usageResponse);
    } catch (err: any) {
      console.error('[SUBSCRIPTION] Error fetching subscription:', err);
      setError(err.message || 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if a feature is available in the current plan
  const hasFeature = useCallback((feature: keyof Plan): boolean => {
    if (!subscription?.plan) return false;
    const value = subscription.plan[feature];
    return typeof value === 'boolean' ? value : false;
  }, [subscription]);

  // Check if user can create more of a resource
  const canCreate = useCallback((resource: 'invoice' | 'proposal' | 'client'): boolean => {
    if (!subscription?.plan || !usage) return false;

    // First check if feature is available (for proposals)
    if (resource === 'proposal' && !subscription.plan.hasProposals) {
      return false;
    }

    const planData = subscription.plan;

    switch (resource) {
      case 'invoice': {
        const limit = planData.maxInvoices ?? planData.maxInvoicesPerMonth ?? 20;
        return limit === -1 || usage.invoicesCount < limit;
      }
      case 'proposal': {
        const limit = planData.maxProposals ?? planData.maxProposalsPerMonth ?? 0;
        return limit === -1 || usage.proposalsCount < limit;
      }
      case 'client': {
        const limit = planData.maxClients ?? 10;
        return limit === -1 || usage.clientsCount < limit;
      }
      default:
        return true;
    }
  }, [subscription, usage]);

  // Get usage info for a resource
  const getUsageInfo = useCallback((resource: 'invoice' | 'proposal' | 'storage'): { used: number; limit: number; percentage: number; unlimited: boolean } => {
    if (!usage || !subscription?.plan) {
      return { used: 0, limit: 0, percentage: 0, unlimited: false };
    }

    const planData = subscription.plan;

    switch (resource) {
      case 'invoice': {
        const limit = planData.maxInvoices ?? planData.maxInvoicesPerMonth ?? 20;
        const used = usage.invoicesCount;
        return {
          used,
          limit,
          percentage: limit > 0 ? (used / limit) * 100 : 0,
          unlimited: limit === -1
        };
      }
      case 'proposal': {
        const limit = planData.maxProposals ?? planData.maxProposalsPerMonth ?? 0;
        const used = usage.proposalsCount;
        return {
          used,
          limit,
          percentage: limit > 0 ? (used / limit) * 100 : 0,
          unlimited: limit === -1
        };
      }
      case 'storage': {
        const limit = planData.maxStorageMb ?? 100;
        const used = usage.storageUsedMb;
        return {
          used,
          limit,
          percentage: limit > 0 ? (used / limit) * 100 : 0,
          unlimited: false
        };
      }
      default:
        return { used: 0, limit: 0, percentage: 0, unlimited: false };
    }
  }, [usage, subscription]);

  // Computed properties
  const isTrialing = subscription?.status === 'TRIALING';
  const isActive = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING';
  
  const trialDaysRemaining = (() => {
    if (!subscription?.trialEnd || subscription.status !== 'TRIALING') return null;
    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const currentPlanSlug = subscription?.plan?.slug || null;

  // Derived plan with normalized field names for easy access
  const plan: NormalizedPlan | null = subscription?.plan ? {
    ...subscription.plan,
    maxInvoices: subscription.plan.maxInvoices ?? subscription.plan.maxInvoicesPerMonth ?? 20,
    maxProposals: subscription.plan.maxProposals ?? subscription.plan.maxProposalsPerMonth ?? 0,
  } : null;

  const value: SubscriptionContextType = {
    subscription,
    usage,
    plan,
    loading,
    error,
    hasFeature,
    canCreate,
    getUsageInfo,
    isTrialing,
    isActive,
    trialDaysRemaining,
    currentPlanSlug,
    refreshSubscription: fetchSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Hook for checking feature access
export function useFeatureAccess(feature: keyof Plan) {
  const { hasFeature, currentPlanSlug, subscription, loading } = useSubscription();
  
  return {
    hasAccess: hasFeature(feature),
    loading,
    currentPlan: currentPlanSlug,
    planName: subscription?.plan?.name || null
  };
}

// Hook for checking if user can create a resource
export function useCanCreate(resource: 'invoice' | 'proposal' | 'client') {
  const { canCreate, getUsageInfo, loading, subscription, usage, plan } = useSubscription();
  
  let usageInfo: { used: number; limit: number; percentage: number; unlimited: boolean };
  
  if (resource === 'invoice' || resource === 'proposal') {
    usageInfo = getUsageInfo(resource);
  } else {
    // For clients
    const limit = plan?.maxClients ?? 10;
    const used = usage?.clientsCount ?? 0;
    usageInfo = {
      used,
      limit,
      percentage: limit > 0 ? (used / limit) * 100 : 0,
      unlimited: limit === -1
    };
  }

  return {
    canCreate: canCreate(resource),
    loading,
    usage: usageInfo,
    currentPlan: subscription?.plan?.slug || null
  };
}
