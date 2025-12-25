'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/global/AppLayout';
import { LoadingPage } from '@/components/common';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { user, loading, empresa } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [user, loading, router, locale]);

  if (loading) {
    return <LoadingPage message="Cargando..." />;
  }

  if (!user) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
