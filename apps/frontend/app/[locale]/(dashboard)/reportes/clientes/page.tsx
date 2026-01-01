'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Users,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button, Card, DatePicker, LoadingSpinner, Badge } from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface ClienteReporte {
  cliente: { 
    id: number;
    razonSocial: string;
    email?: string;
  };
  totalVentas: number;
  cantidadFacturas: number;
  pagado: number;
  pendiente: number;
}

export default function ClientsReportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('reports');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date(),
  });

  const [clientesData, setClientesData] = useState<ClienteReporte[]>([]);
  const [resumen, setResumen] = useState({
    totalClientes: 0,
    totalVentas: 0,
    totalPagado: 0,
    totalPendiente: 0,
  });

  const loadReportData = useCallback(async () => {
    if (!empresa?.id) return;

    try {
      setLoading(true);
      const fechaInicio = dateRange.from.toISOString().split('T')[0];
      const fechaFin = dateRange.to.toISOString().split('T')[0];

      const response = await api.get<any>(`/reportes/clientes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=20`);

      const datos = response.datos || [];
      setClientesData(datos);
      
      // Calculate totals from client data
      const totalVentas = datos.reduce((acc: number, c: any) => acc + (c.totalVentas || 0), 0);
      const totalPagado = datos.reduce((acc: number, c: any) => acc + (c.pagado || 0), 0);
      const totalPendiente = datos.reduce((acc: number, c: any) => acc + (c.pendiente || 0), 0);
      
      setResumen({
        totalClientes: response.totalClientes || datos.length,
        totalVentas,
        totalPagado,
        totalPendiente,
      });

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, dateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const chartData = clientesData.slice(0, 10).map(c => ({
    name: c.cliente.razonSocial.length > 15 ? c.cliente.razonSocial.substring(0, 15) + '...' : c.cliente.razonSocial,
    ventas: c.totalVentas,
    pagado: c.pagado,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${locale}/reportes`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('clientsReport')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('clientsReportDesc')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('exportPDF')}
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('exportExcel')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DatePicker
              label={t('fromDate')}
              value={dateRange.from}
              onChange={(date) => setDateRange({ ...dateRange, from: date || new Date() })}
              locale={locale as 'es' | 'en'}
            />
            <DatePicker
              label={t('toDate')}
              value={dateRange.to}
              onChange={(date) => setDateRange({ ...dateRange, to: date || new Date() })}
              locale={locale as 'es' | 'en'}
            />
          </div>
          <Button onClick={loadReportData} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
            {t('generate')}
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('activeClients')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{resumen.totalClientes}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalSales')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(resumen.totalVentas)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalCollected')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(resumen.totalPagado)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalPending')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(resumen.totalPendiente)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('topClients')}
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value)] : ['']}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="ventas" name={t('totalSales')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Clients Table */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('clientDetails')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('clientName')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('invoiceCount')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('totalSales')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('totalCollected')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('totalPending')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {clientesData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                clientesData.map((item) => (
                  <tr key={item.cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.cliente.razonSocial}
                        </p>
                        {item.cliente.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.cliente.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral">{item.cantidadFacturas}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.totalVentas)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(item.pagado)}
                    </td>
                    <td className="py-3 px-4 text-right text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(item.pendiente)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
