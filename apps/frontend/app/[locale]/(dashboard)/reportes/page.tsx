'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  Package,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/common';

interface ReportCard {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function ReportesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('reports');
  const router = useRouter();

  const reportCards: ReportCard[] = [
    {
      id: 'sales',
      titleKey: 'salesReport',
      descriptionKey: 'salesReportDesc',
      icon: <TrendingUp className="w-8 h-8" />,
      href: `/${locale}/reportes/ventas`,
      color: 'blue',
    },
    {
      id: 'clients',
      titleKey: 'clientsReport',
      descriptionKey: 'clientsReportDesc',
      icon: <Users className="w-8 h-8" />,
      href: `/${locale}/reportes/clientes`,
      color: 'green',
    },
    {
      id: 'products',
      titleKey: 'productsReport',
      descriptionKey: 'productsReportDesc',
      icon: <Package className="w-8 h-8" />,
      href: `/${locale}/reportes/productos`,
      color: 'purple',
    },
    {
      id: 'payments',
      titleKey: 'paymentsReport',
      descriptionKey: 'paymentsReportDesc',
      icon: <CreditCard className="w-8 h-8" />,
      href: `/${locale}/reportes/pagos`,
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { bg: string; icon: string; hover: string }> = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      hover: 'hover:border-blue-300 dark:hover:border-blue-600',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      hover: 'hover:border-green-300 dark:hover:border-green-600',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      icon: 'text-purple-600 dark:text-purple-400',
      hover: 'hover:border-purple-300 dark:hover:border-purple-600',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      icon: 'text-orange-600 dark:text-orange-400',
      hover: 'hover:border-orange-300 dark:hover:border-orange-600',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((report) => {
          const colors = colorClasses[report.color];
          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all duration-200 border-2 border-transparent ${colors.hover} hover:shadow-lg !p-8`}
              onClick={() => router.push(report.href)}
            >
              <div className="flex items-start gap-6">
                <div className={`p-4 rounded-xl ${colors.bg}`}>
                  <div className={colors.icon}>{report.icon}</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {t(report.titleKey)}
                  </h3>
                  <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
                    {t(report.descriptionKey)}
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 dark:text-gray-500 mt-1" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
