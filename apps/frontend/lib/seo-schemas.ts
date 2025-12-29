export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'InvoiceApp',
  url: 'https://invoiceapp.vercel.app',
  logo: 'https://invoiceapp.vercel.app/logo.png',
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
  name: 'InvoiceApp',
  url: 'https://invoiceapp.vercel.app',
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
  screenshot: 'https://invoiceapp.vercel.app/screenshot.png',
  softwareVersion: '1.0.0',
  datePublished: '2025-01-01',
  author: {
    '@type': 'Organization',
    name: 'InvoiceApp Team'
  }
};

export const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is InvoiceApp?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'InvoiceApp is a comprehensive invoice and proposal management system designed for contractors, construction businesses, and service providers. It helps you create professional invoices, track payments, manage clients, and streamline your billing process.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I create proposals and convert them to invoices?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! InvoiceApp allows you to create detailed proposals with work descriptions and payment terms. Once approved, you can seamlessly convert proposals into invoices with just one click, preserving all job information and details.'
      }
    },
    {
      '@type': 'Question',
      name: 'Does InvoiceApp support digital signatures?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, InvoiceApp includes digital signature functionality. You can collect client signatures electronically on invoices, send signature requests via email, and track signature status. All signatures are timestamped and secure.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I track job progress with photos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely! InvoiceApp includes job photo documentation features. You can upload and organize photos by date, attach them to specific jobs or invoices, and create a visual record of work progress.'
      }
    },
    {
      '@type': 'Question',
      name: 'Is InvoiceApp mobile-friendly?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, InvoiceApp is fully responsive and optimized for mobile devices, tablets, and iPads. The interface adapts to your screen size, and PDF generation works perfectly on all devices including iPad Safari.'
      }
    },
    {
      '@type': 'Question',
      name: 'What languages does InvoiceApp support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'InvoiceApp currently supports English and Spanish with full internationalization. You can switch between languages at any time, and all interface elements, documents, and reports are available in both languages.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I manage multiple clients and track their payments?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! InvoiceApp provides comprehensive client management with detailed contact information, billing history, and payment tracking. You can monitor outstanding balances, view payment history, and generate client-specific reports.'
      }
    },
    {
      '@type': 'Question',
      name: 'Does InvoiceApp support different types of work orders?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, InvoiceApp supports multiple order types including Day Work, Contract work, and Extra work. You can specify the order type on both invoices and proposals to clearly categorize your billing.'
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
      item: 'https://invoiceapp.vercel.app'
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Features',
      item: 'https://invoiceapp.vercel.app/features'
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Documentation',
      item: 'https://invoiceapp.vercel.app/docs'
    }
  ]
};
