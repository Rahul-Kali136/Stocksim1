import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Save,
  Info,
  DollarSign,
  Boxes,
  Play,
  Pencil,
  Trash2,
  X,
  History,
  RefreshCw,
  Lock,
  Plus,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState, Spinner } from '@/components/ui';
import { NoProduct } from '@/components/DashboardLayout';
import { exportToExcel } from '@/lib/export';
import { SERVICE_LEVELS } from '@/lib/simulation';

import {
  calculateInventoryPolicy,
  getPoliciesByProduct,
  editInventoryPolicy,
  deleteInventoryPolicy,
  runSimulationForPolicy,
  snapToSupportedServiceLevel,
} from '@/lib/api';

import type { Product } from '@/lib/types';

type EditableFields = Pick<
  Product,
  | 'opening_stock'
  | 'service_level'
  | 'z_value'
  | 'holding_cost'
  | 'stockout_cost'
  | 'ordering_cost'
>;

type BackendPolicy = {
  id: number;
  service_level: number;
  opening_stock: number;
  ordering_cost: number;
  holding_cost: number;
  stockout_cost: number;
  safety_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  created_at?: string;
  created_on?: string;
};

/*
 * ===========================================================
 * POLICY DUPLICATE HELPERS
 * ===========================================================
 *
 * Business rule:
 * For one product, only ONE policy is allowed for one
 * Service Level.
 *
 * Example:
 *   95% -> one record only
 *   92% -> one record only
 *   97% -> one record only
 *
 * If old duplicate rows already exist in the database, the
 * newest row is kept and older rows are removed.
 */
