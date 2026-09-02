import { useState, useEffect, useMemo } from 'react';
import { GitCompare, Download, Trophy, ThumbsUp, AlertTriangle, RefreshCw, BarChart2, FolderX, MousePointerClick } from 'lucide-react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState, InventoryLoader } from '@/components/ui';
import { exportToExcel, exportToPdf } from '@/lib/export';
import {
  getPoliciesByProduct,
  calculateCostAnalysis,
  runPolicyComparisonForProduct as runPolicyComparison,
  getPolicyComparisonsByProduct as getPolicyComparisonByProduct,
} from '@/lib/api';
import { safetyStock, reorderPoint, reorderQuantity, runSimulation, calculateCosts } from '@/lib/simulation';
 
export type EvaluatedPolicy = {
  id?: string | number;
  displayIndex: number;
  policy: string;
  serviceLevel: number;
  targetServiceLevel?: number;
  safetyStock: number;
  rop: number;
  roq: number;
  totalCost: number;
  holdingCost?: number;
  orderingCost?: number;
  stockoutCost?: number;
  overallScore?: number;
  best: boolean;
  recommended: boolean;
  nonRecommended: boolean;
};
 
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const costPayload = payload.find((p: any) => p.dataKey === 'totalCost');
    const ssPayload = payload.find((p: any) => p.dataKey === 'safetyStock');
 
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl border border-slate-800 shadow-xl text-xs font-sans space-y-2 min-w-[170px]">
        <p className="font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1">{label}</p>
        {costPayload && (
          <p className="font-semibold text-slate-100 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
              Total Cost:
            </span>
            <strong className="font-mono text-white">₹{costPayload.value.toLocaleString()}</strong>
          </p>
        )}
        {ssPayload && (
          <p className="font-semibold text-slate-200 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              Safety Stock:
            </span>
            <strong className="font-mono text-slate-100">{ssPayload.value} units</strong>
          </p>
        )}
      </div>
    );
  }
  return null;
};
 
