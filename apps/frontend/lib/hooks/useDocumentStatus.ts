/**
 * Generic hook for calculating document status based on timeline events
 * 
 * This hook centralizes all status calculation logic for:
 * - Proposals (Proformas)
 * - Invoices (Facturas)
 * 
 * Timeline flows:
 * 
 * PROPOSAL:
 *   Created → Sent → Signed → Invoiced → Paid
 * 
 * INVOICE FROM PROPOSAL:
 *   Created → Sent → Signed → Invoiced → Paid
 *   (Shows "Invoiced" because it came from a proposal)
 * 
 * DIRECT INVOICE (no proposal):
 *   Created → Sent → Paid
 *   (No "Signed" - direct invoices don't require client signature)
 *   (No "Invoiced" - it's already an invoice from creation)
 */

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

// ============ Types ============

export type DocumentType = 'proposal' | 'invoice';

export type ProposalStatus = 
  | 'pendiente' 
  | 'emitida' 
  | 'firmada' 
  | 'aceptada' 
  | 'facturada' 
  | 'pagada' 
  | 'rechazada' 
  | 'vencida';

export type InvoiceStatus = 
  | 'pendiente' 
  | 'emitida' 
  | 'firmada' 
  | 'facturada'
  | 'pagada' 
  | 'vencida' 
  | 'anulada';

export type EffectiveStatus = ProposalStatus | InvoiceStatus;

export type BadgeVariant = 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral' 
  | 'indigo' 
  | 'green'
  | 'amber'
  | 'violet';

export interface SignatureRequest {
  id?: string;
  status?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED';
  sentAt?: string | Date | null;
  createdAt?: string | Date | null;
  signerName?: string;
  signature?: {
    signedAt?: string | Date | null;
    signerName?: string;
  } | null;
}

export interface Payment {
  id: string;
  fecha: string;
  monto: number;
  metodoPago?: string;
}

export interface BaseDocument {
  id: string;
  estado: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  signatureRequest?: SignatureRequest | null;
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
}

export interface ProposalDocument extends BaseDocument {
  fechaAceptacion?: string | null;
  facturasGeneradas?: Array<{
    id: string;
    estado?: string;
    pagos?: Payment[];
  }> | null;
}

export interface InvoiceDocument extends BaseDocument {
  proformaOrigenId?: string | null;
  saldoPendiente: number;
  pagos?: Payment[];
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'sent' | 'signed' | 'invoiced' | 'paid';
  date?: string | Date;
  actor?: string;
}

// Flow types for ActivityTimeline
export type TimelineFlow = 'proposal' | 'invoice';

export const TIMELINE_FLOWS = {
  // Proposal flow: full signature process
  proposal: ['created', 'sent', 'signed', 'invoiced', 'paid'] as const,
  // Invoice flow: same steps (direct invoices start at 'invoiced')
  invoice: ['created', 'sent', 'signed', 'invoiced', 'paid'] as const,
};

export interface DocumentStatusResult {
  effectiveStatus: EffectiveStatus;
  badgeVariant: BadgeVariant;
  statusLabel: string;
  timelineEvents: TimelineEvent[];
  isFromProposal: boolean;
  hasSignatureFlow: boolean;
  displayFlow: TimelineEvent['type'][];
}

// ============ Status Calculation Functions ============

/**
 * Calculate effective status for a Proposal
 */
export function getProposalEffectiveStatus(proposal: ProposalDocument): ProposalStatus {
  // Priority order: paid > invoiced > signed > sent > database status
  
  // Check if paid (highest priority) - via generated invoice payments
  const generatedInvoice = proposal.facturasGeneradas?.[0];
  if (generatedInvoice?.pagos && generatedInvoice.pagos.length > 0) {
    return 'pagada';
  }
  
  // Check if invoiced
  if (proposal.estado.toLowerCase() === 'facturada' || 
      (proposal.facturasGeneradas && proposal.facturasGeneradas.length > 0)) {
    return 'facturada';
  }
  
  // Check if signed/accepted
  if (proposal.signatureRequest?.signature?.signedAt || 
      proposal.fechaAceptacion || 
      proposal.signatureStatus === 'SIGNED') {
    return 'firmada';
  }
  
  // Check if sent
  if (proposal.signatureRequest?.sentAt || proposal.signatureRequest?.createdAt) {
    return 'emitida';
  }
  
  // Check if expired (past validity date and still pending)
  if (proposal.fechaVencimiento && 
      new Date(proposal.fechaVencimiento) < new Date() &&
      proposal.estado.toLowerCase() === 'pendiente') {
    return 'vencida';
  }
  
  // Return database status
  return (proposal.estado.toLowerCase() as ProposalStatus) || 'pendiente';
}

