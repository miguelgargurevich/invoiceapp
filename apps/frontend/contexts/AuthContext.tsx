'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

export interface UserWithRole {
  id: string;
  email: string;
  name?: string | null;
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive?: boolean;
  user_metadata?: {
    nombre?: string;
    [key: string]: unknown;
  };
  app_metadata?: {
    provider?: string;
    [key: string]: unknown;
  };
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  user?: UserWithRole;
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
  firmaEmpresa?: string;
  moneda: string;
  taxRate?: number | string;
  serieFactura: string;
  serieProforma: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: UserWithRole | null;
  session: AuthSession | null;
  loading: boolean;
  empresa: Empresa | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshEmpresa: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'authToken';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isLoadingEmpresa, setIsLoadingEmpresa] = useState(false);

  const loadEmpresa = async () => {
    if (isLoadingEmpresa) return;

    try {
      setIsLoadingEmpresa(true);
      const response = await apiClient.get<Empresa>('/empresas/mi-empresa');
      setEmpresa(response);
    } catch {
      setEmpresa(null);
    } finally {
      setIsLoadingEmpresa(false);
    }
  };

  const refreshEmpresa = async () => {
    await loadEmpresa();
  };

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      try {
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

        if (!savedToken) {
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        apiClient.setToken(savedToken);
        const response: any = await apiClient.get('/auth/me');

        if (!mounted) return;

        const restoredUser: UserWithRole = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role,
          isActive: response.user.isActive,
        };

        setUser(restoredUser);
        setSession({
          access_token: savedToken,
          token_type: 'Bearer',
          user: restoredUser,
        });

        await loadEmpresa();
      } catch {
        apiClient.clearToken();
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
        if (mounted) {
          setUser(null);
          setSession(null);
          setEmpresa(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const response: any = await apiClient.post('/auth/login', { email, password });
    const token = response?.session?.access_token;

    if (!token) {
      throw new Error('No authentication token returned');
    }

    apiClient.setToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    const signedUser: UserWithRole = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      role: response.user.role,
      isActive: response.user.isActive,
    };

    setUser(signedUser);
    setSession({
      access_token: token,
      token_type: response?.session?.token_type || 'Bearer',
      user: signedUser,
    });

    await loadEmpresa();
  };

  const signInWithGoogle = async () => {
    throw new Error('Google login no está disponible en auth local');
  };

  const signUp = async (email: string, password: string, name: string, empresaData?: any) => {
    const response: any = await apiClient.post('/auth/register', { email, password, name, empresaData });
    const token = response?.session?.access_token;

    if (!token) {
      throw new Error('No authentication token returned');
    }

    apiClient.setToken(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    const newUser: UserWithRole = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      role: response.user.role,
      isActive: response.user.isActive,
    };

    setUser(newUser);
    setSession({
      access_token: token,
      token_type: response?.session?.token_type || 'Bearer',
      user: newUser,
    });
  };

  const signOut = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // noop
    }

    apiClient.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

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
