import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type {
  Product,
  HistoricalRow,
  Supplier,
  Organization,
} from '@/lib/types';

import {
  apiFetch,
  normalizeHistoricalRow,
  normalizeOrganization,
  normalizeProduct,
  normalizeSupplier,
  normalizeAuditLog,
} from '@/lib/api';

import {
  calculateStats,
  calculateDistribution,
} from '@/lib/simulation';

import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

/* =========================================================
   TYPES
========================================================= */

type DataContextValue = {
  products: Product[];
  activeProduct: Product | null;
  activeProductId: string | null;

  historical: HistoricalRow[];
  suppliers: Supplier[];
  organizations: Organization[];

  loadingProducts: boolean;
  loadingHistorical: boolean;
  loadingSuppliers: boolean;
  loadingOrganizations: boolean;

  setActiveProductId: (id: string | null) => void;

  refreshProducts: () => Promise<void>;
  refreshHistorical: (productId: string) => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;

  createProduct: (
    input: Omit<Product, 'id' | 'user_id' | 'created_at'>
  ) => Promise<Product | null>;

  bulkCreateProducts: (
    inputs: Omit<Product, 'id' | 'user_id' | 'created_at'>[]
  ) => Promise<number>;

  updateProduct: (
    id: string,
    input: Partial<Product>
  ) => Promise<void>;

  deleteProduct: (id: string) => Promise<void>;

  deleteProducts: (ids: string[]) => Promise<void>;

  createSupplier: (
    input: Omit<Supplier, 'id' | 'user_id' | 'created_at'>
  ) => Promise<Supplier | null>;

  bulkCreateSuppliers: (
    inputs: Omit<Supplier, 'id' | 'user_id' | 'created_at'>[]
  ) => Promise<number>;

  updateSupplier: (
    id: string,
    input: Partial<Supplier>
  ) => Promise<void>;

  deleteSupplier: (id: string) => Promise<void>;

  createOrganization: (
    input: Omit<Organization, 'id' | 'user_id' | 'created_at'>
  ) => Promise<Organization | null>;

  bulkCreateOrganizations: (
    inputs: Omit<Organization, 'id' | 'user_id' | 'created_at'>[]
  ) => Promise<number>;

  updateOrganization: (
    id: string,
    input: Partial<Organization>
  ) => Promise<void>;

  deleteOrganization: (id: string) => Promise<void>;

  replaceHistorical: (
    productId: string,
    rows: Array<{
      day: number;
      demand: number;
      lead_time: number;
      date?: string | null;
    }>
  ) => Promise<void>;

  simRows: any[] | null;
  setSimRows: (rows: any[] | null) => void;

  simMode: 'probabilistic' | 'historical';
  setSimMode: (
    mode: 'probabilistic' | 'historical'
  ) => void;

  simDays: number;
  setSimDays: (days: number) => void;

  simCustomOpeningStock: number | '';
  setSimCustomOpeningStock: (
    stock: number | ''
  ) => void;

  simCustomRop: number | '';
  setSimCustomRop: (rop: number | '') => void;

  simCustomRoq: number | '';
  setSimCustomRoq: (roq: number | '') => void;

  simTrialResults: any | null;
  setSimTrialResults: (results: any | null) => void;

  auditLogs: any[];

  addAuditLog: (
    action: string,
    details: string
  ) => Promise<void> | void;

  clearAuditLogs: () => Promise<void> | void;
};

/* =========================================================
   CONTEXT
========================================================= */

const DataContext =
  createContext<DataContextValue | undefined>(undefined);

/* =========================================================
   PROVIDER
========================================================= */

