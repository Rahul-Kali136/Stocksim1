import type { DistributionRow, SimulationRow, CostResult, PolicyRow } from './types';

export const SERVICE_LEVELS: Record<number, number> = {
  90: 1.28,
  95: 1.65,
  97: 1.88,
  99: 2.33,
};

export type HistoricalInput = {
  day: number;
  demand: number;
  lead_time: number;
};

export type StatsResult = {
  averageDemand: number;
  averageLeadTime: number;
  variance: number;
  standardDeviation: number;
  leadTimeVariance: number;
  leadTimeStandardDeviation: number;
  rows: {
    day: number;
    demand: number;
    averageDemand: number;
    difference: number;
    differenceSquare: number;
    lead_time: number;
  }[];
};

export function calculateStats(history: HistoricalInput[]): StatsResult {
  const n = history.length;
  if (n === 0) {
    return { averageDemand: 0, averageLeadTime: 0, variance: 0, standardDeviation: 0, leadTimeVariance: 0, leadTimeStandardDeviation: 0, rows: [] };
  }
  const sumDemand = history.reduce((s, h) => s + h.demand, 0);
  const averageDemand = sumDemand / n;
  const sumLead = history.reduce((s, h) => s + h.lead_time, 0);
  const averageLeadTime = sumLead / n;

  const rows = history.map((h) => {
    const difference = h.demand - averageDemand;
    const differenceSquare = difference * difference;
    return { day: h.day, demand: h.demand, averageDemand, difference, differenceSquare, lead_time: h.lead_time };
  });
  const variance = rows.reduce((s, r) => s + r.differenceSquare, 0) / n;
  const standardDeviation = Math.sqrt(variance);

  const leadDiffSquares = history.map((h) => {
    const diff = h.lead_time - averageLeadTime;
    return diff * diff;
  });
  const leadTimeVariance = leadDiffSquares.reduce((s, v) => s + v, 0) / n;
  const leadTimeStandardDeviation = Math.sqrt(leadTimeVariance);

  return { averageDemand, averageLeadTime, variance, standardDeviation, leadTimeVariance, leadTimeStandardDeviation, rows };
}

export function calculateDistribution(values: number[]): DistributionRow[] {
  const n = values.length;
  if (n === 0) return [];
  const freq = new Map<number, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => a[0] - b[0]);
  const rows: DistributionRow[] = [];
  let cumulative = 0;
  let lastHigh = -1;
  for (let i = 0; i < sorted.length; i++) {
    const [value, frequency] = sorted[i];
    const probability = frequency / n;
    cumulative += probability;
    
    let low = lastHigh + 1;
    let high = Math.round(cumulative * 100) - 1;
    
    if (i === sorted.length - 1) {
      high = 99;
    } else {
      high = Math.max(low, Math.min(98, high));
    }
    
    if (low > high) {
      low = high;
    }
    
    lastHigh = high;
    
    rows.push({
      value,
      frequency,
      probability,
      cumulative,
      interval: `${String(low).padStart(2, '0')}-${String(high).padStart(2, '0')}`,
      low,
      high,
    });
  }
  return rows;
}

export function safetyStock(z: number, sd: number, avgLeadTime: number): number {
  return z * sd * Math.sqrt(avgLeadTime);
}

export function safetyStockAdvanced(z: number, sd: number, avgLeadTime: number, leadTimeSd: number, avgDemand: number): number {
  return z * Math.sqrt(avgLeadTime * sd * sd + avgDemand * avgDemand * leadTimeSd * leadTimeSd);
}

export function reorderPoint(avgDemand: number, avgLeadTime: number, safety: number): number {
  return avgDemand * avgLeadTime + safety;
}

export function reorderQuantity(avgDemand: number, days: number, orderingCost: number, holdingCost: number): number {
  const annualDemand = avgDemand * days;
  if (holdingCost === 0) return 0;
  return Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
}

function pickFromInterval(rn: number, dist: DistributionRow[]): number {
  for (const row of dist) {
    if (rn >= row.low && rn <= row.high) return row.value;
  }
  return dist[dist.length - 1]?.value ?? 0;
}

export type SimulationParams = {
  days: number;
  openingStock: number;
  rop: number;
  roq: number;
  demandDist: DistributionRow[];
  leadDist: DistributionRow[];
  safetyStock?: number;
  mode?: string;
  historicalSequence?: any[];
};

