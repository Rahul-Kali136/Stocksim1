import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';

export type User = {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
  created_at?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    [key: string]: any;
  };
};

export type Session = {
  user: User;
  access_token: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, additionalData?: { username?: string; first_name?: string; last_name?: string; phone_number?: string; state?: string }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Static UUID matching our seeded database data
const FAKE_USER_ID = '9315abba-885c-43e0-983e-28ea47038f77';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_email');
    const token = localStorage.getItem('access_token');
    if (savedUser && token) {
      setSession({
        user: { 
          id: FAKE_USER_ID, 
          email: savedUser,
          created_at: new Date('2026-01-01').toISOString(),
          last_sign_in_at: new Date().toISOString(),
          user_metadata: { full_name: savedUser.split('@')[0] },
          app_metadata: { provider: 'email' }
        },
        access_token: token,
      });
    }
    setLoading(false);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signUp: async (email, password, additionalData = {}) => {
      try {
        await apiFetch('register/', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            username: additionalData.username || email.split('@')[0],
            first_name: additionalData.first_name || '',
            last_name: additionalData.last_name || '',
            phone_number: additionalData.phone_number || '',
            state: additionalData.state || '',
          }),
        });
        return { error: null };
      } catch (err: any) {
        return { error: err.message || 'Registration failed' };
      }
    },
    signIn: async (email, password) => {
      try {
        const res = await apiFetch<{
          access_token: string;
          admin_id: number;
        }>('login/', {
          method: 'POST',
          body: JSON.stringify({ username: email, password }),
        });
        
        localStorage.setItem('user_email', email);
        localStorage.setItem('access_token', res.access_token);
        
        const newSession = {
          user: { 
            id: String(res.admin_id), 
            email,
            created_at: new Date('2026-01-01').toISOString(),
            last_sign_in_at: new Date().toISOString(),
            user_metadata: { full_name: email.split('@')[0] },
            app_metadata: { provider: 'email' }
          },
          access_token: res.access_token,
        };
        
        setSession(newSession);
        return { error: null };
      } catch (err: any) {
        return { error: err.message || 'Login failed' };
      }
    },
    forgotPassword: async (email: string) => {
      try {
        await apiFetch('forgot-password/', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        return { error: null };
      } catch (err: any) {
        return { error: err.message || 'Failed to send reset link.' };
      }
    },
    resetPassword: async (email: string, otp: string, newPassword: string) => {
      try {
        await apiFetch('reset-password/', {
          method: 'POST',
          body: JSON.stringify({
            email,
            otp,
            new_password: newPassword,
            confirm_password: newPassword,
          }),
        });
        return { error: null };
      } catch (err: any) {
        return { error: err.message || 'Failed to reset password.' };
      }
    },
    signOut: async () => {
      localStorage.clear();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={{ ...value, session, user: session?.user ?? null }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

