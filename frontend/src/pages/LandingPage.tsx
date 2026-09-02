import { Link } from 'react-router-dom';
import {
  Upload,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  LineChart,
  IndianRupee,
  GitCompare,
  ArrowRight,
  CheckCircle2,
  Boxes,
  FileSpreadsheet,
  Mail,
  Info,
  TrendingUp,
  Database,
  Target,
  Zap,
} from 'lucide-react';
import { useEffect } from 'react';

const features = [
  { icon: Upload, title: 'Historical Data Upload', desc: 'Import demand and lead-time history from Excel or CSV files in seconds. No manual data entry required.' },
  { icon: BarChart3, title: 'Probability Engine', desc: 'Build frequency, probability, cumulative, and random-number interval tables automatically from your data.' },
  { icon: ShieldCheck, title: 'Safety Stock Calculation', desc: 'Compute safety stock from service-level Z values and demand standard deviation with proven formulas.' },
  { icon: RefreshCw, title: 'ROP & ROQ', desc: 'Derive the reorder point and economic order quantity using industry-standard inventory formulas.' },
  { icon: LineChart, title: 'Monte Carlo Simulation', desc: 'Run thousands of simulated days to see how inventory behaves under uncertainty and variability.' },
  { icon: IndianRupee, title: 'Inventory Cost Analysis', desc: 'Break down holding, ordering, and stockout costs across the full analysis horizon from your real data.' },
];

const steps = [
  { icon: Database, title: 'Upload Your Data', desc: 'Import historical demand and lead-time records from Excel or CSV. Your data stays private and secure.' },
  { icon: Zap, title: 'Run the Analysis', desc: 'The engine computes probability distributions, safety stock, ROP, ROQ, and runs Monte Carlo simulation automatically.' },
  { icon: Target, title: 'Optimize & Compare', desc: 'Compare service-level policies side by side, view cost breakdowns, and pick the lowest-cost plan.' },
];

const stats = [
  { value: '7', label: 'Analysis Modules' },
  { value: '95%', label: 'Service Level Support' },
  { value: '1,000+', label: 'Simulation Iterations' },
  { value: 'Excel', label: 'Import & Export' },
];

const benefits = [
  '95% service level support',
  'Real-time Monte Carlo simulation',
  'Automated reorder planning',
  'Excel import & export',
  'Policy comparison & recommendations',
  'Cost breakdown from real data',
];

