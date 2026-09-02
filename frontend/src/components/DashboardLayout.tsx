import { useState, useEffect, Suspense, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { InventoryLoader } from '@/components/ui';
import { StockSimLoadingPage } from '@/components/StockSimLoadingPage';
import {
  LayoutDashboard,
  Package,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  LineChart,
  DollarSign,
  GitCompare,
  FileText,
  Settings,
  Boxes,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Upload,
  Users,
  Bell,
  User,
  Building2,
  BadgeCheck,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';

const inputNavItems = [
  {
    to: '/dashboard/organizations',
    label: 'Organization Management',
    icon: Building2,
    badgeBg: 'bg-blue-500/15 text-blue-400',
    activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20',
  },
  {
    to: '/dashboard/suppliers',
    label: 'Supplier Management',
    icon: Users,
    badgeBg: 'bg-purple-500/15 text-purple-400',
    activeBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20',
  },
  {
    to: '/dashboard/products',
    label: 'Product Management',
    icon: Package,
    badgeBg: 'bg-emerald-500/15 text-emerald-400',
    activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20',
  },
  {
    to: '/dashboard/historical',
    label: 'Historical Data',
    icon: Upload,
    badgeBg: 'bg-cyan-500/15 text-cyan-400',
    activeBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20',
  },
];

const analysisNavItems = [
  {
    to: '/dashboard/distribution',
    label: 'Probability Distribution',
    icon: BarChart3,
    badgeBg: 'bg-amber-500/15 text-amber-400',
    activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20',
  },
  {
    to: '/dashboard/safety-stock',
    label: 'Inventory Policy',
    icon: ShieldCheck,
    badgeBg: 'bg-blue-500/15 text-blue-400',
    activeBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20',
  },
  {
    to: '/dashboard/rop-roq',
    label: 'Inventory Planning',
    icon: RefreshCw,
    badgeBg: 'bg-teal-500/15 text-teal-400',
    activeBg: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20',
  },
  {
    to: '/dashboard/simulation',
    label: 'Inventory Simulation',
    icon: LineChart,
    badgeBg: 'bg-rose-500/15 text-rose-400',
    activeBg: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-600/20',
  },
  {
    to: '/dashboard/costs',
    label: 'Cost Evaluation',
    icon: DollarSign,
    badgeBg: 'bg-yellow-500/15 text-yellow-400',
    activeBg: 'bg-gradient-to-r from-amber-600 to-yellow-500 text-white shadow-md shadow-amber-600/20',
  },
  {
    to: '/dashboard/policies',
    label: 'Policy Evaluation',
    icon: GitCompare,
    badgeBg: 'bg-violet-500/15 text-violet-400',
    activeBg: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-600/20',
  },
  {
    to: '/dashboard/reports',
    label: 'Reports & Insights',
    icon: FileText,
    badgeBg: 'bg-sky-500/15 text-sky-400',
    activeBg: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/20',
  },
];

const systemNavItems = [
  {
    to: '/dashboard/profile',
    label: 'Profile',
    icon: User,
    badgeBg: 'bg-cyan-500/15 text-cyan-400',
    activeBg: 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/20',
  },
  {
    to: '/dashboard/subscription',
    label: 'Billing & Subscriptions',
    icon: CreditCard,
    badgeBg: 'bg-emerald-500/15 text-emerald-400',
    activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20',
  },
  {
    to: '/dashboard/audit-logs',
    label: 'Audit Logs',
    icon: ShieldCheck,
    badgeBg: 'bg-amber-500/15 text-amber-400',
    activeBg: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/20',
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    badgeBg: 'bg-slate-500/15 text-slate-400',
    activeBg: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md shadow-slate-700/20',
  },
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const { products, activeProduct, setActiveProductId, organizations } = useData();
  const { success } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showAppLoader, setShowAppLoader] = useState(() => !sessionStorage.getItem('hasSeenDashboardLoader'));

  useEffect(() => {
    if (showAppLoader) {
      const timer = setTimeout(() => {
        setShowAppLoader(false);
        sessionStorage.setItem('hasSeenDashboardLoader', 'true');
      }, 8000); // 8 seconds to match animation
      return () => clearTimeout(timer);
    }
  }, [showAppLoader]);

  const hideSwitcherRoutes = [
    '/dashboard/organization',
    '/dashboard/suppliers',
    '/dashboard/product',
    '/dashboard',
    '/dashboard/'
  ];
  const shouldShowSwitcher = !hideSwitcherRoutes.includes(pathname);
  const [bellOpen, setBellOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [apiNotifications, setApiNotifications] = useState<any[]>([]);
  const [dataNotifications, setDataNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(localStorage.getItem('user_avatar'));

  useEffect(() => {
    setAvatar(localStorage.getItem('user_avatar'));
    const currentEmail = localStorage.getItem('user_email') || user?.email || 'satya@gmail.com';
    apiFetch<any>(`api/profile/?email=${currentEmail}`)
      .then((data) => {
        if (data && data.avatar) {
          setAvatar(data.avatar);
          localStorage.setItem('user_avatar', data.avatar);
        }
      }).catch(err => console.error("Could not fetch avatar", err));
  }, [pathname, user]);

  // Generate Data-Driven Notifications
  useEffect(() => {
    const generated: any[] = [];
    products.forEach((p: any, idx: number) => {
      const pName = p.product_name || p.name || 'Unknown Product';
      
      // 1. Low Stock Alert
      if (p.opening_stock !== null && p.rop !== null && p.opening_stock < p.rop) {
        generated.push({
          id: `data-stock-${p.id || idx}`,
          type: 'Alert',
          product: pName,
          message: `Stock level (${p.opening_stock}) has fallen below the calculated Reorder Point (${Math.round(p.rop)}). Consider restocking.`,
          status: 'Unread'
        });
      }

      // 2. Missing Supplier
      if (!p.supplier_id && !p.supplier) {
        generated.push({
          id: `data-supp-${p.id || idx}`,
          type: 'Info',
          product: pName,
          message: `No primary supplier is linked. Update vendor details for automated alerts.`,
          status: 'Unread'
        });
      }
      
      // 3. High Stockout Cost Risk
      if (p.stockout_cost !== null && p.unit_price !== null && p.stockout_cost > p.unit_price * 5) {
        generated.push({
          id: `data-risk-${p.id || idx}`,
          type: 'Warning',
          product: pName,
          message: `High stockout penalty detected (₹${p.stockout_cost}). Ensure safety stock is sufficient.`,
          status: 'Unread'
        });
      }
    });
    setDataNotifications(generated);
  }, [products]);

  const fetchNotifications = () => {
    apiFetch<any[]>('api/notifications/')
      .then((data) => {
        setApiNotifications(data || []);
        setLoadingNotifications(false);
      })
      .catch(() => {
        setLoadingNotifications(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const notifications = [...dataNotifications, ...apiNotifications];

  const handleSignOut = async () => {
    await signOut();
    success('Signed out.');
    navigate('/');
  };

  const userName = localStorage.getItem('user_display_name') || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 border-r border-slate-800 lg:border-r-0 rounded-l-none lg:rounded-l-3xl shadow-2xl relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      
      {/* Logo Header */}
      <Link to="/dashboard" className="relative flex items-center gap-3.5 px-6 py-6 border-b border-white/5 shrink-0 bg-slate-900/50 backdrop-blur-md">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
          <Boxes className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-wider text-sm">STOCKSIM</div>
          <div className="text-[10px] text-blue-400/80 font-bold uppercase tracking-wider leading-none mt-1">Risk Forecaster</div>
        </div>
      </Link>

      <nav className="relative flex-1 overflow-y-auto py-6 space-y-7 px-4 z-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* Dashboard Link */}
        <div className="space-y-1.5">
          <NavLink
            to="/dashboard"
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group ${isActive
                ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50 shadow-inner' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300 ring-1 ring-white/5'
                  }`}>
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <span>Dashboard Overview</span>
              </>
            )}
          </NavLink>
        </div>

        {/* INPUT DATA SECTION */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            Management & Data
          </div>
          <div className="space-y-1">
            {inputNavItems.map((item, i) => (
              <NavLink
                key={`${item.to}-${i}`}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 group ${isActive ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/30' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300 ring-1 ring-white/5'
                      }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* ANALYSIS & RESULTS SECTION */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
            Simulations & Analysis
          </div>
          <div className="space-y-1">
            {analysisNavItems.map((item, i) => (
              <NavLink
                key={`${item.to}-${i}`}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 group ${isActive ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/30' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300 ring-1 ring-white/5'
                      }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="whitespace-normal leading-snug">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* SYSTEM CONTROL */}
        <div className="space-y-2 pb-6">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></span>
            System Controls
          </div>
          <div className="space-y-1">
            {systemNavItems.map((item, i) => (
              <NavLink
                key={`${item.to}-sys-${i}`}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 group ${isActive ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/30' : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300 ring-1 ring-white/5'
                      }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <div className="pt-3 mt-3 border-t border-white/5">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all duration-300 group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center group-hover:bg-rose-500/20 group-hover:text-rose-400 ring-1 ring-white/5 group-hover:ring-rose-500/30">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );

  if (showAppLoader) {
    return <StockSimLoadingPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 fixed top-4 bottom-4 left-4 z-30 overflow-y-auto rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-900/40">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-slate-400 z-10 p-1 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-80 flex flex-col min-w-0 transition-all">
        {/* Topbar */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-20 flex items-center justify-between px-6 lg:px-10 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="font-extrabold text-slate-800 text-xl tracking-tight">Dashboard</span>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell */}
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative w-11 h-11 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 hover:shadow-md transition-all duration-300 group"
            >
              <Bell className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              {notifications.filter(n => n.status !== 'Read').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-rose-500/30 border-2 border-white animate-pulse">
                  {notifications.filter(n => n.status !== 'Read').length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-[calc(100%+0.5rem)] right-0 w-[360px] bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl z-20 overflow-hidden"
                  >
                    <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100/80 flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-500" /> Notifications
                      </span>
                      <button className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-600 font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all" onClick={() => setBellOpen(false)}>Close</button>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-4 hover:bg-blue-50/50 transition-colors cursor-pointer group">
                          <div className="font-bold text-slate-800 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                              {n.type} <span className="text-slate-400 text-xs font-medium">#{n.id}</span>
                            </span>
                            <span className={`text-[10px] px-2 py-1 rounded-md font-extrabold uppercase tracking-wider ${n.status === 'Read' ? 'text-slate-400 bg-slate-100' : 'text-blue-700 bg-blue-100/80'}`}>
                              {n.status}
                            </span>
                          </div>
                          <p className="text-blue-600 font-bold text-xs mt-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {n.product}</p>
                          <p className="text-slate-600 mt-1.5 font-medium text-sm leading-relaxed">{n.message}</p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="px-6 py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                          <Bell className="w-8 h-8 opacity-20" />
                          <span className="text-sm font-semibold">You're all caught up!</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-inner overflow-hidden border border-white/20">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left mr-1">
                  <div className="text-sm font-bold text-slate-800 leading-none">{userName}</div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">Admin</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-[calc(100%+0.75rem)] right-0 w-64 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl z-20 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="text-sm font-extrabold text-slate-900 truncate">{userName}</div>
                        <div className="text-xs font-semibold text-slate-500 truncate mt-0.5">{user?.email}</div>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <User className="w-4 h-4" />
                          My Profile
                        </Link>
                        <Link
                          to="/dashboard/settings"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </Link>
                        <div className="h-px bg-slate-100 my-1" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { transform: 'none', filter: 'none' } }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full h-full"
            >
              <Suspense fallback={<InventoryLoader label="Loading Module..." />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export function NoProduct({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-16 px-6">
      <Package className="w-10 h-10 text-slate-300 mx-auto" />
      <h3 className="mt-4 text-lg font-semibold text-slate-800">No product selected</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        Select a product from the top bar, or create a new one to start running simulations.
      </p>
      {children}
    </div>
  );
}
