import { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FileBarChart, CheckCircle2, TrendingUp, DollarSign, Calendar, ShieldCheck, MousePointerClick } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { apiFetch } from '@/lib/api';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState } from '@/components/ui';
import { NoProduct } from '@/components/DashboardLayout';
import { exportToExcel, exportToPdf } from '@/lib/export';

export default function ReportsPage() {
  const { activeProduct, products, setActiveProductId } = useData();
  const analysis = useAnalysis();
  const { success } = useToast();

  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const fetchReports = () => {
    apiFetch<any>('api/reports/')
      .then((data) => {
        if (Array.isArray(data)) {
          setSavedReports(data);
        } else if (data && Array.isArray(data.results)) {
          setSavedReports(data.results);
        } else {
          setSavedReports([]);
        }
        setLoadingReports(false);
      })
      .catch(() => {
        setSavedReports([]);
        setLoadingReports(false);
      });
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const quickSelectAction = (
    <div className="flex flex-wrap items-center gap-2">
      {products.length > 0 && (
        <div className="flex items-center gap-1.5 bg-sky-50 px-2 py-1.5 rounded-lg border border-sky-200 shadow-xs">
          <span className="text-xs font-bold text-sky-800 hidden sm:flex items-center gap-1">
            <MousePointerClick className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            Product:
          </span>
          <select
            className="bg-white font-bold text-xs text-slate-900 px-2 py-1 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={activeProduct?.id || ''}
            onChange={(e) => setActiveProductId(e.target.value)}
          >
            <option value="">-- Choose a Product --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  if (!activeProduct) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Export full analysis reports" icon={<FileText className="w-5 h-5" />} action={quickSelectAction} />
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-white/50 max-w-lg mx-auto mt-8">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
            <MousePointerClick className="w-6 h-6 animate-bounce text-sky-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Select a Product to Evaluate</h3>
          <p className="text-[13px] text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Choose a product to fetch, compare, and analyze all its saved inventory policies.
          </p>
 
          {products.length > 0 && (
            <div className="mt-5 inline-flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Select:</span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProductId(String(p.id))}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-sky-600 hover:text-white border border-slate-200 hover:border-sky-600 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
  if (!analysis.ready) {
    return (
      <>
        <PageHeader title="Reports" subtitle={activeProduct.name} icon={<FileText className="w-5 h-5" />} action={quickSelectAction} />
        <EmptyState title="No data to report" message="Upload historical data to generate reports." />
      </>
    );
  }

  const bestPolicy = analysis.policies.find((p) => p.best);

  const fullExcel = () => {
    // POST report logs to backend database
    apiFetch('api/reports/', {
      method: 'POST',
      body: JSON.stringify({
        product: activeProduct.name,
        report_type: 'inventory',
        format: 'Excel',
        simulation_days: analysis.simulationRows.length,
        status: 'Generated',
      })
    }).then(() => fetchReports()).catch(() => {});

    exportToExcel(
      [
        {
          name: 'Product',
          rows: [
            ['Field', 'Value'],
            ['Name', activeProduct.name],
            ['Ordering Cost', activeProduct.ordering_cost],
            ['Service Level', `${activeProduct.service_level}%`],
            ['Z Value', activeProduct.z_value],
            ['Stockout Cost', activeProduct.stockout_cost],
            ['Holding Cost', activeProduct.holding_cost],
            ['Opening Stock', activeProduct.opening_stock],
          ],
        },
        {
          name: 'Statistics',
          rows: [
            ['Metric', 'Value'],
            ['Average Demand', analysis.stats.averageDemand.toFixed(4)],
            ['Average Lead Time', analysis.stats.averageLeadTime.toFixed(4)],
            ['Variance', analysis.stats.variance.toFixed(4)],
            ['Standard Deviation', analysis.stats.standardDeviation.toFixed(4)],
            ['Safety Stock', analysis.safetyStock],
            ['ROP', Math.round(analysis.rop)],
            ['ROQ', Math.round(analysis.roq)],
          ],
        },
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
        {
          name: 'Simulation',
          rows: [
            ['Day', 'Random No', 'Opening', 'Demand', 'Closing', 'Lead Time', 'Rem. Lead', 'Ordered', 'Stockout'],
            ...analysis.simulationRows.map((r) => [r.day, r.randomNo, r.openingStock, r.simulatedDemand, r.closingStock, r.leadTime, r.remainingLeadTime, r.ordered ? 'Yes' : 'No', r.stockout]),
          ],
        },
        {
          name: 'Cost Analysis',
          rows: [
            ['Metric', 'Value'],
            ['Average Inventory', analysis.cost.averageInventory.toFixed(2)],
            ['Overall Holding Cost', analysis.cost.overallHoldingCost.toFixed(2)],
            ['Ordering Cost', analysis.cost.orderingCost.toFixed(2)],
            ['Stockout Cost', analysis.cost.stockoutCost.toFixed(2)],
            ['Total Cost', analysis.cost.totalCost.toFixed(2)],
            ['Total Orders', analysis.cost.totalOrders],
            ['Lost Units', analysis.cost.lostUnits],
          ],
        },
        {
          name: 'Policy Comparison',
          rows: [
            ['Policy', 'Safety Stock', 'ROP', 'ROQ', 'Total Cost', 'Best', 'Recommended'],
            ...analysis.policies.map((p) => [p.policy, p.safetyStock, p.rop, p.roq, p.totalCost.toFixed(2), p.best ? 'Yes' : '', p.recommended ? 'Yes' : '']),
          ],
        },
      ],
      `stocksim_report_${activeProduct.name}.xlsx`,
    );
    success('Exported full Excel report.');
  };

  const fullPdf = () => {
    // POST report logs to backend database
    apiFetch('api/reports/', {
      method: 'POST',
      body: JSON.stringify({
        product: activeProduct.name,
        report_type: 'inventory',
        format: 'PDF',
        simulation_days: analysis.simulationRows.length,
        status: 'Generated',
      })
    }).then(() => fetchReports()).catch(() => {});

    exportToPdf(
      `StockSim Report — ${activeProduct.name}`,
      [
        {
          title: 'Product Configuration',
          head: ['Field', 'Value'],
          body: [
            ['Ordering Cost', `₹${activeProduct.ordering_cost}`],
            ['Service Level', `₹${activeProduct.service_level}%`],
            ['Z Value', String(activeProduct.z_value)],
            ['Stockout Cost', `₹${activeProduct.stockout_cost}`],
            ['Holding Cost', `₹${activeProduct.holding_cost}`],
            ['Opening Stock', String(activeProduct.opening_stock)],
          ],
        },
        {
          title: 'Statistics',
          head: ['Metric', 'Value'],
          body: [
            ['Average Demand', analysis.stats.averageDemand.toFixed(2)],
            ['Average Lead Time', analysis.stats.averageLeadTime.toFixed(2)],
            ['Standard Deviation', analysis.stats.standardDeviation.toFixed(4)],
            ['Safety Stock', String(analysis.safetyStock)],
            ['ROP', String(Math.round(analysis.rop))],
            ['ROQ', String(Math.round(analysis.roq))],
          ],
        },
        {
          title: 'Cost Analysis',
          head: ['Metric', 'Value'],
          body: [
            ['Holding Cost', `₹${analysis.cost.overallHoldingCost.toFixed(2)}`],
            ['Ordering Cost', `₹${analysis.cost.orderingCost.toFixed(2)}`],
            ['Stockout Cost', `₹${analysis.cost.stockoutCost.toFixed(2)}`],
            ['Total Cost', `₹${analysis.cost.totalCost.toFixed(2)}`],
            ['Total Orders', String(analysis.cost.totalOrders)],
            ['Lost Units', String(analysis.cost.lostUnits)],
          ],
        },
        {
          title: 'Policy Comparison',
          head: ['Policy', 'Safety Stock', 'ROP', 'ROQ', 'Total Cost'],
          body: analysis.policies.map((p) => [p.policy, p.safetyStock, p.rop, p.roq, `₹${p.totalCost.toFixed(2)}`]),
        },
      ],
      `stocksim_report_${activeProduct.name}.pdf`,
    );
    success('Exported full PDF report.');
  };

  return (
    <>
      <PageHeader 
        title="Executive Report Console" 
        subtitle="Download publication-quality audits, policy briefs, and raw ledger data" 
        icon={<FileText className="w-5 h-5 text-slate-800" />} 
        action={quickSelectAction}
      />

      {/* Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Optimal Policy</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{bestPolicy ? bestPolicy.policy : 'N/A'}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Simulated Cost</div>
            <div className="text-base font-black text-slate-900 mt-0.5">₹{Math.round(analysis.cost.totalCost).toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Service Level</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{activeProduct.service_level}% Target</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lead Time Avg</div>
            <div className="text-base font-black text-slate-900 mt-0.5">{analysis.stats.averageLeadTime.toFixed(1)} Days</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Exports & Table Preview */}
      <div className="grid lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Side: Premium Export Cards */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-stretch">
          
          {/* Excel Card */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">
                  Raw Ledger Data
                </span>
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-lg" />
              </div>
              <h3 className="text-base font-extrabold text-slate-850 mt-3">Full Excel Workbook</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Contains complete daily simulation iterations, randomized distributions, policy matrices, and structured metrics ideal for post-processing.
              </p>
            </div>
            <button 
              onClick={fullExcel}
              className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Spreadsheet
            </button>
          </div>

          {/* PDF Card */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded-md uppercase tracking-wider">
                  Executive PDF
                </span>
                <FileBarChart className="w-8 h-8 text-sky-600 bg-sky-50 p-1.5 rounded-lg" />
              </div>
              <h3 className="text-base font-extrabold text-slate-850 mt-3">Audit Summary Brief</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                A structured PDF report compiling active model variables, computed distributions, total inventory cost curves, and optimal policies.
              </p>
            </div>
            <button 
              onClick={fullPdf}
              className="mt-4 w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF Report
            </button>
          </div>

        </div>

        {/* Right Side: Visual Policy Comparison Preview */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-850 text-sm">Policy Evaluation Summary</h3>
              <p className="text-[10px] text-slate-400">Preview of the policy matrix saved inside reports</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Compiled & Verified
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="py-2.5 pb-2">Policy</th>
                  <th className="py-2.5 pb-2 text-center">Safety Stock</th>
                  <th className="py-2.5 pb-2 text-center">ROP / ROQ</th>
                  <th className="py-2.5 pb-2 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-650 font-medium">
                {analysis.policies.map((p) => (
                  <tr key={p.policy} className={p.best ? 'bg-emerald-50/40 text-emerald-950 font-semibold' : p.recommended ? 'bg-sky-50/20' : ''}>
                    <td className="py-2.5 flex items-center gap-2">
                      {p.policy}
                      {p.best && <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded">BEST</span>}
                    </td>
                    <td className="py-2.5 text-center">{p.safetyStock} units</td>
                    <td className="py-2.5 text-center">{p.rop} / {p.roq}</td>
                    <td className={`py-2.5 text-right font-mono ${p.best ? 'text-emerald-700 font-bold' : ''}`}>₹{p.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 gap-2">
        <span>Report Session: <strong>{activeProduct.name}</strong></span>
        <span>Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span>Standard: <strong>Monte Carlo Inventory Simulation</strong></span>
      </div>
    </>
  );
}