export function DataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { error: toastError } = useToast();

  /* =======================================================
     MAIN DATA
  ======================================================= */

  const [products, setProducts] = useState<Product[]>([]);
  const [activeProductId, setActiveProductId] =
    useState<string | null>(null);

  const [historical, setHistorical] =
    useState<HistoricalRow[]>([]);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  /* =======================================================
     LOADING STATES
  ======================================================= */

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [loadingHistorical, setLoadingHistorical] =
    useState(false);

  const [loadingSuppliers, setLoadingSuppliers] =
    useState(false);

  const [loadingOrganizations, setLoadingOrganizations] =
    useState(false);

  /* =======================================================
     SIMULATION STATE
  ======================================================= */

  const [simRows, setSimRows] =
    useState<any[] | null>(null);

  const [simMode, setSimMode] =
    useState<'probabilistic' | 'historical'>(
      'probabilistic'
    );

  const [simDays, setSimDays] =
    useState<number>(30);

  const [simCustomOpeningStock, setSimCustomOpeningStock] =
    useState<number | ''>('');

  const [simCustomRop, setSimCustomRop] =
    useState<number | ''>('');

  const [simCustomRoq, setSimCustomRoq] =
    useState<number | ''>('');

  const [simTrialResults, setSimTrialResults] =
    useState<any | null>(null);

  /* =======================================================
     AUDIT LOGS
  ======================================================= */

  const [auditLogs, setAuditLogs] =
    useState<any[]>([]);

  /* =======================================================
     CLEAR FRONTEND STORAGE
  ======================================================= */

  const clearStoredFrontendData = useCallback(() => {
    if (typeof window === 'undefined') return;

    const keysToRemove = Object.keys(localStorage).filter(
      (key) => key.startsWith('stocksim_')
    );

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    setAuditLogs([]);
  }, []);

  /* =======================================================
     REFRESH AUDIT LOGS
  ======================================================= */

  const refreshAuditLogs = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiFetch<any[]>(
        'api/auditlogs/'
      );

      setAuditLogs(
        (data ?? []).map(normalizeAuditLog)
      );
    } catch (error: any) {
      toastError(
        error?.message ||
          'Failed to load audit logs'
      );
    }
  }, [user, toastError]);

  /* =======================================================
     CLEAR AUDIT LOGS
  ======================================================= */

  const clearAuditLogs = useCallback(async () => {
    if (!user) return;

    try {
      await apiFetch<any>(
        'api/auditlogs/purge/',
        {
          method: 'DELETE',
        }
      );

      await refreshAuditLogs();
    } catch (error: any) {
      toastError(
        error?.message ||
          'Failed to clear audit logs'
      );
    }
  }, [user, refreshAuditLogs, toastError]);

  /* =======================================================
     ADD AUDIT LOG
  ======================================================= */

  const addAuditLog = useCallback(
    async (
      action: string,
      details: string
    ) => {
      if (!user) return;

      try {
        await apiFetch<any>(
          'api/auditlogs/',
          {
            method: 'POST',
            body: JSON.stringify({
              action,
              details,
              user_email: user.email,
            }),
          }
        );

        await refreshAuditLogs();
      } catch (error: any) {
        console.error(
          'Failed to save audit log:',
          error
        );
      }
    },
    [user, refreshAuditLogs]
  );

  /* =======================================================
     LOAD AUDIT LOGS AFTER LOGIN
  ======================================================= */

  useEffect(() => {
    if (user) {
      refreshAuditLogs();
    } else {
      setAuditLogs([]);
    }
  }, [user, refreshAuditLogs]);

  /* =======================================================
     REFRESH PRODUCTS
     
     IMPORTANT:
     Backend endpoint = api/product/
     NOT api/products/
  ======================================================= */

  const refreshProducts = useCallback(async () => {
    if (!user) return;

    setLoadingProducts(true);

    try {
      const data = await apiFetch<any[]>(
        'api/product/'
      );

      const mapped = (data ?? []).map(
        normalizeProduct
      );

      /*
       * Remove duplicate products on frontend.
       *
       * This protects the UI if backend accidentally
       * returns the same product more than once.
       */
      const uniqueProducts = Array.from(
        new Map(
          mapped.map((product) => [
            String(product.id),
            product,
          ])
        ).values()
      );

      setProducts(uniqueProducts);

      setActiveProductId((prev) => {
        if (
          prev &&
          uniqueProducts.some(
            (product) =>
              String(product.id) === String(prev)
          )
        ) {
          return prev;
        }

        return uniqueProducts.length > 0
          ? uniqueProducts[0].id
          : null;
      });
    } catch (error: any) {
      toastError(
        error?.message ||
          'Failed to load products'
      );
    } finally {
      setLoadingProducts(false);
    }
  }, [user, toastError]);

  /* =======================================================
     REFRESH HISTORICAL DATA
  ======================================================= */

  const refreshHistorical = useCallback(
    async (productId: string) => {
      if (!user || !productId) {
        setHistorical([]);
        return;
      }

      setLoadingHistorical(true);

      try {
        const data = await apiFetch<any[]>(
          `api/inventory/product/${encodeURIComponent(
            productId
          )}/`
        );

        const unpacked: HistoricalRow[] = [];

        if (Array.isArray(data)) {
          data.forEach((inv) => {
            const dates = Array.isArray(inv.date)
              ? inv.date
              : [];

            const demands = Array.isArray(inv.demand)
              ? inv.demand
              : [];

            const leadTimes =
              Array.isArray(inv.lead_time)
                ? inv.lead_time
                : [];

            const length = Math.max(
              dates.length,
              demands.length,
              leadTimes.length
            );

            for (let i = 0; i < length; i++) {
              unpacked.push({
                id: `${inv.id}-${i}`,
                product_id: productId,
                day: i + 1,
                demand: Number(
                  demands[i] ?? 0
                ),
                lead_time: Number(
                  leadTimes[i] ?? 0
                ),
                date: dates[i] ?? null,
                created_at:
                  new Date().toISOString(),
              });
            }
          });
        }

        /*
         * Remove duplicate historical rows.
         */
        const uniqueHistorical = Array.from(
          new Map(
            unpacked.map((row) => [
              String(row.id),
              row,
            ])
          ).values()
        );

        setHistorical(uniqueHistorical);
      } catch (error: any) {
        toastError(
          error?.message ||
            'Failed to load historical data'
        );
      } finally {
        setLoadingHistorical(false);
      }
    },
    [user, toastError]
  );

  /* =======================================================
     REFRESH SUPPLIERS
  ======================================================= */

  const refreshSuppliers = useCallback(async () => {
    if (!user) return;

    setLoadingSuppliers(true);

    try {
      const data = await apiFetch<any[]>(
        'api/suppliers/'
      );

      const mapped = (data ?? []).map(
        normalizeSupplier
      );

      const uniqueSuppliers = Array.from(
        new Map(
          mapped.map((supplier) => [
            String(supplier.id),
            supplier,
          ])
        ).values()
      );

      setSuppliers(uniqueSuppliers);
    } catch (error: any) {
      toastError(
        error?.message ||
          'Failed to load suppliers'
      );
    } finally {
      setLoadingSuppliers(false);
    }
  }, [user, toastError]);

  /* =======================================================
     REFRESH ORGANIZATIONS
  ======================================================= */

  const refreshOrganizations = useCallback(
    async () => {
      if (!user) return;

      setLoadingOrganizations(true);

      try {
        const data = await apiFetch<any[]>(
          'api/organization/'
        );

        const mapped = (data ?? []).map(
          normalizeOrganization
        );

        const uniqueOrganizations =
          Array.from(
            new Map(
              mapped.map((organization) => [
                String(organization.id),
                organization,
              ])
            ).values()
          );

        setOrganizations(uniqueOrganizations);
      } catch (error: any) {
        if (error?.message) {
          toastError(error.message);
        }

        setOrganizations([]);
      } finally {
        setLoadingOrganizations(false);
      }
    },
    [user, toastError]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (!user) {
      setProducts([]);
      setActiveProductId(null);
      setHistorical([]);
      setSuppliers([]);
      setOrganizations([]);
      return;
    }

    /*
     * These are the only initial calls for products
     * and organizations.
     */
    refreshProducts();
    refreshOrganizations();
  }, [
    user,
    refreshProducts,
    refreshOrganizations,
  ]);

  /* =======================================================
     LOAD SUPPLIERS
  ======================================================= */

  useEffect(() => {
    if (user) {
      refreshSuppliers();
    }
  }, [user, refreshSuppliers]);

  /* =======================================================
     LOAD HISTORICAL DATA FOR ACTIVE PRODUCT
  ======================================================= */

  useEffect(() => {
    if (!activeProductId) {
      setHistorical([]);
      return;
    }

    refreshHistorical(activeProductId);
  }, [
    activeProductId,
    refreshHistorical,
  ]);

  /* =======================================================
     CREATE PRODUCT
  ======================================================= */

  const createProduct:
    DataContextValue['createProduct'] =
    useCallback(
      async (input) => {
        if (!user) return null;

        const payload = {
          ...input,
          user_id: user.id,
        };

        try {
          const created = await apiFetch<any>(
            'api/product/',
            {
              method: 'POST',
              body: JSON.stringify(payload),
            }
          );

          await addAuditLog(
            'CREATE_PRODUCT',
            `Created product "${input.name}" with opening stock ${input.opening_stock} units.`
          );

          await refreshProducts();

          return normalizeProduct(
            created
          ) as Product;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to create product'
          );

          return null;
        }
      },
      [
        user,
        addAuditLog,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     BULK CREATE PRODUCTS
  ======================================================= */

  const bulkCreateProducts:
    DataContextValue['bulkCreateProducts'] =
    useCallback(
      async (inputs) => {
        if (!user || inputs.length === 0) {
          return 0;
        }

        try {
          const created =
            await Promise.all(
              inputs.map((input) =>
                apiFetch<any>(
                  'api/product/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      ...input,
                      user_id: user.id,
                    }),
                  }
                )
              )
            );

          await addAuditLog(
            'BULK_CREATE_PRODUCTS',
            `Bulk imported ${created.length} products.`
          );

          await refreshProducts();

          return created.length;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to import products'
          );

          return 0;
        }
      },
      [
        user,
        addAuditLog,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     UPDATE PRODUCT
  ======================================================= */

  const updateProduct:
    DataContextValue['updateProduct'] =
    useCallback(
      async (id, input) => {
        try {
          const payload =
            Object.fromEntries(
              Object.entries(input).filter(
                ([, value]) =>
                  value !== undefined
              )
            );

          await apiFetch<any>(
            `api/product/${id}/`,
            {
              method: 'PATCH',
              body: JSON.stringify(payload),
            }
          );

          const keys = Object.keys(input)
            .filter(
              (key) =>
                input[
                  key as keyof typeof input
                ] !== undefined
            )
            .join(', ');

          await addAuditLog(
            'UPDATE_PRODUCT',
            `Updated parameters for product ID "${id}": ${keys}.`
          );

          await refreshProducts();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to update product'
          );
        }
      },
      [
        addAuditLog,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     DELETE PRODUCT
  ======================================================= */

  const deleteProduct:
    DataContextValue['deleteProduct'] =
    useCallback(
      async (id) => {
        try {
          await apiFetch<any>(
            `api/product/${id}/`,
            {
              method: 'DELETE',
            }
          );

          if (activeProductId === id) {
            setActiveProductId(null);
          }

          await addAuditLog(
            'DELETE_PRODUCT',
            `Deleted product ID "${id}".`
          );

          await refreshProducts();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to delete product'
          );
        }
      },
      [
        activeProductId,
        addAuditLog,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     DELETE PRODUCTS
  ======================================================= */

  const deleteProducts:
    DataContextValue['deleteProducts'] =
    useCallback(
      async (ids) => {
        if (ids.length === 0) return;

        try {
          await Promise.all(
            ids.map((id) =>
              apiFetch<any>(
                `api/product/${id}/`,
                {
                  method: 'DELETE',
                }
              )
            )
          );

          if (
            activeProductId &&
            ids.includes(activeProductId)
          ) {
            setActiveProductId(null);
          }

          await addAuditLog(
            'DELETE_PRODUCTS',
            `Bulk deleted ${ids.length} products.`
          );

          await refreshProducts();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to delete products'
          );
        }
      },
      [
        activeProductId,
        addAuditLog,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     REPLACE HISTORICAL DATA
  ======================================================= */

  const replaceHistorical:
    DataContextValue['replaceHistorical'] =
    useCallback(
      async (productId, rows) => {
        if (!user) return;

        try {
          /* ------------------------------------------------
             STEP 1: SAVE HISTORICAL DATA
          ------------------------------------------------ */

          if (rows.length > 0) {
            await apiFetch(
              `api/inventory/product/${encodeURIComponent(
                productId
              )}/`,
              {
                method: 'POST',
                body: JSON.stringify({
                  date: rows.map(
                    (r) => r.date ?? null
                  ),
                  demand: rows.map(
                    (r) => r.demand
                  ),
                  lead_time: rows.map(
                    (r) => r.lead_time
                  ),
                }),
              }
            );

            /* ----------------------------------------------
               STEP 2: CALCULATE STATISTICS
            ---------------------------------------------- */

            const stats =
              calculateStats(
                rows.map((r) => ({
                  day: r.day,
                  demand: r.demand,
                  lead_time: r.lead_time,
                }))
              );

            await apiFetch(
              `api/product/${productId}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({
                  avg_daily_demand:
                    Number(
                      stats.averageDemand.toFixed(
                        4
                      )
                    ),

                  demand_std_dev:
                    Number(
                      stats.standardDeviation.toFixed(
                        4
                      )
                    ),

                  avg_lead_time:
                    Number(
                      stats.averageLeadTime.toFixed(
                        4
                      )
                    ),

                  lead_time_std_dev:
                    Number(
                      stats.leadTimeStandardDeviation.toFixed(
                        4
                      )
                    ),
                }),
              }
            );

            /* ----------------------------------------------
               FIND CURRENT PRODUCT
            ---------------------------------------------- */

            const product =
              products.find(
                (p) =>
                  String(p.id) ===
                  String(productId)
              );

            /* ----------------------------------------------
               AUXILIARY CALCULATIONS
            ---------------------------------------------- */

            if (product) {
              const pName = product.name;

              /* --------------------------------------------
                 PROBABILITY DISTRIBUTION
                 
                 IMPORTANT:
                 This endpoint is optional.
                 
                 If backend does not have:
                 api/probability/
                 
                 it will NOT stop the upload.
              -------------------------------------------- */

              try {
                const demandDist =
                  calculateDistribution(
                    rows.map(
                      (r) => r.demand
                    )
                  );

                const leadDist =
                  calculateDistribution(
                    rows.map(
                      (r) => r.lead_time
                    )
                  );

                await apiFetch(
                  'api/probability/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      product_name: pName,

                      demand_value:
                        demandDist.map(
                          (d) => d.value
                        ),

                      demand_frequency:
                        demandDist.map(
                          (d) =>
                            d.frequency
                        ),

                      demand_probability:
                        demandDist.map(
                          (d) =>
                            Number(
                              d.probability.toFixed(
                                4
                              )
                            )
                        ),

                      demand_cumulative_probability:
                        demandDist.map(
                          (d) =>
                            Number(
                              d.cumulative.toFixed(
                                4
                              )
                            )
                        ),

                      demand_random_numbers:
                        demandDist.map(
                          (d) =>
                            d.interval
                        ),

                      lead_time_value:
                        leadDist.map(
                          (d) => d.value
                        ),

                      lead_time_frequency:
                        leadDist.map(
                          (d) =>
                            d.frequency
                        ),

                      lead_time_probability:
                        leadDist.map(
                          (d) =>
                            Number(
                              d.probability.toFixed(
                                4
                              )
                            )
                        ),

                      lead_time_cumulative_probability:
                        leadDist.map(
                          (d) =>
                            Number(
                              d.cumulative.toFixed(
                                4
                              )
                            )
                        ),

                      lead_time_random_numbers:
                        leadDist.map(
                          (d) =>
                            d.interval
                        ),
                    }),
                  }
                );
              } catch (probabilityError) {
                /*
                 * Do NOT fail the complete upload.
                 */
                console.warn(
                  'Probability API is unavailable. Historical data was saved successfully.',
                  probabilityError
                );
              }

              /* --------------------------------------------
                 INVENTORY POLICY
              -------------------------------------------- */

              try {
                const z =
                  Number(
                    product.z_value ?? 0
                  );

                const averageLeadTime =
                  Number(
                    stats.averageLeadTime ??
                      0
                  );

                const standardDeviation =
                  Number(
                    stats.standardDeviation ??
                      0
                  );

                const safety = Math.round(
                  z *
                    standardDeviation *
                    Math.sqrt(
                      averageLeadTime
                    )
                );

                const rop =
                  Number(
                    stats.averageDemand ??
                      0
                  ) *
                    averageLeadTime +
                  safety;

                const orderingCost =
                  Number(
                    product.ordering_cost ??
                      0
                  );

                const holdingCost =
                  Number(
                    product.holding_cost ??
                      0
                  );

                const annualDemand =
                  Number(
                    stats.averageDemand ??
                      0
                  ) * rows.length;

                const roq =
                  holdingCost > 0
                    ? Math.sqrt(
                        (2 *
                          annualDemand *
                          orderingCost) /
                          holdingCost
                      )
                    : 0;

                await apiFetch(
                  'api/inventorypolicy/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      policy_name:
                        `Inventory Policy - Product ${pName}`,

                      safety_stock:
                        safety,

                      reorder_point:
                        Number(
                          rop.toFixed(2)
                        ),

                      reorder_quantity:
                        Number(
                          roq.toFixed(2)
                        ),
                    }),
                  }
                );
              } catch (policyError) {
                console.warn(
                  'Inventory policy API failed:',
                  policyError
                );
              }

              /* --------------------------------------------
                 DASHBOARD SUMMARY
              -------------------------------------------- */

              try {
                const org =
                  organizations.find(
                    (o) =>
                      String(o.id) ===
                      String(
                        product.organization_id
                      )
                  );

                const orgName =
                  org?.name ?? 'N/A';

                const serviceLevel =
                  Number(
                    product.service_level ??
                      95
                  );

                const risk = Math.max(
                  0,
                  100 - serviceLevel
                );

                const avgInv =
                  Math.max(
                    0,
                    Number(
                      stats.standardDeviation ??
                        0
                    )
                  );

                const roq =
                  Number(
                    product.ordering_cost ??
                      0
                  ) > 0 &&
                  Number(
                    product.holding_cost ??
                      0
                  ) > 0
                    ? Math.sqrt(
                        (2 *
                          Number(
                            stats.averageDemand ??
                              0
                          ) *
                          rows.length *
                          Number(
                            product.ordering_cost ??
                              0
                          )) /
                          Number(
                            product.holding_cost ??
                              1
                          )
                      )
                    : 0;

                const safety =
                  Math.round(
                    Number(
                      product.z_value ?? 0
                    ) *
                      Number(
                        stats.standardDeviation ??
                          0
                      ) *
                      Math.sqrt(
                        Number(
                          stats.averageLeadTime ??
                            0
                        )
                      )
                  );

                const holdCost =
                  (safety + roq / 2) *
                  Number(
                    product.holding_cost ??
                      0
                  );

                const annualDemand =
                  Number(
                    stats.averageDemand ??
                      0
                  ) * rows.length;

                const numOrd =
                  roq > 0
                    ? annualDemand / roq
                    : 0;

                const ordCost =
                  numOrd *
                  Number(
                    product.ordering_cost ??
                      0
                  );

                const stOutCost =
                  annualDemand *
                  (risk / 100) *
                  Number(
                    product.stockout_cost ??
                      0
                  );

                const totalCost = Math.round(
                  holdCost +
                    ordCost +
                    stOutCost
                );

                await apiFetch(
                  'api/dashboard/summary/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      organization:
                        orgName,

                      product:
                        product.name,

                      simulation_days:
                        rows.length,

                      rop: Number(
                        (
                          Number(
                            stats.averageDemand ??
                              0
                          ) *
                            Number(
                              stats.averageLeadTime ??
                                0
                            ) +
                          safety
                        ).toFixed(2)
                      ),

                      roq: Number(
                        roq.toFixed(2)
                      ),

                      stockout_risk:
                        risk,

                      service_level:
                        serviceLevel,

                      total_cost:
                        totalCost,
                    }),
                  }
                );
              } catch (dashboardError) {
                console.warn(
                  'Dashboard summary API failed:',
                  dashboardError
                );
              }

              /* --------------------------------------------
                 REPORT
              -------------------------------------------- */

              try {
                await apiFetch(
                  'api/reports/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      product:
                        product.name,

                      report_type:
                        'inventory',

                      format: 'Excel',

                      simulation_days:
                        rows.length,

                      status: 'Generated',
                    }),
                  }
                );
              } catch (reportError) {
                console.warn(
                  'Report API failed:',
                  reportError
                );
              }

              /* --------------------------------------------
                 NOTIFICATION
              -------------------------------------------- */

              try {
                const rop =
                  Number(
                    stats.averageDemand ??
                      0
                  ) *
                    Number(
                      stats.averageLeadTime ??
                        0
                    );

                await apiFetch(
                  'api/notifications/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      type: 'Data Import',

                      product:
                        product.name,

                      message:
                        `Uploaded historical demand data of ${rows.length} records.`,

                      status: 'Unread',
                    }),
                  }
                );
              } catch (notificationError) {
                console.warn(
                  'Notification API failed:',
                  notificationError
                );
              }
            }
          } else {
            /* --------------------------------------------
               DELETE HISTORICAL DATA
            -------------------------------------------- */

            await apiFetch(
              `api/inventory/product/${encodeURIComponent(
                productId
              )}/`,
              {
                method: 'DELETE',
              }
            );

            await apiFetch(
              `api/product/${productId}/`,
              {
                method: 'PATCH',
                body: JSON.stringify({
                  avg_daily_demand: 0,
                  demand_std_dev: 0,
                  avg_lead_time: 0,
                  lead_time_std_dev: 0,
                }),
              }
            );
          }

          /* ----------------------------------------------
             FINAL REFRESH
          ---------------------------------------------- */

          await addAuditLog(
            'UPLOAD_DEMAND_DATA',
            `Uploaded demand and lead time historical data records for product ID "${productId}".`
          );

          await refreshHistorical(
            productId
          );

          await refreshProducts();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to upload historical data'
          );
        }
      },
      [
        user,
        products,
        organizations,
        addAuditLog,
        refreshHistorical,
        refreshProducts,
        toastError,
      ]
    );

  /* =======================================================
     CREATE SUPPLIER
  ======================================================= */

  const createSupplier:
    DataContextValue['createSupplier'] =
    useCallback(
      async (input) => {
        if (!user) return null;

        try {
          const created =
            await apiFetch<any>(
              'api/suppliers/',
              {
                method: 'POST',
                body: JSON.stringify({
                  ...input,
                  user_id: user.id,
                }),
              }
            );

          await addAuditLog(
            'CREATE_SUPPLIER',
            `Added supplier "${input.supplier_name}".`
          );

          await refreshSuppliers();

          return normalizeSupplier(
            created
          ) as Supplier;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to create supplier'
          );

          return null;
        }
      },
      [
        user,
        addAuditLog,
        refreshSuppliers,
        toastError,
      ]
    );

  /* =======================================================
     BULK CREATE SUPPLIERS
  ======================================================= */

  const bulkCreateSuppliers:
    DataContextValue['bulkCreateSuppliers'] =
    useCallback(
      async (inputs) => {
        if (!user || inputs.length === 0) {
          return 0;
        }

        try {
          const created =
            await Promise.all(
              inputs.map((input) =>
                apiFetch<any>(
                  'api/suppliers/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      ...input,
                      user_id: user.id,
                    }),
                  }
                )
              )
            );

          await addAuditLog(
            'BULK_CREATE_SUPPLIERS',
            `Bulk imported ${created.length} suppliers.`
          );

          await refreshSuppliers();

          return created.length;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to import suppliers'
          );

          return 0;
        }
      },
      [
        user,
        addAuditLog,
        refreshSuppliers,
        toastError,
      ]
    );

  /* =======================================================
     UPDATE SUPPLIER
  ======================================================= */

  const updateSupplier:
    DataContextValue['updateSupplier'] =
    useCallback(
      async (id, input) => {
        try {
          await apiFetch<any>(
            `api/suppliers/${id}/`,
            {
              method: 'PATCH',
              body: JSON.stringify(
                Object.fromEntries(
                  Object.entries(
                    input
                  ).filter(
                    ([, value]) =>
                      value !== undefined
                  )
                )
              ),
            }
          );

          await addAuditLog(
            'UPDATE_SUPPLIER',
            `Updated parameters for supplier ID "${id}".`
          );

          await refreshSuppliers();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to update supplier'
          );
        }
      },
      [
        addAuditLog,
        refreshSuppliers,
        toastError,
      ]
    );

  /* =======================================================
     DELETE SUPPLIER
  ======================================================= */

  const deleteSupplier:
    DataContextValue['deleteSupplier'] =
    useCallback(
      async (id) => {
        try {
          await apiFetch<any>(
            `api/suppliers/${id}/`,
            {
              method: 'DELETE',
            }
          );

          await addAuditLog(
            'DELETE_SUPPLIER',
            `Deleted supplier ID "${id}".`
          );

          await refreshSuppliers();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to delete supplier'
          );
        }
      },
      [
        addAuditLog,
        refreshSuppliers,
        toastError,
      ]
    );

  /* =======================================================
     CREATE ORGANIZATION
  ======================================================= */

  const createOrganization:
    DataContextValue['createOrganization'] =
    useCallback(
      async (input) => {
        if (!user) return null;

        try {
          const created =
            await apiFetch<any>(
              'api/organization/',
              {
                method: 'POST',
                body: JSON.stringify({
                  organization_name:
                    input.name,

                  organization_type:
                    input.description,

                  location:
                    input.location,

                  user_id: user.id,
                }),
              }
            );

          await addAuditLog(
            'CREATE_ORGANIZATION',
            `Created organization "${input.name}".`
          );

          await refreshOrganizations();

          return normalizeOrganization(
            created
          ) as Organization;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to create organization'
          );

          return null;
        }
      },
      [
        user,
        addAuditLog,
        refreshOrganizations,
        toastError,
      ]
    );

  /* =======================================================
     BULK CREATE ORGANIZATIONS
  ======================================================= */

  const bulkCreateOrganizations:
    DataContextValue['bulkCreateOrganizations'] =
    useCallback(
      async (inputs) => {
        if (!user || inputs.length === 0) {
          return 0;
        }

        try {
          const created =
            await Promise.all(
              inputs.map((input) =>
                apiFetch<any>(
                  'api/organization/',
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      organization_name:
                        input.name ||
                        (input as any)
                          .organization_name,

                      organization_type:
                        input.description ||
                        (input as any)
                          .organization_type,

                      location:
                        input.location,

                      user_id: user.id,
                    }),
                  }
                )
              )
            );

          await addAuditLog(
            'BULK_CREATE_ORGANIZATIONS',
            `Bulk imported ${created.length} organization records.`
          );

          await refreshOrganizations();

          return created.length;
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to import organizations'
          );

          return 0;
        }
      },
      [
        user,
        addAuditLog,
        refreshOrganizations,
        toastError,
      ]
    );

  /* =======================================================
     UPDATE ORGANIZATION
  ======================================================= */

  const updateOrganization:
    DataContextValue['updateOrganization'] =
    useCallback(
      async (id, input) => {
        try {
          const payload: any = {};

          if (input.name !== undefined) {
            payload.organization_name =
              input.name;
          }

          if (
            input.description !==
            undefined
          ) {
            payload.organization_type =
              input.description;
          }

          if (
            input.location !==
            undefined
          ) {
            payload.location =
              input.location;
          }

          await apiFetch<any>(
            `api/organization/${id}/`,
            {
              method: 'PATCH',
              body: JSON.stringify(
                payload
              ),
            }
          );

          await addAuditLog(
            'UPDATE_ORGANIZATION',
            `Updated parameters for organization ID "${id}".`
          );

          await refreshOrganizations();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to update organization'
          );
        }
      },
      [
        addAuditLog,
        refreshOrganizations,
        toastError,
      ]
    );

  /* =======================================================
     DELETE ORGANIZATION
  ======================================================= */

  const deleteOrganization:
    DataContextValue['deleteOrganization'] =
    useCallback(
      async (id) => {
        try {
          await apiFetch<any>(
            `api/organization/${id}/`,
            {
              method: 'DELETE',
            }
          );

          await addAuditLog(
            'DELETE_ORGANIZATION',
            `Deleted organization ID "${id}".`
          );

          await refreshOrganizations();
        } catch (error: any) {
          toastError(
            error?.message ||
              'Failed to delete organization'
          );
        }
      },
      [
        addAuditLog,
        refreshOrganizations,
        toastError,
      ]
    );

  /* =======================================================
     ACTIVE PRODUCT
  ======================================================= */

  const activeProduct =
    products.find(
      (product) =>
        String(product.id) ===
        String(activeProductId)
    ) ?? null;

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value: DataContextValue = {
    products,
    activeProduct,
    activeProductId,

    historical,
    suppliers,
    organizations,

    loadingProducts,
    loadingHistorical,
    loadingSuppliers,
    loadingOrganizations,

    setActiveProductId,

    refreshProducts,
    refreshHistorical,
    refreshSuppliers,
    refreshOrganizations,

    createProduct,
    bulkCreateProducts,
    updateProduct,
    deleteProduct,
    deleteProducts,

    replaceHistorical,

    createSupplier,
    bulkCreateSuppliers,
    updateSupplier,
    deleteSupplier,

    createOrganization,
    bulkCreateOrganizations,
    updateOrganization,
    deleteOrganization,

    simRows,
    setSimRows,

    simMode,
    setSimMode,

    simDays,
    setSimDays,

    simCustomOpeningStock,
    setSimCustomOpeningStock,

    simCustomRop,
    setSimCustomRop,

    simCustomRoq,
    setSimCustomRoq,

    simTrialResults,
    setSimTrialResults,

    auditLogs,
    addAuditLog,
    clearAuditLogs,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useData() {
  const ctx = useContext(DataContext);

  if (!ctx) {
    throw new Error(
      'useData must be used within DataProvider'
    );
  }

  return ctx;
}