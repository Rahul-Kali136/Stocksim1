import { useMemo, useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import {
  calculateStats,
  calculateDistribution,
  safetyStock,
  safetyStockAdvanced,
  reorderPoint,
  reorderQuantity,
  runSimulation,
  calculateCosts,
  comparePolicies,
  SERVICE_LEVELS,
  type StatsResult,
  type SimulationParams,
} from '@/lib/simulation';
import type { DistributionRow, SimulationRow, CostResult, PolicyRow } from '@/lib/types';
import { getPoliciesByProduct } from '@/lib/api';

export type Analysis = {
  ready: boolean;
  stats: StatsResult;
  demandDist: DistributionRow[];
  leadDist: DistributionRow[];
  rawSafetyStock: number;
  safetyStock: number;
  leadTimeDemand: number;
  rop: number;
  roq: number;
  maxInventory: number;
  minInventory: number;
  bufferDays: number;
  simulationRows: SimulationRow[];
  cost: CostResult;
  policies: PolicyRow[];
};

const DEFAULT_DAYS = 30;

export function useAnalysis(): Analysis {
  const { activeProduct, historical } = useData();
  const [dbPolicies, setDbPolicies] = useState<any[]>([]);

  useEffect(() => {
    if (activeProduct?.id) {
      getPoliciesByProduct(activeProduct.id).then((list) => {
        setDbPolicies(Array.isArray(list) ? list : []);
      }).catch(() => setDbPolicies([]));
    } else {
      setDbPolicies([]);
    }
  }, [activeProduct?.id]);

  return useMemo<Analysis>(() => {
    if (!activeProduct || historical.length === 0) {
      return {
        ready: false,
        stats: { averageDemand: 0, averageLeadTime: 0, variance: 0, standardDeviation: 0, leadTimeVariance: 0, leadTimeStandardDeviation: 0, rows: [] },
        demandDist: [],
        leadDist: [],
        rawSafetyStock: 0,
        safetyStock: 0,
        leadTimeDemand: 0,
        rop: 0,
        roq: 0,
        maxInventory: 0,
        minInventory: 0,
        bufferDays: 0,
        simulationRows: [],
        cost: {
          averageInventory: 0,
          holdingCostPerUnit: 0,
          overallHoldingCost: 0,
          periodHoldingCost: 0,
          orderingCostPerOrder: 0,
          orderingCost: 0,
          stockoutCostPerUnit: 0,
          stockoutCost: 0,
          totalCost: 0,
          totalOrders: 0,
          lostUnits: 0,
          remainingInventory: 0,
        },
        policies: [],
      };
    }

    const history = historical.map((h) => ({ day: h.day, demand: Number(h.demand), lead_time: Number(h.lead_time) }));
    const stats = calculateStats(history);
    const demandDist = calculateDistribution(history.map((h) => h.demand));
    const leadDist = calculateDistribution(history.map((h) => h.lead_time));
    const z = activeProduct.z_value;
    const rawSafety = safetyStockAdvanced(z, stats.standardDeviation, stats.averageLeadTime, stats.leadTimeStandardDeviation, stats.averageDemand);
    const safety = Math.round(rawSafety);
    const leadTimeDemand = stats.averageDemand * stats.averageLeadTime;
    const rop = reorderPoint(stats.averageDemand, stats.averageLeadTime, safety);
    const roq = reorderQuantity(stats.averageDemand, history.length, activeProduct.ordering_cost, activeProduct.holding_cost);
    const maxInventory = Math.round(rop + roq);
    const minInventory = safety;
    const bufferDays = stats.averageDemand > 0 ? safety / stats.averageDemand : 0;

    const simParams: SimulationParams = {
      days: history.length,
      openingStock: activeProduct.opening_stock,
      rop,
      roq,
      demandDist,
      leadDist,
      safetyStock: safety,
      mode: 'probabilistic',
      historicalSequence: history,
    };
    const simulationRows = runSimulation(simParams);

    const cost = calculateCosts(simulationRows, {
      holdingCostPerUnit: activeProduct.holding_cost,
      orderingCostPerOrder: activeProduct.ordering_cost,
      stockoutCostPerUnit: activeProduct.stockout_cost,
    });

    const userSL = activeProduct.service_level;
    type PolicyInput = { name: string; serviceLevel: number; z: number; holdingCost?: number; orderingCost?: number; stockoutCost?: number };
    let policiesList: PolicyInput[] = dbPolicies.map((p) => ({
      name: `${p.service_level}% Service`,
      serviceLevel: p.service_level,
      z: p.z_value || SERVICE_LEVELS[p.service_level as keyof typeof SERVICE_LEVELS] || 1.645,
      holdingCost: p.holding_cost ? Number(p.holding_cost) : undefined,
      orderingCost: p.ordering_cost ? Number(p.ordering_cost) : undefined,
      stockoutCost: p.stockout_cost ? Number(p.stockout_cost) : undefined,
    }));

    if (policiesList.length === 0) {
      policiesList = [
        { name: '90% Service', serviceLevel: 90, z: SERVICE_LEVELS[90] },
        { name: '95% Service', serviceLevel: 95, z: SERVICE_LEVELS[95] },
        { name: '97% Service', serviceLevel: 97, z: SERVICE_LEVELS[97] },
        { name: '99% Service', serviceLevel: 99, z: SERVICE_LEVELS[99] },
      ];
    }
    
    if (!policiesList.find((p) => p.serviceLevel === userSL)) {
      policiesList.push({
        name: `${userSL}% Service (Current)`,
        serviceLevel: userSL,
        z: activeProduct.z_value || SERVICE_LEVELS[userSL as keyof typeof SERVICE_LEVELS] || 1.645,
      });
      policiesList.sort((a, b) => a.serviceLevel - b.serviceLevel);
    } else {
      const currentPolicy = policiesList.find((p) => p.serviceLevel === userSL);
      if (currentPolicy) {
        currentPolicy.name = `${currentPolicy.serviceLevel}% Service (Current)`;
      }
    }

    const policies = comparePolicies(
      policiesList,
      {
        avgDemand: stats.averageDemand,
        avgLeadTime: stats.averageLeadTime,
        sd: stats.standardDeviation,
        days: history.length,
        orderingCost: activeProduct.ordering_cost,
        holdingCostPerUnit: activeProduct.holding_cost,
        orderingCostPerOrder: activeProduct.ordering_cost,
        stockoutCostPerUnit: activeProduct.stockout_cost,
        openingStock: activeProduct.opening_stock,
        demandDist,
        leadDist,
        historicalSequence: history,
      },
    );

    return {
      ready: true,
      stats,
      demandDist,
      leadDist,
      rawSafetyStock: rawSafety,
      safetyStock: safety,
      leadTimeDemand,
      rop,
      roq,
      maxInventory,
      minInventory,
      bufferDays,
      simulationRows,
      cost,
      policies,
    };
  }, [activeProduct, historical, dbPolicies]);
}
