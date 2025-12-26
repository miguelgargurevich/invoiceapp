'use client';

import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DetalleProforma {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  igv: number;
  total: number;
  unidadMedida: string;
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
  licencia?: string;
  tituloProfesional?: string;
}

interface Cliente {
  id: string;
  razonSocial: string;
  numeroDocumento: string;
  tipoDocumento: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: Cliente;
  fechaEmision: string;
  fechaValidez?: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  observaciones?: string;
  condiciones?: string;
  
  // Job fields
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
  
  // New contractor fields
  arquitectoNombre?: string;
  fechaPlanos?: string;
  telefonoTrabajo?: string;
  firmaAutorizada?: string;
  diasValidez?: number;
  firmaAceptacion?: string;
  fechaAceptacion?: string;
  
  detalles: DetalleProforma[];
}

interface ContractorProposalPreviewProps {
  proforma: Proforma;
  empresa?: Empresa | null;
  pageNumber?: number;
  totalPages?: number;
}

const ContractorProposalPreview = forwardRef<HTMLDivElement, ContractorProposalPreviewProps>(
  ({ proforma, empresa, pageNumber = 1, totalPages = 1 }, ref) => {
    const isInsured = !!empresa?.licencia;
    
    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-[8.5in] mx-auto text-[10pt]"
        style={{ fontFamily: 'Arial, sans-serif', minHeight: '11in' }}
      >
        {/* HEADER - Row 1-3 */}
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          {/* Row 1: Title */}
          <h1 className="text-2xl font-bold mb-1">PROPOSAL</h1>
          
          {/* Row 2: Licensed/Insured */}
          <div className="text-sm mb-2">
            {isInsured && <span className="font-semibold">Licensed & Insured</span>}
          </div>
          
          {/* Row 3: Company Info */}
          <div className="text-sm space-y-0.5">
            <div className="font-bold text-base">{empresa?.nombre || 'Company Name'}</div>
            {empresa?.tituloProfesional && (
              <div className="font-semibold uppercase">{empresa.tituloProfesional}</div>
            )}
            <div>{empresa?.telefono || 'Phone'}</div>
            <div>{empresa?.direccion || 'Address'}</div>
          </div>
        </div>

        {/* METADATA - Row 4 */}
        <div className="flex justify-end text-xs mb-4">
          <div className="text-right space-x-2">
            <span>Page No. <strong>{pageNumber}</strong></span>
            <span>of <strong>{totalPages}</strong> Pages</span>
            {isInsured && <span className="ml-4"><strong>Insured</strong></span>}
          </div>
        </div>

        {/* CLIENT/JOB INFO - Rows 5-9 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm border border-black p-3">
          {/* Row 5 */}
          <div>
            <span className="font-semibold">Proposal Submitted To:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.razonSocial}
            </div>
          </div>
          <div>
            <span className="font-semibold">Phone:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.telefono || '___________'}
            </div>
          </div>
          
          {/* Row 6 */}
          <div className="col-span-2">
            <span className="font-semibold">Date:</span>
            <span className="ml-2">{formatDate(proforma.fechaEmision)}</span>
          </div>
          
          {/* Row 7 */}
          <div>
            <span className="font-semibold">Street:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.direccion || '___________'}
            </div>
          </div>
          <div>
            <span className="font-semibold">Job Name:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.jobName || '___________'}
            </div>
          </div>
          
          {/* Row 8 */}
          <div>
            <span className="font-semibold">City, State and Zip Code:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {/* Extract city/state/zip if available in address */}
              ___________
            </div>
          </div>
          <div>
            <span className="font-semibold">Job Location:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.jobLocation || '___________'}
            </div>
          </div>
          
          {/* Row 9 */}
          <div>
            <span className="font-semibold">Architect:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.arquitectoNombre || '___________'}
            </div>
          </div>
          <div>
            <span className="font-semibold">Date of Plans:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.fechaPlanos ? formatDate(proforma.fechaPlanos) : '___________'}
            </div>
          </div>
          
          <div className="col-span-2">
            <span className="font-semibold">Job Phone:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.telefonoTrabajo || '___________'}
            </div>
          </div>
        </div>

        {/* WORK DESCRIPTION - Rows 10-18 */}
        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">
            We hereby submit specifications and estimates for:
          </p>
          <div className="min-h-[200px] border border-black p-2">
            <div className="whitespace-pre-wrap text-sm leading-6">
              {proforma.workDescription || (
                <>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border-b border-gray-300 min-h-[24px]" />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* LEGAL CLAUSE */}
        <div className="text-xs italic mb-3 text-justify">
          All material is guaranteed to be as specified. All work to be completed in a 
          workmanlike manner according to standard practices. Any alteration or deviation 
          from above specifications involving extra costs will be executed only upon written 
          orders, and will become an extra charge over and above the estimate. All agreements 
          contingent upon strikes, accidents or delays beyond our control.
        </div>

        {/* TOTAL AMOUNT - Row 19 */}
        <div className="mb-4 border border-black p-3">
          <p className="text-sm">
            The Proposer hereby agrees to furnish material and labor - complete in accordance 
            with the above specifications, for the sum of:
          </p>
          <div className="text-center text-lg font-bold my-2">
            {formatCurrency(proforma.total)} (${proforma.total.toFixed(2)})
          </div>
        </div>

        {/* PAYMENT TERMS - Row 20 */}
        <div className="mb-4">
          <p className="font-semibold text-sm mb-1">Payment to be made as follows:</p>
          <div className="border border-black p-2 min-h-[60px]">
            <div className="whitespace-pre-wrap text-sm">
              {proforma.paymentTerms || '___________'}
            </div>
          </div>
        </div>

        {/* GENERAL CONDITIONS */}
        <div className="text-xs mb-4 space-y-1 text-justify">
          <p><strong>Our workers are fully covered by Workman's Compensation Insurance.</strong></p>
          <p><strong>All work guaranteed for one year from date of completion.</strong></p>
          <p>
            Owner to carry fire, tornado, and other necessary insurance upon above work. 
            Proposer is not responsible for damage from other trades. Proposer shall not be 
            held responsible for accidents happening on the work.
          </p>
        </div>

        {/* SIGNATURES - Rows 21-23 */}
        <div className="border-t-2 border-black pt-3">
          {/* Row 21: Authorized Signature */}
          <div className="mb-4">
            <div className="flex justify-between items-end">
              <div className="flex-1">
                <span className="text-sm">Authorized Signature:</span>
                <div className="border-b border-black mt-6 w-64">
                  {proforma.firmaAutorizada && (
                    <div className="text-center font-signature text-2xl">
                      {proforma.firmaAutorizada}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 22: Validity */}
          <div className="text-xs mb-4">
            <strong>Note:</strong> This proposal may be withdrawn by us if not accepted within{' '}
            <strong className="underline">{proforma.diasValidez || '___'}</strong> days.
          </div>

          {/* Row 23: Acceptance */}
          <div className="border border-black p-3">
            <p className="text-sm font-semibold mb-2">ACCEPTANCE OF PROPOSAL</p>
            <p className="text-xs mb-3">
              The above prices, specifications and conditions are satisfactory and are hereby 
              accepted. You are authorized to do the work as specified. Payment will be made 
              as outlined above.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm">Signature:</span>
                <div className="border-b border-black mt-6">
                  {proforma.firmaAceptacion && (
                    <div className="text-center font-signature text-2xl">
                      {proforma.firmaAceptacion}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm">Date of Acceptance:</span>
                <div className="border-b border-black mt-6">
                  {proforma.fechaAceptacion ? formatDate(proforma.fechaAceptacion) : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ContractorProposalPreview.displayName = 'ContractorProposalPreview';

export default ContractorProposalPreview;
