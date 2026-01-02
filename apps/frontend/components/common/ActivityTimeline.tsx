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
    activeColor: 'bg-green-500',
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

const DEFAULT_EVENTS: TimelineEvent['type'][] = ['created', 'sent', 'signed', 'invoiced', 'paid'];

export function ActivityTimeline({ events, currentStatus, compact = false }: ActivityTimelineProps) {
  const t = useTranslations('timeline');

  // Create a map of completed events
  const completedEvents = new Map(
    events.map(event => [event.type, event])
  );

  // Determine which events to show
  const displayEvents = DEFAULT_EVENTS.map(type => {
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
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary-500" />
        {t('title')}
      </h3>
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
        
        <div className="space-y-6">
          {displayEvents.map((event, index) => {
            const config = EVENT_CONFIG[event.type];
            const Icon = config.icon;
            const isCompleted = event.completed;
            const isCurrent = index === lastCompletedIndex;
            
            return (
              <motion.div
                key={event.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-4"
              >
                {/* Icon */}
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
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                    ${isCompleted ? config.activeColor : 'bg-slate-200 dark:bg-slate-700'}
                    shadow-sm transition-colors duration-300
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className="w-5 h-5 text-slate-400" />
                  )}
                </motion.div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`font-medium ${
                    isCompleted 
                      ? 'text-slate-900 dark:text-white' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {t(`events.${event.type}.label`)}
                  </p>
                  
                  {event.date && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                  
                  {event.actor && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t(`events.${event.type}.by`, { actor: event.actor })}
                    </p>
                  )}
                  
                  {event.details && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                      {event.details}
                    </p>
                  )}
                  
                  {!isCompleted && index === lastCompletedIndex + 1 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic mt-1">
                      {t(`events.${event.type}.pending`)}
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
