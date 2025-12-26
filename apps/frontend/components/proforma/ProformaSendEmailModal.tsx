'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Modal, Input, Textarea } from '@/components/common';
import api from '@/lib/api';

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
}

interface ProformaSendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma;
}

export default function ProformaSendEmailModal({
  isOpen,
  onClose,
  proforma,
}: ProformaSendEmailModalProps) {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [emailData, setEmailData] = useState({
    to: proforma.cliente.email || '',
    subject: `Proforma ${proforma.serie}-${proforma.numero} - ${proforma.cliente.razonSocial}`,
    message: `Estimado/a cliente,\n\nAdjunto encontrará la proforma/cotización ${proforma.serie}-${proforma.numero}.\n\nEsta cotización es válida por 30 días a partir de la fecha de emisión.\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales.`,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendEmail = async () => {
    if (!emailData.to) {
      setErrorMessage(t('emailRequired'));
      setStatus('error');
      return;
    }

    try {
      setSending(true);
      setStatus('idle');
      setErrorMessage('');

      await api.post(`/proformas/${proforma.id}/send-email`, {
        to: emailData.to,
        subject: emailData.subject,
        message: emailData.message,
        locale,
      });

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Error sending email:', error);
      setStatus('error');
      setErrorMessage(error.message || t('sendEmailError'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sendEmail')} size="lg">
      <div className="space-y-6">
        {/* Status Messages */}
        {status === 'success' && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t('emailSentSuccess')}</p>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">El documento se envió correctamente al cliente</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{errorMessage}</p>
              <p className="text-sm text-red-600 dark:text-red-500 mt-1">Verifica los datos e intenta nuevamente</p>
            </div>
          </div>
        )}

        {/* Document Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 dark:bg-blue-500 rounded-lg p-3">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Documento a enviar</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                Proforma {proforma.serie}-{proforma.numero}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Cliente: {proforma.cliente.razonSocial}
              </p>
            </div>
          </div>
        </div>

        {/* Email Form */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('emailTo')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                value={emailData.to}
                onChange={(e) =>
                  setEmailData({ ...emailData, to: e.target.value })
                }
                placeholder={t('emailPlaceholder')}
                className="pl-11 h-11 text-base"
                required
              />
            </div>
            {proforma.cliente.email && emailData.to !== proforma.cliente.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                Email del cliente: {proforma.cliente.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('emailSubject')}
            </label>
            <Input
              value={emailData.subject}
              onChange={(e) =>
                setEmailData({ ...emailData, subject: e.target.value })
              }
              placeholder={t('emailSubjectPlaceholder')}
              className="h-11 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('emailMessage')}
            </label>
            <Textarea
              value={emailData.message}
              onChange={(e) =>
                setEmailData({ ...emailData, message: e.target.value })
              }
              placeholder={t('emailMessagePlaceholder')}
              rows={8}
              className="text-base resize-none"
            />
          </div>
        </div>

        {/* Attachment Info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 dark:bg-gray-700 rounded p-2">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('emailAttachment')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Proforma-{proforma.serie}-{proforma.numero}.pdf
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={sending}
            className="min-w-[100px]"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={sending || status === 'success' || !emailData.to}
            className="min-w-[140px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {sending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('sendingEmail')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('sendEmailButton')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
