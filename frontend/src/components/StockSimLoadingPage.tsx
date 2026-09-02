import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

const LOADING_PHASES = [
  'Authenticating Session...',
  'Establishing Secure Connection...',
  'Initializing Monte Carlo Engine...',
  'Aggregating Historical Data...',
  'Ready.'
];

export function StockSimLoadingPage() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhaseIndex((prev) => (prev < LOADING_PHASES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(phaseInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-hidden flex flex-col items-center justify-center font-sans antialiased selection:bg-blue-200 text-slate-800">
      
      {/* 1. Ultra-Subtle Corporate Grid Background */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.08) 0px, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.05) 0px, transparent 50%)
          `
        }}
      />

      {/* 2. Abstract Minimalist Centerpiece */}
      <div className="relative z-10 flex flex-col items-center">
        
        <div className="relative mb-10 flex items-center justify-center">
          {/* Sleek Outer Spinning Ring */}
          <motion.svg
            className="w-20 h-20 text-blue-500 absolute"
            viewBox="0 0 100 100"
            fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="80 200"
              strokeLinecap="round"
              className="opacity-80"
            />
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="20 200"
              strokeDashoffset="100"
              strokeLinecap="round"
              className="opacity-40"
            />
          </motion.svg>
          
          {/* Inner Static Track */}
          <svg className="w-20 h-20 text-slate-200 absolute" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" />
          </svg>

          {/* Central Icon */}
          <div className="relative w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 z-10">
            <Activity className="w-5 h-5 text-blue-600" strokeWidth={2} />
          </div>
        </div>

        {/* 3. Typography */}
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-2xl font-extrabold tracking-tight text-slate-800 mb-1"
          style={{ fontFamily: 'var(--font-display, "Plus Jakarta Sans", sans-serif)' }}
        >
          StockSim
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[11px] font-bold text-blue-600 tracking-[0.25em] uppercase mb-12"
        >
          Analytics Engine
        </motion.p>

        {/* 4. Elegant Progress Indicator */}
        <div className="w-64 flex flex-col items-center">
          
          {/* Dynamic Loading Text */}
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={phaseIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-[13px] text-slate-500 font-medium"
              >
                {LOADING_PHASES[phaseIndex]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Minimalist Progress Line */}
          <div className="w-32 h-[1px] bg-slate-200 mt-5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