/**
 * Calculate effective status for an Invoice
 * 
 * For DIRECT invoices (no proposal):
 *   - Created with status "facturada" (invoiced - all first 4 steps complete)
 *   - Can become: pagada, vencida, anulada
 * 
 * For invoices FROM PROPOSAL:
 *   - Full signature flow: emitida → firmada → facturada → pagada
 */
export function getInvoiceEffectiveStatus(invoice: InvoiceDocument): InvoiceStatus {
  // Check if this invoice came from a proposal
  // Handle empty string, null, and undefined cases
  const isFromProposal = !!(invoice.proformaOrigenId && invoice.proformaOrigenId.trim() !== '');
  
  // Check if this invoice has its own signature flow (not inherited from proposal)
  const hasOwnSignatureFlow = !!(invoice.signatureRequest?.id);
  
  // Priority order: paid > cancelled > overdue > signed > sent > database status
  
  // Check if paid (highest priority)
  if (invoice.saldoPendiente <= 0 && invoice.pagos && invoice.pagos.length > 0) {
    return 'pagada';
  }
  
  // Check if cancelled
  if (invoice.estado.toUpperCase() === 'ANULADA') {
    return 'anulada';
  }
  
  // Check if overdue (past due date + has pending balance)
  if (invoice.fechaVencimiento && 
      new Date(invoice.fechaVencimiento) < new Date() && 
      invoice.saldoPendiente > 0) {
    return 'vencida';
  }
  
  // For invoices with their own signature flow: check signature status
  // Only check signature status if the invoice itself has a signatureRequest
  if (hasOwnSignatureFlow) {
    // Check if signed
    if (invoice.signatureRequest?.signature?.signedAt) {
      return 'firmada';
    }
    
    // Check if sent for signature
    if (invoice.signatureRequest?.sentAt || invoice.signatureRequest?.createdAt) {
      return 'emitida';
    }
  }
  
  // For direct invoices or invoices from proposals without own signature flow:
  // status is "facturada" (invoiced) - waiting for payment
  return 'facturada';
}

// ============ Badge Variant Functions ============

// Colors synchronized with ActivityTimeline:
// - created: blue (info) = pendiente
// - sent: indigo = emitida  
// - signed: violet = firmada/aceptada
// - invoiced: amber = facturada
// - paid: emerald (success) = pagada
// - overdue: red (danger) = vencida/rechazada
const PROPOSAL_BADGE_VARIANTS: Record<ProposalStatus, BadgeVariant> = {
  pagada: 'success',      // emerald - matches timeline 'paid'
  facturada: 'amber',     // amber - matches timeline 'invoiced'
  firmada: 'violet',      // violet - matches timeline 'signed'
  aceptada: 'violet',     // violet - matches timeline 'signed'
  emitida: 'indigo',      // indigo - matches timeline 'sent'
  pendiente: 'info',      // blue - matches timeline 'created'
  rechazada: 'danger',    // red - matches timeline 'overdue'
  vencida: 'danger',      // red - matches timeline 'overdue'
};

const INVOICE_BADGE_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
  pagada: 'success',
  facturada: 'amber',     // amber - matches timeline 'invoiced'
  firmada: 'violet',
  emitida: 'indigo',
  pendiente: 'info',
  vencida: 'danger',
  anulada: 'neutral',
};

export function getProposalBadgeVariant(status: ProposalStatus): BadgeVariant {
  return PROPOSAL_BADGE_VARIANTS[status] || 'neutral';
}

export function getInvoiceBadgeVariant(status: InvoiceStatus): BadgeVariant {
  return INVOICE_BADGE_VARIANTS[status] || 'neutral';
}

// ============ Timeline Generation Functions ============

/**
 * Generate timeline events for a Proposal
 */
