'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  CreditCard,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
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
import { Button, Card, DatePicker, LoadingSpinner, Badge, SkeletonReportPage } from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface PagoReporte {
  id: number;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  factura: {
    numero: string;
    cliente: {
      razonSocial: string;
    };
  };
}

interface MetodoPago {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export default function PaymentsReportPage({
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

  const [pagosData, setPagosData] = useState<PagoReporte[]>([]);
  const [pagosPorMes, setPagosPorMes] = useState<{ mes: string; monto: number }[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [resumen, setResumen] = useState({
    totalPagos: 0,
    montoPagado: 0,
    cantidadPagos: 0,
  });

  const loadReportData = useCallback(async () => {
    if (!empresa?.id) return;

    try {
      setLoading(true);
      const fechaInicio = dateRange.from.toISOString().split('T')[0];
      const fechaFin = dateRange.to.toISOString().split('T')[0];

      // Get sales data that includes payment info
      const [ventasData, facturasData] = await Promise.all([
        api.get<any>(`/reportes/ventas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&agrupacion=mes`),
        api.get<any>(`/facturas?limit=1000`), // Get all invoices with payments
      ]);

      //console.log('Facturas data received:', facturasData);

      // Build payments from invoices
      const pagos: PagoReporte[] = [];
      const metodosCount: Record<string, number> = {};
      
      const facturas = facturasData.data || [];
      if (Array.isArray(facturas)) {
        facturas.forEach((factura: any) => {
          if (factura.pagos && factura.pagos.length > 0) {
            factura.pagos.forEach((pago: any) => {
              const fechaPago = new Date(pago.fecha);
              if (fechaPago >= dateRange.from && fechaPago <= dateRange.to) {
                const montoNumerico = parseFloat(pago.monto) || 0;
                pagos.push({
                  id: pago.id,
                  fechaPago: pago.fecha,
                  monto: montoNumerico,
                  metodoPago: pago.metodoPago || 'EFECTIVO',
                  referencia: pago.referencia,
                  factura: {
                    numero: factura.numero,
                    cliente: {
                      razonSocial: factura.cliente?.razonSocial || factura.cliente?.nombre || 'Unknown',
                    },
                  },
                });
                
                const metodo = pago.metodoPago || 'EFECTIVO';
                metodosCount[metodo] = (metodosCount[metodo] || 0) + montoNumerico;
              }
            });
          }
        });
      }

      // Sort by date descending
      pagos.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
      setPagosData(pagos.slice(0, 20));

      // Calculate totals
      const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
      setResumen({
        totalPagos: pagos.length,
        montoPagado: totalPagado,
        cantidadPagos: pagos.length,
      });

      // Monthly payments from sales data
      const monthNames: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
      };
      
      const pagosMensuales = (ventasData.datos || []).map((item: any) => ({
        mes: monthNames[item.periodo.split('-')[1]] || item.periodo,
        monto: parseFloat(item.pagado) || 0,
      }));
      setPagosPorMes(pagosMensuales);

      // Payment methods pie chart
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      const metodosArray = Object.entries(metodosCount).map(([name, value], index) => ({
        name: t(`paymentMethod.${name}`) || name,
        value,
        color: colors[index % colors.length],
      }));
      setMetodosPago(metodosArray);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, dateRange, t]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      EFECTIVO: 'Cash',
      TRANSFERENCIA: 'Transfer',
      TARJETA: 'Card',
      CHEQUE: 'Check',
      OTRO: 'Other',
    };
    return labels[method] || method;
  };

  // Show skeleton while initial loading
  if (loading && pagosData.length === 0) {
    return <SkeletonReportPage />;
  }

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
              {t('paymentsReport')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('paymentsReportDesc')}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalCollected')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(resumen.montoPagado)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('paymentsCount')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{resumen.cantidadPagos}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('averagePayment')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(resumen.cantidadPagos > 0 ? resumen.montoPagado / resumen.cantidadPagos : 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Payments Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('monthlyPayments')}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={pagosPorMes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value), t('collected')] : ['']}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="monto" name={t('collected')} fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Payment Methods Pie */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('paymentMethods')}
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height={288}>
              <PieChart>
                <Pie
                  data={metodosPago}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metodosPago.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value)] : ['']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {metodosPago.map((item) => (
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
                <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('recentPayments')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('date')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('invoice')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('client')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('method')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('amount')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pagosData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                pagosData.map((pago) => (
                  <tr key={pago.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(pago.fechaPago).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {pago.factura.numero}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {pago.factura.cliente.razonSocial}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral">{getMethodLabel(pago.metodoPago)}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(pago.monto)}
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
