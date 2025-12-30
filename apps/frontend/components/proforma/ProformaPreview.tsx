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
  moneda?: string;
  logoUrl?: string;
  firmaEmpresa?: string; // Company digital signature
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
  workDescription?: string;
  paymentTerms?: string;
  detalles: DetalleProforma[];
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: {
    signature?: {
      signatureImageUrl?: string;
      signerName?: string;
      signedAt?: string;
    };
  };
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
        <div className="grid grid-cols-12 gap-4 items-start mb-4 border-b-2 border-gray-800 pb-3">
          {/* Left Side - Proposal Number & Dates */}
          <div className="col-span-3">
            <div className="bg-gray-800 text-white px-3 py-2 rounded inline-block mb-2">
              <div className="text-[9px] font-bold">PROPOSAL</div>
              <div className="text-[12px] font-bold">
                {proforma.serie}-{proforma.numero.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="text-[9px] text-gray-700 space-y-0.5">
              <p><span className="font-semibold">Date:</span> {formatDate(proforma.fechaEmision)}</p>
              <p><span className="font-semibold">Valid Until:</span> {formatDate(proforma.fechaValidez)}</p>
            </div>
          </div>

          {/* Center - Company Info */}
          <div className="col-span-6 text-center">
            <div className="text-[16px] font-bold text-gray-900 mb-2">
              {empresa?.razonSocial || empresa?.nombre || 'Mi Empresa'}
            </div>
            <div className="text-[9px] text-gray-600 space-y-0.5">
              {empresa?.nombreComercial && (
                <p className="text-gray-700">{empresa.nombreComercial}</p>
              )}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
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
                <span className="text-[8px] text-gray-400">Logo</span>
              </div>
            )}
          </div>
        </div>

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

        {/* Specifications and Estimates */}
        {proforma.workDescription && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-[10px] font-bold text-gray-800 mb-1">We Hereby submit specifications and estimates for:</div>
            <p className="text-[9px] text-gray-700 whitespace-pre-wrap">{proforma.workDescription}</p>
          </div>
        )}

        {/* Separator Line */}
        <div className="border-t border-gray-400 mb-3"></div>

        {/* Proposal Statement */}
        <div className="mb-3 text-center">
          <p className="text-[10px] font-bold text-gray-800">
            We Propose hereby to furnish material and labor - complete in accordance with above specifications, for the sum of:
          </p>
        </div>

        {/* Payment Terms */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
          <div className="text-[10px]">
            <p className="text-gray-800 mb-2">
              <span className="font-bold text-gray-900">Payment to be made as follows:</span>
              {proforma.paymentTerms && <span className="ml-1">{proforma.paymentTerms}</span>}
            </p>
            <p className="text-gray-800 mt-2">
              <span className="font-bold">Total Amount:</span> {formatCurrency(proforma.total)}
            </p>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-3 grid grid-cols-2 gap-6">
          {/* Left Side - Terms */}
          <div className="text-[8px] text-gray-700 space-y-2">
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
            <p className="text-[10px] font-bold text-gray-900 mb-2">Authorized Signature</p>
            {empresa?.firmaEmpresa ? (
              <div className="flex justify-center">
                <img
                  src={empresa.firmaEmpresa}
                  alt="Company Signature"
                  style={{ width: '150px', height: '60px', maxHeight: '64px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className="border-t border-gray-800 mb-2 mt-16"></div>
            )}
            <p className="text-[8px] italic text-gray-600 mt-2">
              This proposal may be withdrawn by us if not accepted within 30 days.
            </p>
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t-2 border-gray-800 mb-3"></div>

        {/* Acceptance Section */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-900 mb-2">Acceptance of Proposal</p>
          <p className="text-[9px] text-gray-700 mb-3">
            The above prices, specifications and conditions are satisfactory and are hereby accepted. 
            You are authorized to do the work as specified. Payment will be made as outlined above.
          </p>
        </div>

        {/* Signature Lines */}
        {proforma.signatureRequest?.signature?.signatureImageUrl ? (
          // Digital signature exists
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-2">Customer Signature:</p>
              <div className="mb-1">
                <img 
                  src={proforma.signatureRequest.signature.signatureImageUrl} 
                  alt="Customer Signature" 
                  className="h-16 w-auto object-contain"
                />
              </div>
              <div className="border-t border-gray-800 mb-1"></div>
              <p className="text-[9px] text-gray-600">
                {proforma.signatureRequest.signature.signerName || proforma.cliente.razonSocial}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-12">Date of Acceptance:</p>
              <div className="border-t border-gray-800 mb-1"></div>
              <p className="text-[9px] text-gray-600">
                {proforma.signatureRequest.signature.signedAt 
                  ? formatDate(proforma.signatureRequest.signature.signedAt)
                  : formatDate(proforma.fechaEmision)
                }
              </p>
            </div>
          </div>
        ) : (
          // No signature yet - show empty signature lines
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-12">Signature:</p>
              <div className="border-t border-gray-800 mb-1"></div>
              <p className="text-[9px] text-gray-600">Customer Signature</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-800 mb-12">Date of Acceptance:</p>
              <div className="border-t border-gray-800 mb-1"></div>
              <p className="text-[9px] text-gray-600">{formatDate(proforma.fechaEmision)}</p>
            </div>
          </div>
        )}

        {/* Attorney Fees Clause - Bottom of Page */}
        <div className="text-center mt-6">
          <p className="text-[8px] italic text-gray-700">
            If an attorney is used to enforce or collect any obligations due on this obligation, 
            then the purchaser agrees to pay reasonable attorney's fees in addition to any sums then due & owing.
          </p>
        </div>
      </div>
    );
  }
);

ProformaPreview.displayName = 'ProformaPreview';

export default ProformaPreview;
