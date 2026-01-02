'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  FileText, 
  Send, 
  Eye, 
  PenTool, 
  DollarSign,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  type: 'created' | 'sent' | 'signed' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
  date?: Date | string | null;
  actor?: string;
  details?: string;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  currentStatus?: string;
  compact?: boolean;
  /** 
   * Define which event types to display in the timeline.
   * If not provided, defaults based on the events passed:
   * - If 'invoiced' event exists: full flow (created → sent → signed → invoiced → paid)
   * - Otherwise: direct invoice flow (created → sent → paid)
   */
  displayFlow?: TimelineEvent['type'][];
}

const EVENT_CONFIG = {
  created: {
    icon: FileText,
    color: 'bg-slate-500',
    activeColor: 'bg-blue-500',
    label: 'created',
  },
  sent: {
    icon: Send,
    color: 'bg-slate-500',
    activeColor: 'bg-indigo-500',
    label: 'sent',
  },
  signed: {
    icon: PenTool,
    color: 'bg-slate-500',
    activeColor: 'bg-violet-500',
    label: 'signed',
  },
  invoiced: {
    icon: FileText,
    color: 'bg-slate-500',
    activeColor: 'bg-amber-500',
    label: 'invoiced',
  },
  paid: {
    icon: DollarSign,
    color: 'bg-slate-500',
    activeColor: 'bg-emerald-500',
    label: 'paid',
  },
  overdue: {
    icon: AlertCircle,
    color: 'bg-slate-500',
    activeColor: 'bg-red-500',
    label: 'overdue',
  },
  cancelled: {
    icon: AlertCircle,
    color: 'bg-slate-500',
    activeColor: 'bg-gray-500',
    label: 'cancelled',
  },
};

const PROPOSAL_FLOW: TimelineEvent['type'][] = ['created', 'sent', 'signed', 'invoiced', 'paid'];
const DIRECT_INVOICE_FLOW: TimelineEvent['type'][] = ['created', 'sent', 'paid'];

export function ActivityTimeline({ events, currentStatus, compact = false, displayFlow }: ActivityTimelineProps) {
  const t = useTranslations('timeline');

  // Create a map of completed events
  const completedEvents = new Map(
    events.map(event => [event.type, event])
  );

  // Determine the flow to display
  // If displayFlow is explicitly provided, use it
  // Otherwise, determine based on events: if there's an 'invoiced' or 'signed' event, use full flow
  const determineFlow = (): TimelineEvent['type'][] => {
    if (displayFlow) return displayFlow;
    
    // Check if any event indicates this is from a proposal
    const hasProposalEvents = events.some(e => e.type === 'invoiced' || e.type === 'signed');
    return hasProposalEvents ? PROPOSAL_FLOW : DIRECT_INVOICE_FLOW;
  };

  const activeFlow = determineFlow();

  // Determine which events to show
  const displayEvents = activeFlow.map(type => {
    const completedEvent = completedEvents.get(type);
    return {
      type,
      completed: !!completedEvent,
      date: completedEvent?.date,
      actor: completedEvent?.actor,
      details: completedEvent?.details,
    };
  });

  // Find the current/last completed step
  const lastCompletedIndex = displayEvents.reduce((acc, event, index) => {
    return event.completed ? index : acc;
  }, -1);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {displayEvents.map((event, index) => {
          const config = EVENT_CONFIG[event.type];
          const Icon = config.icon;
          const isCompleted = event.completed;
          const isCurrent = index === lastCompletedIndex;
          
          return (
            <div key={event.type} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center
                  ${isCompleted ? config.activeColor : 'bg-slate-200 dark:bg-slate-700'}
                  transition-colors duration-300
                `}
                title={t(`events.${event.type}.label`)}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Icon className="w-3 h-3 text-slate-400" />
                )}
              </motion.div>
              {index < displayEvents.length - 1 && (
                <div className={`w-4 h-0.5 ${
                  index < lastCompletedIndex 
                    ? 'bg-green-500' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status Banner */}
      {lastCompletedIndex >= 0 && lastCompletedIndex < displayEvents.length - 1 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${EVENT_CONFIG[displayEvents[lastCompletedIndex].type].activeColor} animate-pulse`} />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {t('currentStatus')}: {t(`events.${displayEvents[lastCompletedIndex].type}.label`)}
              </span>
            </div>
            {lastCompletedIndex < displayEvents.length - 1 && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="text-xs">{t('nextStep')}:</span>
                <span className="font-medium">{t(`events.${displayEvents[lastCompletedIndex + 1].type}.label`)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline - Horizontal */}
      <div className="relative">
        {/* Horizontal line */}
        <div className="absolute left-0 right-0 top-[52px] h-0.5 bg-slate-200 dark:bg-slate-700 mx-8" />
        
        <div className="flex justify-between items-start">
          {displayEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.type];
            const Icon = config.icon;
            const isCompleted = event.completed;
            const isCurrent = index === lastCompletedIndex;
            
            return (
              <motion.div
                key={event.type}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center relative z-10"
                style={{ width: `${100 / displayEvents.length}%` }}
              >
                {/* Icon above circle */}
                <div className={`mb-2 ${isCompleted ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Circle */}
                <motion.div
                  animate={{
                    scale: isCurrent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isCurrent ? Infinity : 0,
                    repeatType: 'loop',
                  }}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isCompleted ? config.activeColor : 'bg-slate-200 dark:bg-slate-700'}
                    shadow-sm transition-colors duration-300
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                </motion.div>
                
                {/* Content below circle */}
                <div className="mt-3 text-center">
                  <p className={`text-xs font-medium ${
                    isCompleted 
                      ? 'text-slate-900 dark:text-white' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {t(`events.${event.type}.label`)}
                  </p>
                  
                  {event.date && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper function to create timeline events from invoice/proforma data
export function createTimelineFromDocument(doc: {
  createdAt?: Date | string;
  sentAt?: Date | string | null;
  signedAt?: Date | string | null;
  invoicedAt?: Date | string | null;
  paidAt?: Date | string | null;
  status?: string;
  signerName?: string;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  if (doc.createdAt) {
    events.push({ id: 'created', type: 'created', date: doc.createdAt });
  }
  
  if (doc.sentAt) {
    events.push({ id: 'sent', type: 'sent', date: doc.sentAt });
  }
  
  if (doc.signedAt) {
    events.push({ 
      id: 'signed', 
      type: 'signed', 
      date: doc.signedAt,
      actor: doc.signerName 
    });
  }
  
  if (doc.invoicedAt || doc.status === 'facturada') {
    events.push({ id: 'invoiced', type: 'invoiced', date: doc.invoicedAt });
  }
  
  if (doc.paidAt || doc.status === 'paid' || doc.status === 'pagada') {
    events.push({ id: 'paid', type: 'paid', date: doc.paidAt });
  }
  
  return events;
}

export default ActivityTimeline;