function getPolicyTimestamp(policy: BackendPolicy): number {
  const value = policy.created_at || policy.created_on || '';
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isNewerPolicy(
  current: BackendPolicy,
  existing: BackendPolicy
): boolean {
  const currentDate = getPolicyTimestamp(current);
  const existingDate = getPolicyTimestamp(existing);

  if (currentDate !== existingDate) {
    return currentDate > existingDate;
  }

  return Number(current.id) > Number(existing.id);
}

function deduplicatePolicies(
  policies: BackendPolicy[]
): {
  uniquePolicies: BackendPolicy[];
  duplicatePolicies: BackendPolicy[];
} {
  const byServiceLevel = new Map<number, BackendPolicy>();
  const duplicatePolicies: BackendPolicy[] = [];

  for (const policy of policies) {
    const serviceLevel = Number(policy.service_level);

    if (!Number.isFinite(serviceLevel)) {
      continue;
    }

    const existing = byServiceLevel.get(serviceLevel);

    if (!existing) {
      byServiceLevel.set(serviceLevel, policy);
      continue;
    }

    if (isNewerPolicy(policy, existing)) {
      duplicatePolicies.push(existing);
      byServiceLevel.set(serviceLevel, policy);
    } else {
      duplicatePolicies.push(policy);
    }
  }

  return {
    uniquePolicies: Array.from(byServiceLevel.values()),
    duplicatePolicies,
  };
}

export default function SafetyStockPage() {
  const navigate = useNavigate();

  const {
    activeProduct,
    products,
    setActiveProductId,
  } = useData();

  const analysis = useAnalysis();
  const { success, error } = useToast();

  /*
   * ---------------------------------------------------------
   * FORM STATE
   * ---------------------------------------------------------
   */

  const [draft, setDraft] =
    useState<EditableFields | null>(null);

  /*
   * Opening stock is maintained separately.
   *
   * It always comes from the Product database record.
   *
   * Deleting policy history MUST NEVER modify this value.
   */
  const [databaseOpeningStock, setDatabaseOpeningStock] =
    useState<number>(0);

  const [saving, setSaving] = useState(false);

  const [sliderVal, setSliderVal] =
    useState<number>(90);

  const [
    isServiceLevelSelected,
    setIsServiceLevelSelected,
  ] = useState<boolean>(false);

  /*
   * ---------------------------------------------------------
   * BACKEND POLICIES
   * ---------------------------------------------------------
   */

  const [backendPolicies, setBackendPolicies] =
    useState<BackendPolicy[]>([]);

  const [loadingPolicies, setLoadingPolicies] =
    useState(false);

  /*
   * NEW:
   * Loading state for Clear History.
   */
  const [clearingHistory, setClearingHistory] =
    useState(false);

  const [editingPolicy, setEditingPolicy] =
    useState<
      (BackendPolicy & {
        displayIndex?: number;
      }) | null
    >(null);

  const [runningSimPolicyId, setRunningSimPolicyId] =
    useState<number | null>(null);

  /*
   * ---------------------------------------------------------
   * GET OPENING STOCK FROM ACTIVE PRODUCT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!activeProduct) {
      setDatabaseOpeningStock(0);
      return;
    }

    const openingStock = Number(
      activeProduct.opening_stock ?? 0
    );

    setDatabaseOpeningStock(
      Number.isFinite(openingStock)
        ? openingStock
        : 0
    );
  }, [
    activeProduct?.id,
    activeProduct?.opening_stock,
  ]);

  /*
   * ---------------------------------------------------------
   * FETCH POLICY HISTORY
   * ---------------------------------------------------------
   */

  const fetchBackendPolicies =
    useCallback(async () => {
      if (!activeProduct?.id) {
        setBackendPolicies([]);
        return;
      }

      setLoadingPolicies(true);

      try {
        const list =
          await getPoliciesByProduct(
            activeProduct.id
          );

        const policies: BackendPolicy[] =
          Array.isArray(list)
            ? list.filter((p) => Number(p.service_level) > 0)
            : [];

        /*
         * -------------------------------------------------------
         * REMOVE DUPLICATES
         * -------------------------------------------------------
         *
         * Keep only ONE policy for each Service Level.
         * The newest record is kept.
         *
         * This also cleans old duplicate records from the
         * backend database by deleting the older duplicate IDs.
         */
        const {
          uniquePolicies,
          duplicatePolicies,
        } = deduplicatePolicies(policies);

        if (duplicatePolicies.length > 0) {
          console.warn(
            `Found ${duplicatePolicies.length} duplicate inventory policy record(s). Cleaning them up...`
          );

          await Promise.all(
            duplicatePolicies.map(async (duplicate) => {
              try {
                await deleteInventoryPolicy(
                  duplicate.id
                );
              } catch (deleteError) {
                /*
                 * Do not stop the page if one cleanup delete
                 * fails. The duplicate is still hidden from
                 * the frontend by the deduplication logic.
                 */
                console.error(
                  `Failed to remove duplicate policy ${duplicate.id}:`,
                  deleteError
                );
              }
            })
          );
        }

        /*
         * Sort oldest -> newest.
         */
        const sorted = [...uniquePolicies].sort(
          (a, b) => {
            const dateA = getPolicyTimestamp(a);
            const dateB = getPolicyTimestamp(b);

            if (dateA !== dateB) {
              return dateA - dateB;
            }

            return (
              Number(a.id || 0) -
              Number(b.id || 0)
            );
          }
        );

        setBackendPolicies(sorted);
      } catch (err) {
        console.error(
          'Failed to fetch inventory policies:',
          err
        );

        setBackendPolicies([]);
      } finally {
        setLoadingPolicies(false);
      }
    }, [activeProduct?.id]);

  useEffect(() => {
    fetchBackendPolicies();
  }, [fetchBackendPolicies]);

  /*
   * ---------------------------------------------------------
   * INITIALIZE FORM
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!activeProduct) {
      setDraft(null);
      return;
    }

    setIsServiceLevelSelected(false);
    setSliderVal(90);

    setDraft({
      opening_stock:
        databaseOpeningStock,

      service_level: 90,

      z_value: 1.28,

      holding_cost: Number(activeProduct?.holding_cost ?? 0),

      stockout_cost: Number(activeProduct?.stockout_cost ?? 0),

      ordering_cost: Number(activeProduct?.ordering_cost ?? 0),
    });
  }, [
    activeProduct?.id,
    databaseOpeningStock,
  ]);

  /*
   * ---------------------------------------------------------
   * NO PRODUCT
   * ---------------------------------------------------------
   */

  if (!activeProduct) {
    return (
      <>
        <PageHeader
          title="Inventory Policy"
          subtitle="Manage cost parameters and calculate inventory policy metrics"
          icon={
            <ShieldCheck className="w-5 h-5" />
          }
        />

        <NoProduct />
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * NO ANALYSIS
   * ---------------------------------------------------------
   */

  if (!analysis.ready) {
    return (
      <>
        <PageHeader
          title="Inventory Policy"
          subtitle={activeProduct.name}
          icon={
            <ShieldCheck className="w-5 h-5" />
          }
          action={
            products.length > 0 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white font-semibold"
                value={activeProduct.id}
                onChange={(e) =>
                  setActiveProductId(
                    e.target.value
                  )
                }
              >
                {products.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    Product: {p.name}
                  </option>
                ))}
              </select>
            )
          }
        />

        <EmptyState
          title="No historical data"
          message="Upload historical data to compute inventory policy metrics."
        />
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * Z-SCORE
   * ---------------------------------------------------------
   */

  const getZScoreForServiceLevel = (
    sl: number
  ) => {
    const predefined =
      SERVICE_LEVELS[sl];

    if (predefined !== undefined) {
      return predefined;
    }

    const alpha = 1 - sl / 100;

    if (alpha > 0 && alpha < 1) {
      const t = Math.sqrt(
        -2 * Math.log(alpha)
      );

      const c0 = 2.515517;
      const c1 = 0.802853;
      const c2 = 0.010328;

      const d1 = 1.432788;
      const d2 = 0.189269;
      const d3 = 0.001308;

      return Number(
        (
          t -
          (c0 +
            c1 * t +
            c2 * t * t) /
            (1 +
              d1 * t +
              d2 * t * t +
              d3 *
                t *
                t *
                t)
        ).toFixed(3)
      );
    }

    return 1.645;
  };

  /*
   * ---------------------------------------------------------
   * HANDLE FIELD
   * ---------------------------------------------------------
   */

  const handleField = <
    K extends keyof EditableFields
  >(
    key: K,
    value: EditableFields[K]
  ) => {
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  };

  /*
   * ---------------------------------------------------------
   * SERVICE LEVEL CHANGE
   * ---------------------------------------------------------
   */

  const handleServiceLevelChange = (
    sl: number
  ) => {
    const validSL =
      snapToSupportedServiceLevel(sl);

    const z =
      getZScoreForServiceLevel(
        validSL
      );

    setIsServiceLevelSelected(true);

    setSliderVal(validSL);

    setDraft((current) => ({
      opening_stock:
        databaseOpeningStock,

      service_level: validSL,

      z_value: z,

      holding_cost:
        current?.holding_cost || Number(activeProduct?.holding_cost ?? 0),

      stockout_cost:
        current?.stockout_cost || Number(activeProduct?.stockout_cost ?? 0),

      ordering_cost:
        current?.ordering_cost || Number(activeProduct?.ordering_cost ?? 0),
    }));
  };

  /*
   * ---------------------------------------------------------
   * RESET / CREATE ANOTHER POLICY
   * ---------------------------------------------------------
   */

  const handleResetForm = () => {
    setIsServiceLevelSelected(false);

    setSliderVal(90);

    setDraft({
      opening_stock:
        databaseOpeningStock,

      service_level: 90,

      z_value: 1.28,

      holding_cost: Number(activeProduct?.holding_cost ?? 0),

      stockout_cost: Number(activeProduct?.stockout_cost ?? 0),

      ordering_cost: Number(activeProduct?.ordering_cost ?? 0),
    });

    success(
      'New policy form created. Opening stock was loaded from the database.'
    );
  };

  /*
   * ---------------------------------------------------------
   * SAVE NEW POLICY
   * ---------------------------------------------------------
   */

  const handleSavePolicy = async () => {
    if (!draft || !activeProduct) {
      return;
    }

    if (!isServiceLevelSelected) {
      error(
        'Please select a Target Service Level first.'
      );
      return;
    }

    setSaving(true);

    try {
      const policyPayload = {
        product_id:
          activeProduct.id,

        service_level:
          Number(
            draft.service_level
          ),

        ordering_cost:
          Number(
            draft.ordering_cost
          ),

        holding_cost:
          Number(
            draft.holding_cost
          ),

        stockout_cost:
          Number(
            draft.stockout_cost
          ),

        /*
         * IMPORTANT:
         * Always use database opening stock.
         */
        opening_stock:
          Number(
            databaseOpeningStock
          ),
      };

      /*
       * -------------------------------------------------------
       * IMPORTANT DUPLICATE PROTECTION
       * -------------------------------------------------------
       *
       * If this Product already has a policy with the same
       * Service Level, UPDATE that existing policy instead of
       * creating another database row.
       *
       * This means: 95% + 95% will never create two rows.
       */
      const existingPolicy =
        backendPolicies.find(
          (policy) =>
            Number(policy.service_level) ===
            Number(draft.service_level)
        );

      if (existingPolicy) {
        await editInventoryPolicy(
          existingPolicy.id,
          {
            service_level:
              Number(draft.service_level),
            ordering_cost:
              Number(draft.ordering_cost),
            holding_cost:
              Number(draft.holding_cost),
            stockout_cost:
              Number(draft.stockout_cost),

            /*
             * Opening stock always comes from the Product
             * database record. It is never changed here.
             */
            opening_stock:
              Number(databaseOpeningStock),
          }
        );

        success(
          `Service Level ${draft.service_level}% already exists. Existing policy was updated instead of creating a duplicate.`
        );
      } else {
        /*
         * No policy exists for this Service Level, so create
         * exactly ONE new policy.
         */
        await calculateInventoryPolicy(
          policyPayload
        );

        success(
          'Inventory Policy calculated and saved successfully.'
        );
      }

      /*
       * Reload history.
       */
      await fetchBackendPolicies();

      /*
       * Prepare new policy form.
       */
      setIsServiceLevelSelected(false);

      setSliderVal(90);

      setDraft({
        opening_stock:
          databaseOpeningStock,

        service_level: 90,

        z_value: 1.28,

        holding_cost: 0,

        stockout_cost: 0,

        ordering_cost: 0,
      });
    } catch (err: any) {
      console.error(
        'Save policy error:',
        err
      );

      error(
        err?.message ||
          'Failed to save inventory policy.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * EDIT EXISTING POLICY
   * ---------------------------------------------------------
   */

  const handleUpdateExistingPolicy =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (!editingPolicy) {
        return;
      }

      setSaving(true);

      try {
        const serviceLevel =
          snapToSupportedServiceLevel(
            Number(
              editingPolicy.service_level
            )
          );

        await editInventoryPolicy(
          editingPolicy.id,
          {
            service_level:
              serviceLevel,

            ordering_cost:
              Number(
                editingPolicy.ordering_cost
              ),

            holding_cost:
              Number(
                editingPolicy.holding_cost
              ),

            stockout_cost:
              Number(
                editingPolicy.stockout_cost
              ),

            /*
             * Never modify opening stock.
             */
            opening_stock:
              Number(
                databaseOpeningStock
              ),
          }
        );

        success(
          `Inventory Policy #${
            editingPolicy.displayIndex ||
            editingPolicy.id
          } updated successfully.`
        );

        setEditingPolicy(null);

        await fetchBackendPolicies();
      } catch (err: any) {
        console.error(
          'Update policy error:',
          err
        );

        error(
          err?.message ||
            'Failed to edit inventory policy.'
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ---------------------------------------------------------
   * DELETE ONE POLICY
   * ---------------------------------------------------------
   */

  const handleDeletePolicy = async (
    policyId: number,
    displayIndex: number
  ) => {
    const confirmed =
      window.confirm(
        `Delete Inventory Policy #${displayIndex}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteInventoryPolicy(
        policyId
      );

      success(
        `Inventory Policy #${displayIndex} deleted successfully.`
      );

      await fetchBackendPolicies();

      /*
       * Reset ONLY policy form.
       *
       * Opening stock stays unchanged.
       */
      setIsServiceLevelSelected(false);

      setSliderVal(90);

      setDraft({
        opening_stock:
          databaseOpeningStock,

        service_level: 90,

        z_value: 1.28,

        holding_cost: 0,

        stockout_cost: 0,

        ordering_cost: 0,
      });
    } catch (err: any) {
      console.error(
        'Delete policy error:',
        err
      );

      error(
        err?.message ||
          'Failed to delete inventory policy.'
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * CLEAR ALL POLICY HISTORY
   * ---------------------------------------------------------
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * This function DOES NOT set values to zero.
   *
   * It permanently deletes every policy record returned
   * for the current product.
   *
   * It does NOT:
   * - modify Product
   * - modify opening stock
   * - modify historical demand
   * - modify suppliers
   * - modify organizations
   *
   * It ONLY deletes policy history records.
   */

  const handleClearHistory = async () => {
    if (!activeProduct) {
      return;
    }

    if (backendPolicies.length === 0) {
      success(
        'There is no policy history to clear.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Clear all ${backendPolicies.length} inventory policy history records for "${activeProduct.name}"?\n\nThis will permanently delete the policy history records. Opening Stock and Historical Data will NOT be changed.`
      );

    if (!confirmed) {
      return;
    }

    setClearingHistory(true);

    try {
      /*
       * Copy IDs before deleting.
       *
       * We delete the actual database records.
       */
      const policyIds =
        backendPolicies.map(
          (policy) => policy.id
        );

      /*
       * Delete every policy record.
       *
       * IMPORTANT:
       * There is NO PATCH here.
       * We are NOT sending zero values.
       */
      await Promise.all(
        policyIds.map((policyId) =>
          deleteInventoryPolicy(
            policyId
          )
        )
      );

      /*
       * Clear the local table immediately.
       */
      setBackendPolicies([]);

      /*
       * Reload from backend to confirm that
       * the records are actually gone.
       */
      await fetchBackendPolicies();

      /*
       * Reset policy creation form only.
       *
       * Opening stock remains exactly the same.
       */
      setIsServiceLevelSelected(false);

      setSliderVal(90);

      setDraft({
        opening_stock:
          databaseOpeningStock,

        service_level: 90,

        z_value: 1.28,

        holding_cost: 0,

        stockout_cost: 0,

        ordering_cost: 0,
      });

      success(
        `Policy history cleared successfully. ${policyIds.length} records deleted.`
      );
    } catch (err: any) {
      console.error(
        'Clear policy history error:',
        err
      );

      /*
       * If one or more deletes failed,
       * reload the real backend state.
       */
      await fetchBackendPolicies();

      error(
        err?.message ||
          'Failed to clear policy history.'
      );
    } finally {
      setClearingHistory(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * RUN SIMULATION
   * ---------------------------------------------------------
   */

  const handleRunSimulationForPolicy =
    async (
      policyId: number
    ) => {
      setRunningSimPolicyId(
        policyId
      );

      try {
        await runSimulationForPolicy(
          policyId,
          30
        );

        success(
          'Monte Carlo Simulation ran successfully for Policy!'
        );

        navigate(
          '/dashboard/simulation'
        );
      } catch (err: any) {
        error(
          err?.message ||
            'Failed to run simulation.'
        );
      } finally {
        setRunningSimPolicyId(null);
      }
    };

  /*
   * ---------------------------------------------------------
   * EXPORT
   * ---------------------------------------------------------
   */

  const handleExport = () => {
    if (
      analysis.stats.rows.length === 0
    ) {
      error(
        'No data to export.'
      );
      return;
    }

    const latestPolicy =
      backendPolicies[
        backendPolicies.length - 1
      ];

    exportToExcel(
      [
        {
          name:
            'Policy Cost Parameters',

          rows: [
            [
              'Parameter',
              'Value',
            ],

            [
              'Product Name',
              activeProduct.name,
            ],

            [
              'Opening Stock',
              databaseOpeningStock,
            ],

            [
              'Ordering Cost (per order)',
              latestPolicy
                ?.ordering_cost ?? 0,
            ],

            [
              'Holding Cost (per unit)',
              latestPolicy
                ?.holding_cost ?? 0,
            ],

            [
              'Stockout Cost (per unit)',
              latestPolicy
                ?.stockout_cost ?? 0,
            ],

            [
              'Service Level (%)',
              latestPolicy
                ?.service_level ?? 0,
            ],

            [
              'Z-Score',
              latestPolicy
                ? getZScoreForServiceLevel(
                    Number(
                      latestPolicy.service_level
                    )
                  )
                : 0,
            ],
          ],
        },

        {
          name:
            'Calculated Policy Metrics',

          rows: [
            [
              'Metric',
              'Value',
            ],

            [
              'Safety Stock',
              latestPolicy
                ?.safety_stock ?? 0,
            ],

            [
              'Lead Time Demand',
              analysis.leadTimeDemand.toFixed(
                4
              ),
            ],

            [
              'Reorder Point (ROP)',
              latestPolicy
                ?.reorder_point ?? 0,
            ],

            [
              'Reorder Quantity (ROQ)',
              latestPolicy
                ?.reorder_quantity ?? 0,
            ],
          ],
        },
      ],
      `inventory_policy_${activeProduct.name}.xlsx`
    );

    success(
      'Exported inventory policy report.'
    );
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <>
      <PageHeader
        title="Inventory Policy"
        subtitle={`${activeProduct.name} — configure cost parameters, calculate inventory policies, and run simulations`}
        icon={
          <ShieldCheck className="w-5 h-5" />
        }
        action={
          <div className="flex gap-2">
            {products.length > 0 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white font-semibold"
                value={activeProduct.id}
                onChange={(e) =>
                  setActiveProductId(
                    e.target.value
                  )
                }
              >
                {products.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    Product: {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleExport}
              className="btn-secondary"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        }
      />

      {/* =====================================================
          POLICY INPUT CARD
          ===================================================== */}

      <div className="card-pad mb-6 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/60 to-indigo-50/20 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-blue-100">

          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />

              Step 1: Select Target Service Level (%)
            </h3>

            <p className="text-xs text-slate-600 mt-0.5">
              Select or change the target Service Level percentage to enable the Cost Parameter inputs.
            </p>
          </div>

          <button
            onClick={handleResetForm}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold shadow-xs"
            title="Create another policy"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            + Create Another Policy
          </button>
        </div>

        {/* OPENING STOCK */}

        <div className="mb-5 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <Boxes className="w-4 h-4 text-emerald-600" />

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Opening Stock
                </p>

                <p className="text-[11px] text-slate-400">
                  Loaded from database opening-stock record
                </p>
              </div>
            </div>

            <div className="text-right">

              <span className="text-lg font-extrabold text-emerald-700">
                {databaseOpeningStock}
              </span>

              <span className="ml-1 text-xs text-slate-400">
                units
              </span>
            </div>
          </div>
        </div>

        {/* SERVICE LEVEL */}

        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">

          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            Target Service Level (%)
          </label>

          <div className="flex flex-col w-full max-w-lg gap-3">

            <div className="flex items-center justify-between">

              <span className="text-sm font-semibold text-slate-700">

                Selected Service Level:{' '}

                <span className="text-blue-600 font-extrabold text-lg">
                  {isServiceLevelSelected
                    ? sliderVal
                    : 0}
                  %
                </span>
              </span>

              <span className="text-xs text-slate-400">

                Calculated Z-Score:{' '}

                <span className="font-mono font-bold text-slate-700">
                  {isServiceLevelSelected
                    ? getZScoreForServiceLevel(
                        sliderVal
                      )
                    : 0}
                </span>
              </span>
            </div>

            <input
              type="range"
              min="90"
              max="99"
              step="0.5"
              value={sliderVal}
              onChange={(e) => {
                const value =
                  snapToSupportedServiceLevel(
                    Number(
                      e.target.value
                    )
                  );

                handleServiceLevelChange(
                  value
                );
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="relative h-4 text-[10px] text-slate-400 mt-1 select-none">

              <span className="absolute left-0">
                90%
              </span>

              <span className="absolute left-[27.78%] -translate-x-1/2">
                92.5%
              </span>

              <span className="absolute left-[55.56%] -translate-x-1/2">
                95%
              </span>

              <span className="absolute left-[83.33%] -translate-x-1/2">
                97.5%
              </span>

              <span className="absolute right-0">
                99%
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">

            <Info className="w-4 h-4 text-blue-500 shrink-0" />

            <span>
              Calculated using historical demand std dev (
              <strong>
                {analysis.stats.standardDeviation.toFixed(
                  2
                )}
              </strong>
              ) and lead time (
              <strong>
                {analysis.stats.averageLeadTime.toFixed(
                  1
                )}{' '}
                days
              </strong>
              ).
            </span>
          </div>
        </div>

        {/* COST PARAMETERS */}

        {draft && (
          <div className="mt-6 pt-5 border-t border-slate-200/80">

            <div className="flex items-center justify-between gap-4 mb-4">

              <div>

                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                  <DollarSign className="w-4 h-4 text-blue-600" />

                  Step 2: Inventory Policy Cost Parameters

                  {!isServiceLevelSelected && (
                    <span className="text-amber-600 text-xs font-normal flex items-center gap-1">

                      <Lock className="w-3.5 h-3.5" />

                      Disabled until Service Level selected
                    </span>
                  )}
                </h4>

                <p className="text-xs text-slate-500 mt-0.5">
                  Enter Ordering Cost, Holding Cost, and Stockout Cost.
                </p>
              </div>

              <button
                onClick={handleSavePolicy}
                disabled={
                  saving ||
                  !isServiceLevelSelected
                }
                className={`btn-primary text-xs py-2.5 px-5 flex items-center gap-2 shadow-md shadow-blue-600/20 font-semibold ${
                  !isServiceLevelSelected
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <Save className="w-4 h-4" />

                {saving
                  ? 'Calculating...'
                  : 'Save & Calculate Policy'}
              </button>
            </div>

            <fieldset
              disabled={
                !isServiceLevelSelected
              }
              className={
                !isServiceLevelSelected
                  ? 'opacity-50 cursor-not-allowed select-none'
                  : ''
              }
            >

              <div className="grid sm:grid-cols-3 gap-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">

                {/* OPENING STOCK */}

                <Field label="Opening Stock (from database)">
                  <div className="relative rounded-xl shadow-xs">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Boxes className="w-4 h-4 text-emerald-500" />
                    </div>

                    <input
                      type="number"
                      value={
                        databaseOpeningStock
                      }
                      readOnly
                      className="input py-2.5 pl-9 pr-3 text-sm font-bold bg-emerald-50 border-emerald-200 text-emerald-700 w-full cursor-not-allowed"
                    />
                  </div>
                </Field>

                {/* ORDERING COST */}

                <Field label="Ordering Cost (per order)">
                  <div className="relative rounded-xl shadow-xs">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-500 text-sm font-bold">
                        ₹
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      disabled={
                        !isServiceLevelSelected
                      }
                      value={
                        draft.ordering_cost ===
                        0
                          ? ''
                          : draft.ordering_cost
                      }
                      placeholder="0"
                      onFocus={(e) =>
                        e.target.select()
                      }
                      onChange={(e) =>
                        handleField(
                          'ordering_cost',
                          e.target.value ===
                            ''
                            ? 0
                            : Number(
                                e.target
                                  .value
                              )
                        )
                      }
                      className="input py-2.5 pl-7 pr-3 text-sm font-bold bg-white border-slate-300 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </Field>

                {/* HOLDING COST */}

                <Field label="Holding Cost (per unit)">
                  <div className="relative rounded-xl shadow-xs">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-500 text-sm font-bold">
                        ₹
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={
                        !isServiceLevelSelected
                      }
                      value={
                        draft.holding_cost ===
                        0
                          ? ''
                          : draft.holding_cost
                      }
                      placeholder="0"
                      onFocus={(e) =>
                        e.target.select()
                      }
                      onChange={(e) =>
                        handleField(
                          'holding_cost',
                          e.target.value ===
                            ''
                            ? 0
                            : Number(
                                e.target
                                  .value
                              )
                        )
                      }
                      className="input py-2.5 pl-7 pr-3 text-sm font-bold bg-white border-slate-300 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </Field>

                {/* STOCKOUT COST */}

                <Field label="Stockout Cost (per unit)">
                  <div className="relative rounded-xl shadow-xs">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-500 text-sm font-bold">
                        ₹
                      </span>
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={
                        !isServiceLevelSelected
                      }
                      value={
                        draft.stockout_cost ===
                        0
                          ? ''
                          : draft.stockout_cost
                      }
                      placeholder="0"
                      onFocus={(e) =>
                        e.target.select()
                      }
                      onChange={(e) =>
                        handleField(
                          'stockout_cost',
                          e.target.value ===
                            ''
                            ? 0
                            : Number(
                                e.target
                                  .value
                              )
                        )
                      }
                      className="input py-2.5 pl-7 pr-3 text-sm font-bold bg-white border-slate-300 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </Field>

              </div>
            </fieldset>
          </div>
        )}
      </div>

      {/* =====================================================
          HISTORY TABLE
          ===================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden card-hover mb-6">

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">

          <div>

            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">

              <History className="w-[18px] h-[18px] text-blue-600" />

              Calculated Inventory Policies History
            </h3>

            <p className="text-xs text-slate-500">
              Real-time policy calculations for{' '}
              {activeProduct.name}
            </p>
          </div>

          {/* HISTORY ACTIONS */}

          <div className="flex items-center gap-2">

            {/* CLEAR HISTORY */}

            <button
              onClick={
                handleClearHistory
              }
              disabled={
                clearingHistory ||
                loadingPolicies ||
                backendPolicies.length ===
                  0
              }
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete all policy history records"
            >
              <Trash2 className="w-3.5 h-3.5" />

              {clearingHistory
                ? 'Clearing...'
                : 'Clear History'}
            </button>

            {/* REFRESH */}

            <button
              onClick={
                fetchBackendPolicies
              }
              disabled={
                clearingHistory
              }
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingPolicies
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh
            </button>

          </div>
        </div>

        {loadingPolicies ? (
          <div className="p-12 text-center">
            <Spinner />
          </div>
        ) : backendPolicies.length ===
          0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">

            <History className="w-10 h-10 mx-auto mb-3 text-slate-300" />

            <p>
              No saved inventory policies for{' '}
              {activeProduct.name} yet.
            </p>

            <p className="mt-1">
              Select a Target Service Level
              and enter the cost parameters
              to create a policy.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto p-5">

            <table className="table-base">

              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Service Level</th>
                  <th>Opening Stock</th>
                  <th>Ordering Cost</th>
                  <th>Holding Cost</th>
                  <th>Stockout Cost</th>
                  <th>Safety Stock</th>
                  <th>Reorder Point (ROP)</th>
                  <th>Reorder Quantity (ROQ)</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {backendPolicies.map(
                  (pol, index) => (
                    <tr
                      key={pol.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >

                      <td className="font-mono font-bold text-blue-700">
                        {index + 1}
                      </td>

                      <td className="font-bold text-slate-900">
                        {pol.service_level}%
                      </td>

                      <td className="font-medium text-slate-700">
                        {pol.opening_stock}

                        <span className="text-slate-400 text-xs ml-1">
                          units
                        </span>
                      </td>

                      <td className="font-medium text-slate-700">
                        ₹
                        {pol.ordering_cost}
                      </td>

                      <td className="font-medium text-slate-700">
                        ₹
                        {pol.holding_cost}
                      </td>

                      <td className="font-medium text-slate-700">
                        ₹
                        {pol.stockout_cost}
                      </td>

                      <td>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                          {pol.safety_stock}{' '}
                          units
                        </span>
                      </td>

                      <td>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {pol.reorder_point}
                        </span>
                      </td>

                      <td>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {pol.reorder_quantity}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5">

                          {/* EDIT */}

                          <button
                            onClick={() =>
                              setEditingPolicy({
                                ...pol,
                                displayIndex:
                                  index + 1,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit / Recalculate Policy"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* DELETE ONE */}

                          <button
                            onClick={() =>
                              handleDeletePolicy(
                                pol.id,
                                index + 1
                              )
                            }
                            disabled={
                              clearingHistory
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* SIMULATION */}

                          <button
                            onClick={() =>
                              handleRunSimulationForPolicy(
                                pol.id
                              )
                            }
                            disabled={
                              runningSimPolicyId ===
                                pol.id ||
                              clearingHistory
                            }
                            className="btn-primary py-1 px-2.5 text-[11px] flex items-center gap-1 shadow-xs font-semibold"
                            title="Run Monte Carlo Simulation"
                          >
                            <Play className="w-3 h-3" />

                            {runningSimPolicyId ===
                            pol.id
                              ? 'Running...'
                              : 'Run Sim'}
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          EDIT POLICY MODAL
          ===================================================== */}

      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

            {/* HEADER */}

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">

              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                <Pencil className="w-4 h-4 text-blue-600" />

                Edit Inventory Policy{' '}
                {editingPolicy.displayIndex ??
                  editingPolicy.id}
              </h3>

              <button
                onClick={() =>
                  setEditingPolicy(
                    null
                  )
                }
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleUpdateExistingPolicy
              }
              className="p-6 space-y-4"
            >

              <div className="grid grid-cols-2 gap-4">

                {/* SERVICE LEVEL */}

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Service Level (%)
                  </label>

                  <input
                    type="number"
                    step="0.5"
                    min="90"
                    max="99"
                    value={
                      editingPolicy.service_level
                    }
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        service_level:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    className="input py-2 text-xs font-bold w-full"
                  />

                </div>

                {/* OPENING STOCK */}

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Opening Stock
                  </label>

                  <input
                    type="number"
                    value={
                      databaseOpeningStock
                    }
                    readOnly
                    className="input py-2 text-xs font-bold w-full bg-emerald-50 text-emerald-700 cursor-not-allowed"
                  />

                  <p className="text-[10px] text-slate-400 mt-1">
                    From database
                  </p>

                </div>

                {/* ORDERING COST */}

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Ordering Cost (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      editingPolicy.ordering_cost
                    }
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        ordering_cost:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    className="input py-2 text-xs font-bold w-full"
                  />

                </div>

                {/* HOLDING COST */}

                <div>

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Holding Cost (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      editingPolicy.holding_cost
                    }
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        holding_cost:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    className="input py-2 text-xs font-bold w-full"
                  />

                </div>

                {/* STOCKOUT COST */}

                <div className="col-span-2">

                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stockout Cost (₹)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      editingPolicy.stockout_cost
                    }
                    onChange={(e) =>
                      setEditingPolicy({
                        ...editingPolicy,
                        stockout_cost:
                          Number(
                            e.target.value
                          ),
                      })
                    }
                    className="input py-2 text-xs font-bold w-full"
                  />

                </div>

              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">

                <button
                  type="button"
                  onClick={() =>
                    setEditingPolicy(
                      null
                    )
                  }
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />

                  {saving
                    ? 'Recalculating...'
                    : 'Recalculate & Save Policy'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}

/*
 * ===========================================================
 * FIELD COMPONENT
 * ===========================================================
 */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>

      {children}
    </div>
  );
}