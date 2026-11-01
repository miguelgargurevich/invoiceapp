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
import { IconoFacturo } from '@/components/marca/LogoFacturo';
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
  const { signUp, user, loading: authLoading } = useAuth();
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        
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
                <IconoFacturo tamano={40} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Facturo
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
                ? 'Únete a más de 10,000 profesionales que confían en Facturo'
                : 'Join 10,000+ professionals who trust Facturo'
              }
            </p>
          </div>

          {/* Footer */}
          <div className="text-emerald-200 text-sm">
            © {new Date().getFullYear()} Facturo. {t('allRightsReserved')}
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
                <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg flex items-center justify-center p-2.5 mb-3">
                  <IconoFacturo tamano={48} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Facturo
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
