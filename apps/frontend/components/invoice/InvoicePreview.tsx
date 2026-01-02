'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';
import { formatCurrency as baseFormatCurrency, formatDate } from '@/lib/utils';

interface DetalleFactura {
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
  logoUrl?: string;
  moneda?: string;
  taxRate?: number | string;
  firmaEmpresa?: string;
}

interface Factura {
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
  fechaVencimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  saldoPendiente?: number;
  totalPagado?: number;
  observaciones?: string;
  orderType?: string;
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
  totalMaterials?: number;
  totalLabor?: number;
  detalles: DetalleFactura[];
}

interface InvoicePreviewProps {
  factura: Factura;
  empresa?: Empresa | null;
}

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ factura, empresa }, ref) => {
    const t = useTranslations('invoices.pdf');
    const formatCurrency = (amount: number | string | null | undefined) => 
      baseFormatCurrency(amount, empresa?.moneda || 'USD');
    
    // Debug log to check factura data
    //console.log('InvoicePreview - factura:', { serie: factura.serie, numero: factura.numero });
    
    // Use provided totals or calculate from factura
    const totalMaterials = factura.totalMaterials ?? 0;
    const totalLabor = factura.totalLabor ?? factura.subtotal;
    const tax = factura.igv;
    const totalAmount = factura.total;
    
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', maxWidth: '850px' }}
      >
        {/* Header Section */}
        <div className="grid grid-cols-12 gap-4 items-start mb-4 border-b-2 border-gray-800 pb-3">
          {/* Left Side - Receipt Number & Dates */}
          <div className="col-span-3">
            <div style={{ border: '2px solid #1f2937', padding: '8px 12px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#000000', margin: 0 }}>INVOICE</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
                {factura.serie}-{String(factura.numero).padStart(6, '0')}
              </p>
            </div>
            <div className="text-[9px] text-gray-700 space-y-0.5">
              <p><span className="font-semibold">Date:</span> {formatDate(factura.fechaEmision)}</p>
              {/* <p><span className="font-semibold">Due Date:</span> {formatDate(factura.fechaVencimiento)}</p> */}
            </div>
          </div>

          {/* Center - Company Info */}
          <div className="col-span-6 text-center">
            <div className="text-[18px] font-bold text-gray-900">
              {empresa?.nombre || 'Mi Empresa'}
            </div>
            <div className="text-[11px] text-gray-600 space-y-0.5">
              {empresa?.ruc && <p>RUC: {empresa.ruc}</p>}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.email && <p>{empresa.email}</p>}
            </div>
          </div>

          {/* Right Side - Company Logo */}
          <div className="col-span-3 flex justify-end">
            {empresa?.logoUrl ? (
              <img
                src={empresa.logoUrl}
                alt={empresa?.nombre}
                className="h-20 w-auto object-contain"
              />
            ) : (
              <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-4">
          <div className="text-[9px] font-bold text-gray-800 mb-2 uppercase">Client Information</div>
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <p className="font-bold text-gray-900">{factura.cliente.razonSocial}</p>
              <p className="text-gray-700">
                {factura.cliente.tipoDocumento !== 'OTHER' && `${factura.cliente.tipoDocumento}: `}
                {factura.cliente.numeroDocumento || '-'}
              </p>
            </div>
            {factura.cliente.direccion && (
              <div>
                <p className="text-gray-700">{factura.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Work Description */}
        {factura.workDescription && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-[10px] font-bold text-gray-800 mb-1">Work Description:</div>
            <p className="text-[9px] text-gray-700 whitespace-pre-wrap">{factura.workDescription}</p>
          </div>
        )}

        {/* Order Type */}
        {factura.orderType && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-[10px] font-bold text-gray-800 mb-1">Order Type:</div>
            <p className="text-[9px] text-gray-700">
              {factura.orderType === 'day_work' ? 'Day Work' : factura.orderType === 'contract' ? 'Contract' : 'Extra'}
            </p>
          </div>
        )}

        {/* Separator Line */}
        <div className="border-t border-gray-400 mb-4"></div>

        {/* Payment Summary */}
        <div className="mb-6 flex justify-end">
          <div className="w-64">
            <div className="text-[10px] font-bold text-gray-800 mb-2 uppercase text-right">Payment Summary</div>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] text-gray-700">Total Materials</span>
                <span className="text-[10px] font-medium text-right">{formatCurrency(totalMaterials)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[10px] text-gray-700">Total Labor</span>
                <span className="text-[10px] font-medium text-right">{formatCurrency(totalLabor)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-gray-300 pt-1">
                <span className="text-[10px] text-gray-700">
                  Tax {empresa?.taxRate && Number(empresa.taxRate) > 0 ? `(${empresa.taxRate}%)` : ''}
                </span>
                <span className="text-[10px] font-medium text-right">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-gray-100 px-2 rounded mt-1">
                <span className="text-[11px] font-bold text-gray-900">TOTAL AMOUNT</span>
                <span className="text-[11px] font-bold text-gray-900 text-right">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8">
            {/* Company Signature */}
            <div>
              <div className="text-[9px] font-bold text-gray-800 mb-2">Company Signature</div>
              {empresa?.firmaEmpresa ? (
                <div className="h-16 flex items-center justify-center mb-2">
                  <img 
                    src={empresa.firmaEmpresa} 
                    alt="Company Signature" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 mb-2"></div>
              )}
              <div className="border-t-2 border-gray-400 pt-1">
                <p className="text-[8px] text-gray-600 text-center">
                  {empresa?.nombre || 'Company Name'}
                </p>
                <p className="text-[8px] text-gray-500 text-center">
                  Date: {formatDate(factura.fechaEmision)}
                </p>
              </div>
            </div>

            {/* Empty space or client signature if needed */}
            <div></div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-300 text-center text-[8px] text-gray-500">
          <p>{t('thankYou')}</p>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

export default InvoicePreview;
