'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Globe, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button, Input, LoadingSpinner } from '@/components/common';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const switchLocale = () => {
    const newLocale = locale === 'es' ? 'en' : 'es';
    router.push(`/${newLocale}/login`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white">
            {t('appName')}
          </h1>
          <p className="mt-2 text-primary-200 text-lg">
            {t('tagline')}
          </p>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white/90">
            <p className="text-lg italic">
              &ldquo;{t('testimonial')}&rdquo;
            </p>
            <footer className="mt-4 text-primary-200">
              — {t('testimonialAuthor')}
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-primary-200 text-sm">
          © {new Date().getFullYear()} {t('appName')}. {t('allRightsReserved')}
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with theme and language toggles */}
        <div className="p-4 flex justify-end gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <button
            onClick={switchLocale}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">
              {locale === 'es' ? 'EN' : 'ES'}
            </span>
          </button>
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('appName')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {t('tagline')}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {t('signIn')}
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {t('signInDescription')}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-lg border transition-colors',
                        'bg-white dark:bg-gray-900',
                        'text-gray-900 dark:text-gray-100',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        errors.email
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0'
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      className={cn(
                        'w-full pl-10 pr-12 py-3 rounded-lg border transition-colors',
                        'bg-white dark:bg-gray-900',
                        'text-gray-900 dark:text-gray-100',
                        'placeholder-gray-400 dark:placeholder-gray-500',
                        errors.password
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('rememberMe')}
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {t('forgotPassword')}
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full py-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                      {t('signingIn')}
                    </span>
                  ) : (
                    t('signInButton')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noAccount')}{' '}
                  <a
                    href={`/${locale}/register`}
                    className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                  >
                    {t('signUp')}
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
