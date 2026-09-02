import { useState, useEffect } from 'react';
import { CreditCard, Zap, Calendar, Package, Download, Activity, ArrowUpRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FullSpinner } from '@/components/ui';
import PlansPage from './PlansPage';
import InvoicesPage from './InvoicesPage';

export default function SubscriptionDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'invoices'>('overview');
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentSub = async () => {
      try {
        const data = await apiFetch<any>('subscription/subscriptions/current/');
        setSub(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentSub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <FullSpinner label="Loading Subscription Details..." />
      </div>
    );
  }
  
  if (!sub) return <div className="p-8 text-center text-red-500 font-medium bg-red-50 rounded-2xl border border-red-100">Failed to load subscription.</div>;

  const progress = Math.min(100, Math.max(0, (sub.used_runs / sub.run_limit) * 100)) || 0;
  const isPremium = sub.plan.toLowerCase().includes('premium');

  const renderOverview = () => (
    <>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-end justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Subscription Overview</h1>
          <p className="mt-2 text-slate-500">Manage your billing cycle and monitor simulation usage.</p>
        </div>
      </motion.div>
      
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Current Plan Card (Span 3) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={`lg:col-span-3 relative overflow-hidden rounded-[2rem] p-8 shadow-xl ${
            isPremium 
              ? 'bg-slate-900 text-white shadow-blue-900/20 ring-1 ring-white/10' 
              : 'bg-white text-slate-900 border border-slate-200'
          }`}
        >
          {isPremium && <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 pointer-events-none" />}
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${isPremium ? 'bg-white/10 text-cyan-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Zap className="h-7 w-7" />
                </div>
                <div>
                  <h2 className={`text-sm font-bold uppercase tracking-widest ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>Current Plan</h2>
                  <p className={`text-3xl font-black tracking-tight ${isPremium ? 'text-white' : 'text-slate-900'}`}>{sub.plan}</p>
                </div>
              </div>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            
            <div className={`grid grid-cols-2 gap-6 rounded-2xl p-6 ${isPremium ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar className="h-4 w-4"/> Started On
                </p>
                <p className="font-semibold text-lg">{sub.invoice_date || 'N/A'}</p>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar className="h-4 w-4"/> Renews On
                </p>
                <p className="font-semibold text-lg">{sub.renewal_date || 'N/A'}</p>
              </div>
            </div>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button onClick={() => setActiveTab('plans')} className={`flex-1 rounded-xl px-6 py-3.5 text-center text-sm font-bold transition-all shadow-md ${
                isPremium 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/25' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/25'
              }`}>
                Upgrade Plan
              </button>
              <button onClick={() => setActiveTab('invoices')} className={`flex-1 rounded-xl px-6 py-3.5 text-center text-sm font-bold transition-all border ${
                isPremium
                  ? 'border-white/20 bg-white/5 text-white hover:bg-white/10'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
                View Invoices
              </button>
            </div>
          </div>
        </motion.div>

        {/* Usage Card (Span 2) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col"
        >
           <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Simulation Usage</h2>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-end justify-between mb-4">
              <div>
                <span className="text-5xl font-black text-slate-900 tracking-tighter">{sub.used_runs}</span>
                <span className="text-slate-500 font-semibold ml-2">/ {sub.run_limit}</span>
              </div>
            </div>
            
            {/* Animated Progress Bar */}
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`absolute left-0 top-0 bottom-0 rounded-full ${
                  progress > 90 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 
                  progress > 75 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
                  'bg-gradient-to-r from-cyan-400 to-blue-500'
                }`}
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm font-bold">
              <span className={progress > 90 ? 'text-red-600' : 'text-slate-500'}>
                {progress.toFixed(1)}% Used
              </span>
              <span className="text-slate-900">{sub.remaining_runs} Remaining</span>
            </div>
            
            <div className="mt-8 rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-start gap-3">
              <ArrowUpRight className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Your limits will automatically reset at the beginning of your next billing cycle.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-10">
      <div className="mb-8 border-b border-slate-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold transition-colors relative ${
              activeTab === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('plans')}
            className={`pb-4 text-sm font-bold transition-colors relative ${
              activeTab === 'plans' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Plans
            {activeTab === 'plans' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 text-sm font-bold transition-colors relative ${
              activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Invoices
            {activeTab === 'invoices' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'plans' && <PlansPage />}
          {activeTab === 'invoices' && <InvoicesPage />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}