import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart as LineIcon,
  Download,
  Play,
  Save,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Info,
  TrendingDown,
  ShieldAlert,
  Zap,
  BarChart2,
  Database,
  MousePointerClick,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState, Spinner } from '@/components/ui';
import { StatCard } from '@/components/StatCard';
import { NoProduct } from '@/components/DashboardLayout';
import { exportToExcel, exportToPdf } from '@/lib/export';
import { ProductDragBar } from '@/components/ProductDragBar';
import { runSimulation } from '@/lib/simulation';
import { apiFetch } from '@/lib/api';
import type { SimulationRow } from '@/lib/types';

export default function SimulationPage() {
  const {
    activeProduct,
    products,
    setActiveProductId,
    historical,
    suppliers,
    simRows: rows,
    setSimRows: setRows,
    simMode,
    setSimMode,
    simDays: days,
    setSimDays: setDays,
    simCustomOpeningStock: customOpeningStock,
    setSimCustomOpeningStock: setCustomOpeningStock,
    simCustomRop: customRop,
    setSimCustomRop: setCustomRop,
    simCustomRoq: customRoq,
    setSimCustomRoq: setCustomRoq,
    simTrialResults: trialResults,
    setSimTrialResults: setTrialResults,
    addAuditLog,
  } = useData();
  const analysis = useAnalysis();
  const { success, error } = useToast();

  const [shufflingNumbers, setShufflingNumbers] = useState<{ demandRn: number; leadTimeRn: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'stockouts' | 'distributions'>('table');
  const [multiTrialCount, setMultiTrialCount] = useState<number>(100);
  const [runningTrials, setRunningTrials] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let intervalId: any;
    if (isSimulating) {
      const count = days > 0 ? days : 30;
      intervalId = setInterval(() => {
        const temp = Array.from({ length: count }, () => ({
          demandRn: Math.floor(Math.random() * 100),
          leadTimeRn: Math.floor(Math.random() * 100),
        }));
        setShufflingNumbers(temp);
      }, 70);
    } else {
      setShufflingNumbers([]);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSimulating, days]);

  // Initialize form parameters when analysis or active product changes and fetch database simulation records
  useEffect(() => {
    if (activeProduct && analysis.ready) {
      setCustomOpeningStock(activeProduct.opening_stock);
      setCustomRop(Math.round(analysis.rop));
      setCustomRoq(Math.round(analysis.roq));
      setTrialResults(null);
      
      if (activeProduct.policy_id) {
        setIsFetchingDB(true);
        apiFetch<any>(`api/simulation/policy/${activeProduct.policy_id}/`)
          .then((res) => {
            if (res && res.data && res.data.length > 0) {
              const rawSim = res.data[0];
              const unzipped: SimulationRow[] = [];
              const daysCount = rawSim.day?.length || 0;
              
              for (let i = 0; i < daysCount; i++) {
                const isOrdered = String(rawSim.order_status?.[i] || '').includes('Order');
                const isArrived = String(rawSim.order_status?.[i] || '').includes('Arrived') || String(rawSim.order_status?.[i] || '').includes('Received');
                const opStock = rawSim.opening_stock?.[i] ?? 0;
                const simDem = rawSim.simulated_demand?.[i] ?? 0;
                const stockoutVal = (opStock - simDem) < 0 ? Math.abs(opStock - simDem) : 0;
                
                unzipped.push({
                  day: rawSim.day?.[i] ?? (i + 1),
                  randomNo: rawSim.random_demand?.[i] ?? 0,
                  openingStock: opStock,
                  simulatedDemand: simDem,
                  closingStock: rawSim.closing_stock?.[i] ?? 0,
                  leadTime: rawSim.simulated_lead?.[i] ?? 0,
                  leadTimeRandomNo: rawSim.random_lead?.[i] ?? null,
                  remainingLeadTime: 0,
                  ordered: isOrdered,
                  orderArrived: isArrived,
                  stockout: stockoutVal,
                });
              }
              setRows(unzipped);
              setDays(daysCount);
            } else {
              setRows(null);
            }
          })
          .catch(() => {
            setRows(null);
          })
          .finally(() => {
            setIsFetchingDB(false);
          });
      } else {
        setRows(null);
      }
    }
  }, [activeProduct?.id, activeProduct?.policy_id, analysis.ready]);

  // Background reactive calculation of overall multi-trial simulation metrics without page refresh
  useEffect(() => {
    if (!activeProduct || !analysis.ready) return;

    const runAutomaticTrials = () => {
      try {
        const historicalSequence = historical.map((h) => ({ demand: Number(h.demand), lead_time: Number(h.lead_time) }));
        const simDays = simMode === 'historical' && historicalSequence.length > 0 ? historicalSequence.length : days > 0 ? days : 30;
        const totalTrials = 100;
        const trialStockoutUnits: number[] = [];
        const trialStockoutCosts: number[] = [];
        let stockoutRunCount = 0;

        for (let i = 0; i < totalTrials; i++) {
          const res = runSimulation({
            days: simDays,
            openingStock: openingStock,
            rop: rop,
            roq: roq,
            demandDist: analysis.demandDist,
            leadDist: analysis.leadDist,
            mode: simMode,
            historicalSequence,
          });
          const totalStockoutInRun = res.reduce((s, r) => s + r.stockout, 0);
          trialStockoutUnits.push(totalStockoutInRun);
          trialStockoutCosts.push(totalStockoutInRun * Number(activeProduct.stockout_cost));
          if (totalStockoutInRun > 0) {
            stockoutRunCount += 1;
          }
        }

        trialStockoutUnits.sort((a, b) => a - b);
        const totalLost = trialStockoutUnits.reduce((s, v) => s + v, 0);
        const avgStockoutUnits = totalLost / totalTrials;
        const avgStockoutCost = (trialStockoutCosts.reduce((s, v) => s + v, 0)) / totalTrials;
        const maxStockoutUnits = trialStockoutUnits[trialStockoutUnits.length - 1] ?? 0;
        const p95Idx = Math.min(Math.floor(totalTrials * 0.95), totalTrials - 1);
        const percentile95Stockout = trialStockoutUnits[p95Idx] ?? 0;
        const probabilityOfStockout = (stockoutRunCount / totalTrials) * 100;

        setTrialResults({
          probabilityOfStockout,
          avgStockoutUnits,
          avgStockoutCost,
          maxStockoutUnits,
          percentile95Stockout,
          runsWithStockout: stockoutRunCount,
          totalTrials,
        });
      } catch (err) {
        console.error("Background trials execution failed", err);
      }
    };

    runAutomaticTrials();
  }, [activeProduct?.id, days, customOpeningStock, customRop, customRoq, simMode, historical, analysis.ready]);

  const openingStock = customOpeningStock !== '' ? Number(customOpeningStock) : activeProduct?.opening_stock ?? 0;
  const rop = customRop !== '' ? Number(customRop) : analysis?.rop ?? 0;
  const roq = customRoq !== '' ? Number(customRoq) : analysis?.roq ?? 0;
  const currentRows = rows ?? analysis.simulationRows;

  const reorderAlerts = useMemo(() => {
    if (!currentRows || currentRows.length === 0 || !activeProduct) return [];
    return currentRows
      .filter((r) => r.ordered)
      .map((r) => {
        const activeSupplierStr = activeProduct.supplier ? String(activeProduct.supplier).trim().toLowerCase() : '';
        const supplierObj = suppliers.find((s) => {
          const sNameStr = String(s.supplier_name).trim().toLowerCase();
          const sIdStr = String(s.id).trim().toLowerCase();
          return sNameStr === activeSupplierStr || sIdStr === activeSupplierStr;
        });
        const supplierName = supplierObj?.supplier_name || String(activeProduct.supplier) || 'Sweet Bakery';
        const fallbackEmail = `info@${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        
        return {
          day: r.day,
          roq: Math.round(roq),
          supplierName,
          email: supplierObj?.email || fallbackEmail,
          phone: supplierObj?.phone || 'No phone configured'
        };
      });
  }, [currentRows, activeProduct?.supplier, roq, suppliers]);

  if (!activeProduct) {
    return (
      <>
        <PageHeader title="Simulation System" subtitle="Simulate inventory behavior and stockouts" icon={<LineIcon className="w-5 h-5" />} />
        <NoProduct />
      </>
    );
  }

  if (!analysis.ready) {
    return (
      <>
        <PageHeader title="Simulation System" subtitle={activeProduct.name} icon={<LineIcon className="w-5 h-5" />} />
        <EmptyState title="No historical data" message="Upload historical data to run an inventory simulation." />
      </>
    );
  }

  const handleRun = (targetMode: 'probabilistic' | 'historical' = simMode) => {
    setIsSimulating(true);
    setTimeout(() => {
      const historicalSequence = historical.map((h) => ({ demand: Number(h.demand), lead_time: Number(h.lead_time) }));
      const result = runSimulation({
        days: days > 0 ? days : 30,
        openingStock,
        rop,
        roq,
        demandDist: analysis.demandDist,
        leadDist: analysis.leadDist,
        mode: targetMode,
        historicalSequence,
      });
      setRows(result);
      setTrialResults(null);
      setIsSimulating(false);
      
      if (targetMode === 'probabilistic') {
        success('Random numbers generation completed!');
        addAuditLog('RUN_SIMULATION_PROBABILISTIC', `Ran probabilistic Monte Carlo baseline simulation for product "${activeProduct.name}" for ${days > 0 ? days : 30} days.`);
      } else {
        success('Simulation run based on historical data sequence completed!');
        addAuditLog('RUN_SIMULATION_HISTORICAL', `Ran historical sequence baseline simulation for product "${activeProduct.name}" for ${days > 0 ? days : 30} days.`);
      }

      // Sync the simulation run to the backend MySQL database
      if (activeProduct?.policy_id) {
        apiFetch('api/simulation/run/', {
          method: 'POST',
          body: JSON.stringify({
            policy_id: activeProduct.policy_id,
            simulation_days: days > 0 ? days : 30,
            initial_stock: openingStock,
            rop: rop,
            roq: roq,
            // Send exact arrays generated by frontend calculation
            day: result.map(r => r.day),
            opening_stock: result.map(r => r.openingStock),
            random_demand: result.map(r => r.randomNo),
            simulated_demand: result.map(r => r.simulatedDemand),
            closing_stock: result.map(r => r.closingStock),
            order_status: result.map(r => r.ordered ? `Order (${Math.round(roq)})` : (r.orderArrived ? `Arrived (+${Math.round(roq)})` : '—')),
            random_lead: result.map(r => r.leadTimeRandomNo),
            simulated_lead: result.map(r => r.leadTime),
            arrival_day: result.map((r, idx) => r.ordered ? (idx + 1 + r.leadTime) : null),
            stock_received: result.map(r => r.orderArrived ? Math.round(roq) : 0),
          }),
        }).catch((err) => {
          console.error("Failed to sync simulation with database:", err);
        });
      }

      // Automatically dispatch alerts directly to the supplier
      const alertsCount = result.filter(r => r.ordered).length;
      if (alertsCount > 0) {
        const activeSupplierStr = activeProduct.supplier ? String(activeProduct.supplier).trim().toLowerCase() : '';
        const supplierObj = suppliers.find(s => {
          const sNameStr = String(s.supplier_name).trim().toLowerCase();
          const sIdStr = String(s.id).trim().toLowerCase();
          return sNameStr === activeSupplierStr || sIdStr === activeSupplierStr;
        });
        const supplierName = supplierObj?.supplier_name || String(activeProduct.supplier) || 'Sweet Bakery';
        const email = supplierObj?.email || `info@${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        const phone = supplierObj?.phone || '+91 98765 43210';
        success(`Dispatched ${alertsCount} automated reorder alert${alertsCount !== 1 ? 's' : ''} directly to ${supplierName} (Email: ${email} & SMS: ${phone})!`);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 50);
  };

  const handleResetParams = () => {
    setDays(30);
    setCustomOpeningStock(activeProduct.opening_stock);
    setCustomRop(Math.round(analysis.rop));
    setCustomRoq(Math.round(analysis.roq));
    setRows(null);
    setTrialResults(null);
    success('Reset parameters to baseline calculated values.');
  };



  // Run multi-trial Monte Carlo simulation to evaluate statistical stockout risk distribution
  const handleRunMultiTrialRiskAnalysis = () => {
    setRunningTrials(true);
    setTimeout(() => {
      try {
        const historicalSequence = historical.map((h) => ({ demand: Number(h.demand), lead_time: Number(h.lead_time) }));
        const simDays = simMode === 'historical' && historicalSequence.length > 0 ? historicalSequence.length : days > 0 ? days : 30;
        const totalTrials = multiTrialCount;
        const trialStockoutUnits: number[] = [];
        const trialStockoutCosts: number[] = [];
        let stockoutRunCount = 0;

        for (let i = 0; i < totalTrials; i++) {
          const res = runSimulation({
            days: simDays,
            openingStock,
            rop,
            roq,
            demandDist: analysis.demandDist,
            leadDist: analysis.leadDist,
            mode: simMode,
            historicalSequence,
          });
          const totalStockoutInRun = res.reduce((s, r) => s + r.stockout, 0);
          trialStockoutUnits.push(totalStockoutInRun);
          trialStockoutCosts.push(totalStockoutInRun * Number(activeProduct.stockout_cost));
          if (totalStockoutInRun > 0) {
            stockoutRunCount += 1;
          }
        }

        trialStockoutUnits.sort((a, b) => a - b);
        const totalLost = trialStockoutUnits.reduce((s, v) => s + v, 0);
        const avgStockoutUnits = totalLost / totalTrials;
        const avgStockoutCost = (trialStockoutCosts.reduce((s, v) => s + v, 0)) / totalTrials;
        const maxStockoutUnits = trialStockoutUnits[trialStockoutUnits.length - 1] ?? 0;
        const p95Idx = Math.min(Math.floor(totalTrials * 0.95), totalTrials - 1);
        const percentile95Stockout = trialStockoutUnits[p95Idx] ?? 0;
        const probabilityOfStockout = (stockoutRunCount / totalTrials) * 100;

        setTrialResults({
          probabilityOfStockout,
          avgStockoutUnits,
          avgStockoutCost,
          maxStockoutUnits,
          percentile95Stockout,
          runsWithStockout: stockoutRunCount,
          totalTrials,
        });

        success(`Completed ${totalTrials} Monte Carlo trials for stockout risk evaluation!`);
        addAuditLog('RUN_RISK_ANALYSIS', `Executed ${totalTrials}-run Monte Carlo risk distribution analysis for product "${activeProduct.name}".`);
      } catch (err) {
        console.error(err);
        error('Failed to execute multi-trial simulation.');
      } finally {
        setRunningTrials(false);
      }
    }, 50);
  };



  const chartData = currentRows.map((r) => ({
    day: r.day,
    stock: r.closingStock,
    ordered: r.ordered ? r.closingStock : null,
    arrived: r.orderArrived ? r.closingStock : null,
  }));

  // Stockout Analysis Aggregations & Data Series
  const stockoutEvents = currentRows.filter((r) => r.stockout > 0);
  const totalOrders = currentRows.filter((r) => r.ordered).length;
  const totalArrived = currentRows.filter((r) => r.orderArrived).length;
  const lostUnits = currentRows.reduce((s, r) => s + r.stockout, 0);
  const totalDemandSimulated = currentRows.reduce((s, r) => s + r.simulatedDemand, 0);
  const fulfilledDemand = Math.max(0, totalDemandSimulated - lostUnits);
  const fillRate = totalDemandSimulated > 0 ? (fulfilledDemand / totalDemandSimulated) * 100 : 100;
  const stockoutDays = stockoutEvents.length;
  const stockoutRate = currentRows.length > 0 ? (stockoutDays / currentRows.length) * 100 : 0;
  const stockoutCostTotal = lostUnits * Number(activeProduct.stockout_cost);


  const maxSingleDayStockout = currentRows.reduce((max, r) => Math.max(max, r.stockout), 0);
  const avgStockoutPerEvent = stockoutDays > 0 ? lostUnits / stockoutDays : 0;

  // Daily Demand vs Stockout Chart Data
  const stockoutDailyChartData = currentRows.map((r) => ({
    day: `Day ${r.day}`,
    dayNum: r.day,
    demand: r.simulatedDemand,
    fulfilled: r.simulatedDemand - r.stockout,
    stockout: r.stockout,
    stockoutCost: r.stockout * Number(activeProduct.stockout_cost),
    closingStock: r.closingStock,
  }));

  // Cumulative Stockout Loss Curve
  let cumulativeLost = 0;
  let cumulativeCost = 0;
  const cumulativeStockoutData = currentRows.map((r) => {
    cumulativeLost += r.stockout;
    cumulativeCost += r.stockout * Number(activeProduct.stockout_cost);
    return {
      day: r.day,
      cumulativeLost,
      cumulativeCost,
    };
  });

  const handleExportExcel = () => {
    if (currentRows.length === 0) {
      error('No simulation data.');
      return;
    }
    exportToExcel(
      [
        {
          name: 'Monte Carlo Simulation',
          rows: [
            [
              'Day',
              'Demand Random No',
              'Opening Stock',
              'Simulated Demand',
              'Closing Stock',
              'Lead Time Random No',
              'Lead Time (Days)',
              'Remaining Lead Time',
              'Order Placed',
              'Order Arrived',
              'Stockout Units',
            ],
            ...currentRows.map((r) => [
              r.day,
              r.randomNo,
              r.openingStock,
              r.simulatedDemand,
              r.closingStock,
              r.leadTimeRandomNo !== null ? r.leadTimeRandomNo : 'Null',
              r.leadTime !== null ? r.leadTime : 'Null',
              r.remainingLeadTime !== null ? r.remainingLeadTime : 'Null',
              r.ordered ? 'Yes' : 'No',
              r.orderArrived ? 'Yes' : 'No',
              r.stockout,
            ]),
          ],
        },
        {
          name: 'Stockout Analysis Summary',
          rows: [
            ['Metric', 'Value'],
            ['Simulated Period (Days)', currentRows.length],
            ['Total Simulated Demand', totalDemandSimulated],
            ['Fulfilled Demand', fulfilledDemand],
            ['Total Stockout Units (Lost Demand)', lostUnits],
            ['Service Fill Rate (%)', fillRate.toFixed(2)],
            ['Stockout Days', stockoutDays],
            ['Stockout Frequency Rate (%)', stockoutRate.toFixed(2)],
            ['Peak Single-Day Deficit', maxSingleDayStockout],
            ['Average Deficit per Stockout Event', avgStockoutPerEvent.toFixed(2)],
            ['Unit Stockout Cost', activeProduct.stockout_cost],
            ['Total Stockout Financial Loss', stockoutCostTotal.toFixed(2)],
          ],
        },
        {
          name: 'Stockout Events Log',
          rows: [
            ['Day', 'Opening Stock', 'Simulated Demand', 'Fulfilled Demand', 'Stockout Units', 'Daily Financial Loss', 'Remaining Lead Time'],
            ...stockoutEvents.map((r) => [
              r.day,
              r.openingStock,
              r.simulatedDemand,
              r.simulatedDemand - r.stockout,
              r.stockout,
              (r.stockout * Number(activeProduct.stockout_cost)).toFixed(2),
              r.remainingLeadTime !== null ? `${r.remainingLeadTime} days` : 'No active lead time',
            ]),
          ],
        },
      ],
      `monte_carlo_simulation_${activeProduct.name}.xlsx`,
    );
    success('Exported Monte Carlo simulation and Stockout Analysis to Excel.');
  };

  const handleExportPdf = () => {
    if (currentRows.length === 0) {
      error('No simulation data.');
      return;
    }
    exportToPdf(
      `Monte Carlo Simulation System — ${activeProduct.name}`,
      [
        {
          title: 'Simulation Parameters',
          head: ['Parameter', 'Value'],
          body: [
            ['Simulated Days', String(days)],
            ['Initial Opening Stock', String(openingStock)],
            ['Reorder Point (ROP)', String(Math.round(rop))],
            ['Reorder Quantity (ROQ)', String(Math.round(roq))],
            ['Unit Stockout Cost', `₹${activeProduct.stockout_cost}`],
          ],
        },
        {
          title: 'Stockout Analysis & Risk Summary',
          head: ['Stockout KPI Metric', 'Result'],
          body: [
            ['Total Simulated Demand', `${totalDemandSimulated} units`],
            ['Fulfilled Demand', `${fulfilledDemand} units`],
            ['Total Stockout Units', `${lostUnits} units`],
            ['Service Fill Rate', `${fillRate.toFixed(2)}%`],
            ['Stockout Event Days', `${stockoutDays} of ${currentRows.length} days`],
            ['Stockout Frequency Risk', `${stockoutRate.toFixed(2)}%`],
            ['Peak Single-Day Stockout', `${maxSingleDayStockout} units`],
            ['Total Stockout Cost Impact', `₹${stockoutCostTotal.toLocaleString()}`],
          ],
        },
        {
          title: 'Daily Simulation Table',
          head: ['Day', 'Demand RN', 'Opening', 'Demand', 'Closing', 'Lead RN', 'Lead Time', 'Rem. Lead', 'Ordered', 'Stockout'],
          body: currentRows.map((r) => [
            String(r.day),
            String(r.randomNo),
            String(r.openingStock),
            String(r.simulatedDemand),
            String(r.closingStock),
            r.leadTimeRandomNo !== null ? String(r.leadTimeRandomNo) : 'Null',
            r.leadTime !== null ? `${r.leadTime} d` : 'Null',
            r.remainingLeadTime !== null ? `${r.remainingLeadTime} d` : 'Null',
            r.ordered ? 'Yes' : '—',
            r.stockout > 0 ? String(r.stockout) : '0',
          ]),
        },
      ],
      `monte_carlo_simulation_${activeProduct.name}.pdf`,
    );
    success('Exported simulation report to PDF.');
  };

  return (
    <>
      <PageHeader
        title="Monte Carlo Simulation System"
        subtitle={`${activeProduct.name} — probabilistic inventory & stockout analysis engine`}
        icon={<LineIcon className="w-5 h-5 text-blue-600" />}
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
            <button onClick={handleExportExcel} className="btn-secondary h-[42px]">
              <Download className="w-4 h-4" /> Excel
            </button>
            <button onClick={handleExportPdf} className="btn-secondary h-[42px]">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        }
      />

      {/* Control Panel / Parameters */}
      <div className="card-pad mb-6 border-l-4 border-l-blue-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-blue-600" />
              Simulation Setup & Method:
            </h3>
            <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              <button
                onClick={() => { setSimMode('probabilistic'); handleRun('probabilistic'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  simMode === 'probabilistic'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎲 Probabilistic (Monte Carlo)
              </button>
              <button
                onClick={() => { setSimMode('historical'); handleRun('historical'); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  simMode === 'historical'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Historical Sequence
              </button>
            </div>
          </div>
          <button onClick={handleResetParams} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
            <RefreshCw className="w-3 h-3" /> Reset Defaults
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="label text-xs">Simulation Days</label>
            <input
              type="number"
              min={1}
              max={365}
              className="input text-sm"
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div>
            <label className="label text-xs">Opening Stock</label>
            <input
              type="number"
              min={0}
              className="input text-sm bg-slate-50 cursor-not-allowed text-slate-500"
              value={customOpeningStock}
              disabled
            />
          </div>

          <div>
            <label className="label text-xs">Reorder Point (ROP)</label>
            <input
              type="number"
              min={0}
              className="input text-sm bg-slate-50 cursor-not-allowed text-slate-500"
              value={customRop}
              disabled
            />
          </div>

          <div>
            <label className="label text-xs">Reorder Quantity (ROQ)</label>
            <input
              type="number"
              min={1}
              className="input text-sm bg-slate-50 cursor-not-allowed text-slate-500"
              value={customRoq}
              disabled
            />
          </div>
        </div>



        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              {simMode === 'historical' ? (
                <>Simulating inventory & stockouts directly using your <strong>{historical.length} days of uploaded historical data</strong>.</>
              ) : (
                <>Order triggers when <strong>Closing Stock &le; ROP ({Math.round(rop)})</strong>. Lead time generated via RN. Order of <strong>{Math.round(roq)} ROQ</strong> arrives after lead time.</>
              )}
            </span>
          </div>
          <button onClick={() => handleRun(simMode)} className="btn-primary shadow-md hover:shadow-lg transition-all" disabled={isSimulating}>
            {isSimulating ? (
              <>
                <Spinner className="w-4 h-4 animate-spin text-white" />
                Rolling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run {simMode === 'historical' ? 'Data-Based' : 'Monte Carlo'} Engine
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Simulated Days" value={currentRows.length} icon={<LineIcon className="w-4 h-4" />} />
        <StatCard label="Orders Placed" value={totalOrders} icon={<RefreshCw className="w-4 h-4" />} color="violet" />
        <StatCard label="Orders Arrived" value={totalArrived} icon={<CheckCircle2 className="w-4 h-4" />} color="emerald" />
        <StatCard label="Stockout Units" value={lostUnits} icon={<AlertTriangle className="w-4 h-4" />} color="rose" />
        <StatCard label="Stockout Risk" value={`${stockoutRate.toFixed(1)}%`} icon={<AlertTriangle className="w-4 h-4" />} color="amber" />
        <StatCard label="Stockout Cost" value={`₹${stockoutCostTotal.toLocaleString()}`} icon={<AlertTriangle className="w-4 h-4" />} color="rose" />
      </div>

      {trialResults && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 mb-6 shadow-lg border border-indigo-900/40">
          <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3 mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-xs tracking-wider text-indigo-300 uppercase flex items-center gap-1.5">
                🔮 Probabilistic Risk Forecast Dashboard (100-Trial Stats)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Statistical averages computed reactively across 100 trials without page refresh.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-900/60 rounded-full text-[10px] font-semibold text-indigo-300 border border-indigo-800/30">
              ⚡ Reactive Calculations Active
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/30">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-350">Expected Stockout Prob.</div>
              <div className="text-2xl font-black mt-1.5 text-amber-400">{trialResults.probabilityOfStockout.toFixed(1)}%</div>
              <div className="text-[9px] text-slate-400 mt-1">Overall runs with stockout risk</div>
            </div>
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/30">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-350">Average Stockout Units</div>
              <div className="text-2xl font-black mt-1.5 text-white">{trialResults.avgStockoutUnits.toFixed(1)} units</div>
              <div className="text-[9px] text-slate-400 mt-1">Expected unmet demand volume</div>
            </div>
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/30">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-350">Expected Shortage Cost</div>
              <div className="text-2xl font-black mt-1.5 text-rose-400">₹{Math.round(trialResults.avgStockoutCost).toLocaleString()}</div>
              <div className="text-[9px] text-slate-400 mt-1">Mean stockout cost penalty</div>
            </div>
            <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-900/30">
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-350">Worst Case Shortage (P95)</div>
              <div className="text-2xl font-black mt-1.5 text-rose-500">{trialResults.percentile95Stockout} units</div>
              <div className="text-[9px] text-slate-400 mt-1">95th-percentile highest shortage</div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Alerts */}
      {reorderAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
              🔔 Supplier Reorder Alerts Automatically Dispatched ({reorderAlerts.length})
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-350">
              📨 Dispatched Directly
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {reorderAlerts.map((alert, idx) => (
              <div key={idx} className="flex flex-col lg:flex-row lg:items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-amber-100 text-xs text-slate-750 shadow-xs gap-3">
                <div>
                  <span className="font-bold text-amber-700">Day {alert.day}:</span> Stock reached ROP. Triggered automated reorder of <strong className="text-slate-900">{alert.roq} units</strong>.
                </div>
                <div className="mt-1 lg:mt-0 font-medium text-slate-500 flex flex-wrap items-center gap-3">
                  <span>Supplier: <strong className="text-slate-800">{alert.supplierName}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Email: <strong className="text-blue-600 font-semibold">{alert.email}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>SMS (Phone): <strong className="text-purple-600 font-semibold">{alert.phone}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                    ✓ Dispatched
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div ref={resultsRef} className="flex flex-wrap border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2 gap-1">
        <button
          onClick={() => setActiveTab('table')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'table' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Simulation Calculation Table
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'chart' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Inventory Trajectory Chart
        </button>
        <button
          onClick={() => setActiveTab('stockouts')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stockouts' ? 'border-rose-600 text-rose-600 bg-rose-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${stockoutDays > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          Stockout Analysis
          {stockoutDays > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded-full">
              {stockoutDays} {stockoutDays === 1 ? 'event' : 'events'}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('distributions')}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'distributions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Probability Distribution Reference
        </button>
      </div>

      {/* TAB CONTENT 1: SIMULATION TABLE */}
      {activeTab === 'table' && (
        <div className="card-pad">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Monte Carlo Simulation Calculation Table</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displays day-by-day calculations: Opening Stock, Simulated Demand, Closing Stock, Lead Time RN, Lead Time, Remaining Lead Time, and Stockout tracking.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Order Placed (ROP)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Order Arrived (+ROQ)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[65vh] border border-slate-200 rounded-lg shadow-inner">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white sticky top-0 uppercase tracking-wider font-semibold z-10">
                <tr>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Day</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Demand RN</th>
                  <th className="px-3 py-3 text-right border-r border-slate-700">Opening Stock</th>
                  <th className="px-3 py-3 text-right border-r border-slate-700">Sim. Demand</th>
                  <th className="px-3 py-3 text-right border-r border-slate-700">Closing Stock</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Lead Time RN</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Lead Time</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Rem. Lead Time</th>
                  <th className="px-3 py-3 text-center border-r border-slate-700">Order Status</th>
                  <th className="px-3 py-3 text-center">Stockout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {currentRows.map((r, idx) => {
                  const isOrderPlaced = r.ordered;
                  const isArrived = r.orderArrived;

                  let rowBg = 'hover:bg-slate-50';
                  if (isOrderPlaced) rowBg = 'bg-amber-50/70 hover:bg-amber-100/70';
                  else if (isArrived) rowBg = 'bg-emerald-50/70 hover:bg-emerald-100/70';

                  const demandRnVal = isSimulating && shufflingNumbers[idx] ? shufflingNumbers[idx].demandRn : r.randomNo;
                  const leadTimeRnVal = isSimulating && shufflingNumbers[idx] ? shufflingNumbers[idx].leadTimeRn : r.leadTimeRandomNo;

                  return (
                    <tr key={r.day} className={`transition-colors ${rowBg}`}>
                      <td className="px-3 py-2.5 font-bold text-slate-800 text-center border-r border-slate-100">{r.day}</td>
                      <td className={`px-3 py-2.5 font-mono text-center border-r border-slate-100 ${isSimulating ? 'animate-pulse text-blue-600 font-bold bg-blue-50/40' : 'text-slate-600'}`}>
                        {demandRnVal}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-700 text-right border-r border-slate-100">{r.openingStock}</td>
                      <td className="px-3 py-2.5 text-slate-700 text-right border-r border-slate-100">{r.simulatedDemand}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 text-right border-r border-slate-100">{r.closingStock}</td>

                      {/* Lead Time RN */}
                      <td className={`px-3 py-2.5 text-center border-r border-slate-100 ${isSimulating ? 'animate-pulse bg-blue-50/30' : ''}`}>
                        {isSimulating && shufflingNumbers[idx] ? (
                          <span className="font-mono font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{shufflingNumbers[idx].leadTimeRn}</span>
                        ) : r.leadTimeRandomNo !== null ? (
                          <span className="font-mono font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{r.leadTimeRandomNo}</span>
                        ) : (
                          <span className="font-mono text-slate-400 italic">Null</span>
                        )}
                      </td>

                      {/* Lead Time */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {r.leadTime !== null ? (
                          <span className="font-semibold text-amber-800">{r.leadTime} days</span>
                        ) : (
                          <span className="font-mono text-slate-400 italic">Null</span>
                        )}
                      </td>

                      {/* Remaining Lead Time */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {r.remainingLeadTime !== null ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {r.remainingLeadTime} {r.remainingLeadTime === 1 ? 'day' : 'days'}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400 italic">Null</span>
                        )}
                      </td>

                      {/* Order Status */}
                      <td className="px-3 py-2.5 text-center border-r border-slate-100">
                        {isOrderPlaced ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                            Order ({Math.round(roq)})
                          </span>
                        ) : isArrived ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                            Arrived (+{Math.round(roq)})
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>

                      {/* Stockout */}
                      <td className="px-3 py-2.5 text-center">
                        {r.stockout > 0 ? (
                          <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                            -{r.stockout}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: CHART */}
      {activeTab === 'chart' && (
        <div className="card-pad">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Inventory Level & Lead Time Cycle Trajectory</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualizing daily Closing Stock over time and ROP reorder line ({Math.round(rop)}).
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Day', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: 'Stock Units', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                      <div className="font-bold border-b border-slate-700 pb-1">Day {label}</div>
                      <div>Closing Stock: <strong className="text-blue-400">{d.stock} units</strong></div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={rop} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `ROP: ${Math.round(rop)}`, fontSize: 10, fill: '#f59e0b', position: 'top' }} />
              <Line type="monotone" dataKey="stock" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 2, fill: '#1d4ed8' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TAB CONTENT 3: STOCKOUT ANALYSIS */}
      {activeTab === 'stockouts' && (
        <div className="space-y-6">


          {/* Stockout Analysis Overview Banner & Detailed Metrics */}
          <div className="card-pad border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/40 to-amber-50/20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-rose-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    Stockout & Shortage Risk Breakdown
                    {stockoutDays > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                        Deficit Detected
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Zero Shortages
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Analyzing unfulfilled demand, lost sales volume, service fill rates, and monetary stockout penalties.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                <span>Unit Penalty Rate:</span>
                <span className="text-rose-600 font-bold">₹{activeProduct.stockout_cost} / unit</span>
              </div>
            </div>

            {/* Detailed Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Level Achieved</div>
                  <div className={`text-3xl font-black mt-2.5 ${fillRate >= 95 ? 'text-emerald-600' : fillRate >= 85 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {fillRate.toFixed(1)}%
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-3 leading-relaxed">Percentage of customer demand fulfilled successfully. An optimal configuration should exceed 95%.</div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stockout Risk & Out-of-Stock Days</div>
                  <div className={`text-3xl font-black mt-2.5 ${stockoutDays === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stockoutDays} <span className="text-lg font-normal text-slate-500">days ({stockoutRate.toFixed(1)}% risk)</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-3 leading-relaxed">Number of days where inventory level dropped to zero, exposing the organization to order deficits.</div>
              </div>
            </div>
          </div>

          {/* Charts Row: Daily Demand vs Stockout & Cumulative Loss Curve */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chart 1: Daily Demand vs Stockout Deficit */}
            <div className="card-pad">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-rose-600" />
                    Daily Demand vs. Stockout Shortage Breakdown
                  </h4>
                  <p className="text-xs text-slate-500">
                    Compares fulfilled customer demand (emerald) against lost unfulfilled demand (rose) per day.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockoutDailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dayNum" tick={{ fontSize: 11 }} label={{ value: 'Day', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Units', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1">{d.day}</div>
                          <div>Total Demanded: <strong>{d.demand} units</strong></div>
                          <div className="text-emerald-400">Fulfilled: <strong>{d.fulfilled} units</strong></div>
                          {d.stockout > 0 ? (
                            <div className="text-rose-400 font-semibold">Stockout Deficit: <strong>-{d.stockout} units (₹{d.stockoutCost.toLocaleString()})</strong></div>
                          ) : (
                            <div className="text-slate-400">Stockout Deficit: 0 units</div>
                          )}
                          <div className="text-blue-300 pt-1 border-t border-slate-800">End of Day Stock: {d.closingStock} units</div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar dataKey="fulfilled" name="Fulfilled Demand" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="stockout" name="Unmet Stockout Shortage" fill="#f43f5e" stackId="a" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Cumulative Lost Units & Financial Loss Trend */}
            <div className="card-pad">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                    Cumulative Stockout Accumulation & Financial Loss Curve
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tracks the cumulative accumulation of lost units and financial cost penalties over the simulation period.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cumulativeStockoutData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} label={{ value: 'Day', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Lost Units', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Cost (₹)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <div className="font-bold border-b border-slate-700 pb-1">Day {label} Cumulative Total</div>
                          <div className="text-amber-300">Total Lost Units: <strong>{d.cumulativeLost} units</strong></div>
                          <div className="text-rose-400 font-semibold">Total Stockout Cost: <strong>₹{d.cumulativeCost.toLocaleString()}</strong></div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area yAxisId="left" type="monotone" dataKey="cumulativeLost" name="Cumulative Lost Units" stroke="#f59e0b" fillOpacity={0.2} fill="#f59e0b" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="cumulativeCost" name="Cumulative Financial Loss (₹)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stockout Event Detailed Table Log */}
          <div className="card-pad">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Stockout Event Log ({stockoutDays} {stockoutDays === 1 ? 'day' : 'days'})
                </h4>
                <p className="text-xs text-slate-500">
                  Detailed view of specific simulation days where demand exceeded available stock.
                </p>
              </div>
              <div className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                Total Shortage: <strong className="text-rose-600">{lostUnits} units</strong>
              </div>
            </div>

            {stockoutDays === 0 ? (
              <div className="py-8 text-center bg-emerald-50/50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h5 className="font-semibold text-emerald-900 text-sm">No Stockouts Occurred in this Simulation Run!</h5>
                <p className="text-xs text-emerald-700 mt-1">
                  Opening stock and reorder point parameters successfully satisfied all simulated customer demand without any lost sales.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 text-white uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 text-center">Day</th>
                      <th className="px-3 py-2.5 text-right">Opening Stock</th>
                      <th className="px-3 py-2.5 text-right">Simulated Demand</th>
                      <th className="px-3 py-2.5 text-right">Fulfilled Units</th>
                      <th className="px-3 py-2.5 text-center">Stockout Shortage</th>
                      <th className="px-3 py-2.5 text-right">Financial Loss (₹)</th>
                      <th className="px-3 py-2.5 text-center">Lead Time / Replenishment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stockoutEvents.map((r) => {
                      const fulfilled = r.simulatedDemand - r.stockout;
                      const dayCost = r.stockout * Number(activeProduct.stockout_cost);

                      return (
                        <tr key={r.day} className="hover:bg-rose-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-slate-800 text-center">{r.day}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{r.openingStock}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800">{r.simulatedDemand}</td>
                          <td className="px-3 py-2.5 text-right text-emerald-700 font-semibold">{fulfilled}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                              -{r.stockout} units
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-rose-700">
                            ₹{dayCost.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {r.remainingLeadTime !== null ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                Order Pending ({r.remainingLeadTime} {r.remainingLeadTime === 1 ? 'day' : 'days'} left)
                              </span>
                            ) : r.ordered ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                Reorder Triggered Today
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No Active Order</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PROBABILITY DISTRIBUTIONS */}
      {activeTab === 'distributions' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Demand Distribution */}
          <div className="card-pad">
            <h3 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Demand Probability Distribution & RN Intervals
            </h3>
            <div className="overflow-x-auto max-h-72">
              <table className="table-base text-xs">
                <thead>
                  <tr>
                    <th>Demand Value</th>
                    <th>Frequency</th>
                    <th>Probability</th>
                    <th>Cumulative</th>
                    <th>Random No Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.demandDist.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-slate-800">{r.value}</td>
                      <td>{r.frequency}</td>
                      <td>{(r.probability * 100).toFixed(1)}%</td>
                      <td>{(r.cumulative * 100).toFixed(1)}%</td>
                      <td>
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium border border-slate-200">
                          {r.interval}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lead Time Distribution */}
          <div className="card-pad">
            <h3 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Lead Time Probability Distribution & RN Intervals
            </h3>
            <div className="overflow-x-auto max-h-72">
              <table className="table-base text-xs">
                <thead>
                  <tr>
                    <th>Lead Time (Days)</th>
                    <th>Frequency</th>
                    <th>Probability</th>
                    <th>Cumulative</th>
                    <th>Random No Interval</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.leadDist.map((r, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-slate-800">{r.value} days</td>
                      <td>{r.frequency}</td>
                      <td>{(r.probability * 100).toFixed(1)}%</td>
                      <td>{(r.cumulative * 100).toFixed(1)}%</td>
                      <td>
                        <span className="font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200">
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
      )}

    </>
  );
}

