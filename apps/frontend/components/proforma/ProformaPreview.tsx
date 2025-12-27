'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency as baseFormatCurrency, formatDate } from '@/lib/utils';

interface DetalleProforma {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  igv: number;
  total: number;
  producto?: {
    codigo: string;
    nombre: string;
  };
}

interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
  moneda?: string;
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: {
    id: string;
    razonSocial: string;
    numeroDocumento: string;
    tipoDocumento: string;
    direccion?: string;
    email?: string;
  };
  fechaEmision: string;
  fechaValidez: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  observaciones?: string;
  condiciones?: string;
  detalles: DetalleProforma[];
}

interface ProformaPreviewProps {
  proforma: Proforma;
  empresa?: Empresa | null;
}

const ProformaPreview = forwardRef<HTMLDivElement, ProformaPreviewProps>(
  ({ proforma, empresa }, ref) => {
    const t = useTranslations('quotes.pdf');
    const formatCurrency = (amount: number | string | null | undefined) => 
      baseFormatCurrency(amount, empresa?.moneda || 'USD');
    
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
          <div className="flex-1">
            {empresa?.logo ? (
              <img
                src={empresa.logo}
                alt={empresa.nombre}
                className="h-16 w-auto mb-2"
              />
            ) : (
              <div className="text-lg font-bold text-gray-800 mb-2">
                {empresa?.nombre || 'Mi Empresa'}
              </div>
            )}
            <div className="text-xs text-gray-600 space-y-0.5">
              {empresa?.ruc && <p>RUC: {empresa.ruc}</p>}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.email && <p>{empresa.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-lg mb-2">
              <div className="text-sm font-bold">{t('proforma')}</div>
              <div className="text-base font-bold">
                {proforma.serie}-{proforma.numero.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="text-xs text-gray-600">
              <p>
                <span className="font-medium">{t('issueDate')}</span>{' '}
                {formatDate(proforma.fechaEmision)}
              </p>
              <p>
                <span className="font-medium">{t('validUntil')}</span>{' '}
                {formatDate(proforma.fechaValidez)}
              </p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-6 bg-gray-50 p-3 rounded-lg">
          <h3 className="text-xs font-bold text-gray-800 mb-2 uppercase">
            {t('clientData')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">{t('companyName')}</span>
              <p className="font-medium">{proforma.cliente.razonSocial}</p>
            </div>
            <div>
              <span className="text-gray-500">
                {proforma.cliente.tipoDocumento}:
              </span>
              <p className="font-medium">{proforma.cliente.numeroDocumento}</p>
            </div>
            {proforma.cliente.direccion && (
              <div className="col-span-2">
                <span className="text-gray-500">{t('document')}</span>
                <p className="font-medium">{proforma.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-3 text-left text-xs font-medium">
                  {t('description')}
                </th>
                <th className="py-2 px-3 text-center text-xs font-medium w-16">
                  {t('quantity')}
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium w-24">
                  {t('unitPrice')}
                </th>
                <th className="py-2 px-3 text-right text-xs font-medium w-24">
                  {t('lineSubtotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {proforma.detalles.map((detalle, index) => (
                <tr
                  key={detalle.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="py-2 px-3 text-xs border-b border-gray-200">
                    {detalle.producto && (
                      <span className="text-[10px] text-gray-500 block">
                        {detalle.producto.codigo}
                      </span>
                    )}
                    {detalle.descripcion}
                  </td>
                  <td className="py-2 px-3 text-center text-xs border-b border-gray-200">
                    {detalle.cantidad}
                  </td>
                  <td className="py-2 px-3 text-right text-xs border-b border-gray-200">
                    {formatCurrency(detalle.precioUnitario)}
                  </td>
                  <td className="py-2 px-3 text-right text-xs font-medium border-b border-gray-200">
                    {formatCurrency(detalle.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64">
            <div className="flex justify-between py-1.5 text-xs">
              <span className="text-gray-600">{t('subtotal')}</span>
              <span>{formatCurrency(proforma.subtotal)}</span>
            </div>
            {proforma.descuento > 0 && (
              <div className="flex justify-between py-1.5 text-xs">
                <span className="text-gray-600">{t('discount')}</span>
                <span className="text-red-600">
                  -{formatCurrency(proforma.descuento)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5 text-xs">
              <span className="text-gray-600">{t('tax')}</span>
              <span>{formatCurrency(proforma.igv)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-1.5">
              <span className="text-sm font-bold">{t('total')}</span>
              <span className="text-sm font-bold text-gray-800">
                {formatCurrency(proforma.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {proforma.condiciones && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-xs font-bold text-yellow-800 mb-1.5">
              {t('conditions')}
            </h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{proforma.condiciones}</p>
          </div>
        )}

        {/* Observations */}
        {proforma.observaciones && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-bold text-gray-800 mb-1.5">
              {t('observations')}
            </h3>
            <p className="text-xs text-gray-600">{proforma.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
          <p className="font-medium text-gray-800 mb-1">
            {t('validUntilDate')} {formatDate(proforma.fechaValidez)}
          </p>
          <p>{t('thankYou')}</p>
          <p className="mt-1">
            {t('quotationNote')}
          </p>
        </div>
      </div>
    );
  }
);

ProformaPreview.displayName = 'ProformaPreview';

export default ProformaPreview;
