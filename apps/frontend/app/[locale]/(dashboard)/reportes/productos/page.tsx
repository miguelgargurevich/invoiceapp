'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Package,
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
import { Button, Card, DatePicker, LoadingSpinner, Badge, SkeletonReportPage } from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface ProductoReporte {
  producto: { 
    id: number;
    nombre: string;
    codigo?: string;
  };
  totalVentas: number;
  cantidadVendida: number;
}

export default function ProductsReportPage({
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

  const [productosData, setProductosData] = useState<ProductoReporte[]>([]);
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    totalVentas: 0,
    totalUnidades: 0,
  });

  const loadReportData = useCallback(async () => {
    if (!empresa?.id) return;

    try {
      setLoading(true);
      const fechaInicio = dateRange.from.toISOString().split('T')[0];
      const fechaFin = dateRange.to.toISOString().split('T')[0];

      const response = await api.get<any>(`/reportes/productos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=20`);

      const productos = response.datos || [];
      setProductosData(productos);
      
      const totalVentas = productos.reduce((sum: number, p: ProductoReporte) => sum + p.totalVentas, 0);
      const totalUnidades = productos.reduce((sum: number, p: ProductoReporte) => sum + p.cantidadVendida, 0);
      
      setResumen({
        totalProductos: productos.length,
        totalVentas,
        totalUnidades,
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

  // Show skeleton while initial loading
  if (loading && productosData.length === 0) {
    return <SkeletonReportPage />;
  }

  const chartData = productosData.slice(0, 10).map(p => ({
    name: p.producto.nombre.length > 15 ? p.producto.nombre.substring(0, 15) + '...' : p.producto.nombre,
    ventas: p.totalVentas,
    cantidad: p.cantidadVendida,
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
              {t('productsReport')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('productsReportDesc')}
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
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('productsSold')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{resumen.totalProductos}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalSales')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(resumen.totalVentas)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalUnits')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{resumen.totalUnidades}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('topProducts')}
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value === undefined) return [''];
                  return [
                    name === 'ventas' ? formatCurrency(value) : value,
                    name === 'ventas' ? t('totalSales') : t('quantity')
                  ];
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="ventas" name={t('totalSales')} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('productDetails')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  #
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('productName')}
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('quantity')}
                </th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {t('totalSales')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {productosData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                productosData.map((item, index) => (
                  <tr key={item.producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {item.producto.nombre}
                        </p>
                        {item.producto.codigo && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.producto.codigo}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="neutral">{item.cantidadVendida} {t('unitsSold')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.totalVentas)}
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
