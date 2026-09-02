// src/services/api.ts

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://127.0.0.1:8000/api";

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const normalizedBase = API_BASE_URL.replace(/\/$/, "");
  let normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  // Prevent duplicate 'api/api/' structure if BASE_URL ends with '/api'
  if (normalizedBase.endsWith("/api") && normalizedPath.startsWith("api/")) {
    normalizedPath = normalizedPath.slice(4);
  }

  const token = localStorage.getItem("access_token");

  const response = await fetch(`${normalizedBase}/${normalizedPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && {
        Authorization: `Bearer ${token}`,
      }),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();

  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        payload?.error ||
        response.statusText ||
        "Request failed"
    );
  }

  return payload as T;
}

export function extractResults(response: any): any[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (response.results && Array.isArray(response.results)) return response.results;
  return [];
}

/* ---------------- Product ---------------- */

export function normalizeProduct(row: any) {
  return {
    ...row,
    id: row.product_id ?? row.id ?? row.uuid ?? "",
    name: row.product_name ?? row.name ?? "",
    product_name: row.product_name ?? row.name ?? "",
    organization_id: row.organization_id ?? row.organization ?? null,

    category: row.category ?? "",
    supplier: row.supplier ?? "",

    unit_price: Number(row.unit_price ?? 0),
    ordering_cost: Number(row.ordering_cost ?? 0),
    service_level: Number(row.service_level ?? 95),

    z_value: Number(row.z_value ?? 1.645),

    stockout_cost: Number(row.stockout_cost ?? 0),
    holding_cost: Number(row.holding_cost ?? 0),
    opening_stock: Number(row.opening_stock ?? 0),

    avg_daily_demand: Number(row.avg_daily_demand ?? 0),
    demand_std_dev: Number(row.demand_std_dev ?? 0),

    avg_lead_time: Number(row.avg_lead_time ?? 0),
    lead_time_std_dev: Number(row.lead_time_std_dev ?? 0),

    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Supplier ---------------- */

export function normalizeSupplier(row: any) {
  return {
    ...row,
    id: row.supplier_id ?? row.id ?? row.uuid ?? "",
    name: row.supplier_name ?? row.name ?? "",
    supplier_name: row.supplier_name ?? row.name ?? "",
    contact_person: row.contact_person ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",

    category: row.category ?? "",
    rating: Number(row.rating ?? 0),
    notes: row.notes ?? "",

    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Organization ---------------- */

export function normalizeOrganization(row: any) {
  return {
    ...row,
    id: row.organization_id ?? row.id ?? row.uuid ?? "",
    name: row.organization_name ?? row.name ?? "",
    organization_name: row.organization_name ?? row.name ?? "",
    description: row.organization_type ?? row.description ?? "",

    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Historical Data ---------------- */

export function normalizeHistoricalRow(row: any) {
  return {
    ...row,

    id: row.id ?? row.uuid ?? "",

    product_id: row.product_id ?? row.product ?? "",

    day: Number(row.day ?? 1),
    demand: Number(row.demand ?? 0),
    lead_time: Number(row.lead_time ?? 0),

    date: row.date ?? null,

    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Report ---------------- */

export function normalizeReport(row: any) {
  return {
    ...row,
    id: row.id ?? row.uuid ?? "",
    product: row.product ?? "",
    report_type: row.report_type ?? "",
    format: row.format ?? "",
    simulation_days: Number(row.simulation_days ?? 30),
    status: row.status ?? "",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Notification ---------------- */

export function normalizeNotification(row: any) {
  return {
    ...row,
    id: row.id ?? row.uuid ?? "",
    type: row.type ?? "",
    product: row.product ?? "",
    message: row.message ?? "",
    status: row.status ?? "Unread",
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Audit Log ---------------- */

export function normalizeAuditLog(row: any) {
  return {
    ...row,
    id: row.id ?? row.uuid ?? "",
    action: row.action ?? "",
    details: row.details ?? row.description ?? "",
    user_email: row.user_email ?? row.user ?? "System",
    timestamp: row.timestamp ?? row.created_at ?? new Date().toISOString(),
  };
}

/* ---------------- Inventory Policy / Safety Stock API ---------------- */

export async function calculateInventoryPolicy(data: {
  product_id: string;
  service_level: number;
  ordering_cost: number;
  holding_cost: number;
  stockout_cost: number;
  opening_stock: number;
}) {
  return apiFetch('api/inventorypolicy/calculate/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPoliciesByProduct(productId: string): Promise<any[]> {
  return apiFetch<any[]>(`api/inventorypolicy/product/${encodeURIComponent(productId)}/all/`);
}

export async function editInventoryPolicy(policyId: number, data: {
  service_level: number;
  ordering_cost: number;
  holding_cost: number;
  stockout_cost: number;
  opening_stock: number;
}) {
  return apiFetch(`api/inventorypolicy/${policyId}/edit/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInventoryPolicy(policyId: number) {
  return apiFetch(`api/inventorypolicy/${policyId}/delete/`, {
    method: 'DELETE',
  });
}

export async function runSimulationForPolicy(policyId: number, days: number = 30) {
  return apiFetch(`api/simulation/run/${policyId}/`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

export function snapToSupportedServiceLevel(sl: number): number {
  const supported = [90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
  return supported.reduce((prev, curr) => (Math.abs(curr - sl) < Math.abs(prev - sl) ? curr : prev));
}

/* ---------------- Cost Analysis API ---------------- */

export async function calculateCostAnalysis(policyId: number) {
  return apiFetch(`api/costanalysis/`, {
    method: 'POST',
    body: JSON.stringify({ policy_id: policyId }),
  });
}

export async function getPolicyComparisonsByAdmin(_adminId?: string | number): Promise<any[]> {
  const result = await apiFetch<any>(`api/policycomparison/admin/`);
  return result.data || [];
}

export async function getPolicyComparisonsByProduct(productId: string | number): Promise<any[]> {
  const result = await apiFetch<any>(`api/policycomparison/product/${productId}/`);
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

export async function runPolicyComparisonForProduct(productId: string | number): Promise<any[]> {
  const result = await apiFetch<any>(`api/policycomparison/run/${productId}/`, {
    method: 'POST'
  });
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

export async function getCostAnalysisByProduct(productId: string): Promise<any[]> {
  return apiFetch<any[]>(`api/costanalysis/product/${encodeURIComponent(productId)}/`);
}