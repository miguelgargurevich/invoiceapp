'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Book,
  FileText,
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ChevronDown,
} from 'lucide-react';
import { Card, Input, Button } from '@/components/common';
import { motion, AnimatePresence } from 'framer-motion';

export default function AyudaPage() {
  const t = useTranslations('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: t('faqs.createInvoice.question'),
      answer: t('faqs.createInvoice.answer'),
    },
    {
      question: t('faqs.addClient.question'),
      answer: t('faqs.addClient.answer'),
    },
    {
      question: t('faqs.convertProforma.question'),
      answer: t('faqs.convertProforma.answer'),
    },
    {
      question: t('faqs.generateReports.question'),
      answer: t('faqs.generateReports.answer'),
    },
    {
      question: t('faqs.companySettings.question'),
      answer: t('faqs.companySettings.answer'),
    },
    {
      question: t('faqs.vatCalculation.question'),
      answer: t('faqs.vatCalculation.answer'),
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Search */}
      <Card className="!p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-5 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <Book className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('gettingStarted')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('gettingStartedDesc')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('documentation')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('documentationDesc')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('videoTutorials')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('videoTutorialsDesc')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5 hover:shadow-lg transition-shadow cursor-pointer group">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:scale-110 transition-transform">
              <HelpCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {t('faq')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('faqDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('faqTitle')}
          </h2>
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('noResults')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Contact Section */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('needMoreHelp')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('email')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('emailDesc')}
              </p>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                soporte@invoiceapp.com
              </Button>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('phone')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('phoneHours')}
              </p>
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                +51 999 999 999
              </Button>
            </div>

            <div className="flex flex-col items-center text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('liveChat')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('liveChatDesc')}
              </p>
              <Button variant="outline" size="sm">
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('startChat')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
