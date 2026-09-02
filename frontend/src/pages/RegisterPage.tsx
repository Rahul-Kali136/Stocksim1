import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Spinner, StockSimLoader } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !/^[A-Za-z]+$/.test(firstName.trim())) {
      error('First Name must contain letters only.');
      return;
    }
    if (!lastName.trim() || !/^[A-Za-z]+$/.test(lastName.trim())) {
      error('Last Name must contain letters only.');
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      error('Phone Number must contain exactly 10 digits.');
      return;
    }
    if (!name.trim() || name.length < 3) {
      error('Username must be at least 3 characters long.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      error('Please enter a valid email address.');
      return;
    }
    if (!state.trim()) {
      error('State is required.');
      return;
    }
    if (password.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      error('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: err } = await signUp(email, password, {
      username: name,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phone,
      state: state.trim(),
    });
    setLoading(false);
    if (err) {
      error(err);
      return;
    }
    success('Account created successfully! Please sign in with your credentials.');
    navigate('/login');
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
          style={{ backgroundImage: `url('/warehouse_logistics_future.png')` }}
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
            Start forecasting inventory risk today.
          </h2>
          <p className="text-slate-300 mt-4 leading-relaxed text-sm">
            Create a free account to upload demand data, run Monte Carlo simulations, and compare inventory policies.
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
            <span className="font-display font-black text-lg text-slate-900">Stock<span className="text-indigo-650">Sim</span></span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">Create Account</h1>
          <p className="text-slate-550 text-xs mt-1 mb-6">Fill in your information to get started with analysis.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                    placeholder="First Name" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                    placeholder="Last Name" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                  placeholder="Your username" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            </div>

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

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                  placeholder="10-digit phone number" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">State</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                  placeholder="Your State" 
                  value={state} 
                  onChange={(e) => setState(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                  placeholder="Min. 6 characters" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-650 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-405 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 transition-all focus:outline-none" 
                  placeholder="••••••••" 
                  value={confirm} 
                  onChange={(e) => setConfirm(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-650 hover:to-purple-700 text-white rounded-xl py-2.5 font-bold text-sm shadow-md shadow-indigo-550/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50" 
              disabled={loading}
            >
              {loading ? <Spinner className="w-4 h-4 text-white" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-bold hover:text-indigo-705 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
    </AnimatePresence>
  );
}
