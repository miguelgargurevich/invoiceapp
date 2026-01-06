'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { 
  Eye, EyeOff, Mail, Lock, User, Globe, Moon, Sun, 
  CheckCircle, ArrowLeft, FileText, Users, Zap, Shield,
  Sparkles, CheckCircle2, Gift
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';

type RegisterForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const benefits = [
  { icon: FileText, text: 'Create Professional Invoices', textEs: 'Crea Facturas Profesionales' },
  { icon: Users, text: 'Manage Unlimited Clients', textEs: 'Gestiona Clientes Ilimitados' },
  { icon: Zap, text: 'Get Paid Faster', textEs: 'Cobra Más Rápido' },
  { icon: Shield, text: 'Secure & Encrypted', textEs: 'Seguro y Encriptado' },
];

export default function RegisterPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const registerSchema = z.object({
    name: z.string().min(1, t('nameRequired')),
    email: z.string().email(t('emailInvalid')),
    password: z.string().min(6, t('passwordMinLength')),
    confirmPassword: z.string().min(6, t('passwordMinLength')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('passwordMismatch'),
    path: ['confirmPassword'],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.push(`/${locale}/dashboard`);
    }
  }, [user, authLoading, router, locale]);

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('');
      setIsLoading(true);
      await signUp(data.email, data.password, data.name);
      setSuccess(true);
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 3000);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || t('signUpError'));
    } finally {
      setIsLoading(false);
    }
  };

  const switchLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    router.push(`/${newLocale}/register`);
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
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-400/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-emerald-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
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
                <p className="text-emerald-200 text-sm">
                  {t('tagline')}
                </p>
              </div>
            </Link>
          </div>

          {/* Benefits */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4">
                <Gift className="w-4 h-4 text-yellow-400" />
                <span className="text-white text-sm font-medium">
                  {locale === 'es' ? '14 días de prueba gratis' : '14-day free trial'}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {locale === 'es' ? 'Empieza gratis hoy' : 'Start free today'}
              </h2>
              <p className="text-emerald-200">
                {locale === 'es' 
                  ? 'Sin tarjeta de crédito requerida. Cancela en cualquier momento.'
                  : 'No credit card required. Cancel anytime.'
                }
              </p>
            </div>

            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-medium">
                    {locale === 'es' ? benefit.textEs : benefit.text}
                  </span>
                  <CheckCircle className="w-5 h-5 text-emerald-300 ml-auto" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Social Proof */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex -space-x-2">
                {['MG', 'JR', 'SC', 'AL'].map((initials, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-emerald-600 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">{initials}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Sparkles key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
            <p className="text-white/90 text-sm">
              {locale === 'es' 
                ? 'Únete a más de 10,000 profesionales que confían en InvoiceApp'
                : 'Join 10,000+ professionals who trust InvoiceApp'
              }
            </p>
          </div>

          {/* Footer */}
          <div className="text-emerald-200 text-sm">
            © {new Date().getFullYear()} InvoiceApp. {t('allRightsReserved')}
          </div>
        </div>
      </div>

      {/* Right side - Register form */}
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
            <div className="lg:hidden text-center mb-6">
              <Link href={`/${locale}`} className="inline-flex flex-col items-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center p-2.5 mb-3">
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
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t('createAccount')} 🚀
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  {t('signUpDescription')}
                </p>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {locale === 'es' ? '¡Cuenta creada!' : 'Account Created!'}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {t('signUpSuccess')}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {locale === 'es' ? 'Redirigiendo al login...' : 'Redirecting to login...'}
                  </p>
                </motion.div>
              ) : (
                <>
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

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('name')}
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          {...register('name')}
                          type="text"
                          placeholder={t('namePlaceholder')}
                          className={cn(
                            'w-full pl-12 pr-4 py-3.5 rounded-xl border-2 transition-all',
                            'bg-slate-50 dark:bg-slate-900',
                            'text-slate-900 dark:text-white',
                            'placeholder-slate-400 dark:placeholder-slate-500',
                            errors.name
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-emerald-500/20',
                            'focus:outline-none focus:ring-4'
                          )}
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          {errors.name.message}
                        </p>
                      )}
                    </div>

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
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-emerald-500/20',
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
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-emerald-500/20',
                            'focus:outline-none focus:ring-4'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('confirmPassword')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          {...register('confirmPassword')}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('confirmPasswordPlaceholder')}
                          className={cn(
                            'w-full pl-12 pr-12 py-3.5 rounded-xl border-2 transition-all',
                            'bg-slate-50 dark:bg-slate-900',
                            'text-slate-900 dark:text-white',
                            'placeholder-slate-400 dark:placeholder-slate-500',
                            errors.confirmPassword
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-emerald-500/20',
                            'focus:outline-none focus:ring-4'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full" />
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full py-3.5 text-base font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                          {t('signingUp')}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t('signUpButton')}
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
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {t('continueWithGoogle')}
                    </span>
                  </button>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('alreadyHaveAccount')}{' '}
                      <Link
                        href={`/${locale}/login`}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors"
                      >
                        {t('signIn')}
                      </Link>
                    </p>
                  </div>
                </>
              )}
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
