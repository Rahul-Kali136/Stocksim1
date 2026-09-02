import { RefreshCw, Download, AlertCircle, TrendingUp, Anchor, BarChart3, Clock, AlertTriangle, MousePointerClick } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState } from '@/components/ui';
import { StatCard } from '@/components/StatCard';
import { NoProduct } from '@/components/DashboardLayout';
import { exportToExcel } from '@/lib/export';

export default function RopRoqPage() {
  const { activeProduct, products, setActiveProductId } = useData();
  const analysis = useAnalysis();
  const { success, error } = useToast();

  if (!activeProduct) {
    return (
      <>
        <PageHeader title="Inventory Planning" subtitle="Reorder point and economic order quantity" icon={<RefreshCw className="w-5 h-5" />} />
        <NoProduct />
      </>
    );
  }
  if (!analysis.ready) {
    return (
      <>
        <PageHeader title="Inventory Planning" subtitle={activeProduct.name} icon={<RefreshCw className="w-5 h-5" />} />
        <EmptyState title="No historical data" message="Upload historical data to compute ROP and ROQ." />
      </>
    );
  }

  const annualDemand = analysis.stats.averageDemand * analysis.stats.rows.length;

  const handleExport = () => {
    exportToExcel(
      [
        {
          name: 'ROP & ROQ',
          rows: [
            ['Metric', 'Value'],
            ['Average Demand', analysis.stats.averageDemand.toFixed(4)],
            ['Average Lead Time', analysis.stats.averageLeadTime.toFixed(4)],
            ['Safety Stock', analysis.safetyStock],
            ['ROP (Reorder Point)', Math.round(analysis.rop)],
            ['Annual Demand', annualDemand.toFixed(2)],
            ['Ordering Cost', activeProduct.ordering_cost],
            ['Holding Cost', activeProduct.holding_cost],
            ['ROQ (Economic Order Quantity)', Math.round(analysis.roq)],
          ],
        },
      ],
      `rop_roq_${activeProduct.name}.xlsx`,
    );
    success('Exported ROP & ROQ to Excel.');
  };

  return (
    <>
      <PageHeader
        title="Inventory Planning"
        subtitle={`${activeProduct.name} — reorder point and economic order quantity`}
        icon={<RefreshCw className="w-5 h-5 text-blue-600" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {products.length > 0 && (
              <div className="flex items-center gap-3 bg-[#f0f8ff] border border-[#bae6fd] rounded-xl px-4 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-[#0369a1] font-bold">
                  <MousePointerClick className="w-4 h-4" />
                  <span className="text-sm">Product:</span>
                </div>
                <select
                  className="bg-white border-2 border-sky-500 text-slate-800 text-sm font-bold rounded-lg focus:ring-sky-500 focus:border-sky-500 block px-3 py-1.5 min-w-[200px] outline-none shadow-sm cursor-pointer"
                  value={activeProduct?.id || ''}
                  onChange={(e) => setActiveProductId(e.target.value)}
                >
                  <option value="" disabled>-- Choose a Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={handleExport} className="btn-secondary py-2 text-sm flex items-center gap-1.5 h-[42px]">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        }
      />

      {/* Baseline Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Average Demand" value={analysis.stats.averageDemand.toFixed(2)} icon={<BarChart3 className="w-5 h-5" />} color="blue" />
        <StatCard label="Average Lead Time" value={`${analysis.stats.averageLeadTime.toFixed(2)} days`} icon={<Clock className="w-5 h-5" />} color="violet" />
        <StatCard label="Safety Stock" value={analysis.safetyStock} icon={<Anchor className="w-5 h-5" />} color="emerald" />
        <StatCard label="Annual Demand" value={Math.round(annualDemand)} icon={<TrendingUp className="w-5 h-5" />} color="amber" />
      </div>

      {/* ROP and ROQ Cards */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* ROP Card */}
        <div className="card-pad border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                Reorder Point (ROP)
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                Trigger Metric
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-5xl font-bold text-slate-900 tracking-tight">
                {Math.round(analysis.rop)}
              </span>
              <span className="text-slate-500 font-medium">units</span>
            </div>
          </div>

          <div className="mt-8 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
            Place an order with your supplier when current inventory falls to exactly <strong>{Math.round(analysis.rop)} units</strong> to seamlessly cover demand during lead time.
          </div>
        </div>

        {/* ROQ Card */}
        <div className="card-pad border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                Reorder Quantity (ROQ / EOQ)
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                Optimization Metric
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-5xl font-bold text-slate-900 tracking-tight">
                {Math.round(analysis.roq)}
              </span>
              <span className="text-slate-500 font-medium">units</span>
            </div>
          </div>

          <div className="mt-8 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
            Order exactly <strong>{Math.round(analysis.roq)} units</strong> per purchase. This specific quantity mathematically minimizes the total sum of ordering and holding costs.
          </div>
        </div>
      </div>

      {analysis.roq === 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 mt-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Cannot Calculate ROQ</h4>
            <p className="text-sm mt-1">Holding cost is zero, which mathematically prevents calculation of the Economic Order Quantity. Please update the product holding cost.</p>
          </div>
        </div>
      )}
    </>
  );
}