export default function PolicyComparisonPage() {
  const { activeProduct, products, setActiveProductId } = useData();
  const analysis = useAnalysis();
  const { success } = useToast();
 
  const [backendPolicies, setBackendPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(false);

  // Automatically run API sync when the active product changes
  useEffect(() => {
    if (!activeProduct?.id) {
      setBackendPolicies([]);
      return;
    }

    let isMounted = true;
    setLoadingPolicies(true);

    const fetchPoliciesAndRunComparison = async () => {
      try {
        const prodId = activeProduct.id.toString();
        // 1. Network Call: GET /api/inventorypolicy/product/<product_id>/all/
        const list = await getPoliciesByProduct(prodId);
        if (!isMounted) return;

        const policiesList = Array.isArray(list) ? list : [];
        setBackendPolicies(policiesList);
        setLoadingPolicies(false);

        if (policiesList.length > 0) {
          // Run sync calls in the background without blocking the UI
          try {
            // 2. Network Call: Ensure cost analysis calculated for each policy
            await Promise.all(
              policiesList.map((pol) =>
                calculateCostAnalysis(pol.id).catch(() => null)
              )
            );
            // 3. Network Call: POST /api/policycomparison/run/<product_id>/
            await runPolicyComparison(prodId);
            // 4. Network Call: GET /api/policycomparison/product/<product_id>/
            await getPolicyComparisonByProduct(prodId);
          } catch (syncErr) {
            console.warn('API network sync note:', syncErr);
          }
        }
      } catch (err) {
        console.error('Error fetching policies for selected product:', err);
        if (isMounted) {
          setBackendPolicies([]);
          setLoadingPolicies(false);
        }
      }
    };

    fetchPoliciesAndRunComparison();

    return () => {
      isMounted = false;
    };
  }, [activeProduct?.id]);
 
  // Evaluate ONLY actual saved policies belonging to the selected product
  // Evaluate ONLY actual saved policies using Multi-Factor Weighted Scoring Engine
  const evaluatedPolicies = useMemo<EvaluatedPolicy[]>(() => {
    if (!analysis.ready || !activeProduct || !activeProduct?.id || backendPolicies.length === 0) return [];
 
    const stats = analysis.stats;
    const baseDays = 30;
    const targetSL = activeProduct.service_level || 95;
 
    // 1. Sort backend policies by DB id ascending (chronological order of policy creation)
    const sortedBackendPolicies = [...backendPolicies].sort(
      (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)
    );
 
    // 2. Map to EvaluatedPolicy with 1, 2, 3... sequential displayIndex without #
    const rawList: any[] = sortedBackendPolicies.map((pol: any, idx: number) => {
      const displayIndex = idx + 1; // Sequential index: 1, 2, 3...
      const sl = pol.service_level || 95;
      const sStock = pol.safety_stock ?? Math.round(safetyStock(pol.z_value || 1.65, stats.standardDeviation, stats.averageLeadTime));
      const ropVal = pol.reorder_point ?? Math.round(reorderPoint(stats.averageDemand, stats.averageLeadTime, sStock));
      const roqVal = pol.reorder_quantity ?? Math.round(reorderQuantity(stats.averageDemand, baseDays, pol.ordering_cost || activeProduct.ordering_cost, pol.holding_cost || activeProduct.holding_cost));
 
      const simRows = runSimulation({
        days: baseDays,
        openingStock: pol.opening_stock ?? activeProduct.opening_stock,
        rop: ropVal,
        roq: roqVal,
        demandDist: analysis.demandDist,
        leadDist: analysis.leadDist,
        safetyStock: sStock,
      });
 
      const costRes = calculateCosts(simRows, {
        holdingCostPerUnit: pol.holding_cost || activeProduct.holding_cost,
        orderingCostPerOrder: pol.ordering_cost || activeProduct.ordering_cost,
        stockoutCostPerUnit: pol.stockout_cost || activeProduct.stockout_cost,
      });
 
      return {
        id: pol.id,
        displayIndex,
        policy: `Policy ${displayIndex} (${sl}% Service)`,
        serviceLevel: sl,
        targetServiceLevel: targetSL,
        safetyStock: sStock,
        rop: ropVal,
        roq: roqVal,
        totalCost: Math.round(costRes.totalCost),
        holdingCost: Math.round(costRes.overallHoldingCost),
        orderingCost: Math.round(costRes.orderingCost),
        stockoutCost: Math.round(costRes.stockoutCost),
        overallScore: 0,
        best: false,
        recommended: false,
        nonRecommended: false,
      };
    });
 
    if (rawList.length === 0) return [];
 
    // Calculate Multi-Factor Weighted Policy Scores
    const ssVals = rawList.map((r) => r.safetyStock);
    const ropVals = rawList.map((r) => r.rop);
    const roqVals = rawList.map((r) => r.roq);
    const ordVals = rawList.map((r) => r.orderingCost);
    const holdVals = rawList.map((r) => r.holdingCost);
    const stockVals = rawList.map((r) => r.stockoutCost);
 
    const minSS = Math.min(...ssVals), maxSS = Math.max(...ssVals);
    const minROP = Math.min(...ropVals), maxROP = Math.max(...ropVals);
    const minROQ = Math.min(...roqVals), maxROQ = Math.max(...roqVals);
    const minOrd = Math.min(...ordVals), maxOrd = Math.max(...ordVals);
    const minHold = Math.min(...holdVals), maxHold = Math.max(...holdVals);
    const minStock = Math.min(...stockVals), maxStock = Math.max(...stockVals);
 
    const list: EvaluatedPolicy[] = rawList.map((item) => {
      const sl = item.serviceLevel;
      let slNorm = 1.0;
      if (sl < targetSL) {
        const diff = targetSL - sl;
        slNorm = diff <= 3.0 ? 0.75 : Math.max(0.1, 0.75 - 0.15 * (diff - 3.0));
      }
 
      const ssNorm = maxSS > minSS ? (maxSS - item.safetyStock) / (maxSS - minSS) : 1.0;
      const ropNorm = maxROP > minROP ? (maxROP - item.rop) / (maxROP - minROP) : 1.0;
      const roqNorm = maxROQ > minROQ ? (maxROQ - item.roq) / (maxROQ - minROQ) : 1.0;
      const ordNorm = maxOrd > minOrd ? (maxOrd - item.orderingCost) / (maxOrd - minOrd) : 1.0;
      const holdNorm = maxHold > minHold ? (maxHold - item.holdingCost) / (maxHold - minHold) : 1.0;
      const stockNorm = maxStock > minStock ? (maxStock - item.stockoutCost) / (maxStock - minStock) : 1.0;
 
      const weighted =
        0.30 * slNorm +
        0.15 * ssNorm +
        0.15 * ropNorm +
        0.10 * roqNorm +
        0.10 * ordNorm +
        0.10 * holdNorm +
        0.10 * stockNorm;
 
      const overallScore = Math.round(weighted * 100 * 10) / 10;
      return { ...item, overallScore };
    });
 
    // 3. Sort by Overall Policy Score (Descending: Highest score is Best!)
    list.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
 
    if (list.length > 0) {
      // 🏆 Best Policy: Highest overall policy score
      list[0].best = true;
 
      if (list.length === 2) {
        list[1].nonRecommended = true;
      } else if (list.length >= 3) {
        list[1].recommended = true;
        list[list.length - 1].nonRecommended = true;
 
        for (let i = 2; i < list.length; i++) {
          if (!list[i].recommended) {
            list[i].nonRecommended = true;
          }
        }
      }
    }
 
    return list;
  }, [analysis, activeProduct, backendPolicies]);
 
  const bestPolicy = evaluatedPolicies.find((p) => p.best);
  const recommendedPolicy = evaluatedPolicies.find((p) => p.recommended);
  const nonRecommendedPolicy = evaluatedPolicies.find((p) => p.nonRecommended);
 
  const chartData = evaluatedPolicies.map((p) => ({
    policy: p.policy,
    totalCost: p.totalCost,
    safetyStock: p.safetyStock,
    rop: p.rop,
    roq: p.roq,
  }));
 
  const handleExportExcel = () => {
    if (evaluatedPolicies.length === 0 || !activeProduct) return;
    exportToExcel(
      [
        {
          name: 'Policy Comparison',
          rows: [
            ['Policy', 'Policy Name', 'Service Level (%)', 'Safety Stock', 'ROP', 'ROQ', 'Total Cost (INR)', 'Status Tag'],
            ...evaluatedPolicies.map((p) => [
              `Policy ${p.displayIndex}`,
              p.policy,
              `${p.serviceLevel}%`,
              p.safetyStock,
              p.rop,
              p.roq,
              p.totalCost.toFixed(2),
              p.best ? 'BEST (Lowest Cost)' : p.recommended ? 'RECOMMENDED' : 'NON-RECOMMENDED',
            ]),
          ],
        },
      ],
      `policy_comparison_${activeProduct.name}.xlsx`,
    );
    success('Exported policy comparison report to Excel.');
  };
 
  const handleExportPdf = () => {
    if (evaluatedPolicies.length === 0 || !activeProduct) return;
    exportToPdf(
      `Policy Comparison — ${activeProduct.name}`,
      [
        {
          title: `Policies Saved for ${activeProduct.name}`,
          head: ['Policy', 'Service Level', 'Safety Stock', 'ROP', 'ROQ', 'Total Cost', 'Evaluation Tag'],
          body: evaluatedPolicies.map((p) => [
            `Policy ${p.displayIndex}`,
            `${p.serviceLevel}%`,
            p.safetyStock,
            p.rop,
            p.roq,
            `₹${p.totalCost.toLocaleString()}`,
            p.best ? 'BEST 🏆' : p.recommended ? 'RECOMMENDED 👍' : 'NON-RECOMMENDED ⚠️',
          ]),
        },
      ],
      `policy_comparison_${activeProduct.name}.pdf`,
    );
    success('Exported policy comparison report to PDF.');
  };
 
  return (
    <>
      <PageHeader
        title="Policy Evaluation & Comparison"
        subtitle="Select a product to fetch and compare all its saved inventory policies"
        icon={<GitCompare className="w-5 h-5" />}
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
            {activeProduct?.id && (
              <>
                <button onClick={() => setLoadingPolicies(true)} className="btn-secondary py-2 text-xs flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPolicies ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button onClick={handleExportExcel} disabled={evaluatedPolicies.length === 0} className="btn-secondary py-2 text-xs disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
                <button onClick={handleExportPdf} disabled={evaluatedPolicies.length === 0} className="btn-secondary py-2 text-xs disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
              </>
            )}
          </div>
        }
      />
      
      {loadingPolicies ? (
        <InventoryLoader label={`Evaluating policies for ${activeProduct?.name}...`} />
      ) : backendPolicies.length === 0 ? (
        <div className="card-pad text-center py-12 border border-slate-200 rounded-2xl bg-white shadow-xs">
          <FolderX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No Saved Policies Found for {activeProduct?.name}</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            There are no inventory policies saved in the database for this product yet.
            Please go to the <strong>Safety Stock / Policy Setup</strong> page to calculate and save policies first.
          </p>
        </div>
      ) : (
        <>
          {/* TOP CARDS: BEST, RECOMMENDED, NON-RECOMMENDED */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {/* BEST POLICY CARD */}
            {bestPolicy && (
              <div className="p-4 bg-white border-l-4 border-l-emerald-500 border border-slate-200 shadow-xs rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Best Policy</span>
                  </div>
                  <span className="badge bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                    BEST 🏆
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">{bestPolicy.policy}</div>
                <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
                  <div>Safety Stock: <strong className="text-slate-900">{bestPolicy.safetyStock} units</strong></div>
                  <div>ROP: <strong className="text-slate-900">{bestPolicy.rop}</strong> | ROQ: <strong className="text-slate-900">{bestPolicy.roq}</strong></div>
                  <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between mt-1">
                    <span className="text-slate-500 font-medium">Total Cost:</span>
                    <strong className="text-emerald-700 font-mono text-sm font-bold">₹{bestPolicy.totalCost.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}
 
            {/* RECOMMENDED POLICY CARD */}
            {recommendedPolicy && (
              <div className="p-4 bg-white border-l-4 border-l-blue-500 border border-slate-200 shadow-xs rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <ThumbsUp className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Recommended</span>
                  </div>
                  <span className="badge bg-blue-100 text-blue-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                    REC 👍
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">{recommendedPolicy.policy}</div>
                <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
                  <div>Safety Stock: <strong className="text-slate-900">{recommendedPolicy.safetyStock} units</strong></div>
                  <div>ROP: <strong className="text-slate-900">{recommendedPolicy.rop}</strong> | ROQ: <strong className="text-slate-900">{recommendedPolicy.roq}</strong></div>
                  <div className="pt-1.5 border-t border-blue-100 flex items-center justify-between mt-1">
                    <span className="text-slate-500 font-medium">Total Cost:</span>
                    <strong className="text-blue-700 font-mono text-sm font-bold">₹{recommendedPolicy.totalCost.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}
 
            {/* NON-RECOMMENDED POLICY CARD */}
            {nonRecommendedPolicy && (
              <div className="p-4 bg-white border-l-4 border-l-rose-500 border border-slate-200 shadow-xs rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span className="font-bold text-[10px] uppercase tracking-wider">Not Recommended</span>
                  </div>
                  <span className="badge bg-rose-100 text-rose-800 text-[9px] font-extrabold px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                    AVOID ⚠️
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">{nonRecommendedPolicy.policy}</div>
                <div className="text-[11px] text-slate-600 mt-1.5 space-y-0.5">
                  <div>Safety Stock: <strong className="text-slate-900">{nonRecommendedPolicy.safetyStock} units</strong></div>
                  <div>ROP: <strong className="text-slate-900">{nonRecommendedPolicy.rop}</strong> | ROQ: <strong className="text-slate-900">{nonRecommendedPolicy.roq}</strong></div>
                  <div className="pt-1.5 border-t border-rose-100 flex items-center justify-between mt-1">
                    <span className="text-slate-500 font-medium">Total Cost:</span>
                    <strong className="text-rose-700 font-mono text-sm font-bold">₹{nonRecommendedPolicy.totalCost.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
 
          {/* DUAL-AXIS ANALYTICS CHART */}
          <div className="card-pad mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-slate-850 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-600" />
                  Policy Cost vs Safety Stock Analytics — {activeProduct?.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Comparison of Total Cost against Safety Stock for all saved policies</p>
              </div>
            </div>
 
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 15, right: -5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="policy" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#0ea5e9' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0ea5e9', strokeWidth: 1.5, strokeDasharray: '3 3' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar
                  yAxisId="right"
                  dataKey="safetyStock"
                  name="Safety Stock Buffer (Units)"
                  fill="#38bdf8"
                  opacity={0.85}
                  barSize={28}
                  radius={[6, 6, 0, 0]}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalCost"
                  name="Total Cost (₹)"
                  stroke="#0284c7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
 
          {/* FULL COMPARISON TABLE */}
          <div className="card-pad">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">Policies Comparison Table</h3>
                <p className="text-xs text-slate-400">Comparing saved database policies for {activeProduct?.name}</p>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Total Saved Policies: <span className="font-bold text-slate-800">{evaluatedPolicies.length}</span>
              </div>
            </div>
 
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Service Level</th>
                    <th>Safety Stock</th>
                    <th>ROP</th>
                    <th>ROQ</th>
                    <th>Total Cost</th>
                    <th>Evaluation Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatedPolicies.map((p) => {
                    const isBest = p.best;
                    const isRec = p.recommended;
                    const isNonRec = p.nonRecommended;
 
                    return (
                      <tr
                        key={p.id}
                        className={
                          isBest
                            ? 'bg-emerald-50/60 font-semibold'
                            : isRec
                            ? 'bg-blue-50/50'
                            : isNonRec
                            ? 'bg-rose-50/50 text-slate-700'
                            : ''
                        }
                      >
                        <td className="font-bold text-slate-900 whitespace-nowrap">
                          Policy {p.displayIndex} <span className="text-xs font-normal text-slate-500">({p.serviceLevel}%)</span>
                        </td>
                        <td>
                          <span className="font-semibold">{p.serviceLevel}%</span>
                        </td>
                        <td>{p.safetyStock} units</td>
                        <td>{p.rop}</td>
                        <td>{p.roq}</td>
                        <td className="font-mono font-bold">
                          ₹{p.totalCost.toLocaleString()}
                        </td>
                        <td>
                          {isBest ? (
                            <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold flex items-center gap-1 w-max">
                              <Trophy className="w-3 h-3 text-emerald-700" /> Best Policy 🏆
                            </span>
                          ) : isRec ? (
                            <span className="badge bg-blue-100 text-blue-800 border border-blue-300 font-bold flex items-center gap-1 w-max">
                              <ThumbsUp className="w-3 h-3 text-blue-700" /> Recommended 👍
                            </span>
                          ) : isNonRec ? (
                            <span className="badge bg-rose-100 text-rose-800 border border-rose-300 font-bold flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3 text-rose-700" /> Non-Recommended ⚠️
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">— Standard Policy</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
 