'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/global/AppLayout';
import { LoadingPage } from '@/components/common';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface EmpresaResponse {
  setupCompleted?: boolean;
}

export default function DashboardLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { user, loading, empresa } = useAuth();
  const router = useRouter();
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`);
      return;
    }

    // Check if user has completed setup
    const checkSetupStatus = async () => {
      if (user && empresa) {
        try {
          const response = await api.get<EmpresaResponse>('/empresas/mi-empresa');
          if (response && response.setupCompleted === false) {
            // User hasn't completed setup, redirect to wizard
            router.push(`/${locale}/setup`);
            return;
          }
        } catch (error) {
          // If no empresa exists, redirect to setup
          if ((error as Error)?.message?.includes('404')) {
            router.push(`/${locale}/setup`);
            return;
          }
        }
      }
      setCheckingSetup(false);
    };

    if (!loading && user) {
      checkSetupStatus();
    }
  }, [user, loading, router, locale, empresa]);

  if (loading || checkingSetup) {
    return <LoadingPage message="Loading..." />;
  }

  if (!user) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
