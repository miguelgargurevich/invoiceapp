'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/global/AppLayout';
import { LoadingPage } from '@/components/common';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api, { ApiError } from '@/lib/api';

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

    // Sin empresa (cuenta creada en /register) o con el asistente a medias: al asistente, en el idioma actual.
    const checkSetupStatus = async () => {
      try {
        const response = await api.get<EmpresaResponse>('/empresas/mi-empresa');
        if (response && response.setupCompleted === false) {
          router.push(`/${locale}/setup`);
          return;
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          router.push(`/${locale}/setup`);
          return;
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

  return (
    <SubscriptionProvider>
      <AppLayout>{children}</AppLayout>
    </SubscriptionProvider>
  );
}
