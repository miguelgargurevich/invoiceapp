'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard, Card, Badge, SkeletonMetricCard, Skeleton } from '@/components/common';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/api';

interface DashboardStats {
  totalFacturas: number;
  totalProformas: number;
  totalClientes: number;
  totalProductos: number;
  ventasMes: number;
  ventasMesAnterior: number;
  facturasPendientes: number;
  facturasVencidas: number;
}

interface RecentInvoice {
  id: string;
  numero: string;
  cliente: { nombre: string };
  total: number;
  estado: string;
  fechaEmision: string;
}

interface MonthlyRevenue {
  mes: string;
  ingresos: number;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { empresa } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empresa?.id) {
      loadDashboardData();
    }
  }, [empresa?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would be a single API call
      // For now, we'll simulate the data
      const dashboardData: DashboardStats = {
        totalFacturas: 156,
        totalProformas: 43,
        totalClientes: 89,
        totalProductos: 234,
        ventasMes: 45680.50,
        ventasMesAnterior: 38250.00,
        facturasPendientes: 12,
        facturasVencidas: 3,
      };

      const recentData: RecentInvoice[] = [
        {
          id: '1',
          numero: 'F001-000156',
          cliente: { nombre: 'Empresa ABC S.A.C.' },
          total: 2450.00,
          estado: 'EMITIDA',
          fechaEmision: new Date().toISOString(),
        },
        {
          id: '2',
          numero: 'F001-000155',
          cliente: { nombre: 'Comercial Lima E.I.R.L.' },
          total: 1890.50,
          estado: 'PAGADA',
          fechaEmision: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          numero: 'F001-000154',
          cliente: { nombre: 'Distribuidora Norte S.A.' },
          total: 5670.00,
          estado: 'PENDIENTE',
          fechaEmision: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '4',
          numero: 'F001-000153',
          cliente: { nombre: 'Servicios Generales SAC' },
          total: 890.00,
          estado: 'PAGADA',
          fechaEmision: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: '5',
          numero: 'F001-000152',
          cliente: { nombre: 'Tech Solutions Peru' },
          total: 3200.00,
          estado: 'VENCIDA',
          fechaEmision: new Date(Date.now() - 604800000).toISOString(),
        },
      ];

      const monthlyData: MonthlyRevenue[] = [
        { mes: 'Ene', ingresos: 32000 },
        { mes: 'Feb', ingresos: 28000 },
        { mes: 'Mar', ingresos: 35000 },
        { mes: 'Abr', ingresos: 42000 },
        { mes: 'May', ingresos: 38000 },
        { mes: 'Jun', ingresos: 45680 },
      ];

      setStats(dashboardData);
      setRecentInvoices(recentData);
      setMonthlyRevenue(monthlyData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      PAGADA: 'success',
      EMITIDA: 'info',
      PENDIENTE: 'warning',
      VENCIDA: 'danger',
      ANULADA: 'neutral',
    };
    return variants[status] || 'neutral';
  };

  const percentageChange = stats
    ? ((stats.ventasMes - stats.ventasMesAnterior) / stats.ventasMesAnterior) * 100
    : 0;

  const pieData = [
    { name: 'Pagadas', value: 120, color: '#22c55e' },
    { name: 'Pendientes', value: 25, color: '#f59e0b' },
    { name: 'Vencidas', value: 11, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-64 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('welcome', { name: empresa?.razonSocial || 'Usuario' })}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricCard
            title={t('monthlySales')}
            value={formatCurrency(stats?.ventasMes || 0)}
            change={`${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`}
            changeType={percentageChange >= 0 ? 'positive' : 'negative'}
            icon={<DollarSign className="w-6 h-6" />}
            color="blue"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetricCard
            title={t('totalInvoices')}
            value={stats?.totalFacturas.toString() || '0'}
            icon={<FileText className="w-6 h-6" />}
            color="green"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MetricCard
            title={t('totalClients')}
            value={stats?.totalClientes.toString() || '0'}
            icon={<Users className="w-6 h-6" />}
            color="yellow"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <MetricCard
            title={t('pendingInvoices')}
            value={stats?.facturasPendientes.toString() || '0'}
            subtitle={`${stats?.facturasVencidas || 0} ${t('overdue')}`}
            icon={<Clock className="w-6 h-6" />}
            color="red"
          />
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('revenueOverview')}
              </h2>
              <select className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <option value="6">{t('last6Months')}</option>
                <option value="12">{t('last12Months')}</option>
              </select>
            </div>
            <div className="h-72 w-full min-h-[288px]">
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="mes"
                    className="text-gray-500"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    className="text-gray-500"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `S/${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ingresos']}
                    contentStyle={{
                      backgroundColor: 'var(--tooltip-bg)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Invoice Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {t('invoiceStatus')}
            </h2>
            <div className="h-48 w-full min-h-[192px]">
              <ResponsiveContainer width="100%" height={192}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {pieData.map((item) => (
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
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('recentInvoices')}
            </h2>
            <a
              href="/es/facturas"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              {t('viewAll')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('invoiceNumber')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('client')}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('date')}
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('amount')}
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {invoice.numero}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {invoice.cliente.nombre}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(invoice.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={getStatusBadge(invoice.estado)}>
                        {invoice.estado}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {recentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {invoice.numero}
                  </span>
                  <Badge variant={getStatusBadge(invoice.estado)} size="sm">
                    {invoice.estado}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {invoice.cliente.nombre}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(invoice.fechaEmision).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