export default function LandingPage() {
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();
  }, []);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-transform duration-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/10">
              <Boxes className="w-5.5 h-5.5" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-slate-900">
              Stock<span className="text-blue-600">Sim</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#stats" className="hover:text-blue-600 transition-colors">Why StockSim</a>
            <a href="#footer" className="hover:text-blue-600 transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary py-1.5 px-4 text-xs sm:text-sm font-bold border-slate-200 hover:bg-slate-100 hover:border-slate-300">Sign In</Link>
            <Link to="/register" className="btn-primary py-1.5 px-4 text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/10">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-50 py-16 lg:py-24">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.015] bg-[radial-gradient(circle_at_1px_1px,#1e293b_1px,transparent_0)] bg-[size:40px_40px]" />
        
        <div className="relative max-w-7xl mx-auto px-5">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Monte Carlo Inventory Risk Forecaster
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] text-slate-900 tracking-tight">
                Forecast demand.<br />
                Optimize inventory.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-650 to-cyan-600">Cut carrying costs.</span>
              </h1>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                StockSim applies rigorous probability modeling and Monte Carlo simulations directly to your historical spreadsheets. Quantify stockout risks, size safety stock buffers, and automate replenishment schedules effortlessly.
              </p>
              <div className="flex flex-wrap gap-3.5 justify-center lg:justify-start pt-2">
                <Link to="/register" className="btn-primary text-sm px-6 py-3 font-bold bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/15 flex items-center gap-2">
                  Start Analyzing Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-secondary text-sm px-6 py-3 font-bold border-slate-200 hover:bg-slate-100 hover:border-slate-300">
                  View Demo Dashboard
                </Link>
              </div>
            </div>

            {/* Right Asset Showcase */}
            <div className="lg:col-span-6">
              <style>{`
                @keyframes float3D {
                  0%, 100% { transform: rotateX(9deg) rotateY(-16deg) rotateZ(3deg) translateY(0px); }
                  50% { transform: rotateX(7deg) rotateY(-13deg) rotateZ(2deg) translateY(-12px); }
                }
                .animate-float-3d {
                  animation: float3D 6s ease-in-out infinite;
                  transform-style: preserve-3d;
                  perspective: 1200px;
                }
                .animate-float-3d:hover {
                  animation: none !important;
                  transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.04) translateY(-4px) !important;
                  box-shadow: 0 35px 60px -15px rgba(99, 102, 241, 0.3) !important;
                }
              `}</style>
              <div className="relative mx-auto max-w-lg lg:max-w-none" style={{ perspective: '1200px' }}>
                {/* Visual backdrops */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-20 pointer-events-none" />
                
                {/* Browser Card Mock */}
                <div className="relative rounded-2xl shadow-2xl border border-slate-200 overflow-hidden bg-white transition-all duration-700 ease-out animate-float-3d">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 border-b border-slate-200">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">stocksim.app/simulation</span>
                  </div> 
                  {/* High Fidelity Dashboard Preview */}
                  <img  
                    src="/login_dashboard_preview.png" 
                    alt="StockSim Premium Dashboard Preview" 
                    className="w-full h-auto object-cover object-center max-h-[350px] transition-transform duration-[6000ms] hover:scale-102"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.slice(0, 4).map((b) => (
              <div key={b} className="flex items-center gap-2.5 justify-center md:justify-start">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-slate-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">How It Works</span>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">From raw spreadsheets to optimization decisions</h2>
          <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">No manual calculators or complicated sheets. Upload your data and let our background engines deliver visual metrics.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((s, i) => (
            <div key={s.title} className="relative bg-white rounded-2xl border border-slate-250/70 p-6 text-center shadow-xs hover:shadow-md transition-all duration-200 group">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-650 text-white text-xs font-black flex items-center justify-center shadow-md">
                {i + 1}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mt-2 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-5 font-bold text-base text-slate-900">{s.title}</h3>
              <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Analytics Showcase Section */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Image Visual */}
            <div className="lg:col-span-6 order-last lg:order-first">
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl group bg-white p-2.5">
                <div className="relative rounded-2xl overflow-hidden">
                  <img 
                    src="/warehouse_logistics_future.png" 
                    alt="Futuristic Logistics Management Visual" 
                    className="w-full h-auto object-cover object-center max-h-[380px] rounded-2xl transition-transform duration-[6000ms] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Right Information */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Enterprise Optimization</span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Rethink Inventory Control with Probabilistic Intelligence
              </h2>
              <p className="text-slate-650 text-sm sm:text-base leading-relaxed">
                StockSim goes beyond simple formulas. By correlating demand frequency distributions with lead time probability parameters, our platform helps you plan for real-world supply chain friction.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-650 flex items-center justify-center shrink-0 mt-0.5">
                    🎯
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Dynamic Buffer Size Customization</h4>
                    <p className="text-xs text-slate-500 mt-1">Automatically scale safety stock margins based on service levels to avoid capital overcommitment.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-650 flex items-center justify-center shrink-0 mt-0.5">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Automated Supplier Latency Safeguards</h4>
                    <p className="text-xs text-slate-500 mt-1">Account for potential vendor dispatch delays by simulating probabilistic lead time constraints.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Features</span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">Full-suite inventory forecasting toolkit</h2>
            <p className="text-slate-500 text-sm sm:text-base mt-3 leading-relaxed">Analyze history, compute distribution intervals, and simulate supply chain variability side-by-side.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-350 group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 text-base">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
            {/* Policy comparison highlight card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-350 group flex flex-col justify-center">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 mb-3">
                <GitCompare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Policy Comparison</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">Compare multiple service-level policies side by side and pick the lowest-cost plan with a clear recommendation graph.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_50%,#2563eb_0%,transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-5 py-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight">Built for Supply-Chain Professionals</h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">Replace spreadsheet guesswork with statistically sound policy design metrics.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xs hover:bg-white/10 transition-colors">
                <div className="font-display text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">{s.value}</div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-2.5">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-200 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-650 to-cyan-600 px-8 py-16 text-center shadow-xl shadow-blue-600/10">
          <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative max-w-xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to optimize your inventory policies?</h2>
            <p className="text-blue-100 text-sm sm:text-base mt-3 leading-relaxed">Upload demand spreadsheets and unlock probabilistic reorder guidelines in under 60 seconds.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-800 font-bold text-sm shadow-md hover:bg-slate-50 active:scale-[0.98] transition-all">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-transparent text-white font-bold text-sm border border-white/30 hover:bg-white/10 transition-all">
                Access Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-slate-950 text-slate-400 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-5 py-12 grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-600 flex items-center justify-center">
                <Boxes className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-display font-black tracking-tight">Stock<span className="text-blue-400">Sim</span></span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">Monte Carlo inventory simulation modeling and safety stock optimization for modern business operations.</p>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Features</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Forecasting Modules</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#stats" className="hover:text-white transition-colors">Why StockSim</a></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Get Started Free</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> About System</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Spreadsheet Templates</a></li>
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Replenishment Guides</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-white transition-colors flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Support Desk</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-5 py-6 text-xs text-slate-650 text-center font-medium">
            © {new Date().getFullYear()} StockSim. All rights reserved. Designed for professional inventory risk modeling.
          </div>
        </div>
      </footer>
    </div>
  );
}
