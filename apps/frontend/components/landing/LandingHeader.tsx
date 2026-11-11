'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Moon, Sun, LayoutDashboard } from 'lucide-react';
import { LogoFacturo } from '@/components/marca/LogoFacturo';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInstalacion } from '@/lib/hooks/useInstalacion';

export function LandingHeader() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  // El ítem «Instalar app» aparece con la misma decisión que la sección (#instalar) y solo en el menú móvil.
  const { instalacion } = useInstalacion();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '#features', label: t('nav.features') },
    { href: '#pricing', label: t('nav.pricing') },
    // Testimonios solo si el idioma trae la sección (hoy no hay clientes reales que citar).
    ...(t.has('nav.testimonials') ? [{ href: '#testimonials', label: t('nav.testimonials') }] : []),
    { href: '#faq', label: t('nav.faq') },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg border-b border-slate-200/50 dark:border-slate-700/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href={`/${locale}/landing`} className="flex items-center gap-2 group">
              <LogoFacturo tamano={36} className="group-hover:opacity-90 transition-opacity" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <Link
                  href={`/${locale}/dashboard`}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-105"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href={`/${locale}/login`}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {t('nav.login')}
                  </Link>

                  <Link
                    href={`/${locale}/setup`}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-105"
                  >
                    {t('nav.getStarted')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 shadow-2xl"
            >
              <div className="flex flex-col h-full pt-20 pb-6 px-6">
                <nav className="flex-1 space-y-1">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                  {instalacion.tipo !== 'nada' && (
                    <a
                      href="#instalar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      {t('nav.instalar')}
                    </a>
                  )}
                </nav>

                <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 w-full px-4 py-3 text-base font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  </button>

                  {user ? (
                    <Link
                      href={`/${locale}/dashboard`}
                      className="flex items-center gap-2 w-full px-4 py-3 text-center text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/${locale}/login`}
                        className="block px-4 py-3 text-base font-medium text-slate-700 dark:text-slate-300 hover:text-primary-600 transition-colors"
                      >
                        {t('nav.login')}
                      </Link>

                      <Link
                        href={`/${locale}/setup`}
                        className="block w-full px-4 py-3 text-center text-base font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg"
                      >
                        {t('nav.getStarted')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
