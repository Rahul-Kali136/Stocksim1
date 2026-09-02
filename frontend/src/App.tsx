import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { DataProvider } from '@/context/DataContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StockSimLoadingPage } from '@/components/StockSimLoadingPage';

// Eagerly load the landing page and layout for instant LCP
import LandingPage from '@/pages/LandingPage';
import DashboardLayout from '@/components/DashboardLayout';

// Lazy load authentication pages
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));

// Lazy load all dashboard pages to reduce initial bundle size
const OverviewPage = lazy(() => import('@/pages/dashboard/OverviewPage'));
const ProductsPage = lazy(() => import('@/pages/dashboard/ProductsPage'));
const SuppliersPage = lazy(() => import('@/pages/dashboard/SuppliersPage'));
const OrganizationsPage = lazy(() => import('@/pages/dashboard/OrganizationsPage'));
const HistoricalDataPage = lazy(() => import('@/pages/dashboard/HistoricalDataPage'));
const DistributionPage = lazy(() => import('@/pages/dashboard/DistributionPage'));
const SafetyStockPage = lazy(() => import('@/pages/dashboard/SafetyStockPage'));
const RopRoqPage = lazy(() => import('@/pages/dashboard/RopRoqPage'));
const SimulationPage = lazy(() => import('@/pages/dashboard/SimulationPage'));
const CostAnalysisPage = lazy(() => import('@/pages/dashboard/CostAnalysisPage'));
const PolicyComparisonPage = lazy(() => import('@/pages/dashboard/PolicyComparisonPage'));
const ReportsPage = lazy(() => import('@/pages/dashboard/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/dashboard/SettingsPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const AuditLogsPage = lazy(() => import('@/pages/dashboard/AuditLogsPage'));
const SubscriptionDashboard = lazy(() => import('@/pages/dashboard/SubscriptionDashboard'));

import { Boxes } from 'lucide-react';

// Global fallback loader for suspense boundaries (Thematic StockSim Style)
const FallbackLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50/80 backdrop-blur-sm fixed inset-0 z-[100]">
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="relative flex items-center justify-center w-20 h-20">
        {/* Sleek outer track */}
        <div className="absolute inset-0 rounded-2xl border-[2px] border-slate-200/50"></div>
        {/* Animated sleek progress indicator */}
        <div className="absolute inset-0 rounded-2xl border-[2px] border-transparent border-t-blue-600 border-r-indigo-600 animate-[spin_1.5s_ease-in-out_infinite]"></div>
        
        {/* Thematic Icon Centerpiece */}
        <div className="absolute inset-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center shadow-inner">
          <Boxes className="w-6 h-6 text-indigo-600 animate-pulse" />
        </div>
      </div>
      
      {/* Project Branding */}
      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Stock<span className="text-blue-600">Sim</span></h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Authenticating...</p>
      </div>
    </div>
  </div>
);
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<FallbackLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DataProvider>
                      <DashboardLayout />
                    </DataProvider>
                  </ProtectedRoute>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="suppliers" element={<SuppliersPage />} />
                <Route path="organizations" element={<OrganizationsPage />} />
                <Route path="historical" element={<HistoricalDataPage />} />
                <Route path="distribution" element={<DistributionPage />} />
                <Route path="safety-stock" element={<SafetyStockPage />} />
                <Route path="rop-roq" element={<RopRoqPage />} />
                <Route path="simulation" element={<SimulationPage />} />
                <Route path="costs" element={<CostAnalysisPage />} />
                <Route path="policies" element={<PolicyComparisonPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="subscription" element={<SubscriptionDashboard />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
