'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';

export interface UserWithRole extends User {
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive?: boolean;
}

export interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  web?: string;
  logoUrl?: string;
  firmaEmpresa?: string; // Company digital signature
  moneda: string;
  taxRate?: number | string; // Tax rate percentage (e.g., 18 for 18%)
  serieFactura: string;
  serieProforma: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: UserWithRole | null;
  session: Session | null;
  loading: boolean;
  empresa: Empresa | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshEmpresa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  
  // Flags to prevent duplicate API calls
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          await loadUserWithRole(session.user);
          await loadEmpresa();
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error getting initial session:', err);
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        //console.log('[AuthContext] Auth state changed:', event);
        setSession(session);
        
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          await loadUserWithRole(session.user);
          await loadEmpresa();
        } else {
          apiClient.clearToken();
          setUser(null);
          setEmpresa(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserWithRole = async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }
    
    // Prevent duplicate calls
    if (isLoadingUser) {
      console.log('[AuthContext] User already loading, skipping...');
      return;
    }

    try {
      setIsLoadingUser(true);
      // Obtener datos del usuario desde el backend que incluye el rol
      const response: any = await apiClient.get('/auth/me');
      const userWithRole: UserWithRole = {
        ...supabaseUser,
        role: response.user.role,
        isActive: response.user.isActive
      };
      setUser(userWithRole);
    } catch (error) {
      console.error('[AuthContext] Error loading user role:', error);
      // Si hay error, crear UserWithRole con rol por defecto
      const userWithRole: UserWithRole = {
        ...supabaseUser,
        role: 'USER',
        isActive: true
      };
      setUser(userWithRole);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const loadEmpresa = async () => {
    // Prevent duplicate calls
    if (isLoadingEmpresa) {
      console.log('[AuthContext] Empresa already loading, skipping...');
      return;
    }
    
    try {
      setIsLoadingEmpresa(true);
      const response = await apiClient.get<Empresa>('/empresas/mi-empresa');
      setEmpresa(response);
    } catch (error) {
      console.log('[AuthContext] No empresa found or error:', error);
      setEmpresa(null);
    } finally {
      setIsLoadingEmpresa(false);
    }
  };

  const refreshEmpresa = async () => {
    await loadEmpresa();
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      apiClient.setToken(data.session.access_token);
      await loadEmpresa();
    }
  };

  const signInWithGoogle = async () => {
    // Detectar URL base automáticamente
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const redirectUrl = `${baseUrl}/es/dashboard`;
    
    console.log('[Google Auth] Redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    apiClient.clearToken();
    setUser(null);
    setSession(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        empresa,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshEmpresa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
