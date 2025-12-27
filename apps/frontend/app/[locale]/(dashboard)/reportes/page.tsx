'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Button, Card, MetricCard, DatePicker, LoadingSpinner } from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface VentasPorMes {
  mes: string;
  ventas: number;
  cobrado: number;
}

interface TopCliente {
  cliente: { razonSocial: string };
  totalVentas: number;
}

interface TopProducto {
  producto: { nombre: string };
  totalVentas: number;
  cantidadVendida: number;
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

export default function ReportesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('reports');
  const { empresa } = useAuth();
  const { formatCurrency, currencySymbol } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date(),
  });
  const [reportType, setReportType] = useState('ventas');

  // State for real data from API
  const [ventasMensuales, setVentasMensuales] = useState<VentasPorMes[]>([]);
  const [topClientes, setTopClientes] = useState<TopCliente[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
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

      // Fetch all report data in parallel
      const [ventasData, clientesData, productosData, graficosData] = await Promise.all([
        api.get<any>(`/reportes/ventas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&agrupacion=mes`),
        api.get<any>(`/reportes/clientes?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=5`),
        api.get<any>(`/reportes/productos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=5`),
        api.get<any>('/dashboard/graficos'),
      ]);

      // Transform monthly sales data
      const monthNames: Record<string, string> = {
        '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
      };
      
      const ventasTransformed: VentasPorMes[] = (ventasData.datos || []).map((item: any) => ({
        mes: monthNames[item.periodo.split('-')[1]] || item.periodo,
        ventas: item.total || 0,
        cobrado: item.pagado || 0,
      }));

      // Set totals from sales data
      setTotales({
        totalFacturado: ventasData.resumen?.totalVentas || 0,
        totalCobrado: ventasData.resumen?.totalPagado || 0,
        totalPendiente: ventasData.resumen?.totalPendiente || 0,
        facturas: ventasData.resumen?.cantidadFacturas || 0,
      });

      // Set monthly sales
      setVentasMensuales(ventasTransformed);

      // Set top clients
      setTopClientes((clientesData.datos || []).map((c: any) => ({
        cliente: c.cliente,
        totalVentas: c.totalVentas,
      })));

      // Set top products
      setTopProductos((productosData.datos || []).map((p: any) => ({
        producto: p.producto,
        totalVentas: p.totalVentas,
        cantidadVendida: p.cantidadVendida,
      })));

      // Set invoice status from graficos endpoint
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

  const handleGenerateReport = () => {
    loadReportData();
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
            <Button onClick={handleGenerateReport} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" className="mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
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

      {/* Top Clients and Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('topClients')}
          </h2>
          <div className="space-y-4">
            {topClientes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('noData')}</p>
            ) : (
              topClientes.map((cliente, index) => (
                <div key={cliente.cliente.razonSocial} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {cliente.cliente.razonSocial}
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${topClientes[0]?.totalVentas ? (cliente.totalVentas / topClientes[0].totalVentas) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(cliente.totalVentas)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top Products */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('topProducts')}
          </h2>
          <div className="space-y-4">
            {topProductos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('noData')}</p>
            ) : (
              topProductos.map((producto, index) => (
                <div key={producto.producto.nombre} className="flex items-center gap-4">
                  <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 text-sm font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {producto.producto.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {producto.cantidadVendida} {t('unitsSold')}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(producto.totalVentas)}
                  </span>
                </div>
              ))
            )}
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
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${((parseFloat(String(v)) || 0)/1000).toFixed(0)}k`} />
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
