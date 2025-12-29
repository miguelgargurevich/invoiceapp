'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
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
  logo?: string;
  moneda?: string;
  taxRate?: number | string;
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
  signatureRequest?: {
    signature?: {
      signatureImageUrl: string;
      signerName: string;
      signedAt: string;
    };
  };
  estado: string;
  saldoPendiente?: number;
  totalPagado?: number;
  observaciones?: string;
  orderType?: string;
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
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
    
    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', minHeight: '297mm' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3 border-b border-gray-800 pb-2">
          <div className="flex-1">
            {empresa?.logo ? (
              <img
                src={empresa.logo}
                alt={empresa.nombre}
                className="h-12 w-auto mb-1.5"
              />
            ) : (
              <div className="text-[11px] font-bold text-gray-800 mb-1.5">
                {empresa?.nombre || 'Mi Empresa'}
              </div>
            )}
            <div className="text-[9px] text-gray-600 space-y-0.5">
              {empresa?.ruc && <p>RUC: {empresa.ruc}</p>}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.email && <p>{empresa.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-800 text-white px-3 py-1.5 rounded mb-1.5">
              <div className="text-[9px] font-bold">{t('invoice')}</div>
              <div className="text-[10px] font-bold">
                {factura.serie}-{factura.numero.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="text-[9px] text-gray-600">
              <p>
                <span className="font-medium">{t('issueDate')}</span>{' '}
                {formatDate(factura.fechaEmision)}
              </p>
              <p>
                <span className="font-medium">{t('dueDate')}</span>{' '}
                {formatDate(factura.fechaVencimiento)}
              </p>
              {factura.orderType && (
                <div className="mt-1 flex items-center gap-1 text-[8px]">
                  <input 
                    type="checkbox" 
                    checked={factura.orderType === 'day_work'} 
                    readOnly 
                    className="w-2.5 h-2.5"
                  />
                  <span>Day Work</span>
                  <input 
                    type="checkbox" 
                    checked={factura.orderType === 'contract'} 
                    readOnly 
                    className="w-2.5 h-2.5 ml-2"
                  />
                  <span>Contract</span>
                  <input 
                    type="checkbox" 
                    checked={factura.orderType === 'extra'} 
                    readOnly 
                    className="w-2.5 h-2.5 ml-2"
                  />
                  <span>Extra</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-3 bg-gray-50 p-1.5 rounded" style={{ pageBreakInside: 'avoid' }}>
          <div className="text-[10px] font-medium text-gray-800 mb-0.5 uppercase">
            {t('clientData')}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[9px]">
            <div>
              <span className="text-gray-500">{t('companyName')}</span>
              <p className="font-medium">{factura.cliente.razonSocial}</p>
            </div>
            <div>
              <span className="text-gray-500">
                {factura.cliente.numeroDocumento && factura.cliente.tipoDocumento !== 'OTHER'
                  ? `${factura.cliente.tipoDocumento}:`
                  : t('document')}
              </span>
              <p className="font-medium">
                {factura.cliente.numeroDocumento || '-'}
              </p>
            </div>
            {factura.cliente.direccion && (
              <div className="col-span-2">
                <span className="text-gray-500">{t('address')}</span>
                <p className="font-medium">{factura.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Work Description */}
        {factura.workDescription && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-[10px] font-bold text-gray-800 mb-1">We Hereby submit specifications and estimates for:</div>
            <p className="text-[9px] text-gray-700 whitespace-pre-wrap">{factura.workDescription}</p>
          </div>
        )}

        {/* Separator Line */}
        {factura.workDescription && (
          <>
            <div className="border-t border-gray-400 mb-3"></div>
            <div className="mb-3 text-center">
              <p className="text-[10px] font-bold text-gray-800">
                We Propose hereby to furnish material and labor - complete in accordance with above specifications, for the sum of:
              </p>
            </div>
          </>
        )}

        {/* Payment Terms */}
        {factura.paymentTerms && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
            <div className="text-[10px]">
              <p className="text-gray-800 mb-2">
                <span className="font-bold text-gray-900">Payment to be made as follows:</span>
                <span className="ml-1">{factura.paymentTerms}</span>
              </p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-3" style={{ pageBreakInside: 'avoid' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-1 px-2 text-left text-[10px] font-medium">
                  {t('description')}
                </th>
                <th className="py-1 px-2 text-center text-[10px] font-medium w-14">
                  {t('quantity')}
                </th>
                <th className="py-1 px-2 text-right text-[10px] font-medium w-20">
                  {t('unitPrice')}
                </th>
                <th className="py-1 px-2 text-right text-[10px] font-medium w-20">
                  {t('lineSubtotal')}
                </th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles.map((detalle, index) => (
                <tr
                  key={detalle.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="py-1 px-2 text-[10px] border-b border-gray-200">
                    {detalle.producto && (
                      <span className="text-[8px] text-gray-500 block">
                        {detalle.producto.codigo}
                      </span>
                    )}
                    {detalle.descripcion}
                  </td>
                  <td className="py-1 px-2 text-center text-[10px] border-b border-gray-200">
                    {detalle.cantidad}
                  </td>
                  <td className="py-1 px-2 text-right text-[10px] border-b border-gray-200">
                    {formatCurrency(detalle.precioUnitario)}
                  </td>
                  <td className="py-1 px-2 text-right text-[10px] font-medium border-b border-gray-200">
                    {formatCurrency(detalle.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-3" style={{ pageBreakInside: 'avoid' }}>
          <div className="w-56">
            <div className="flex justify-between py-1 text-[10px]">
              <span className="text-gray-600">{t('subtotal')}</span>
              <span>{formatCurrency(factura.subtotal)}</span>
            </div>
            {factura.descuento > 0 && (
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-gray-600">{t('discount')}</span>
                <span className="text-red-600">
                  -{formatCurrency(factura.descuento)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1 text-[10px]">
              <span className="text-gray-600">
                {t('tax')}
                {empresa?.taxRate && Number(empresa.taxRate) > 0 ? ` (${empresa.taxRate}%)` : ''}
              </span>
              <span>{formatCurrency(factura.igv)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-gray-800 mt-1">
              <span className="text-xs font-bold">{t('total')}</span>
              <span className="text-xs font-bold text-gray-800">
                {formatCurrency(factura.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Observations */}
        {factura.observaciones && (
          <div className="mb-2 p-1.5 bg-gray-50 rounded" style={{ pageBreakInside: 'avoid' }}>
            <div className="text-[10px] font-medium text-gray-800 mb-0.5">
              {t('observations')}
            </div>
            <p className="text-[10px] text-gray-600">{factura.observaciones}</p>
          </div>
        )}

        {/* Signature */}
        {factura.signatureRequest?.signature && (
          <div className="mb-2 p-1.5 bg-gray-50 rounded border border-green-200" style={{ pageBreakInside: 'avoid' }}>
            <h3 className="text-[8px] font-medium text-gray-800 mb-1">
              {t('signature')}
            </h3>
            <div className="flex items-end gap-3">
              <div className="flex-shrink-0">
                <img 
                  src={factura.signatureRequest.signature.signatureImageUrl} 
                  alt="Signature" 
                  className="h-12 w-auto border border-gray-300 rounded bg-white"
                />
              </div>
              <div className="text-[10px] text-gray-600">
                <p className="font-medium text-gray-800">
                  {factura.signatureRequest.signature.signerName}
                </p>
                <p className="text-[8px] text-gray-500 mt-0.5">
                  {t('signedOn')}: {formatDate(factura.signatureRequest.signature.signedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-2 text-center text-[8px] text-gray-500">
          <p>{t('thankYou')}</p>
          <p className="mt-1">
            {t('electronicDocument')}
          </p>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

export default InvoicePreview;
