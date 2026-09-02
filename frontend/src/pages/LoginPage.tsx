import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Mail, Lock, ArrowRight, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner, StockSimLoader } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { signIn, forgotPassword, resetPassword } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (
      hash.includes('type=recovery') || 
      hash.includes('recovery_token=') || 
      search.includes('type=recovery')
    ) {
      setViewMode('reset');
    }
  }, []);

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Username or email is required.');
      return;
    }
    if (!password) {
      error('Password is required.');
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      error(err);
      return;
    }
    navigate('/dashboard');
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      error('Please enter a valid email address to reset your password.');
      return;
    }
    setLoading(true);
    const { error: err } = await forgotPassword(email);
    setLoading(false);
    if (err) {
      error(err);
      return;
    }
    success('Password reset OTP sent to your email successfully!');
    setViewMode('reset');
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      error('Please enter the OTP sent to your email.');
      return;
    }
    if (newPassword.length < 6) {
      error('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    const { error: err } = await resetPassword(email, otp.trim(), newPassword);
    setLoading(false);
    
    if (err) {
      error(err);
      return;
    }
    
    success('Password updated successfully! Please sign in with your new password.');
    setViewMode('login');
    window.location.hash = '';
    setPassword('');
    setOtp('');
  };

  return (
    <AnimatePresence mode="wait">
        <motion.div 
          key="page"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="min-h-screen grid lg:grid-cols-2 bg-slate-100 font-sans select-none">
      
      {/* Left Illustrative Panel with High-Fidelity Professional Image */}
      <div className="hidden lg:flex flex-col justify-between relative p-12 overflow-hidden border-r border-slate-200">
        {/* Background Image with elegant overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] hover:scale-105"
          style={{ backgroundImage: `url('/login_dashboard_preview.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950/30 via-transparent to-purple-950/20" />

        {/* Branding */}
        <Link to="/" className="flex items-center gap-2.5 relative z-10 w-fit hover:opacity-90 active:scale-95 transition-all">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <Boxes className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="font-display font-black text-xl tracking-tight text-white">
            Stock<span className="text-indigo-400">Sim</span>
          </span>
        </Link>

        {/* Content */}
        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-400/25 rounded-full text-xs font-bold text-indigo-300 mb-4 backdrop-blur-md">
            📈 Enterprise-Grade Supply Chain Sim
          </span>
          <h2 className="font-display text-4xl font-black leading-tight text-white tracking-tight">
            Design, Simulate, and Optimize Inventory Policies.
          </h2>
          <p className="text-slate-300 mt-4 leading-relaxed text-sm">
            Harness Monte Carlo trial simulations and advanced safety stock algorithms to eliminate stockouts while minimizing total carrying cost.
          </p>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs relative z-10 font-semibold tracking-wider uppercase">
          © {new Date().getFullYear()} StockSim Platform
        </p>
      </div>

      {/* Right Form Panel (Light Theme) */}
      <div className="flex items-center justify-center p-6 bg-slate-50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />
        
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative z-10">
          
          {/* Logo on Mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-lg text-slate-900">Stock<span className="text-indigo-600">Sim</span></span>
          </div>

          {/* VIEW MODE: LOGIN */}
          {viewMode === 'login' && (
            <>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Sign In</h1>
              <p className="text-slate-550 text-xs mt-1 mb-6">Access your workspace to continue simulation testing.</p>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Username or Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
                      placeholder="you@company.com or username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => setViewMode('forgot')}
                      className="text-[11px] text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white rounded-xl py-2.5 font-bold text-sm shadow-md shadow-indigo-550/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Spinner className="w-4 h-4 text-white" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                    Create one
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* VIEW MODE: FORGOT PASSWORD */}
          {viewMode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => setViewMode('login')}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-xs mb-4 transition-colors focus:outline-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>

              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5.5 h-5.5 text-indigo-600" />
                Forgot Password
              </h1>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed mb-6">
                Enter your email address and we will send a secure link to reset your account credentials.
              </p>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white rounded-xl py-2.5 font-bold text-sm shadow-md shadow-indigo-550/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Spinner className="w-4 h-4 text-white" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {/* VIEW MODE: RESET PASSWORD */}
          {viewMode === 'reset' && (
            <>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Lock className="w-5.5 h-5.5 text-purple-600" />
                Set New Password
              </h1>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed mb-6">
                Please enter a secure new password for your StockSim account.
              </p>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">OTP Verification Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
                      placeholder="Enter the OTP from your email"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none"
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-650 hover:from-purple-650 hover:to-indigo-750 text-white rounded-xl py-2.5 font-bold text-sm shadow-md shadow-indigo-550/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Spinner className="w-4 h-4 text-white" /> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </motion.div>
    </AnimatePresence>
  );
}
