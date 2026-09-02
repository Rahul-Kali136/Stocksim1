// TypeScript Type Definitions

export type Product = {
  id: string;
  name: string;
  category?: string;
  supplier?: string;
  supplier_id?: string | number | null;
  organization_id?: string | null;
  unit_price?: number;
  ordering_cost: number;
  service_level: number;
  z_value: number;
  stockout_cost: number;
  holding_cost: number;
  opening_stock: number;
  avg_daily_demand: number;
  demand_std_dev: number;
  avg_lead_time: number;
  lead_time_std_dev: number;
  created_at: string;
  safety_stock?: number;
  rop?: number;
  roq?: number;
  policy_id?: string | number | null;
};

export type Organization = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  location?: string;
};

export type Supplier = {
  id: string;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  notes: string;
  created_at: string;
  business_type?: string;
  organization_id?: string | number | null;
};

export type HistoricalRow = {
  id: string;
  product_id: string;
  day: number;
  demand: number;
  lead_time: number;
  date: string | null;
  created_at: string;
};



export type DistributionRow = {
  value: number;
  frequency: number;
  probability: number;
  cumulative: number;
  interval: string;
  low: number;
  high: number;
};

export type SimulationRow = {
  day: number;
  randomNo: number;
  openingStock: number;
  simulatedDemand: number;
  closingStock: number;
  leadTime: number;
  leadTimeRandomNo: number | null;
  remainingLeadTime: number;
  ordered: boolean;
  orderArrived: boolean;
  stockout: number;
};

export type CostResult = {
  averageInventory: number;
  holdingCostPerUnit: number;
  overallHoldingCost: number;
  periodHoldingCost: number;
  orderingCostPerOrder: number;
  orderingCost: number;
  stockoutCostPerUnit: number;
  stockoutCost: number;
  totalCost: number;
  totalOrders: number;
  lostUnits: number;
  remainingInventory: number;
};

export type PolicyRow = {
  policy: string;
  safetyStock: number;
  rop: number;
  roq: number;
  totalCost: number;
  recommended: boolean;
  best: boolean;
};

export type Report = {
  id: string;
  product: string;
  report_type: string;
  format: string;
  simulation_days: number;
  status: string;
  created_at: string;
};

export type Notification = {
  id: string;
  type: string;
  product: string;
  message: string;
  status: string;
  created_at: string;
};
