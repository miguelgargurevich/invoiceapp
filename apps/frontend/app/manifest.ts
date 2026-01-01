import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InvoiceApp - Professional Invoice & Proposal Management',
    short_name: 'InvoiceApp',
    description: 'Comprehensive invoice and proposal management system for contractors and businesses',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    // icons: [
    //   {
    //     src: '/icon-192.png',
    //     sizes: '192x192',
    //     type: 'image/png',
    //   },
    //   {
    //     src: '/icon-512.png',
    //     sizes: '512x512',
    //     type: 'image/png',
    //   },
    // ],
    categories: ['business', 'finance', 'productivity'],
    lang: 'en',
    dir: 'ltr',
  };
}
