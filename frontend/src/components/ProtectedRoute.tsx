import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { StockSimLoader } from './ui';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <StockSimLoader label="Securing your workspace..." />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
