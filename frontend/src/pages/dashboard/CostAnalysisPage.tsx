import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Calculator,
  IndianRupee,
  Download,
  RefreshCw,
  MousePointerClick,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

import { useData } from "@/context/DataContext";
import { useToast } from "@/context/ToastContext";

import { PageHeader } from "@/components/ui";
import { StatCard } from "@/components/StatCard";
import { ProductDragBar } from "@/components/ProductDragBar";

import {
  exportToExcel,
  exportToPdf,
} from "@/lib/export";

import {
  calculateStats,
  safetyStockAdvanced,
  reorderPoint,
  reorderQuantity,
  SERVICE_LEVELS,
  runSimulation,
} from "@/lib/simulation";

import {
  getPoliciesByProduct,
  calculateCostAnalysis,
  runSimulationForPolicy,
} from "@/lib/api";

/**
 * Currency Formatter
 */
const formatCurrency = (value: number) => {
  const safeValue = Number.isFinite(Number(value))
    ? Number(value)
    : 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safeValue);
};

/**
 * Policy returned by the Inventory Buffer / Safety Stock backend.
 *
 * These are the values entered/calculated by the admin for a
 * particular Product + Service Level.
 */
interface BackendPolicy {
  id: number;

  service_level: number;

  opening_stock?: number;

  z_value?: number | null;

  average_demand?: number | null;

  average_lead_time?: number | null;

  safety_stock?: number | null;

  reorder_point?: number | null;

  reorder_quantity?: number | null;

  ordering_cost?: number | null;

  holding_cost?: number | null;

  stockout_cost?: number | null;

  created_at?: string;

  created_on?: string;
}

/**
 * Cost Analysis Result Type
 */
interface CostAnalysisResult {
  serviceLevel: number;
  zScore: number;

  safetyStock: number;
  reorderPoint: number;
  reorderQuantity: number;

  days: number;

  holdingCost: number;
  orderingCost: number;
  stockoutCost: number;

  totalDemand: number;
  averageInventory: number;

  holdingCostTotal: number;
  periodHoldingCost: number;

  totalOrders: number;
  orderingCostTotal: number;

  lostUnits: number;
  stockoutCostTotal: number;

  totalInventoryCost: number;

  stats: ReturnType<typeof calculateStats>;
}

/**
 * Convert any API response into an array.
 *
 * Supports:
 *   []
 *   { data: [] }
 *   { results: [] }
 */
function normalizePolicies(value: unknown): BackendPolicy[] {
  if (Array.isArray(value)) {
    return value as BackendPolicy[];
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const obj = value as {
      data?: unknown;
      results?: unknown;
    };

    if (Array.isArray(obj.data)) {
      return obj.data as BackendPolicy[];
    }

    if (Array.isArray(obj.results)) {
      return obj.results as BackendPolicy[];
    }
  }

  return [];
}

/**
 * Remove duplicate Service Levels.
 *
 * Inventory Buffer should have one policy for each Product +
 * Service Level. If old duplicate rows are returned, keep the
 * newest/highest-id row for display.
 *
 * IMPORTANT:
 * This does not change Opening Stock.
 */
