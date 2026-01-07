'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { FileText, Twitter, Github, Linkedin, Mail } from 'lucide-react';

export function LandingFooter() {
  const t = useTranslations('landing');
  const locale = useLocale();

  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { href: '#features', label: t('footer.links.features') },
      { href: '#pricing', label: t('footer.links.pricing') },
      { href: '#testimonials', label: t('footer.links.testimonials') },
      { href: '#faq', label: t('footer.links.faq') },
    ],
    company: [
      { href: `/${locale}/about`, label: t('footer.links.about') },
      { href: `/${locale}/blog`, label: t('footer.links.blog') },
      { href: `/${locale}/careers`, label: t('footer.links.careers') },
      { href: `/${locale}/contact`, label: t('footer.links.contact') },
    ],
    legal: [
      { href: `/${locale}/privacy`, label: t('footer.links.privacy') },
      { href: `/${locale}/terms`, label: t('footer.links.terms') },
      { href: `/${locale}/cookies`, label: t('footer.links.cookies') },
    ],
  };

  const socialLinks = [
    { href: 'https://twitter.com/invoiceapp', icon: Twitter, label: 'Twitter' },
    { href: 'https://github.com/invoiceapp', icon: Github, label: 'GitHub' },
    { href: 'https://linkedin.com/company/invoiceapp', icon: Linkedin, label: 'LinkedIn' },
    { href: 'mailto:hello@invoiceapp.io', icon: Mail, label: 'Email' },
  ];

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 md:py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href={`/${locale}/landing`} className="flex items-center gap-2 group mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                InvoiceApp
              </span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
              {t('footer.description')}
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              {t('footer.sections.product')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              {t('footer.sections.company')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              {t('footer.sections.legal')}
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {currentYear} InvoiceApp. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}/login`}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {t('nav.login')}
              </Link>
              <Link
                href={`/${locale}/setup`}
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