export function runSimulation(params: SimulationParams): SimulationRow[] {
  const { days, openingStock, rop, roq, demandDist, leadDist, mode, historicalSequence } = params;
  const rows: SimulationRow[] = [];
  let opening = openingStock;
  let remainingLead = 0;
  let pendingOrder = 0;
  let onOrder = false;

  const isHistorical = mode === 'historical' && historicalSequence && historicalSequence.length > 0;
  const simDays = isHistorical ? Math.min(days, historicalSequence.length) : days;

  for (let day = 1; day <= simDays; day++) {
    let simulatedDemand = 0;
    let randomNo = 0;
    
    if (isHistorical) {
      simulatedDemand = historicalSequence[day - 1]?.demand ?? 0;
      randomNo = 0;
    } else {
      randomNo = Math.floor(Math.random() * 100);
      simulatedDemand = pickFromInterval(randomNo, demandDist);
    }
    
    let closing = opening - simulatedDemand;
    let stockout = 0;
    if (closing < 0) {
      stockout = -closing;
      closing = 0;
    }
    
    let leadTime = 0;
    let leadTimeRandomNo: number | null = null;
    let ordered = false;
    let orderArrived = false;

    if (onOrder && remainingLead > 0) {
      remainingLead -= 1;
      if (remainingLead === 0) {
        closing = Math.round(closing + pendingOrder);
        pendingOrder = 0;
        onOrder = false;
        orderArrived = true;
      }
    }

    if (!onOrder && closing <= rop) {
      if (isHistorical) {
        leadTime = historicalSequence[day - 1]?.lead_time ?? 0;
        leadTimeRandomNo = null;
      } else {
        const leadRn = Math.floor(Math.random() * 100);
        leadTimeRandomNo = leadRn;
        leadTime = pickFromInterval(leadRn, leadDist);
      }
      remainingLead = leadTime;
      pendingOrder = Math.round(roq);
      onOrder = true;
      ordered = true;
    }

    rows.push({
      day,
      randomNo,
      openingStock: Math.round(opening),
      simulatedDemand,
      closingStock: Math.round(closing),
      leadTime,
      leadTimeRandomNo,
      remainingLeadTime: remainingLead,
      ordered,
      orderArrived,
      stockout,
    });
    opening = Math.round(closing);
  }
  return rows;
}

export type CostParams = {
  holdingCostPerUnit: number;
  orderingCostPerOrder: number;
  stockoutCostPerUnit: number;
};

export function calculateCosts(
  rows: SimulationRow[],
  params: CostParams,
): CostResult {
  const totalDays = rows.length;
  if (totalDays === 0) {
    return {
      averageInventory: 0,
      holdingCostPerUnit: params.holdingCostPerUnit,
      overallHoldingCost: 0,
      periodHoldingCost: 0,
      orderingCostPerOrder: params.orderingCostPerOrder,
      orderingCost: 0,
      stockoutCostPerUnit: params.stockoutCostPerUnit,
      stockoutCost: 0,
      totalCost: 0,
      totalOrders: 0,
      lostUnits: 0,
      remainingInventory: 0,
    };
  }
  const sumClosing = rows.reduce((s, r) => s + r.closingStock, 0);
  const averageInventory = sumClosing / totalDays;
  const remainingInventory = rows[rows.length - 1].closingStock;
  const totalOrders = rows.filter((r) => r.ordered).length;
  const lostUnits = rows.reduce((s, r) => s + r.stockout, 0);

  const overallHoldingCost = averageInventory * params.holdingCostPerUnit;
  const periodHoldingCost = remainingInventory * params.holdingCostPerUnit;
  const orderingCost = totalOrders * params.orderingCostPerOrder;
  const stockoutCost = lostUnits * params.stockoutCostPerUnit;
  const totalCost = overallHoldingCost + orderingCost + stockoutCost;

  return {
    averageInventory,
    holdingCostPerUnit: params.holdingCostPerUnit,
    overallHoldingCost,
    periodHoldingCost,
    orderingCostPerOrder: params.orderingCostPerOrder,
    orderingCost,
    stockoutCostPerUnit: params.stockoutCostPerUnit,
    stockoutCost,
    totalCost,
    totalOrders,
    lostUnits,
    remainingInventory,
  };
}

export type PolicyInput = {
  name: string;
  serviceLevel: number;
  z: number;
  holdingCost?: number;
  orderingCost?: number;
  stockoutCost?: number;
};

export function comparePolicies(
  policies: PolicyInput[],
  base: {
    avgDemand: number;
    avgLeadTime: number;
    sd: number;
    days: number;
    orderingCost: number;
    holdingCostPerUnit: number;
    orderingCostPerOrder: number;
    stockoutCostPerUnit: number;
    openingStock: number;
    demandDist: DistributionRow[];
    leadDist: DistributionRow[];
    historicalSequence: any[];
  },
): PolicyRow[] {
  const results: PolicyRow[] = policies.map((p) => {
    const pOrderingCost = p.orderingCost ?? base.orderingCostPerOrder;
    const pHoldingCost = p.holdingCost ?? base.holdingCostPerUnit;
    const pStockoutCost = p.stockoutCost ?? base.stockoutCostPerUnit;

    const safety = safetyStock(p.z, base.sd, base.avgLeadTime);
    const rop = reorderPoint(base.avgDemand, base.avgLeadTime, safety);
    const roq = reorderQuantity(base.avgDemand, base.days, pOrderingCost, pHoldingCost);
    const simRows = runSimulation({
      days: base.days,
      openingStock: base.openingStock,
      rop,
      roq,
      demandDist: base.demandDist,
      leadDist: base.leadDist,
      safetyStock: safety,
      mode: 'historical',
      historicalSequence: base.historicalSequence,
    });
    const cost = calculateCosts(simRows, {
      holdingCostPerUnit: pHoldingCost,
      orderingCostPerOrder: pOrderingCost,
      stockoutCostPerUnit: pStockoutCost,
    });
    return {
      policy: p.name,
      safetyStock: Math.round(safety),
      rop: Math.round(rop),
      roq: Math.round(roq),
      totalCost: cost.totalCost,
      recommended: false,
      best: false,
    };
  });
  results.sort((a, b) => a.totalCost - b.totalCost);
  if (results.length > 0) results[0].best = true;
  if (results.length > 1) results[1].recommended = true;
  return results;
}
