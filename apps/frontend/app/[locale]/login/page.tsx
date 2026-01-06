'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Eye, EyeOff, Mail, Lock, Globe, Moon, Sun, 
  ArrowLeft, FileText, Users, Zap, Shield, CheckCircle2,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';

type LoginForm = {
  email: string;
  password: string;
};

const features = [
  { icon: FileText, text: 'Professional Invoices', textEs: 'Facturas Profesionales' },
  { icon: Users, text: 'Client Management', textEs: 'Gestión de Clientes' },
  { icon: Zap, text: 'Fast & Easy', textEs: 'Rápido y Fácil' },
  { icon: Shield, text: 'Secure & Reliable', textEs: 'Seguro y Confiable' },
];

// List of 33 welcome emojis
const welcomeEmojis = [
  '👋', '😊', '🎉', '✨', '🚀', '💼', '📊', '💡', 
  '🌟', '🎯', '⚡', '🔥', '💪', '🏆', '🎊', '🌈',
  '✌️', '👍', '🤝', '💫', '🌺', '🎨', '🎭', '🎪',
  '🎸', '🎹', '🎵', '🎤', '🎬', '🎮', '🎲', '🎰',
  '🎳'
];

export default function LoginPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Select a random emoji on component mount
  const randomEmoji = useMemo(() => {
    return welcomeEmojis[Math.floor(Math.random() * welcomeEmojis.length)];
  }, []);

  const loginSchema = z.object({
    email: z.string().email(t('emailInvalid')),
    password: z.string().min(6, t('passwordMinLength')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push(`/${locale}/dashboard`);
    }
  }, [user, authLoading, router, locale]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      setIsLoading(true);
      await signIn(data.email, data.password);
      router.push(`/${locale}/dashboard`);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || t('signInError'));
    } finally {
      setIsLoading(false);
    }
  };

  const switchLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    router.push(`/${newLocale}/login`);
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setIsLoading(true);
      await signInWithGoogle();
      // Redirect is handled by Supabase callback
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || t('googleSignInError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Left side - Enhanced Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-primary-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          {/* Logo & Brand */}
          <div>
            <Link href={`/${locale}`} className="inline-flex items-center gap-3 group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                <Image
                  src="/invoiceapp-logo.png"
                  alt="InvoiceApp Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  InvoiceApp
                </h1>
                <p className="text-primary-200 text-sm">
                  {t('tagline')}
                </p>
              </div>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {locale === 'es' ? 'Facturación simplificada' : 'Simplified Invoicing'}
              </h2>
              <p className="text-primary-200">
                {locale === 'es' 
                  ? 'Todo lo que necesitas para gestionar tu negocio en un solo lugar.'
                  : 'Everything you need to manage your business in one place.'
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium text-sm">
                    {locale === 'es' ? feature.textEs : feature.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <blockquote className="text-white/90">
              <p className="text-base italic leading-relaxed">
                &ldquo;{t('testimonial')}&rdquo;
              </p>
              <footer className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">MG</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">María González</p>
                  <p className="text-primary-200 text-xs">{locale === 'es' ? 'Contratista de Construcción' : 'Construction Contractor'}</p>
                </div>
              </footer>
            </blockquote>
          </div>

          {/* Footer */}
          <div className="text-primary-200 text-sm">
            © {new Date().getFullYear()} InvoiceApp. {t('allRightsReserved')}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="p-4 flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            {locale === 'es' ? 'Volver al inicio' : 'Back to home'}
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-500" />
              )}
            </button>
            <button
              onClick={switchLocale}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase">
                {locale === 'es' ? 'EN' : 'ES'}
              </span>
            </button>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <Link href={`/${locale}`} className="inline-flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/25 flex items-center justify-center p-2.5 mb-3">
                  <Image
                    src="/invoiceapp-logo.png"
                    alt="InvoiceApp Logo"
                    width={56}
                    height={56}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  InvoiceApp
                </h1>
              </Link>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {t('tagline')}
              </p>
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t('welcomeBack')} {randomEmoji}
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {t('signInDescription')}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 dark:text-red-400 text-xs">!</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      className={cn(
                        'w-full pl-12 pr-4 py-3.5 rounded-xl border-2 transition-all',
                        'bg-slate-50 dark:bg-slate-900',
                        'text-slate-900 dark:text-white',
                        'placeholder-slate-400 dark:placeholder-slate-500',
                        errors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-primary-500/20',
                        'focus:outline-none focus:ring-4'
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      className={cn(
                        'w-full pl-12 pr-12 py-3.5 rounded-xl border-2 transition-all',
                        'bg-slate-50 dark:bg-slate-900',
                        'text-slate-900 dark:text-white',
                        'placeholder-slate-400 dark:placeholder-slate-500',
                        errors.password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 dark:focus:border-primary-500 focus:ring-primary-500/20',
                        'focus:outline-none focus:ring-4'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {t('rememberMe')}
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    {t('forgotPassword')}
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3.5 text-base font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                      {t('signingIn')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {t('signInButton')}
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {t('orContinueWith')}
                  </span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {t('continueWithGoogle')}
                </span>
              </button>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('noAccount')}{' '}
                  <Link
                    href={`/${locale}/register`}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold transition-colors"
                  >
                    {t('signUp')}
                  </Link>
                </p>
              </div>
            </div>

            {/* Legal Links */}
            <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-400 dark:text-slate-500">
              <Link href={`/${locale}/terms`} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {locale === 'es' ? 'Términos' : 'Terms'}
              </Link>
              <Link href={`/${locale}/privacy`} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {locale === 'es' ? 'Privacidad' : 'Privacy'}
              </Link>
              <Link href={`/${locale}/contact`} className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                {locale === 'es' ? 'Contacto' : 'Contact'}
              </Link>
            </div>

            {/* Footer credit */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ☕ Powered by — <span className="font-medium">Gargurevich Dev</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