export function getProposalTimelineEvents(proposal: ProposalDocument): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  // Created
  if (proposal.fechaEmision) {
    events.push({ id: 'created', type: 'created', date: proposal.fechaEmision });
  }
  
  // Sent
  const sentAt = proposal.signatureRequest?.sentAt || proposal.signatureRequest?.createdAt;
  if (sentAt) {
    events.push({ id: 'sent', type: 'sent', date: sentAt });
  }
  
  // Signed
  const signedAt = proposal.signatureRequest?.signature?.signedAt;
  if (signedAt) {
    events.push({ 
      id: 'signed', 
      type: 'signed', 
      date: signedAt,
      actor: proposal.signatureRequest?.signature?.signerName || proposal.signatureRequest?.signerName
    });
  }
  
  // Invoiced (if converted to invoice)
  const generatedInvoice = proposal.facturasGeneradas?.[0];
  if (generatedInvoice) {
    events.push({ id: 'invoiced', type: 'invoiced', date: proposal.fechaAceptacion || undefined });
  }
  
  // Paid
  const effectiveStatus = getProposalEffectiveStatus(proposal);
  if (effectiveStatus === 'pagada' && generatedInvoice?.pagos?.length) {
    const lastPayment = generatedInvoice.pagos[generatedInvoice.pagos.length - 1];
    events.push({ id: 'paid', type: 'paid', date: lastPayment.fecha });
  }
  
  return events;
}

/**
 * Generate timeline events for an Invoice
 * 
 * Two different flows:
 * 1. Invoice with own signature flow: Events based on actual signature dates
 * 2. Direct Invoice (no signature): Created/Sent/Signed/Invoiced all happen at creation, only Paid is pending
 */
export function getInvoiceTimelineEvents(invoice: InvoiceDocument): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  // Check if this invoice has its own signature flow (not inherited from proposal)
  const hasOwnSignatureFlow = !!(invoice.signatureRequest?.id);
  
  if (hasOwnSignatureFlow) {
    // For invoices with their own signature flow: use actual dates
    
    // Created
    if (invoice.fechaEmision) {
      events.push({ id: 'created', type: 'created', date: invoice.fechaEmision });
    }
    
    // Sent (if signature was requested)
    const sentAt = invoice.signatureRequest?.sentAt || invoice.signatureRequest?.createdAt;
    if (sentAt) {
      events.push({ id: 'sent', type: 'sent', date: sentAt });
    }
    
    // Signed
    const signedAt = invoice.signatureRequest?.signature?.signedAt;
    if (signedAt) {
      events.push({ 
        id: 'signed', 
        type: 'signed', 
        date: signedAt,
        actor: invoice.signatureRequest?.signature?.signerName || invoice.signatureRequest?.signerName
      });
    }
    
    // Invoiced
    events.push({ id: 'invoiced', type: 'invoiced', date: invoice.fechaEmision });
    
  } else {
    // For direct invoices (no own signature flow): mark first 4 steps as complete at creation
    // This represents that direct invoices skip the signature flow
    
    const creationDate = invoice.fechaEmision;
    
    // All first 4 steps completed at invoice creation
    events.push({ id: 'created', type: 'created', date: creationDate });
    events.push({ id: 'sent', type: 'sent', date: creationDate });
    events.push({ id: 'signed', type: 'signed', date: creationDate });
    events.push({ id: 'invoiced', type: 'invoiced', date: creationDate });
  }
  
  // Paid - same logic for both flows
  if (invoice.saldoPendiente <= 0 && invoice.pagos && invoice.pagos.length > 0) {
    const lastPayment = invoice.pagos[invoice.pagos.length - 1];
    events.push({ id: 'paid', type: 'paid', date: lastPayment.fecha });
  }
  
  return events;
}

// ============ Main Hook ============

/**
 * Hook for Proposal status
 */
export function useProposalStatus(proposal: ProposalDocument | null): DocumentStatusResult | null {
  const t = useTranslations('quotes');
  
  return useMemo(() => {
    if (!proposal) return null;
    
    const effectiveStatus = getProposalEffectiveStatus(proposal);
    const badgeVariant = getProposalBadgeVariant(effectiveStatus);
    const timelineEvents = getProposalTimelineEvents(proposal);
    
    // Get translated label using statuses.* keys
    const statusLabels: Record<ProposalStatus, string> = {
      pendiente: t('statuses.pendiente'),
      emitida: t('statuses.emitida'),
      firmada: t('statuses.firmada'),
      aceptada: t('statuses.aceptada'),
      facturada: t('statuses.facturada'),
      pagada: t('statuses.pagada'),
      rechazada: t('statuses.rechazada'),
      vencida: t('statuses.vencida'),
    };
    
    return {
      effectiveStatus,
      badgeVariant,
      statusLabel: statusLabels[effectiveStatus] || effectiveStatus,
      timelineEvents,
      isFromProposal: false, // Proposals are never "from proposal"
      hasSignatureFlow: true, // Proposals always have signature flow
      displayFlow: [...TIMELINE_FLOWS.proposal], // Proposals always use full flow
    };
  }, [proposal, t]);
}

