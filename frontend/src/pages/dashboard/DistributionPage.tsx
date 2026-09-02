import { BarChart3, Download, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState } from '@/components/ui';
import { NoProduct } from '@/components/DashboardLayout';
import { exportToExcel } from '@/lib/export';

function DistTable({
  title,
  rows,
  gradientId,
  startColor,
  stopColor,
  headerGradient,
}: {
  title: string;
  rows: { value: number; frequency: number; probability: number; cumulative: number; interval: string }[];
  gradientId: string;
  startColor: string;
  stopColor: string;
  headerGradient: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden card-hover">
      <div className={`px-5 py-3.5 text-white font-bold text-base flex items-center justify-between ${headerGradient}`}>
        <span>{title}</span>
        <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-medium">{rows.length} Values</span>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows.map((r) => ({ value: r.value, frequency: r.frequency }))}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={startColor} stopOpacity={1} />
                <stop offset="100%" stopColor={stopColor} stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="value" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Bar dataKey="frequency" fill={`url(#${gradientId})`} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto mt-4 rounded-xl border border-slate-100">
          <table className="table-base">
            <thead>
              <tr>
                <th>Value</th>
                <th>Frequency</th>
                <th>Probability</th>
                <th>Cumulative</th>
                <th>RN Interval</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.value} className="hover:bg-blue-50/40 transition-colors">
                  <td className="font-semibold text-slate-800">{r.value}</td>
                  <td className="font-medium text-slate-700">{r.frequency}</td>
                  <td className="font-medium text-slate-700">{r.probability.toFixed(4)}</td>
                  <td className="font-medium text-slate-700">{r.cumulative.toFixed(4)}</td>
                  <td>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold font-mono">
                      {r.interval}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DistributionPage() {
  const { activeProduct, products, setActiveProductId } = useData();
  const analysis = useAnalysis();
  const { success, error } = useToast();

  if (!activeProduct) {
    return (
      <>
        <PageHeader title="Distribution Engine" subtitle="Probability tables for demand and lead time" icon={<BarChart3 className="w-5 h-5" />} />
        <NoProduct />
      </>
    );
  }
  if (!analysis.ready) {
    return (
      <>
        <PageHeader
          title="Distribution Engine"
          subtitle={activeProduct.name}
          icon={<BarChart3 className="w-5 h-5" />}
          action={
            products.length > 0 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white font-semibold"
                value={activeProduct.id}
                onChange={(e) => setActiveProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    Product: {p.name}
                  </option>
                ))}
              </select>
            )
          }
        />
        <EmptyState title="No historical data" message="Upload historical data to generate probability distributions." />
      </>
    );
  }

  const handleExport = () => {
    if (analysis.demandDist.length === 0) {
      error('No distribution data to export.');
      return;
    }
    exportToExcel(
      [
        {
          name: 'Demand Distribution',
          rows: [
            ['Value', 'Frequency', 'Probability', 'Cumulative', 'RN Interval'],
            ...analysis.demandDist.map((r) => [r.value, r.frequency, r.probability.toFixed(4), r.cumulative.toFixed(4), r.interval]),
          ],
        },
        {
          name: 'Lead Time Distribution',
          rows: [
            ['Value', 'Frequency', 'Probability', 'Cumulative', 'RN Interval'],
            ...analysis.leadDist.map((r) => [r.value, r.frequency, r.probability.toFixed(4), r.cumulative.toFixed(4), r.interval]),
          ],
        },
      ],
      `distribution_${activeProduct.name}.xlsx`,
    );
    success('Exported distribution tables.');
  };

  const totalDemandRecords = analysis.demandDist.reduce((sum, item) => sum + item.frequency, 0);
  const totalLeadRecords = analysis.leadDist.reduce((sum, item) => sum + item.frequency, 0);

  return (
    <>
      <PageHeader
        title="Distribution Engine"
        subtitle={`${activeProduct.name} — frequency, probability, cumulative, and random-number intervals`}
        icon={<BarChart3 className="w-5 h-5" />}
        action={
          <div className="flex gap-2">
            {products.length > 0 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white font-semibold"
                value={activeProduct.id}
                onChange={(e) => setActiveProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    Product: {p.name}
                  </option>
                ))}
              </select>
            )}
            <button onClick={handleExport} className="btn-secondary">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Product Name</p>
            <h2 className="text-2xl font-bold text-slate-800 truncate max-w-[200px]">{activeProduct.name}</h2>
          </div>
        </div>

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Demand Records</p>
            <h2 className="text-2xl font-bold text-slate-800">{totalDemandRecords}</h2>
          </div>
        </div>

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Lead Time Records</p>
            <h2 className="text-2xl font-bold text-slate-800">{totalLeadRecords}</h2>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <DistTable
          title="Demand Distribution"
          rows={analysis.demandDist}
          gradientId="demandGradient"
          startColor="#2563eb"
          stopColor="#60a5fa"
          headerGradient="bg-gradient-to-r from-blue-600 to-indigo-600"
        />

        <DistTable
          title="Lead Time Distribution"
          rows={analysis.leadDist}
          gradientId="leadGradient"
          startColor="#9333ea"
          stopColor="#c084fc"
          headerGradient="bg-gradient-to-r from-purple-600 to-pink-600"
        />
      </div>
    </>
  );
}
