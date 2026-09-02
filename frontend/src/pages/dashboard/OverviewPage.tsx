import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import {
  Package,
  Users,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  Upload,
  BarChart2,
  Activity,
  Settings2,
  FileText,
  Eye,
  Database,
  Building2,
  Trash2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { NoProduct } from '@/components/DashboardLayout';

const DONUT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#f97316', '#8b5cf6'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

function today() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

export default function OverviewPage() {
  const { products, activeProduct, suppliers, organizations } = useData();
  const analysis = useAnalysis();
  const { user } = useAuth();
  const { success, error } = useToast();

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User';

  const handleDeleteSimulation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this simulation?')) return;
    try {
      await apiFetch(`/api/simulation/${id}/`, { method: 'DELETE' });
      setDashboardSummaries((prev) => prev.filter((r) => r.id !== id));
      success('Simulation deleted successfully');
    } catch (e: any) {
      console.error(e);
      error(e.message || 'Failed to delete simulation');
    }
  };

  const totalCost = analysis.ready ? analysis.cost.totalCost : 0;
  
  // Immediately load global stockout risk (from sims or theoretical target)
  let stockoutRisk = 0;
  if (analysis.ready && analysis.simulationRows.length > 0) {
    stockoutRisk = (analysis.simulationRows.filter((r) => r.stockout > 0).length / analysis.simulationRows.length) * 100;
  } else if (products.length > 0) {
    stockoutRisk = products.reduce((sum, p: any) => sum + (100 - Number(p.service_level || 95)), 0) / products.length;
  }

  const donutData = analysis.ready
    ? [
        { name: 'Holding Cost', value: Math.round(analysis.cost.overallHoldingCost) },
        { name: 'Ordering Cost', value: Math.round(analysis.cost.orderingCost) },
        { name: 'Stockout Cost', value: Math.round(analysis.cost.stockoutCost) },
        { name: 'Safety Stock Cost', value: Math.round(analysis.safetyStock * (activeProduct?.holding_cost ?? 1)) },
        { name: 'Other', value: Math.max(0, Math.round(totalCost * 0.05)) },
      ].filter((d) => d.value > 0)
    : [];

  const topProductsData = products.slice(0, 5).map((p, i) => ({
    name: p.name,
    cost: Math.round(totalCost * (1 - i * 0.15)) || 0,
  }));

  const [dashboardSummaries, setDashboardSummaries] = useState<any[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [stats, setStats] = useState({
    total_products: 0,
    total_simulations: 0,
    total_inventory_cost: 0,
    average_closing_stock: 0,
  });
  const [backendData, setBackendData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    apiFetch<any>('api/dashboard/')
      .then((res) => {
        if (active && res && res.success && res.data) {
          setBackendData(res.data);
        } else {
          setBackendData({}); // Empty but loaded
        }
      })
      .catch(() => {
        if (active) setBackendData({});
      });
    return () => {
      active = false;
    };
  }, [organizations]);

  useEffect(() => {
    if (!backendData) return;
    
    const recent = backendData.recent_simulations || [];
    const mapped = recent.map((sim: any) => ({
      id: sim.id,
      organization: organizations[0]?.name ?? 'My Org',
      product: sim.product ?? 'N/A',
      simulation_days: sim.days ?? 30,
      rop: sim.rop ?? 'N/A',
      roq: sim.roq ?? 'N/A',
      stockout_risk: sim.stockout_risk ?? 0.0,
      service_level: sim.service_level ?? 95.0,
      total_cost: sim.total_cost ?? 0,
    }));

    // Find products without a simulation run and calculate their theoretical data
    const simulatedNames = new Set(mapped.map((s: any) => s.product));
    const theoretical = products
      .filter((p: any) => !simulatedNames.has(p.product_name || p.name))
      .map((p: any) => {
        const demand = Number(p.average_daily_demand || 0) * Number(p.working_days_per_year || 365);
        const hc = Number(p.holding_cost || 0);
        const oc = Number(p.ordering_cost || 0);
        const eoq = hc > 0 ? Math.sqrt((2 * demand * oc) / hc) : 0;
        const totalCost = hc > 0 && eoq > 0 ? (demand / eoq) * oc + (eoq / 2) * hc : 0;

        return {
          id: p.id,
          isTheoretical: true,
          organization: organizations[0]?.name ?? 'My Org',
          product: p.product_name || p.name || 'N/A',
          simulation_days: 0,
          rop: Math.round(Number(p.calculated_rop || 0)),
          roq: Math.round(Number(p.calculated_roq || 0)),
          stockout_risk: 100 - Number(p.service_level || 95),
          service_level: Number(p.service_level || 95),
          total_cost: totalCost,
        };
      });

    const combined = [...mapped, ...theoretical];
    setDashboardSummaries(combined);
    
    setStats({
      total_products: products.length,
      total_simulations: backendData.summary?.total_simulations ?? 0,
      total_inventory_cost: combined.reduce((sum, s) => sum + Number(s.total_cost || 0), 0),
      average_closing_stock: backendData.statistics?.average_closing_stock ?? 0,
    });
    
    setLoadingSummaries(false);
  }, [backendData, products, organizations]);

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex items-start justify-between flex-wrap gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden"
      >
        {/* Decorative background elements */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" 
        />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {userName}!</h1>
          <p className="text-blue-100/80 mt-1.5 text-sm font-medium max-w-md">Get a bird's eye view of your inventory optimization. Keep track of costs, stockout risks, and active simulations.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 shadow-lg text-sm font-semibold text-white">
          <Database className="w-4 h-4 text-blue-300" />
          {today()}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" style={{ perspective: 1200 }}>
        <StatTile
          label="Total Products"
          value={stats.total_products || products.length}
          icon={<Package className="w-6 h-6 text-blue-600" />}
          bg="bg-blue-50"
          link="/dashboard/products"
          delay={0.1}
        />
        <StatTile
          label="Total Suppliers"
          value={suppliers.length}
          icon={<Users className="w-6 h-6 text-green-600" />}
          bg="bg-green-50"
          link="/dashboard/suppliers"
          delay={0.2}
        />
        <StatTile
          label="Total Simulations"
          value={stats.total_simulations || dashboardSummaries.length}
          icon={<TrendingUp className="w-6 h-6 text-slate-600" />}
          bg="bg-slate-100"
          link="/dashboard/simulation"
          delay={0.3}
        />
        <StatTile
          label="Total Cost (₹)"
          value={`₹${fmt(stats.total_inventory_cost || totalCost)}`}
          icon={<IndianRupee className="w-6 h-6 text-amber-500" />}
          bg="bg-amber-50"
          link="/dashboard/costs"
          valueClass="text-amber-700"
          delay={0.4}
        />
        <StatTile
          label="Stockout Risk"
          value={
            stats.average_closing_stock > 0 ? (
              <div className="flex flex-col">
                <span>{stats.average_closing_stock.toFixed(1)} Units</span>
                <span className="text-[10px] xl:text-xs font-semibold opacity-70 mt-[-2px] tracking-normal uppercase">(Avg Closing Stock)</span>
              </div>
            ) : (
              `${stockoutRisk.toFixed(2)}%`
            )
          }
          icon={<AlertTriangle className="w-6 h-6 text-rose-500" />}
          bg="bg-rose-50"
          link="/dashboard/simulation"
          valueClass="text-rose-600"
          delay={0.5}
        />
      </div>

      {/* No product state */}
      {!activeProduct && (
        <NoProduct>
          <div className="flex gap-2 justify-center mt-4">
            <Link to="/dashboard/products" className="btn-primary">Create a product</Link>
          </div>
        </NoProduct>
      )}

      {/* Main content — only when product exists */}
      {activeProduct && (
        <>
          {/* Shortcut panels — two columns */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Data Upload */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-blue-700 text-base mb-4">Input Data Upload</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <ShortcutRow
                  icon={<Building2 className="w-5 h-5 text-indigo-500" />}
                  label="Organization Details"
                  sub="Add or manage organization information"
                  to="/dashboard/organizations"
                  delay={0.05}
                />
                <ShortcutRow
                  icon={<Users className="w-5 h-5 text-green-500" />}
                  label="Supplier Details"
                  sub="Add or manage supplier information"
                  to="/dashboard/suppliers"
                  delay={0.10}
                />
                <ShortcutRow
                  icon={<Package className="w-5 h-5 text-blue-500" />}
                  label="Product Details"
                  sub="Add or manage product information"
                  to="/dashboard/products"
                  delay={0.15}
                />
                <ShortcutRow
                  icon={<Upload className="w-5 h-5 text-amber-500" />}
                  label="Historical Data Upload"
                  sub="Upload historical demand and lead time (Excel)"
                  to="/dashboard/historical"
                  delay={0.20}
                />
              </div>
            </div>

            {/* Analysis & Results */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-bold text-green-700 text-base mb-4">Analysis & Results</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <ShortcutRow
                  icon={<BarChart2 className="w-5 h-5 text-blue-500" />}
                  label="Demand Probability"
                  sub="View calculated demand probability"
                  to="/dashboard/distribution"
                  delay={0.05}
                />
                <ShortcutRow
                  icon={<Activity className="w-5 h-5 text-green-500" />}
                  label="Lead Time Probability"
                  sub="View calculated lead time probability"
                  to="/dashboard/distribution"
                  delay={0.10}
                />
                <ShortcutRow
                  icon={<TrendingUp className="w-5 h-5 text-violet-500" />}
                  label="Monte Carlo Simulation"
                  sub="Run simulation and view results"
                  to="/dashboard/simulation"
                  delay={0.15}
                />
                <ShortcutRow
                  icon={<Settings2 className="w-5 h-5 text-orange-500" />}
                  label="Inventory Optimization"
                  sub="View optimal inventory parameters"
                  to="/dashboard/rop-roq"
                  delay={0.20}
                />
                <ShortcutRow
                  icon={<IndianRupee className="w-5 h-5 text-rose-500" />}
                  label="Cost Analysis"
                  sub="View inventory cost analysis"
                  to="/dashboard/costs"
                  delay={0.25}
                />
              </div>
            </div>
          </div>

          {/* Inventory Overview donut — full width */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm p-6 relative overflow-hidden"
          >
            <h2 className="font-extrabold text-slate-900 text-lg mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-violet-600" />
              Inventory Cost Breakdown
            </h2>
            {donutData.length > 0 ? (
              <div className="grid lg:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value: any) => [`₹${fmt(Number(value))}`, 'Cost']}
                    />
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                      ))}
                    </Pie>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 font-semibold" fontSize={13}>Total Cost</text>
                    <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={20} fontWeight={800} fill="#0f172a">₹{fmt(totalCost)}</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {donutData.map((d, i) => (
                    <motion.div 
                      key={d.name} 
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm" 
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} 
                        />
                        <span className="text-sm font-bold text-slate-700">{d.name}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">₹{fmt(d.value)}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Upload data to see cost breakdown</p>
              </div>
            )}
          </motion.div>

          {/* Bottom two panels stacked vertically for spaciousness */}
          <div className="space-y-6">
            {/* Product Simulation & Policy Metrics */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Product Simulation & Policy Metrics
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100/80 text-[11px]">
                      <th className="text-left pb-3 font-semibold px-4">ID</th>
                      <th className="text-left pb-3 font-semibold px-4">Organization</th>
                      <th className="text-left pb-3 font-semibold px-4">Product</th>
                      <th className="text-left pb-3 font-semibold px-4">Simulation Days</th>
                      <th className="text-center pb-3 font-semibold px-4">ROP</th>
                      <th className="text-center pb-3 font-semibold px-4">ROQ</th>
                      <th className="text-center pb-3 font-semibold px-4">Stockout Risk</th>
                      <th className="text-center pb-3 font-semibold px-4">Service Level</th>
                      <th className="text-right pb-3 font-semibold px-4">Total Cost</th>
                      <th className="text-center pb-3 font-semibold px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 text-slate-600">
                    {dashboardSummaries.map((r) => {
                      const riskVal = Number(r.stockout_risk || 0);
                      const isHighRisk = riskVal > 15;
                      const isLowRisk = riskVal < 5;
                      
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-all duration-200 group">
                          <td className="py-4 px-4 font-bold text-indigo-600">#{r.id}</td>
                          <td className="py-4 px-4 font-semibold text-slate-500">{r.organization}</td>
                          <td className="py-4 px-4 font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{r.product}</td>
                          <td className="py-4 px-4 font-medium text-slate-500">
                            <span className="bg-slate-100/80 px-2.5 py-1 rounded-full text-slate-600 text-xs">
                              {r.simulation_days} Days
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-medium text-slate-700">{r.rop}</td>
                          <td className="py-4 px-4 text-center font-mono font-medium text-slate-700">{r.roq}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block font-bold px-3 py-1 rounded-full text-xs border ${
                              isHighRisk 
                                ? 'text-rose-600 bg-rose-50/50 border-rose-100' 
                                : isLowRisk 
                                  ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100' 
                                  : 'text-amber-600 bg-amber-50/50 border-amber-100'
                            }`}>
                              {riskVal.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-block font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-3 py-1 rounded-full text-xs">
                              {Number(r.service_level).toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">₹{fmt(Number(r.total_cost))}</td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Link to="/dashboard/simulation" className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white transition-all duration-200">
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button 
                                onClick={() => handleDeleteSimulation(r.id)}
                                className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {dashboardSummaries.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-12">No products or summaries in database yet</p>
                )}
              </div>
            </div>

            {/* Top Products by Total Cost */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 relative overflow-hidden"
            >
              <h2 className="font-extrabold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                Top Products by Total Cost
              </h2>
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topProductsData} barSize={48} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}K`} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(v) => [`₹${fmt(Number(v))}`, 'Total Cost'] as [string, string]} 
                    />
                    <Bar dataKey="cost" radius={[8, 8, 0, 0]} animationDuration={1500} animationEasing="ease-out">
                      {topProductsData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} style={{ filter: 'drop-shadow(0px -4px 6px rgba(0,0,0,0.1))' }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No products yet</p>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-4 border-t border-slate-200 pt-4">
        © 2026 STOCKSIM &nbsp;|&nbsp; Inventory Optimization Using Monte Carlo Simulation
      </div>

      {/* Quick links */}
      <div className="hidden">
        <Link to="/dashboard/reports"><FileText /></Link>
      </div>
    </div>
  );
}

function StatTile({
  label, value, icon, bg, link, valueClass = 'text-slate-900',
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  bg: string;
  link: string;
  valueClass?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.03, rotateY: 5, rotateX: 5, z: 20 }}
      className="group relative bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-sm p-4 xl:p-5 flex flex-col gap-3 transition-shadow overflow-hidden transform-gpu min-w-0"
      style={{ perspective: 1000 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="flex items-center justify-between relative z-10 gap-2">
        <span className="text-[10px] xl:text-xs uppercase tracking-wider text-slate-500 font-semibold leading-tight line-clamp-2">{label}</span>
        <div className={`w-10 h-10 xl:w-12 xl:h-12 rounded-xl shrink-0 ${bg} flex items-center justify-center shadow-inner`}>{icon}</div>
      </div>
      <div className={`text-xl xl:text-2xl 2xl:text-3xl font-extrabold tracking-tight relative z-10 truncate ${valueClass}`}>
        {value}
      </div>
      <Link to={link} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 group/link relative z-10 w-fit mt-auto pt-1">
        View Details 
        <span className="group-hover/link:translate-x-1 transition-transform">→</span>
      </Link>
    </motion.div>
  );
}

function ShortcutRow({ icon, label, sub, to, delay = 0 }: { icon: React.ReactNode; label: string; sub: string; to: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, x: 5 }}
    >
      <Link
        to={to}
        className="flex items-center gap-3 xl:gap-4 p-3 xl:p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight">{label}</div>
          <div className="text-[11px] xl:text-xs font-medium text-slate-400 leading-snug line-clamp-2 mt-0.5">{sub}</div>
        </div>
        <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-full shrink-0 bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors ml-1">
          <span className="text-lg leading-none -mt-0.5">›</span>
        </div>
      </Link>
    </motion.div>
  );
}
