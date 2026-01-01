'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  TrendingUp,
  BarChart3,
  FileText,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button, Card, MetricCard, DatePicker, LoadingSpinner } from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface VentasPorMes {
  mes: string;
  ventas: number;
  cobrado: number;
}

interface Totales {
  totalFacturado: number;
  totalCobrado: number;
  totalPendiente: number;
  facturas: number;
}

interface EstadoFactura {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export default function SalesReportPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('reports');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date(),
  });

  const [ventasMensuales, setVentasMensuales] = useState<VentasPorMes[]>([]);
  const [estadoFacturas, setEstadoFacturas] = useState<EstadoFactura[]>([]);
  const [totales, setTotales] = useState<Totales>({
    totalFacturado: 0,
    totalCobrado: 0,
    totalPendiente: 0,
    facturas: 0,
  });

  const loadReportData = useCallback(async () => {
    if (!empresa?.id) return;

    try {
      setLoading(true);
      const fechaInicio = dateRange.from.toISOString().split('T')[0];
      const fechaFin = dateRange.to.toISOString().split('T')[0];

      const [ventasData, graficosData] = await Promise.all([
        api.get<any>(`/reportes/ventas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&agrupacion=mes`),
        api.get<any>('/dashboard/graficos'),
      ]);

      const monthNames: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
      };
      
      const ventasTransformed: VentasPorMes[] = (ventasData.datos || []).map((item: any) => ({
        mes: monthNames[item.periodo.split('-')[1]] || item.periodo,
        ventas: item.total || 0,
        cobrado: item.pagado || 0,
      }));

      setTotales({
        totalFacturado: ventasData.resumen?.totalVentas || 0,
        totalCobrado: ventasData.resumen?.totalPagado || 0,
        totalPendiente: ventasData.resumen?.totalPendiente || 0,
        facturas: ventasData.resumen?.cantidadFacturas || 0,
      });

      setVentasMensuales(ventasTransformed);

      const estados = graficosData.estadosFacturas || { pagada: 0, pendiente: 0, vencida: 0 };
      setEstadoFacturas([
        { name: t('paid'), value: estados.pagada, color: '#22c55e' },
        { name: t('pendingStatus'), value: estados.pendiente, color: '#f59e0b' },
        { name: t('overdueStatus'), value: estados.vencida, color: '#ef4444' },
      ]);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, dateRange, t]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

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
              {t('salesReport')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('salesReportDesc')}
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
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Button onClick={loadReportData} disabled={loading} className="w-full sm:w-auto">
            {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
            {t('generate')}
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('totalInvoiced')}
          value={formatCurrency(totales.totalFacturado)}
          icon={<BarChart3 className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title={t('totalCollected')}
          value={formatCurrency(totales.totalCobrado)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title={t('totalPending')}
          value={formatCurrency(totales.totalPendiente)}
          icon={<FileText className="w-6 h-6" />}
          color="yellow"
        />
        <MetricCard
          title={t('totalInvoices')}
          value={totales.facturas.toString()}
          icon={<FileText className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('monthlySales')}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={ventasMensuales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${((parseFloat(String(v)) || 0)/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value)] : ['']}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="ventas" name={t('invoiced')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cobrado" name={t('collected')} fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Invoice Status Pie */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('invoiceStatus')}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={estadoFacturas}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {estadoFacturas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {estadoFacturas.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