/**
 * Hook for Invoice status
 */
export function useInvoiceStatus(invoice: InvoiceDocument | null): DocumentStatusResult | null {
  const t = useTranslations('invoices');
  
  return useMemo(() => {
    if (!invoice) return null;
    
    const effectiveStatus = getInvoiceEffectiveStatus(invoice);
    const badgeVariant = getInvoiceBadgeVariant(effectiveStatus);
    const timelineEvents = getInvoiceTimelineEvents(invoice);
    
    // Check if this invoice has its own signature flow
    const hasOwnSignatureFlow = !!(invoice.signatureRequest?.id);
    const isFromProposal = !!(invoice.proformaOrigenId && invoice.proformaOrigenId.trim() !== '');
    
    // All invoices use the same timeline flow (5 steps)
    // Direct invoices just have the first 4 steps already completed
    const displayFlow = [...TIMELINE_FLOWS.invoice];
    
    // Get translated label
    const statusLabels: Record<InvoiceStatus, string> = {
      pendiente: t('statusPending'),
      emitida: t('statusSent'),
      firmada: t('statusSigned'),
      facturada: t('statusInvoiced'),
      pagada: t('statusPaid'),
      vencida: t('statusOverdue'),
      anulada: t('statusCancelled'),
    };
    
    return {
      effectiveStatus,
      badgeVariant,
      statusLabel: statusLabels[effectiveStatus] || effectiveStatus,
      timelineEvents,
      isFromProposal,
      hasSignatureFlow: hasOwnSignatureFlow,
      displayFlow,
    };
  }, [invoice, t]);
}

// ============ Utility Functions for Lists (no hook needed) ============

/**
 * Get proposal status info for list views (without hook)
 * Use this in map functions where hooks can't be used
 */
export function getProposalStatusInfo(proposal: ProposalDocument, translations: {
  statusPending: string;
  statusSent: string;
  statusSigned: string;
  statusAccepted: string;
  statusInvoiced: string;
  statusPaid: string;
  statusRejected: string;
  statusExpired: string;
}): { status: ProposalStatus; variant: BadgeVariant; label: string } {
  const status = getProposalEffectiveStatus(proposal);
  const variant = getProposalBadgeVariant(status);
  
  const labels: Record<ProposalStatus, string> = {
    pendiente: translations.statusPending,
    emitida: translations.statusSent,
    firmada: translations.statusSigned,
    aceptada: translations.statusAccepted,
    facturada: translations.statusInvoiced,
    pagada: translations.statusPaid,
    rechazada: translations.statusRejected,
    vencida: translations.statusExpired,
  };
  
  return { status, variant, label: labels[status] || status };
}

/**
 * Get invoice status info for list views (without hook)
 * Use this in map functions where hooks can't be used
 */
export function getInvoiceStatusInfo(invoice: InvoiceDocument, translations: {
  statusPending: string;
  statusSent: string;
  statusSigned: string;
  statusInvoiced: string;
  statusPaid: string;
  statusOverdue: string;
  statusCancelled: string;
}): { status: InvoiceStatus; variant: BadgeVariant; label: string } {
  const status = getInvoiceEffectiveStatus(invoice);
  const variant = getInvoiceBadgeVariant(status);
  
  const labels: Record<InvoiceStatus, string> = {
    pendiente: translations.statusPending,
    emitida: translations.statusSent,
    firmada: translations.statusSigned,
    facturada: translations.statusInvoiced,
    pagada: translations.statusPaid,
    vencida: translations.statusOverdue,
    anulada: translations.statusCancelled,
  };
  
  return { status, variant, label: labels[status] || status };
}

// ============ Export Default ============

export default {
  useProposalStatus,
  useInvoiceStatus,
  getProposalEffectiveStatus,
  getInvoiceEffectiveStatus,
  getProposalStatusInfo,
  getInvoiceStatusInfo,
  getProposalTimelineEvents,
  getInvoiceTimelineEvents,
};
