import { type ReactNode } from 'react';
import { Loader2, Rocket, ArrowUpRight, TrendingUp, BarChart2, Activity, Database, Network, Boxes } from 'lucide-react';
import { motion } from 'framer-motion';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`w-5 h-5 animate-spin ${className}`} />;
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="relative flex items-center justify-center w-20 h-20">
        {/* Sleek outer track */}
        <div className="absolute inset-0 rounded-2xl border-[2px] border-slate-100"></div>
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
        {label && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>}
      </div>
    </div>
  );
}

export function StockSimLoader({ label = 'Initializing...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-slate-950">
      
      {/* 3D AI Generated Warehouse Inventory Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70 mix-blend-screen scale-105"
        style={{ backgroundImage: `url('/warehouse_inventory_loading_bg.jpg')` }}
      />
      {/* Dynamic gradient overlay to ensure text readability and add movement */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"
        animate={{ opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Subtle Scanner Line Animation across the warehouse */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-0 pointer-events-none"
        animate={{ top: ['-10%', '110%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Glassmorphic Loader Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm mx-6 overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] p-10 flex flex-col items-center"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        
        {/* Animated Inventory Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="relative mb-6 flex items-center justify-center"
        >
          {/* Subtle pulse behind icon */}
          <motion.div 
            className="absolute w-24 h-24 rounded-full border border-cyan-400/30"
            animate={{ scale: [1, 1.5], opacity: [1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <div className="relative w-16 h-16 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-cyan-900/50 border border-white/20 overflow-hidden group">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Boxes className="w-8 h-8 text-white relative z-10" strokeWidth={2} />
          </div>
        </motion.div>

        {/* Text and Branding */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center w-full"
        >
          <h3 className="font-display font-bold text-3xl text-white tracking-tight mb-2 drop-shadow-md">
            Stock<span className="text-cyan-400">Sim</span>
          </h3>
          
          <div className="flex items-center justify-center gap-2.5 mt-6 bg-black/40 backdrop-blur-md rounded-full py-2 px-5 border border-white/10 w-fit mx-auto shadow-inner">
            <Spinner className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-[0.2em] drop-shadow-sm">{label}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function InventoryLoader({ label = 'Loading Module...' }: { label?: string }) {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-6 flex items-center justify-center"
      >
        <motion.div 
          className="absolute w-24 h-24 rounded-full border border-sky-400/30"
          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <div className="relative w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-sky-500/20 border border-white/20 overflow-hidden group">
          <Boxes className="w-8 h-8 text-white relative z-10" strokeWidth={2} />
        </div>
      </motion.div>
      <h3 className="font-display font-bold text-xl text-slate-800 tracking-tight mb-2">
        Stock<span className="text-sky-500">Sim</span>
      </h3>
      <div className="flex items-center justify-center gap-2 mt-2 bg-white rounded-full py-1.5 px-4 border border-slate-200 shadow-sm w-fit mx-auto">
        <Spinner className="w-3.5 h-3.5 text-sky-500" />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2.5">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-pad text-center py-12">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{message}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}


export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/70 rounded-md ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
