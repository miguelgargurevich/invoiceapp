// Centralized exports for all custom hooks

export { useCurrency } from './useCurrency';

export {
  // Hooks
  useProposalStatus,
  useInvoiceStatus,
  
  // Pure functions for lists
  getProposalEffectiveStatus,
  getInvoiceEffectiveStatus,
  getProposalStatusInfo,
  getInvoiceStatusInfo,
  getProposalTimelineEvents,
  getInvoiceTimelineEvents,
  getProposalBadgeVariant,
  getInvoiceBadgeVariant,
  
  // Types
  type DocumentType,
  type ProposalStatus,
  type InvoiceStatus,
  type EffectiveStatus,
  type BadgeVariant,
  type SignatureRequest,
  type Payment,
  type BaseDocument,
  type ProposalDocument,
  type InvoiceDocument,
  type TimelineEvent,
  type DocumentStatusResult,
} from './useDocumentStatus';
