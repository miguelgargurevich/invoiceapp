'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Download,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button, Card, MetricCard, DatePicker } from '@/components/common';
import { formatCurrency } from '@/lib/utils';

export default function ReportesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('reports');
  const { empresa } = useAuth();
  const currency = empresa?.moneda || 'S/';

  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [reportType, setReportType] = useState('ventas');

  // Mock data for reports
  const ventasMensuales = [
    { mes: 'Ene', ventas: 32000, cobrado: 28000 },
    { mes: 'Feb', ventas: 28000, cobrado: 25000 },
    { mes: 'Mar', ventas: 35000, cobrado: 32000 },
    { mes: 'Abr', ventas: 42000, cobrado: 38000 },
    { mes: 'May', ventas: 38000, cobrado: 35000 },
    { mes: 'Jun', ventas: 45680, cobrado: 40000 },
  ];

  const topClientes = [
    { nombre: 'Empresa ABC S.A.C.', total: 15680 },
    { nombre: 'Comercial Lima E.I.R.L.', total: 12450 },
    { nombre: 'Tech Solutions Peru', total: 9800 },
    { nombre: 'Distribuidora Norte S.A.', total: 8500 },
    { nombre: 'Servicios Generales SAC', total: 6200 },
  ];

  const topProductos = [
    { nombre: 'Servicio de Consultoría', total: 25000, cantidad: 120 },
    { nombre: 'Laptop HP ProBook', total: 18000, cantidad: 6 },
    { nombre: 'Mantenimiento Mensual', total: 12000, cantidad: 15 },
    { nombre: 'Capacitación', total: 8500, cantidad: 20 },
    { nombre: 'Licencia Software', total: 5200, cantidad: 40 },
  ];

  const estadoFacturas = [
    { name: t('paid'), value: 120, color: '#22c55e' },
    { name: t('pendingStatus'), value: 25, color: '#f59e0b' },
    { name: t('overdueStatus'), value: 11, color: '#ef4444' },
  ];

  const totales = {
    totalFacturado: 220680,
    totalCobrado: 198000,
    totalPendiente: 22680,
    facturas: 156,
    clientes: 89,
    productos: 234,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
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
          <div className="flex gap-2">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="ventas">{t('salesReport')}</option>
              <option value="clientes">{t('clientsReport')}</option>
              <option value="productos">{t('productsReport')}</option>
              <option value="pagos">{t('paymentsReport')}</option>
            </select>
            <Button>
              <Filter className="w-4 h-4 mr-2" />
              {t('generate')}
            </Button>
          </div>
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
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currency}${((parseFloat(String(v)) || 0)/1000).toFixed(0)}k`} />
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

      {/* Top Clients and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('topClients')}
          </h2>
          <div className="space-y-4">
            {topClientes.map((cliente, index) => (
              <div key={cliente.nombre} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {cliente.nombre}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${(cliente.total / topClientes[0].total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(cliente.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Products */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('topProducts')}
          </h2>
          <div className="space-y-4">
            {topProductos.map((producto, index) => (
              <div key={producto.nombre} className="flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {producto.nombre}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {producto.cantidad} {t('unitsSold')}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(producto.total)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('salesTrend')}
        </h2>
          <div className="h-72 w-full min-h-[288px]">
            <ResponsiveContainer width="100%" height={288}>
            <LineChart data={ventasMensuales}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currency}${((parseFloat(String(v)) || 0)/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value)] : ['']}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                name={t('invoiced')}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
              />
              <Line
                type="monotone"
                dataKey="cobrado"
                name={t('collected')}
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
