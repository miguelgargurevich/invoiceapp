import { URL_SITIO } from '@/lib/sitio';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Facturo',
  url: URL_SITIO,
  logo: `${URL_SITIO}/logo.png`,
  description: 'Professional invoice and proposal management system for contractors and businesses',
  sameAs: [
    'https://twitter.com/invoiceapp',
    'https://linkedin.com/company/invoiceapp',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-555-123-4567',
    contactType: 'Customer Support',
    email: 'support@invoiceapp.com',
    availableLanguage: ['English', 'Spanish']
  }
};

export const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Facturo',
  url: URL_SITIO,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock'
  },
  description: 'Comprehensive invoice and proposal management system with features for client management, payment tracking, job documentation, and digital signatures.',
  featureList: [
    'Invoice Creation and Management',
    'Professional Proposal Generation',
    'Payment Tracking and History',
    'Client Database Management',
    'Job Site Photo Documentation',
    'Work Order Management',
    'Digital Signature Collection',
    'Multi-Currency Support',
    'Customizable Templates',
    'Financial Reporting',
    'Mobile-Responsive Interface',
    'PDF Export and Sharing',
    'Multi-Language Support (English/Spanish)',
    'Dark Mode Support',
    'Secure Data Storage'
  ],
  screenshot: `${URL_SITIO}/screenshot.png`,
  softwareVersion: '1.0.0',
  datePublished: '2025-01-01',
  author: {
    '@type': 'Organization',
    name: 'Facturo Team'
  }
};

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Facturo?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Facturo is a comprehensive invoice and proposal management system designed for contractors, construction businesses, and service providers. It helps you create professional invoices, track payments, manage clients, and streamline your billing process.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I create proposals and convert them to invoices?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Facturo allows you to create detailed proposals with work descriptions and payment terms. Once approved, you can seamlessly convert proposals into invoices with just one click, preserving all job information and details.'
      }
    },
    {
      '@type': 'Question',
      name: 'Does Facturo support digital signatures?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Facturo includes digital signature functionality. You can collect client signatures electronically on invoices, send signature requests via email, and track signature status. All signatures are timestamped and secure.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I track job progress with photos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely! Facturo includes job photo documentation features. You can upload and organize photos by date, attach them to specific jobs or invoices, and create a visual record of work progress.'
      }
    },
    {
      '@type': 'Question',
      name: 'Is Facturo mobile-friendly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Facturo is fully responsive and optimized for mobile devices, tablets, and iPads. The interface adapts to your screen size, and PDF generation works perfectly on all devices including iPad Safari.'
      }
    },
    {
      '@type': 'Question',
      name: 'What languages does Facturo support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Facturo currently supports English and Spanish with full internationalization. You can switch between languages at any time, and all interface elements, documents, and reports are available in both languages.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I manage multiple clients and track their payments?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! Facturo provides comprehensive client management with detailed contact information, billing history, and payment tracking. You can monitor outstanding balances, view payment history, and generate client-specific reports.'
      }
    },
    {
      '@type': 'Question',
      name: 'Does Facturo support different types of work orders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, Facturo supports multiple order types including Day Work, Contract work, and Extra work. You can specify the order type on both invoices and proposals to clearly categorize your billing.'
      }
    }
  ]
};

export const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: URL_SITIO
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Features',
      item: `${URL_SITIO}/features`
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Documentation',
      item: `${URL_SITIO}/docs`
    }
  ]
};
