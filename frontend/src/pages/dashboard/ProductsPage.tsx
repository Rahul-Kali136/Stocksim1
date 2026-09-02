import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  Search,
  Boxes,
  DollarSign,
  Users,
  Layers,
  X,
} from 'lucide-react';

import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, StockSimLoader, EmptyState, Spinner } from '@/components/ui';
import { SERVICE_LEVELS } from '@/lib/simulation';
import {
  downloadProductTemplate,
  parseProductFile,
} from '@/lib/export';
import type { Product } from '@/lib/types';

type Draft = {
  product_name: string;
  category: string;
  supplier_id: string;
  organization_id: string;

  unit_price: number;
  opening_stock: number;
  ordering_cost: number;
  service_level: number;
  stockout_cost: number;
  holding_cost: number;
};

/*
 * New Product initial values
 *
 * Numeric fields start with 0.
 * Admin can change them before creating the product.
 */
const emptyDraft: Draft = {
  product_name: '',
  category: '',
  supplier_id: '',
  organization_id: '',

  unit_price: 0,
  opening_stock: 0,
  ordering_cost: 0,
  service_level: 0,
  stockout_cost: 0,
  holding_cost: 0,
};

export default function ProductsPage() {
  const {
    products,
    loadingProducts,
    createProduct,
    bulkCreateProducts,
    updateProduct,
    deleteProduct,
    deleteProducts,
    setActiveProductId,
    activeProductId,
    organizations,
    suppliers,
  } = useData();

  const { success, error } = useToast();

  const bulkFileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [draft, setDraft] = useState<Draft>({
    ...emptyDraft,
  });

  const [saving, setSaving] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (showForm || showBulk) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm, showBulk]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [organizationFilter, setOrganizationFilter] = useState('All');

  // =========================================================
  // BULK UPLOAD
  // =========================================================

  const handleBulkUpload = async (file: File) => {
    setBulkUploading(true);

    try {
      const parsed = await parseProductFile(file);

      const inputs = parsed.map((p) => {
        const matchedOrg = organizations.find(
          (o) =>
            o.name.toLowerCase().trim() ===
            p.organization.toLowerCase().trim()
        );

        const matchedSupplier = suppliers.find(
          (s) =>
            s.supplier_name.toLowerCase().trim() ===
            p.supplier.toLowerCase().trim()
        );

        return {
          product_name: p.name,
          category: p.category || '',
          supplier_id: matchedSupplier
            ? Number(matchedSupplier.id)
            : null,

          unit_price: Number(p.unit_price || 0),
          opening_stock: Number(p.opening_stock || 0),

          ordering_cost: 0,
          service_level: 0,
          stockout_cost: 0,
          holding_cost: 0,

          organization_id: matchedOrg
            ? Number(matchedOrg.id)
            : null,

          z_value: 0,
          avg_daily_demand: 0,
          demand_std_dev: 0,
          avg_lead_time: 0,
          lead_time_std_dev: 0,
        };
      });

      const count = await bulkCreateProducts(inputs);

      if (count > 0) {
        success(`Imported ${count} products from file.`);
        setShowBulk(false);
      }
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : 'Failed to import products.'
      );
    } finally {
      setBulkUploading(false);

      if (bulkFileRef.current) {
        bulkFileRef.current.value = '';
      }
    }
  };

  // =========================================================
  // CREATE
  // =========================================================

  const openCreate = () => {
    setEditing(null);

    // Reset all fields.
    // Numeric fields start from 0.
    setDraft({
      ...emptyDraft,
    });

    setShowForm(true);
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEdit = (p: Product) => {
    setEditing(p);

    setDraft({
      product_name:
        (p as any).product_name ??
        (p as any).name ??
        '',

      category:
        (p as any).category ??
        '',

      supplier_id:
        (p as any).supplier_id != null
          ? String((p as any).supplier_id)
          : '',

      organization_id:
        p.organization_id != null
          ? String(p.organization_id)
          : '',

      unit_price:
        Number(
          (p as any).unit_price ?? 0
        ),

      opening_stock:
        Number(
          (p as any).opening_stock ?? 0
        ),

      ordering_cost:
        Number(
          (p as any).ordering_cost ?? 0
        ),

      service_level:
        Number(
          (p as any).service_level ?? 0
        ),

      stockout_cost:
        Number(
          (p as any).stockout_cost ?? 0
        ),

      holding_cost:
        Number(
          (p as any).holding_cost ?? 0
        ),
    });

    setShowForm(true);
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // -----------------------------------------
    // Validation
    // -----------------------------------------

    if (!draft.product_name.trim()) {
      error('Product name is required.');
      return;
    }

    if (!draft.category.trim()) {
      error('Category is required.');
      return;
    }

    if (!draft.supplier_id) {
      error('Please select a supplier.');
      return;
    }

    if (draft.unit_price < 0) {
      error('Unit price cannot be negative.');
      return;
    }

    if (draft.opening_stock < 0) {
      error('Opening stock cannot be negative.');
      return;
    }

    if (draft.ordering_cost < 0) {
      error('Ordering cost cannot be negative.');
      return;
    }

    if (
      draft.service_level < 0 ||
      draft.service_level > 100
    ) {
      error('Service level must be between 0 and 100.');
      return;
    }

    if (draft.stockout_cost < 0) {
      error('Stockout cost cannot be negative.');
      return;
    }

    if (draft.holding_cost < 0) {
      error('Holding cost cannot be negative.');
      return;
    }

    setSaving(true);

    try {
      /*
       * IMPORTANT:
       *
       * Database columns shown in your screenshot:
       *
       * product_name
       * category
       * unit_price
       * supplier_id
       * organization_id
       *
       * Therefore we send product_name and supplier_id
       * instead of name and supplier.
       */

      const serviceLevel = Number(
        draft.service_level
      );

      const payload = {
        product_name:
          draft.product_name.trim(),

        category:
          draft.category.trim(),

        supplier_id:
          Number(draft.supplier_id),

        organization_id:
          draft.organization_id
            ? Number(draft.organization_id)
            : null,

        unit_price:
          Number(draft.unit_price),

        opening_stock:
          Number(draft.opening_stock),

        ordering_cost:
          Number(draft.ordering_cost),

        service_level:
          serviceLevel,

        stockout_cost:
          Number(draft.stockout_cost),

        holding_cost:
          Number(draft.holding_cost),

        /*
         * For service level 0, use 0.
         * Otherwise use the configured Z value.
         */
        z_value:
          serviceLevel === 0
            ? 0
            : SERVICE_LEVELS[serviceLevel] ?? 1.645,

        avg_daily_demand: 0,
        demand_std_dev: 0,
        avg_lead_time: 0,
        lead_time_std_dev: 0,
      };

      console.log(
        'Product payload:',
        payload
      );

      // -----------------------------------------
      // UPDATE
      // -----------------------------------------

      if (editing) {
        await updateProduct(
          editing.id,
          payload
        );

        success('Product updated successfully.');
      }

      // -----------------------------------------
      // CREATE
      // -----------------------------------------

      else {
        const created =
          await createProduct(payload);

        if (created) {
          success(
            'Product created successfully.'
          );

          setActiveProductId(
            created.id
          );
        } else {
          error(
            'Product could not be created.'
          );

          return;
        }
      }

      // Close and reset form
      setShowForm(false);
      setEditing(null);
      setDraft({
        ...emptyDraft,
      });
    } catch (err) {
      console.error(
        'Product save error:',
        err
      );

      error(
        err instanceof Error
          ? err.message
          : 'Failed to save product.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE SINGLE PRODUCT
  // =========================================================

  const handleDelete = async (
    p: Product
  ) => {
    if (
      !confirm(
        `Delete "${(p as any).product_name ?? (p as any).name}"? This will remove the product and its data.`
      )
    ) {
      return;
    }

    try {
      await deleteProduct(p.id);

      success('Product deleted.');

      setSelectedIds((prev) =>
        prev.filter(
          (id) => id !== p.id
        )
      );
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : 'Failed to delete product.'
      );
    }
  };

  // =========================================================
  // DELETE SELECTED PRODUCTS
  // =========================================================

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    if (
      !confirm(
        `Delete the ${selectedIds.length} selected products? This will remove all their data.`
      )
    ) {
      return;
    }

    try {
      await deleteProducts(
        selectedIds
      );

      success(
        `${selectedIds.length} products deleted.`
      );

      setSelectedIds([]);
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : 'Failed to delete products.'
      );
    }
  };

  // =========================================================
  // METRICS
  // =========================================================

  const totalProducts =
    products.length;

  const totalCategories =
    new Set(
      products.map(
        (p) =>
          (p as any).category ||
          ''
      )
    ).size;

  const totalSuppliers =
    new Set(
      products.map(
        (p) =>
          (p as any).supplier ||
          ''
      )
    ).size;

  const totalInventory =
    products.reduce(
      (sum, p) =>
        sum +
        Number(
          p.opening_stock ?? 0
        ),
      0
    );

  // =========================================================
  // FILTERS
  // =========================================================

  const categories = [
    'All',
    ...new Set(
      products.map(
        (p) =>
          (p as any).category ||
          ''
      )
    ),
  ];

  const supplierFilters = [
    'All',
    ...new Set(
      products.map(
        (p) =>
          (p as any).supplier ||
          ''
      )
    ),
  ];

  // =========================================================
  // FILTERED PRODUCTS
  // =========================================================

  const filteredProducts =
    products.filter(
      (product) => {
        const productName =
          String(
            (product as any)
              .product_name ??
              (product as any).name ??
              ''
          );

        const category =
          String(
            (product as any)
              .category ?? ''
          );

        const supplierObj = suppliers.find(s => String(s.id) === String((product as any).supplier_id));
        const supplier =
          String(
            supplierObj?.supplier_name ?? (product as any).supplier ?? ''
          );

        const searchLower =
          search.toLowerCase();

        const searchMatch =
          productName
            .toLowerCase()
            .includes(searchLower) ||
          category
            .toLowerCase()
            .includes(searchLower) ||
          supplier
            .toLowerCase()
            .includes(searchLower);

        const categoryMatch =
          categoryFilter === 'All'
            ? true
            : category ===
              categoryFilter;

        const supplierMatch =
          supplierFilter === 'All'
            ? true
            : supplier ===
              supplierFilter;

        const organizationMatch =
          organizationFilter === 'All'
            ? true
            : String(
                product.organization_id
              ) ===
              organizationFilter;

        if (loadingProducts) return <StockSimLoader />;

  return (
          searchMatch &&
          categoryMatch &&
          supplierMatch &&
          organizationMatch
        );
      }
    );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <PageHeader
        title="Products"
        subtitle="Manage inventory products, categories, suppliers, and stock"
        icon={
          <Package className="w-5 h-5" />
        }
        action={
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() =>
                setShowBulk(true)
              }
            >
              <Upload className="w-4 h-4" />
              Bulk Upload
            </button>

            <button
              className="btn-primary"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        }
      />

      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Products */}

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Boxes className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Products
            </p>

            <h2 className="text-2xl font-bold text-slate-800">
              {totalProducts}
            </h2>
          </div>
        </div>

        {/* Categories */}

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <Layers className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Categories
            </p>

            <h2 className="text-2xl font-bold text-slate-800">
              {totalCategories}
            </h2>
          </div>
        </div>

        {/* Suppliers */}

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Suppliers
            </p>

            <h2 className="text-2xl font-bold text-slate-800">
              {totalSuppliers}
            </h2>
          </div>
        </div>

        {/* Inventory */}

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Total Inventory
            </p>

            <h2 className="text-2xl font-bold text-slate-800">
              {totalInventory} Units
            </h2>
          </div>
        </div>
      </div>

      {/* =====================================================
          SEARCH & FILTERS
      ====================================================== */}

      {products.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              type="text"
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 shadow-sm hover:border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-200"
              placeholder="Search product name..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

            {search && (
              <button
                onClick={() =>
                  setSearch('')
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {organizations.length >
              0 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white"
                value={
                  organizationFilter
                }
                onChange={(e) =>
                  setOrganizationFilter(
                    e.target.value
                  )
                }
              >
                <option value="All">
                  All Organizations
                </option>

                {organizations.map(
                  (org) => (
                    <option
                      key={org.id}
                      value={org.id}
                    >
                      Org: {org.name}
                    </option>
                  )
                )}
              </select>
            )}

            {categories.length >
              2 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white"
                value={
                  categoryFilter
                }
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }
              >
                {categories.map(
                  (cat) => (
                    <option
                      key={cat}
                      value={cat}
                    >
                      Category: {cat}
                    </option>
                  )
                )}
              </select>
            )}

            {supplierFilters.length >
              2 && (
              <select
                className="input py-2 text-xs sm:text-sm bg-white"
                value={
                  supplierFilter
                }
                onChange={(e) =>
                  setSupplierFilter(
                    e.target.value
                  )
                }
              >
                {supplierFilters.map(
                  (sup) => (
                    <option
                      key={sup}
                      value={sup}
                    >
                      Supplier: {sup}
                    </option>
                  )
                )}
              </select>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          SELECT ALL
      ====================================================== */}

      {!loadingProducts &&
        filteredProducts.length >
          0 && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 mb-6">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={
                  filteredProducts.length >
                    0 &&
                  selectedIds.length ===
                    filteredProducts.length
                }
                onChange={(e) => {
                  if (
                    e.target.checked
                  ) {
                    setSelectedIds(
                      filteredProducts.map(
                        (p) => p.id
                      )
                    );
                  } else {
                    setSelectedIds(
                      []
                    );
                  }
                }}
              />

              <span className="text-sm font-semibold text-slate-700">
                Select All (
                {
                  filteredProducts.length
                }{' '}
                Products)
              </span>
            </div>

            {selectedIds.length >
              0 && (
              <button
                onClick={
                  handleDeleteSelected
                }
                className="btn-secondary text-rose-600 hover:bg-rose-50 hover:border-rose-200 py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />

                Delete Selected (
                {selectedIds.length})
              </button>
            )}
          </div>
        )}

      {/* =====================================================
          PRODUCT LIST
      ====================================================== */}

      {loadingProducts ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-8 h-8 text-blue-600" />
        </div>
      ) : filteredProducts.length ===
        0 ? (
        <EmptyState
          title="No Products Found"
          message="Create your first product to manage inventory items."
          action={
            <button
              onClick={openCreate}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(
            (p) => {
              const productName =
                (p as any)
                  .product_name ??
                (p as any).name ??
                '';

              const category =
                (p as any).category ??
                '';

              const supplier =
                suppliers.find(
                  (s) => String(s.id) === String((p as any).supplier_id)
                )?.supplier_name ??
                (p as any).supplier ??
                '';

              return (
                <div
                  key={p.id}
                  className={`card-pad border border-slate-200/90 rounded-2xl bg-white shadow-sm card-hover flex flex-col justify-between transition-all duration-300 cursor-pointer ${
                    activeProductId ===
                    p.id
                      ? 'ring-2 ring-blue-500 border-blue-500 shadow-xl shadow-blue-500/10'
                      : ''
                  }`}
                  onClick={() =>
                    setActiveProductId(
                      p.id
                    )
                  }
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-blue-600 flex items-center justify-center text-xl shadow-sm">
                          📦
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-slate-900 truncate">
                            {productName}
                          </h3>

                          {activeProductId ===
                            p.id && (
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              Active Selection
                            </span>
                          )}
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.includes(
                          p.id
                        )}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        onChange={(e) => {
                          if (
                            e.target.checked
                          ) {
                            setSelectedIds(
                              (prev) => [
                                ...prev,
                                p.id,
                              ]
                            );
                          } else {
                            setSelectedIds(
                              (prev) =>
                                prev.filter(
                                  (id) =>
                                    id !==
                                    p.id
                                )
                            );
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          Category
                        </p>

                        <p className="font-bold text-slate-800 mt-0.5">
                          {category ||
                            'Not Set'}
                        </p>
                      </div>

                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                          Supplier
                        </p>

                        <p className="font-bold text-slate-800 mt-0.5">
                          {supplier ||
                            'Not Set'}
                        </p>
                      </div>

                      {p.organization_id && (
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            Organization
                          </p>

                          <p className="font-bold text-blue-600 mt-0.5">
                            {organizations.find(
                              (o) =>
                                String(
                                  o.id
                                ) ===
                                String(
                                  p.organization_id
                                )
                            )?.name ??
                              'Unknown'}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            Unit Price
                          </p>

                          <p className="font-bold text-emerald-600 mt-0.5">
                            ₹
                            {Number(
                              (p as any)
                                .unit_price ??
                                0
                            )}
                          </p>
                        </div>

                        <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            Opening Stock
                          </p>

                          <p className="font-bold text-blue-600 mt-0.5">
                            {Number(
                              p.opening_stock ??
                                0
                            )}{' '}
                            Units
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex gap-2.5 mt-5 pt-4 border-t border-slate-100"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    <button
                      onClick={() =>
                        openEdit(p)
                      }
                      className="btn-secondary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-blue-300"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(p)
                      }
                      className="btn-secondary flex-1 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !saving && setShowForm(false)}
          />

          {/* Compact Modal */}
          <div
            className="
              relative z-[110]
              bg-white
              rounded-3xl
              shadow-2xl
              w-full
              max-w-xl
              max-h-[85vh]
              overflow-hidden
              animate-in zoom-in-95 duration-200
            "
          >

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter product details
                </p>
              </div>

              <button
                type="button"
                onClick={() => !saving && setShowForm(false)}
                className="
                  w-8 h-8
                  rounded-lg
                  flex items-center justify-center
                  text-slate-400
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(85vh-125px)] overflow-y-auto"
            >
              <div className="px-5 py-4 space-y-4">

                {/* Product Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Product Name
                  </label>

                  <input
                    type="text"
                    className="input w-full h-10 text-sm"
                    value={draft.product_name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        product_name: e.target.value,
                      })
                    }
                    placeholder="Enter product name"
                    required
                  />
                </div>

                {/* Category + Supplier */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Category
                    </label>

                    <input
                      type="text"
                      className="input w-full h-10 text-sm"
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          category: e.target.value,
                        })
                      }
                      placeholder="e.g. Bakery"
                      required
                    />
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Supplier
                    </label>

                    <select
                      className="input w-full h-10 text-sm bg-white"
                      value={draft.supplier_id}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          supplier_id: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select Supplier</option>

                      {suppliers.map((supplier) => (
                        <option
                          key={supplier.id}
                          value={String(supplier.id)}
                        >
                          {supplier.supplier_name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Organization */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Organization
                  </label>

                  <select
                    className="input w-full h-10 text-sm bg-white"
                    value={draft.organization_id}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        organization_id: e.target.value,
                      })
                    }
                  >
                    <option value="">None / Unassigned</option>

                    {organizations.map((org) => (
                      <option
                        key={org.id}
                        value={String(org.id)}
                      >
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Price + Opening Stock */}
                <div className="grid grid-cols-2 gap-3">

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Unit Price (₹)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0"
                      className="input w-full h-10 text-sm"
                      value={draft.unit_price}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          unit_price:
                            e.target.value === ''
                              ? 0
                              : Number(e.target.value),
                        })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Opening Stock (Units)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input w-full h-10 text-sm"
                      value={draft.opening_stock}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          opening_stock:
                            e.target.value === ''
                              ? 0
                              : Number(e.target.value),
                        })
                      }
                      placeholder="0"
                      required
                    />
                  </div>

                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">

                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={saving}
                    className="btn-secondary h-9 px-5 text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary h-9 px-5 text-sm"
                  >
                    {saving ? (
                      <>
                        <Spinner className="w-4 h-4" />
                        Saving...
                      </>
                    ) : editing ? (
                      'Save Changes'
                    ) : (
                      'Create Product'
                    )}
                  </button>

                </div>

              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
          BULK UPLOAD MODAL
      ====================================================== */}

      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => !saving && setShowBulk(false)}
          />

          <div className="relative z-[110] bg-white rounded-3xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Bulk Upload Products
              </h2>

              <button
                onClick={() =>
                  setShowBulk(false)
                }
                className="btn-ghost px-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-500 mb-4">
                Upload an Excel or CSV
                file containing product
                details.
              </p>

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() =>
                  bulkFileRef.current?.click()
                }
              >
                {bulkUploading ? (
                  <Spinner className="w-7 h-7 text-blue-600 mx-auto" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                )}

                <p className="text-sm text-slate-500 mt-2">
                  Click to select an
                  .xlsx or .csv file
                </p>
              </div>

              <input
                ref={bulkFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f =
                    e.target.files?.[0];

                  if (f) {
                    handleBulkUpload(
                      f
                    );
                  }
                }}
              />

              <button
                onClick={
                  downloadProductTemplate
                }
                className="btn-secondary w-full mt-4"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}