function deduplicatePolicies(
  policies: BackendPolicy[]
): BackendPolicy[] {
  const map = new Map<number, BackendPolicy>();

  for (const policy of policies) {
    const serviceLevel = Number(policy.service_level);

    if (!Number.isFinite(serviceLevel)) {
      continue;
    }

    const existing = map.get(serviceLevel);

    if (!existing) {
      map.set(serviceLevel, policy);
      continue;
    }

    const currentDate = new Date(
      policy.created_at ||
        policy.created_on ||
        ""
    ).getTime();

    const existingDate = new Date(
      existing.created_at ||
        existing.created_on ||
        ""
    ).getTime();

    const currentId = Number(policy.id) || 0;
    const existingId = Number(existing.id) || 0;

    if (
      Number.isFinite(currentDate) &&
      Number.isFinite(existingDate)
    ) {
      if (
        currentDate > existingDate ||
        (
          currentDate === existingDate &&
          currentId > existingId
        )
      ) {
        map.set(serviceLevel, policy);
      }
    } else if (currentId > existingId) {
      map.set(serviceLevel, policy);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      Number(a.service_level) -
      Number(b.service_level)
  );
}

export default function CostAnalysisPage() {
  const {
    activeProduct,
    products,
    setActiveProductId,
    historical,
  } = useData();

  const {
    success,
    error,
  } = useToast();

  /**
   * =========================================================
   * INVENTORY BUFFER SERVICE LEVELS
   * =========================================================
   *
   * These come from the policies saved by the admin in
   * Inventory Buffer / Safety Stock.
   *
   * Example:
   *   Admin saves 95%
   *   Admin saves 97%
   *
   * Cost Analysis will show:
   *   95%
   *   97%
   *
   * Selecting 95% loads only the 95% policy data.
   * Selecting 97% loads only the 97% policy data.
   */

  const [backendPolicies, setBackendPolicies] =
    useState<BackendPolicy[]>([]);

  const [selectedServiceLevel, setSelectedServiceLevel] =
    useState<number | null>(null);

  const [loadingPolicies, setLoadingPolicies] =
    useState(false);

  const [backendCostData, setBackendCostData] = useState<any>(null);

  /**
   * Fetch all Inventory Buffer policies for the active product.
   */
  const fetchPolicies = useCallback(async () => {
    if (!activeProduct?.id) {
      setBackendPolicies([]);
      setSelectedServiceLevel(null);
      return;
    }

    setLoadingPolicies(true);

    try {
      const response =
        await getPoliciesByProduct(
          activeProduct.id
        );

      const policies =
        deduplicatePolicies(
          normalizePolicies(response)
        );

      setBackendPolicies(policies);

      if (policies.length === 0) {
        setSelectedServiceLevel(null);
        return;
      }

      /*
       * Preserve the currently selected service level
       * when it still exists.
       */
      const currentStillExists =
        selectedServiceLevel !== null &&
        policies.some(
          (policy) =>
            Number(policy.service_level) ===
            Number(selectedServiceLevel)
        );

      if (currentStillExists) {
        return;
      }

      /*
       * If the Product already has a service level and that
       * level exists in Inventory Buffer, select it.
       */
      const productServiceLevel =
        Number(
          activeProduct.service_level
        );

      const productPolicy =
        policies.find(
          (policy) =>
            Number(policy.service_level) ===
            productServiceLevel
        );

      if (productPolicy) {
        setSelectedServiceLevel(
          Number(productPolicy.service_level)
        );
        return;
      }

      /*
       * Otherwise select the newest/highest-id policy.
       *
       * This makes the page show the most recently saved
       * Inventory Buffer policy when it first opens.
       */
      const latestPolicy =
        [...policies].sort(
          (a, b) =>
            Number(b.id || 0) -
            Number(a.id || 0)
        )[0];

      setSelectedServiceLevel(
        Number(latestPolicy.service_level)
      );
    } catch (err: any) {
      console.error(
        "Failed to fetch inventory policies:",
        err
      );

      setBackendPolicies([]);
      setSelectedServiceLevel(null);

      error(
        err?.message ||
          "Failed to load Inventory Buffer service levels."
      );
    } finally {
      setLoadingPolicies(false);
    }
  }, [
    activeProduct?.id,
    activeProduct?.service_level,
    error,
  ]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  /**
   * Selected Inventory Buffer policy.
   *
   * All Service-Level-dependent values below come from this
   * policy instead of always using activeProduct.service_level.
   */
  const selectedPolicy = useMemo(() => {
    if (
      selectedServiceLevel === null
    ) {
      return null;
    }

    return (
      backendPolicies.find(
        (policy) =>
          Number(policy.service_level) ===
          Number(selectedServiceLevel)
      ) || null
    );
  }, [
    backendPolicies,
    selectedServiceLevel,
  ]);

  /**
   * Service levels available to the Cost Evaluation page.
   */
  const availableServiceLevels =
    useMemo(
      () =>
        backendPolicies
          .map((policy) =>
            Number(policy.service_level)
          )
          .filter(
            (level) =>
              Number.isFinite(level)
          )
          .filter(
            (level, index, array) =>
              array.indexOf(level) === index
          )
          .sort(
            (a, b) => a - b
          ),
      [backendPolicies]
    );

  /**
   * =========================================================
   * INVENTORY COST CALCULATION ENGINE
   * =========================================================
   */
  const computed =
    useMemo<CostAnalysisResult | null>(() => {
      if (
        !activeProduct ||
        historical.length === 0
      ) {
        return null;
      }

      /*
       * If admin has created Inventory Buffer policies,
       * Cost Analysis must use the selected policy.
       *
       * Do not silently calculate another Service Level.
       */
      if (
        backendPolicies.length > 0 &&
        !selectedPolicy
      ) {
        return null;
      }

      /**
       * Prepare Historical Data.
       */
      const history =
        historical.map(
          (item) => ({
            day: item.day,
            demand:
              Number(item.demand),
            lead_time:
              Number(item.lead_time),
          })
        );

      /**
       * Statistical Calculation.
       */
      const stats =
        calculateStats(history);

      /**
       * Service Level.
       *
       * When Inventory Buffer data exists, this is the
       * Service Level selected by the admin/user.
       */
      const serviceLevel =
        selectedPolicy
          ? Number(
              selectedPolicy.service_level
            )
          : Number(
              activeProduct.service_level ??
                95
            );

      /**
       * Z Score.
       *
       * Prefer the Inventory Buffer stored z_value.
       * Otherwise calculate it from SERVICE_LEVELS.
       */
      const zScore =
        selectedPolicy?.z_value !== null &&
        selectedPolicy?.z_value !== undefined &&
        Number.isFinite(
          Number(
            selectedPolicy.z_value
          )
        )
          ? Number(
              selectedPolicy.z_value
            )
          : (
              SERVICE_LEVELS[
                serviceLevel
              ] ??
              SERVICE_LEVELS[95]
            );

      /**
       * Opening Stock.
       *
       * IMPORTANT:
       * Opening Stock is already fetched from Product.
       * Selecting another Service Level must NOT change it.
       */
      const openingStock =
        Number(
          activeProduct.opening_stock ?? 0
        );

      /**
       * Safety Stock.
       *
       * Prefer the selected Inventory Buffer value.
       */
      const policySafetyStock =
        selectedPolicy?.safety_stock;

      const safetyStock =
        policySafetyStock !== null &&
        policySafetyStock !== undefined &&
        Number.isFinite(
          Number(policySafetyStock)
        )
          ? Number(policySafetyStock)
          : (
              activeProduct.safety_stock &&
              Number(
                activeProduct.safety_stock
              ) > 0
            )
              ? Number(
                  activeProduct.safety_stock
                )
              : Math.round(
                  safetyStockAdvanced(
                    zScore,
                    stats.standardDeviation,
                    stats.averageLeadTime,
                    stats.leadTimeStandardDeviation,
                    stats.averageDemand
                  )
                );

      /**
       * Reorder Point.
       *
       * Prefer the selected Inventory Buffer value.
       */
      const policyROP =
        selectedPolicy?.reorder_point;

      const reorderPointValue =
        policyROP !== null &&
        policyROP !== undefined &&
        Number.isFinite(
          Number(policyROP)
        )
          ? Number(policyROP)
          : (
              activeProduct.rop &&
              Number(
                activeProduct.rop
              ) > 0
            )
              ? Number(
                  activeProduct.rop
                )
              : reorderPoint(
                  stats.averageDemand,
                  stats.averageLeadTime,
                  safetyStock
                );

      /**
       * Reorder Quantity.
       *
       * Prefer the selected Inventory Buffer value.
       */
      const policyROQ =
        selectedPolicy?.reorder_quantity;

      const selectedOrderingCost =
        selectedPolicy?.ordering_cost !==
          null &&
        selectedPolicy?.ordering_cost !==
          undefined &&
        Number.isFinite(
          Number(
            selectedPolicy.ordering_cost
          )
        )
          ? Number(
              selectedPolicy.ordering_cost
            )
          : Number(
              activeProduct.ordering_cost
            );

      const selectedHoldingCost =
        selectedPolicy?.holding_cost !==
          null &&
        selectedPolicy?.holding_cost !==
          undefined &&
        Number.isFinite(
          Number(
            selectedPolicy.holding_cost
          )
        )
          ? Number(
              selectedPolicy.holding_cost
            )
          : Number(
              activeProduct.holding_cost
            );

      const selectedStockoutCost =
        selectedPolicy?.stockout_cost !==
          null &&
        selectedPolicy?.stockout_cost !==
          undefined &&
        Number.isFinite(
          Number(
            selectedPolicy.stockout_cost
          )
        )
          ? Number(
              selectedPolicy.stockout_cost
            )
          : Number(
              activeProduct.stockout_cost
            );

      const reorderQuantityValue =
        policyROQ !== null &&
        policyROQ !== undefined &&
        Number.isFinite(
          Number(policyROQ)
        )
          ? Number(policyROQ)
          : (
              activeProduct.roq &&
              Number(
                activeProduct.roq
              ) > 0
            )
              ? Number(
                  activeProduct.roq
                )
              : reorderQuantity(
                  stats.averageDemand,
                  history.length,
                  selectedOrderingCost,
                  selectedHoldingCost
                );

      /**
       * Product Cost Configuration.
       *
       * These values are now taken from the selected
       * Inventory Buffer Service Level policy.
       */
      const holdingCost =
        selectedHoldingCost;

      const orderingCost =
        selectedOrderingCost;

      const stockoutCost =
        selectedStockoutCost;

      const days =
        history.length;

      /**
       * Total Demand.
       */
      const totalDemand =
        stats.averageDemand *
        days;

      /**
       * Holding Cost Calculation.
       */
      const averageInventory =
        openingStock +
        safetyStock / 2;

      const holdingCostTotal =
        averageInventory *
        holdingCost;

      const periodHoldingCost =
        (
          openingStock +
          safetyStock
        ) *
        holdingCost;

      /**
       * Ordering Cost Calculation.
       */
      const totalOrders =
        reorderQuantityValue > 0
          ? Math.ceil(
              totalDemand /
              reorderQuantityValue
            )
          : 0;

      const orderingCostTotal =
        totalOrders *
        orderingCost;

      /**
       * Stockout Cost Calculation.
       *
       * Opening Stock remains the Product opening stock.
       * Only ROP / ROQ change according to the selected
       * Service Level policy.
       */
      const simulationRows =
        runSimulation({
          days: history.length,
          openingStock,
          rop: reorderPointValue,
          roq: reorderQuantityValue,
          demandDist: [],
          leadDist: [],
          mode: "historical",
          historicalSequence: history,
        });

      const lostUnits =
        simulationRows.reduce(
          (sum, row) =>
            sum + Number(row.stockout || 0),
          0
        );

      const stockoutCostTotal =
        lostUnits *
        stockoutCost;

      /**
       * Final Inventory Cost.
       */
      const totalInventoryCost =
        holdingCostTotal +
        orderingCostTotal +
        stockoutCostTotal;

      const finalDays = backendCostData?.simulation_days ?? days;
      const finalTotalDemand = backendCostData?.total_demand ?? totalDemand;
      const finalTotalOrders = backendCostData?.total_orders ?? totalOrders;
      const finalLostUnits = backendCostData?.stockout_quantity ?? lostUnits;
      
      const finalHoldingCostTotal = backendCostData?.holding_cost ?? holdingCostTotal;
      const finalOrderingCostTotal = backendCostData?.ordering_cost ?? orderingCostTotal;
      const finalStockoutCostTotal = backendCostData?.stockout_cost ?? stockoutCostTotal;
      const finalTotalInventoryCost = backendCostData?.total_inventory_cost ?? totalInventoryCost;
      const finalAverageInventory = backendCostData?.average_inventory ?? averageInventory;

      return {
        serviceLevel,
        zScore,

        safetyStock,

        reorderPoint:
          reorderPointValue,

        reorderQuantity:
          reorderQuantityValue,

        days: finalDays,

        holdingCost,
        orderingCost,
        stockoutCost,

        totalDemand: finalTotalDemand,

        averageInventory: finalAverageInventory,

        holdingCostTotal: finalHoldingCostTotal,

        periodHoldingCost,

        totalOrders: finalTotalOrders,

        orderingCostTotal: finalOrderingCostTotal,

        lostUnits: finalLostUnits,

        stockoutCostTotal: finalStockoutCostTotal,

        totalInventoryCost: finalTotalInventoryCost,

        stats,
      };
    }, [
      activeProduct,
      historical,
      backendPolicies.length,
      selectedPolicy,
      selectedServiceLevel,
      backendCostData,
    ]);

  const [loadingCost, setLoadingCost] = useState(false);

  useEffect(() => {
    if (selectedPolicy?.id) {
      setLoadingCost(true);
      runSimulationForPolicy(selectedPolicy.id, 365)
        .then(() => {
          return calculateCostAnalysis(selectedPolicy.id);
        })
        .then((res: any) => {
          if (res && res.data) {
            setBackendCostData(res.data);
          } else {
            console.warn("No data in cost analysis response", res);
          }
        })
        .catch((err) => {
          console.error("Failed to update backend cost analysis:", err);
          error("Failed to fetch latest cost analysis from backend.");
        })
        .finally(() => {
          setLoadingCost(false);
        });
    }
  }, [selectedPolicy?.id, error]);

  /**
   * =========================================================
   * PRODUCT MISSING STATE
   * =========================================================
   */
  if (!activeProduct) {
    return (
      <>
        <PageHeader
          title="Cost Analysis"
          subtitle="Automated inventory cost calculation"
          icon={<Calculator />}
        />
        <ProductDragBar />
      </>
    );
  }

  /**
   * =========================================================
   * HISTORICAL DATA / POLICY STATE
   * =========================================================
   */
  if (
    historical.length === 0
  ) {
    return (
      <>
        <PageHeader
          title="Cost Analysis"
          subtitle={activeProduct.name}
          icon={<Calculator />}
        />
        <ProductDragBar />

        <section className="card-pad">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <Calculator className="mx-auto mb-3 h-10 w-10 text-slate-400" />

            <h3 className="text-lg font-semibold text-slate-800">
              No Historical Data
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Historical demand and lead-time data are
              required for Cost Evaluation.
            </p>
          </div>
        </section>
      </>
    );
  }

  /**
   * When policies exist but none is selected, show the
   * selection state instead of displaying incorrect data.
   */
  if (
    backendPolicies.length > 0 &&
    !selectedPolicy
  ) {
    return (
      <>
        <PageHeader
          title="Cost Analysis"
          subtitle={`${activeProduct.name} - select an Inventory Buffer service level`}
          icon={<Calculator />}
        />
        <ProductDragBar />

        <section className="card-pad">
          <ServiceLevelSelector
            serviceLevels={
              availableServiceLevels
            }
            selectedServiceLevel={
              selectedServiceLevel
            }
            onChange={
              setSelectedServiceLevel
            }
            loading={loadingPolicies}
            onRefresh={
              fetchPolicies
            }
          />
        </section>
      </>
    );
  }

  if (!computed) {
    return (
      <>
        <PageHeader
          title="Cost Analysis"
          subtitle={activeProduct.name}
          icon={<Calculator />}
        />
        <ProductDragBar />

        <section className="card-pad">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500">
              Select an Inventory Buffer Service Level
              to view its Cost Evaluation.
            </p>
          </div>
        </section>
      </>
    );
  }

  /**
   * Chart Data.
   */
  const chartData = [
    {
      name: "Holding",
      cost: Math.round(
        computed.holdingCostTotal
      ),
    },
    {
      name: "Ordering",
      cost: Math.round(
        computed.orderingCostTotal
      ),
    },
    {
      name: "Stockout",
      cost: Math.round(
        computed.stockoutCostTotal
      ),
    },
  ];

  /**
   * =========================================================
   * EXPORT EXCEL
   * =========================================================
   */
  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          name: "Inventory Configuration",
          rows: [
            ["Field", "Value"],

            [
              "Product Name",
              activeProduct.name,
            ],

            [
              "Selected Service Level (%)",
              computed.serviceLevel,
            ],

            [
              "Z Score",
              computed.zScore,
            ],

            [
              "Opening Stock",
              activeProduct.opening_stock,
            ],

            [
              "Safety Stock",
              computed.safetyStock,
            ],

            [
              "Reorder Point (ROP)",
              computed.reorderPoint.toFixed(2),
            ],

            [
              "Reorder Quantity (ROQ)",
              computed.reorderQuantity.toFixed(2),
            ],

            [
              "Analysis Period (Days)",
              computed.days,
            ],

            [
              "Holding Cost / Unit",
              formatCurrency(
                computed.holdingCost
              ),
            ],

            [
              "Ordering Cost / Order",
              formatCurrency(
                computed.orderingCost
              ),
            ],

            [
              "Stockout Cost / Unit",
              formatCurrency(
                computed.stockoutCost
              ),
            ],
          ],
        },

        {
          name: "Cost Summary",
          rows: [
            ["Metric", "Value"],

            [
              "Average Inventory",
              computed.averageInventory.toFixed(2),
            ],

            [
              "Holding Cost",
              formatCurrency(
                computed.holdingCostTotal
              ),
            ],

            [
              "Period Holding Cost",
              formatCurrency(
                computed.periodHoldingCost
              ),
            ],

            [
              "Ordering Cost",
              formatCurrency(
                computed.orderingCostTotal
              ),
            ],

            [
              "Stockout Cost",
              formatCurrency(
                computed.stockoutCostTotal
              ),
            ],

            [
              "Total Inventory Cost",
              formatCurrency(
                computed.totalInventoryCost
              ),
            ],

            [
              "Total Orders",
              computed.totalOrders,
            ],

            [
              "Lost Units",
              computed.lostUnits,
            ],
          ],
        },

        {
          name: "Historical Demand Data",
          rows: [
            [
              "Day",
              "Demand",
              "Lead Time",
            ],

            ...historical.map(
              (item) => [
                item.day,
                item.demand,
                item.lead_time,
              ]
            ),
          ],
        },
      ],
      `cost_analysis_${activeProduct.name}_${computed.serviceLevel}SL.xlsx`
    );

    success(
      `Cost analysis for ${computed.serviceLevel}% exported successfully.`
    );
  };

  /**
   * =========================================================
   * EXPORT PDF
   * =========================================================
   */
  const handleExportPdf = () => {
    exportToPdf(
      `Cost Analysis - ${activeProduct.name} - ${computed.serviceLevel}%`,
      [
        {
          title: "Inventory Configuration",
          head: [
            "Field",
            "Value",
          ],
          body: [
            [
              "Product Name",
              activeProduct.name,
            ],

            [
              "Service Level",
              `${computed.serviceLevel}%`,
            ],

            [
              "Z Score",
              String(computed.zScore),
            ],

            [
              "Opening Stock",
              String(
                activeProduct.opening_stock
              ),
            ],

            [
              "Safety Stock",
              String(
                computed.safetyStock
              ),
            ],

            [
              "Reorder Point",
              computed.reorderPoint.toFixed(2),
            ],

            [
              "Reorder Quantity",
              computed.reorderQuantity.toFixed(2),
            ],

            [
              "Analysis Period",
              `${computed.days} days`,
            ],
          ],
        },

        {
          title: "Cost Breakdown",
          head: [
            "Metric",
            "Value",
          ],
          body: [
            [
              "Average Inventory",
              computed.averageInventory.toFixed(2),
            ],

            [
              "Holding Cost",
              formatCurrency(
                computed.holdingCostTotal
              ),
            ],

            [
              "Ordering Cost",
              formatCurrency(
                computed.orderingCostTotal
              ),
            ],

            [
              "Stockout Cost",
              formatCurrency(
                computed.stockoutCostTotal
              ),
            ],

            [
              "Total Inventory Cost",
              formatCurrency(
                computed.totalInventoryCost
              ),
            ],

            [
              "Total Orders",
              String(
                computed.totalOrders
              ),
            ],

            [
              "Lost Units",
              String(
                computed.lostUnits
              ),
            ],
          ],
        },
      ],
      `cost_analysis_${activeProduct.name}_${computed.serviceLevel}SL.pdf`
    );

    success(
      `Cost analysis for ${computed.serviceLevel}% exported successfully.`
    );
  };

  return (
    <>
      <PageHeader
        title="Cost Analysis"
        subtitle={
          `${activeProduct.name} - ` +
          `${computed.serviceLevel}% service level cost evaluation`
        }
        icon={<Calculator />}
        action={
          <div className="flex flex-wrap items-center gap-3">
            {products.length > 0 && (
              <div className="flex items-center gap-3 bg-[#f0f8ff] border border-[#bae6fd] rounded-xl px-4 py-2 shadow-sm h-[42px]">
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
            <button
              type="button"
              className="
                flex items-center gap-2
                rounded-xl
                bg-gradient-to-tr from-blue-600 to-indigo-600
                shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]
                px-5 py-2.5 h-[42px]
                text-sm font-semibold text-white
                transition-all duration-300
                hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5
                active:translate-y-0
              "
              onClick={handleExportExcel}
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>

            <button
              type="button"
              className="
                flex items-center gap-2
                rounded-xl
                bg-gradient-to-tr from-slate-800 to-slate-700
                shadow-[0_4px_14px_0_rgba(15,23,42,0.39)]
                px-5 py-2.5 h-[42px]
                text-sm font-semibold text-white
                transition-all duration-300
                hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)] hover:-translate-y-0.5
                active:translate-y-0
              "
              onClick={handleExportPdf}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        }
      />

      {/* =====================================================
          SERVICE LEVEL SELECTION & BANNER
          ===================================================== */}
      <section className="mb-8">
        <div className="bg-white/40 backdrop-blur-3xl border border-white/60 shadow-xs rounded-[2rem] p-6 sm:p-8">
          <ServiceLevelSelector
            serviceLevels={availableServiceLevels}
            selectedServiceLevel={selectedServiceLevel}
            onChange={setSelectedServiceLevel}
            loading={loadingPolicies}
            onRefresh={fetchPolicies}
          />

          {selectedPolicy && (
            <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 p-5 shadow-inner">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Calculator className="w-4 h-4" />
                  </div>
                  Selected Service Level:
                  <strong className="text-blue-700 text-base ml-1">
                    {computed.serviceLevel}%
                  </strong>
                </span>

                <span className="flex items-center gap-2">
                  Opening Stock:
                  <strong className="text-slate-800 text-base ml-1">
                    {Number(activeProduct.opening_stock ?? 0)} units
                  </strong>
                </span>

                <span className="flex items-center gap-2">
                  Policy ID:
                  <strong className="bg-slate-200/60 px-2 py-0.5 rounded-md text-slate-700 font-mono text-xs">
                    #{selectedPolicy.id}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CALCULATION PARAMETERS
          ===================================================== */}
      <section className="mb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Calculator className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Inventory Calculation Parameters
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Service Level" value={`${computed.serviceLevel}%`} accent="blue" />
          <InfoCard label="Z Score" value={computed.zScore} accent="slate" />
          <InfoCard label="Reorder Point (ROP)" value={computed.reorderPoint.toFixed(2)} accent="emerald" />
          <InfoCard label="Reorder Quantity (ROQ)" value={computed.reorderQuantity.toFixed(2)} accent="violet" />
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <InfoCard label="Holding Cost / Unit" value={formatCurrency(computed.holdingCost)} accent="slate" />
          <InfoCard label="Ordering Cost / Order" value={formatCurrency(computed.orderingCost)} accent="slate" />
          <InfoCard label="Stockout Cost / Unit" value={formatCurrency(computed.stockoutCost)} accent="slate" />
        </div>

        <div className="
          mt-6
          rounded-2xl
          bg-slate-800
          border border-slate-700
          p-5
          text-sm
          text-slate-300
          shadow-lg
          flex flex-wrap items-center gap-y-3 gap-x-6
        ">
          <span className="flex items-center gap-2">
            Safety Stock: <strong className="text-white text-base">{computed.safetyStock}</strong>
          </span>
          <div className="w-px h-4 bg-slate-600 hidden sm:block" />
          
          <span className="flex items-center gap-2">
            Avg Demand: <strong className="text-white text-base">{computed.stats.averageDemand.toFixed(2)}</strong>
          </span>
          <div className="w-px h-4 bg-slate-600 hidden md:block" />
          
          <span className="flex items-center gap-2">
            Avg Lead Time: <strong className="text-white text-base">{computed.stats.averageLeadTime.toFixed(2)}d</strong>
          </span>
          <div className="w-px h-4 bg-slate-600 hidden lg:block" />
          
          <span className="flex items-center gap-2">
            Demand Std Dev: <strong className="text-white text-base">{computed.stats.standardDeviation.toFixed(4)}</strong>
          </span>
        </div>
      </section>

      {/* =====================================================
          COST SUMMARY
          ===================================================== */}
      <section className="mb-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <IndianRupee className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Inventory Cost Summary
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Holding Cost" value={formatCurrency(computed.holdingCostTotal)} accent="blue" />
          <InfoCard label="Ordering Cost" value={formatCurrency(computed.orderingCostTotal)} accent="violet" />
          <InfoCard label="Stockout Cost" value={formatCurrency(computed.stockoutCostTotal)} accent="rose" />
          <InfoCard label="Total Inventory Cost" value={formatCurrency(computed.totalInventoryCost)} accent="emerald" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          {/* Chart Section */}
          <div className="lg:col-span-7 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6">
            <h4 className="mb-6 font-bold text-slate-800 text-lg">Cost Distribution</h4>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontWeight: 600, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: '#F1F5F9', opacity: 0.4 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px 20px', fontWeight: 'bold' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const colors = ['#3B82F6', '#8B5CF6', '#F43F5E'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Calculation Receipt */}
          <div className="lg:col-span-5 bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-8 flex flex-col justify-between">
            <div>
              <h4 className="mb-6 font-bold text-slate-800 text-lg border-b border-slate-100 pb-4">
                Detailed Breakdown
              </h4>

              <div className="space-y-1">
                <Row label="Average Inventory" value={computed.averageInventory.toFixed(2)} />
                <Row label="Holding Cost" value={formatCurrency(computed.holdingCostTotal)} />
                <Row label="Ordering Cost" value={formatCurrency(computed.orderingCostTotal)} />
                <Row label="Stockout Cost" value={formatCurrency(computed.stockoutCostTotal)} />
                
                <div className="my-6" />
                <Row label="Total Orders" value={computed.totalOrders} />
                <Row label="Lost Units" value={computed.lostUnits} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
              <Row label="Total Inventory Cost" value={formatCurrency(computed.totalInventoryCost)} bold highlight />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * =========================================================
 * SERVICE LEVEL SELECTOR (PREMIUM SEGMENTED CONTROL)
 * =========================================================
 */
function ServiceLevelSelector({
  serviceLevels,
  selectedServiceLevel,
  onChange,
  loading,
  onRefresh,
}: {
  serviceLevels: number[];
  selectedServiceLevel: number | null;
  onChange: (serviceLevel: number) => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Inventory Buffer Service Level
          </h3>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Select an active Service Level policy to project costs.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="
            flex items-center gap-2
            rounded-xl
            border border-slate-200/60
            bg-white/80 backdrop-blur-sm
            px-4 py-2
            text-sm font-semibold
            text-slate-700
            shadow-xs
            transition-all duration-300
            hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm
            active:scale-95
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-6 flex items-center justify-center animate-pulse">
          <p className="text-sm font-semibold text-blue-800 tracking-wide">Loading available policies...</p>
        </div>
      ) : serviceLevels.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <p className="text-sm font-semibold text-amber-900">
            No Inventory Buffer Service Levels found. Please configure a policy first.
          </p>
        </div>
      ) : (
        <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex flex-wrap gap-1.5 shadow-inner border border-slate-200/50 w-max max-w-full">
          {serviceLevels.map((serviceLevel) => {
            const selected = Number(selectedServiceLevel) === Number(serviceLevel);
            return (
              <button
                key={serviceLevel}
                type="button"
                onClick={() => onChange(serviceLevel)}
                className={`
                  relative
                  px-6 py-2.5
                  text-sm font-bold
                  rounded-xl
                  transition-all duration-300 ease-out
                  ${selected 
                    ? "text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }
                `}
              >
                {selected && (
                  <div className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-slate-200/60 z-0" />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {serviceLevel}% 
                  {selected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * =========================================================
 * INFORMATION CARD (GLASSMORPHIC)
 * =========================================================
 */
function InfoCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  accent?: "blue" | "emerald" | "violet" | "rose" | "slate";
}) {
  const gradients = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200/60",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/60",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-200/60",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-200/60",
    slate: "from-slate-500/10 to-slate-500/5 border-slate-200/60",
  };

  const textColors = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    violet: "text-violet-700",
    rose: "text-rose-700",
    slate: "text-slate-700",
  };

  return (
    <div className={`
      relative overflow-hidden
      rounded-2xl
      border
      bg-white/60 backdrop-blur-xl
      p-5
      shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]
      transition-all duration-300
      hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]
      group
    `}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[accent]} opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500/80 mb-1">
          {label}
        </p>
        <p className={`text-2xl font-black tracking-tight ${textColors[accent]} drop-shadow-sm`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * CALCULATION ROW (RECEIPT STYLE)
 * =========================================================
 */
function Row({
  label,
  value,
  bold = false,
  highlight = false,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`
      flex items-end justify-between
      ${bold ? "py-3" : "py-1.5"}
    `}>
      <span
        className={`
          flex-1
          ${bold ? "text-sm font-bold uppercase tracking-wider text-slate-800" : "text-sm font-semibold text-slate-500"}
          ${highlight ? "text-emerald-700" : ""}
        `}
      >
        {label}
      </span>

      {/* Dotted Leader */}
      {!bold && (
        <div className="flex-1 mx-4 border-b-2 border-dotted border-slate-200/70 translate-y-[-6px]" />
      )}

      <span
        className={`
          ${bold ? "text-xl font-black text-slate-900" : "text-sm font-bold text-slate-700 font-mono"}
          ${highlight ? "text-emerald-700" : ""}
        `}
      >
        {value}
      </span>
    </div>
  );
}