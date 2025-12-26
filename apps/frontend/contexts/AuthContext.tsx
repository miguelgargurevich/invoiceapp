'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';

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
  moneda: string;
  serieFactura: string;
  serieProforma: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          await loadEmpresa();
        }
      } catch (err) {
        console.error('[AuthContext] Error getting initial session:', err);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          await loadEmpresa();
        } else {
          apiClient.clearToken();
          setEmpresa(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadEmpresa = async () => {
    try {
      const response = await apiClient.get<Empresa>('/empresas/mi-empresa');
      setEmpresa(response);
    } catch (error) {
      console.log('[AuthContext] No empresa found or error:', error);
      setEmpresa(null);
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
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/es/dashboard`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/es/dashboard';
    
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
