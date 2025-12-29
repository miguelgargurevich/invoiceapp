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
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
  moneda?: string;
  taxRate?: number | string;
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
        className="bg-white text-black p-8 mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', maxWidth: '850px' }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          {/* Left Side - Company Info */}
          <div className="flex-1">
            <div className="text-[13px] font-bold text-gray-900 mb-3">PROPOSAL</div>
            <div className="text-[10px] space-y-1">
              <p className="font-bold text-gray-900">
                {empresa?.razonSocial || empresa?.nombre}
                {empresa?.nombreComercial && (
                  <span className="font-bold text-gray-700"> | {empresa.nombreComercial}</span>
                )}
              </p>
              <p className="text-gray-700">
                {empresa?.telefono && empresa.telefono}
                {empresa?.telefono && empresa?.direccion && ' | '}
                {empresa?.direccion && empresa.direccion}
              </p>
              {empresa?.email && <p className="text-gray-700">{empresa.email}</p>}
            </div>
          </div>

          {/* Right Side - Proposal Info */}
          <div className="text-right">
            <div className="bg-gray-800 text-white px-4 py-2 rounded mb-2">
              <div className="text-[9px] font-bold">PROPOSAL</div>
              <div className="text-[11px] font-bold">
                {proforma.serie}-{proforma.numero.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="text-[9px] text-gray-600">
              <p><span className="font-medium">Date:</span> {formatDate(proforma.fechaEmision)}</p>
              <p><span className="font-medium">Valid Until:</span> {formatDate(proforma.fechaValidez)}</p>
            </div>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t-2 border-gray-800 mb-4"></div>

        {/* Client Information */}
        <div className="mb-4">
          <div className="text-[9px] font-bold text-gray-800 mb-2 uppercase">Client Information</div>
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <p className="font-bold text-gray-900">{proforma.cliente.razonSocial}</p>
              <p className="text-gray-700">
                {proforma.cliente.tipoDocumento !== 'OTHER' && `${proforma.cliente.tipoDocumento}: `}
                {proforma.cliente.numeroDocumento || '-'}
              </p>
            </div>
            {proforma.cliente.direccion && (
              <div>
                <p className="text-gray-700">{proforma.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-3 text-left text-[10px] font-bold border border-gray-300">Description</th>
                <th className="py-2 px-3 text-center text-[10px] font-bold border border-gray-300 w-24">Qty</th>
                <th className="py-2 px-3 text-right text-[10px] font-bold border border-gray-300 w-32">Unit Price</th>
                <th className="py-2 px-3 text-right text-[10px] font-bold border border-gray-300 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {proforma.detalles.map((detalle) => (
                <tr key={detalle.id}>
                  <td className="py-2 px-3 text-[10px] border border-gray-300">
                    {detalle.descripcion}
                  </td>
                  <td className="py-2 px-3 text-center text-[10px] border border-gray-300">{detalle.cantidad}</td>
                  <td className="py-2 px-3 text-right text-[10px] border border-gray-300">
                    {formatCurrency(detalle.precioUnitario)}
                  </td>
                  <td className="py-2 px-3 text-right text-[10px] font-medium border border-gray-300">
                    {formatCurrency(detalle.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-64">
            <div className="flex justify-between py-1 text-[10px]">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-medium">{formatCurrency(proforma.subtotal)}</span>
            </div>
            {proforma.descuento > 0 && (
              <div className="flex justify-between py-1 text-[10px]">
                <span className="text-gray-700">Discount:</span>
                <span className="text-red-600 font-medium">-{formatCurrency(proforma.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 text-[10px]">
              <span className="text-gray-700">
                Tax{empresa?.taxRate && Number(empresa.taxRate) > 0 ? ` (${empresa.taxRate}%)` : ''}:
              </span>
              <span className="font-medium">{formatCurrency(proforma.igv)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 border-gray-800 mt-1">
              <span className="text-[11px] font-bold">TOTAL:</span>
              <span className="text-[11px] font-bold">{formatCurrency(proforma.total)}</span>
            </div>
          </div>
        </div>

        {/* Observations */}
        {proforma.observaciones && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-[10px] font-bold text-gray-800 mb-1">Observations:</div>
            <p className="text-[9px] text-gray-700 whitespace-pre-wrap">{proforma.observaciones}</p>
          </div>
        )}

        {/* Attorney Fees Clause */}
        <div className="mb-4 text-center">
          <p className="text-xs italic text-gray-700">
            If an attorney is used to enforce or collect any obligations due on this obligation, 
            then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.
          </p>
        </div>

        {/* Separator Line */}
        <div className="border-t border-gray-400 mb-4"></div>

        {/* Proposal Statement */}
        <div className="mb-4 text-center">
          <p className="text-[10px] font-medium text-gray-800">
            We Propose hereby to furnish material and labor - complete in accordance with above specifications, for the sum of:
          </p>
        </div>

        {/* Payment Terms */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded">
          <div className="text-[10px]">
            <p className="font-bold text-gray-900 mb-2">Payment to be made as follows:</p>
            <p className="text-gray-800">
              <span className="font-bold">Total Amount:</span> {formatCurrency(proforma.total)}
            </p>
            {proforma.condiciones && (
              <p className="text-gray-700 mt-2 text-[9px] whitespace-pre-wrap">{proforma.condiciones}</p>
            )}
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-4 grid grid-cols-2 gap-6">
          {/* Left Side - Terms */}
          <div className="text-[9px] text-gray-700 space-y-2">
            <p>
              <span className="font-bold">All material is guaranteed</span> to be as specified. All work to be completed 
              in a workmanlike manner according to standard practices. Any alteration or deviation from above 
              specifications involving extra costs will be executed only upon written orders, and will become an 
              extra charge over and above the estimate.
            </p>
            <p>
              All agreements contingent upon strikes, accidents or delays beyond our control. Owner to carry fire, 
              windstorm and other necessary insurance.
            </p>
            <p>
              <span className="font-bold">Our workers are fully covered by Workman's Compensation Insurance.</span>
            </p>
          </div>

          {/* Right Side - Signature */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-gray-900 mb-8">Authorized Signature</p>
            <div className="border-t border-gray-800 mb-2 mt-10"></div>
            <p className="text-[8px] italic text-gray-600 mt-2">
              This proposal may be withdrawn by us if not accepted within 30 days.
            </p>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t-2 border-gray-800 mb-4"></div>

        {/* Acceptance Section */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-900 mb-2">Acceptance of Proposal</p>
          <p className="text-[9px] text-gray-700 mb-4">
            The above prices, specifications and conditions are satisfactory and are hereby accepted. 
            You are authorized to do the work as specified. Payment will be made as outlined above.
          </p>
        </div>

        {/* Signature Lines */}
        <div className="border-t border-gray-400 mb-4"></div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-[9px] font-bold text-gray-800 mb-6">Signature:</p>
            <div className="border-t border-gray-800 mb-1"></div>
            <p className="text-[9px] text-gray-600">Customer Signature</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-800 mb-6">Date of Acceptance:</p>
            <div className="border-t border-gray-800 mb-1"></div>
            <p className="text-[9px] text-gray-600">{formatDate(proforma.fechaEmision)}</p>
          </div>
        </div>
      </div>
    );
  }
);

ProformaPreview.displayName = 'ProformaPreview';

export default ProformaPreview;
