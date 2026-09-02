import { Settings, Database, Sliders, Info, RefreshCw, Cpu, Activity, Server, FileText } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/ui';
import { SERVICE_LEVELS } from '@/lib/simulation';

export default function SettingsPage() {
  const { products, refreshProducts, refreshSuppliers } = useData();
  const { success } = useToast();

  const handleRefreshAll = async () => {
    await Promise.all([refreshProducts(), refreshSuppliers()]);
    success('All remote schemas and datasets refreshed successfully.');
  };

  return (
    <>
      <PageHeader 
        title="System Settings" 
        subtitle="Manage global model thresholds, lookups, and dataset synchronizations" 
        icon={<Settings className="w-5 h-5 text-slate-800" />} 
      />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Lookup Reference Table (8 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-4">
              <Sliders className="w-5 h-5 text-sky-600 bg-sky-50 p-1 rounded-lg" />
              <div>
                <h3 className="font-bold text-slate-850 text-sm">Service Level Standard (Z-Value Lookup)</h3>
                <p className="text-[10px] text-slate-400">Critical factor parameters matched to customer satisfaction probabilities</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              The safety factor (Z-Value) maps the confidence level that stockouts will not occur. These standards are automatically injected into the Monte Carlo simulation logic.
            </p>

            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3">Confidence Target</th>
                    <th className="px-4 py-3">Z-Score Offset Value</th>
                    <th className="px-4 py-3 text-right">Protection Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-650 font-medium">
                  {Object.entries(SERVICE_LEVELS).map(([sl, z]) => {
                    const zNum = typeof z === 'number' ? z : parseFloat(String(z));
                    const quality = zNum >= 2.0 ? 'Premium Access' : zNum >= 1.6 ? 'High Standard' : 'Basic Balance';
                    const qualityColor = zNum >= 2.0 ? 'text-emerald-600 bg-emerald-50' : zNum >= 1.6 ? 'text-sky-600 bg-sky-50' : 'text-slate-500 bg-slate-50';
                    return (
                      <tr key={sl} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">{sl}% Target</td>
                        <td className="px-4 py-3 font-mono text-slate-850">{z}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${qualityColor}`}>
                            {quality}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Data control & Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Data Controls Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4 mb-4">
              <Database className="w-5 h-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg" />
              <div>
                <h3 className="font-bold text-slate-850 text-sm">Data Synchronizations</h3>
                <p className="text-[10px] text-slate-400">Manage connections to your remote datasets</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Local Cache Schema</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">Force reload active catalog and suppliers.</p>
                </div>
                <button 
                  onClick={handleRefreshAll} 
                  className="btn flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Synchronize
                </button>
              </div>

              {/* Server Stats */}
              <div className="space-y-2.5 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-slate-400" /> API Gateway</span>
                  <span className="font-bold text-slate-700">Online</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-slate-400" /> Active Products</span>
                  <span className="font-bold text-slate-700"><strong>{products.length}</strong> items cached</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-slate-400" /> Engine Version</span>
                  <span className="font-mono font-bold text-slate-700">v3.4-mc</span>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full translate-x-8 -translate-y-8 blur-xl"></div>
            <div className="flex items-center gap-3 border-b border-slate-150 pb-3 mb-3 relative z-10">
              <Info className="w-5 h-5 text-sky-600 bg-sky-50 p-1 rounded-lg" />
              <h3 className="font-bold text-slate-850 text-sm">Platform Audit Brief</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed relative z-10">
              StockSim runs deep-level Monte Carlo inventory forecasting. It integrates demand probability curves, safety margins, reorder thresholds, and active carrying costs to identify optimal policies that secure targeted delivery guarantees at minimal overhead cost.
            </p>
          </div>

        </div>

      </div>
    </>
  );
}
