'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

// Types
interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxInvoicesPerMonth: number;
  maxClients: number;
  maxProposalsPerMonth: number;
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

interface UsageData {
  invoices: { used: number; limit: number; percentage: number };
  proposals: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  usage: UsageData | null;
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
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [subResponse, usageResponse] = await Promise.all([
        api.get<Subscription>('/subscriptions/current'),
        api.get<UsageData>('/subscriptions/usage')
      ]);

      setSubscription(subResponse);
      setUsage(usageResponse);
    } catch (err: any) {
      console.error('[SUBSCRIPTION] Error fetching subscription:', err);
      setError(err.message || 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

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

    switch (resource) {
      case 'invoice': {
        const limit = subscription.plan.maxInvoicesPerMonth;
        return limit === -1 || usage.invoices.used < limit;
      }
      case 'proposal': {
        const limit = subscription.plan.maxProposalsPerMonth;
        return limit === -1 || usage.proposals.used < limit;
      }
      case 'client': {
        // Client count needs to be fetched separately or from usage
        const limit = subscription.plan.maxClients;
        return limit === -1; // For now, return true if unlimited
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

    switch (resource) {
      case 'invoice':
        return {
          used: usage.invoices.used,
          limit: subscription.plan.maxInvoicesPerMonth,
          percentage: usage.invoices.percentage,
          unlimited: subscription.plan.maxInvoicesPerMonth === -1
        };
      case 'proposal':
        return {
          used: usage.proposals.used,
          limit: subscription.plan.maxProposalsPerMonth,
          percentage: usage.proposals.percentage,
          unlimited: subscription.plan.maxProposalsPerMonth === -1
        };
      case 'storage':
        return {
          used: usage.storage.used,
          limit: subscription.plan.maxStorageMb,
          percentage: usage.storage.percentage,
          unlimited: false
        };
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

  const value: SubscriptionContextType = {
    subscription,
    usage,
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
  const { canCreate, getUsageInfo, loading, subscription } = useSubscription();
  
  const usageInfo = resource === 'invoice' || resource === 'proposal' 
    ? getUsageInfo(resource) 
    : { used: 0, limit: subscription?.plan?.maxClients || 0, percentage: 0, unlimited: (subscription?.plan?.maxClients || 0) === -1 };

  return {
    canCreate: canCreate(resource),
    loading,
    usage: usageInfo,
    currentPlan: subscription?.plan?.slug || null
  };
}
