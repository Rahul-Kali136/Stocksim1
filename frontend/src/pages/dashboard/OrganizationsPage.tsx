import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash2, X, Search, FileText, Upload, Download, Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, StockSimLoader, EmptyState, Spinner } from '@/components/ui';
import { downloadOrganizationTemplate, parseOrganizationFile } from '@/lib/export';
import type { Organization } from '@/lib/types';

type Draft = {
  name: string;
  description: string;
  location: string;
};

const emptyDraft: Draft = {
  name: '',
  description: '',
  location: '',
};

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const { organizations, loadingOrganizations, deleteOrganization, products, updateProduct, suppliers } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');




  const [linkingOrg, setLinkingOrg] = useState<Organization | null>(null);
  const [linkingSupplierOrg, setLinkingSupplierOrg] = useState<Organization | null>(null);
  const [orgSuppliers, setOrgSuppliers] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (showForm || showBulk || linkingOrg || linkingSupplierOrg) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm, showBulk, linkingOrg, linkingSupplierOrg]);

  const { createOrganization, updateOrganization } = useData();

  const handleEdit = (org: Organization) => {
    setEditing(org);
    setDraft({ name: org.name, description: org.description || '', location: org.location || '' });
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // -----------------------------------------
    // Input Validation
    // -----------------------------------------
    if (!draft.name.trim()) {
      error('Organization name is required.');
      return;
    }

    if (!draft.location.trim()) {
      error('Organization location is required.');
      return;
    }

    if (draft.name.length < 2) {
      error('Organization name must be at least 2 characters long.');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateOrganization(editing.id, draft);
        success('Organization updated.');
      } else {
        await createOrganization(draft);
        success('Organization created.');
      }
      setShowForm(false);
    } catch (err: any) {
      error(err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async (file: File) => {
    
    setSaving(true);
    setUploadError('');
    try {
      const parsedData = await parseOrganizationFile(file);
      if (parsedData.length === 0) throw new Error('No valid organizations found in file.');
      let successCount = 0;
      for (const item of parsedData) {
        try {
          await createOrganization(item);
          successCount++;
        } catch (e) {
          console.error('Row insert failed:', e);
        }
      }
      success(`Successfully uploaded ${successCount} organization(s).`);
      setShowBulk(false);
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process file.');
    } finally {
      setSaving(false);
    }
  };


  const toggleSupplierLink = (orgId: string, supplierId: string) => {
    if (!user) return;
    const current = orgSuppliers[orgId] || [];
    const updated = current.includes(supplierId)
      ? current.filter((id) => id !== supplierId)
      : [...current, supplierId];

    const nextMap = { ...orgSuppliers, [orgId]: updated };
    setOrgSuppliers(nextMap);
    success(`Supplier association updated for organization.`);
  };

  const handleDelete = async (o: Organization) => {
    const productsInOrg = products.filter((p) => p.organization_id === o.id);
    const msg = productsInOrg.length > 0
      ? `Delete organization "${o.name}"? Note: ${productsInOrg.length} product(s) associated with this organization will have their organization unset.`
      : `Delete organization "${o.name}"?`;
    
    if (!confirm(msg)) return;
    try {
      await deleteOrganization(o.id);
      success('Organization deleted.');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to delete organization.');
    }
  };

  const filtered = organizations.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loadingOrganizations) return <StockSimLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        subtitle="Group, manage and filter your inventory by organizations or business units."
        icon={<Building2 className="w-5 h-5" />}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowBulk(true)}>
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={handleAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Organization
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{organizations.length}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Organizations</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{products.length}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Products Linked</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {loadingOrganizations ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner className="w-8 h-8 text-blue-600 mb-3" />
          <span className="text-sm font-medium text-slate-400">Loading organizations...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "No search results" : "No organizations yet"}
          message={search ? "Try adjusting your search terms." : "Add organizations to categorize and filter your products."}
          action={
            !search ? (
              <div className="flex gap-2">
                <button onClick={() => setShowBulk(true)} className="btn-secondary">
                  <Upload className="w-4 h-4" /> Bulk Upload
                </button>
                <button onClick={handleAdd} className="btn-primary">
                  <Plus className="w-4 h-4" /> Create first organization
                </button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((org) => {
            const orgProductsCount = products.filter((p) => p.organization_id === org.id).length;
            return (
              <div key={org.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                
                <div>
                  <div className="flex items-start justify-between pl-2">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base leading-snug group-hover:text-blue-700 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1">
                        {orgProductsCount} Product(s) linked
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(org)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Edit organization"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(org)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete organization"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {org.description && (
                    <div className="mt-4 pl-2 text-xs text-slate-500 border-l border-slate-100 bg-slate-50/50 p-2.5 rounded-lg italic">
                      {org.description}
                    </div>
                  )}

                  {/* List of associated products */}
                  {products.filter((p) => p.organization_id === org.id).length > 0 && (
                    <div className="mt-4 pl-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Linked Products:</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {products.filter((p) => p.organization_id === org.id).map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-150">
                            📦 {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List of associated suppliers (implicitly via products) */}
                  {Array.from(new Set(products.filter((p) => p.organization_id === org.id).map((p) => p.supplier).filter(Boolean))).length > 0 && (
                    <div className="mt-3.5 pl-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Product Suppliers:</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {Array.from(new Set(products.filter((p) => p.organization_id === org.id).map((p) => p.supplier).filter(Boolean))).map((sup, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-755 text-[10px] font-bold border border-purple-150">
                            👤 {sup}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explicitly Linked Suppliers */}
                  {(() => {
                    const explicitIds = orgSuppliers[org.id] || [];
                    const linkedSups = suppliers.filter(s => explicitIds.includes(s.id));
                    if (linkedSups.length === 0) return null;
                    return (
                      <div className="mt-3.5 pl-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Directly Linked Suppliers:</p>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {linkedSups.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-150">
                              👤 {s.supplier_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 pl-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLinkingOrg(org)}
                    className="btn-secondary py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center gap-1"
                  >
                    🔗 Products
                  </button>
                  <button
                    onClick={() => setLinkingSupplierOrg(org)}
                    className="btn-secondary py-1.5 text-[11px] font-bold text-purple-650 hover:bg-purple-50 hover:border-purple-200 flex items-center justify-center gap-1"
                  >
                    👤 Suppliers
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}



      
      {/* Add / Edit Organization Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => !saving && setShowForm(false)} />
          <div className="relative z-[110] w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editing ? 'Edit Organization' : 'Add Organization'}</h3>
                <p className="text-sm text-slate-500 mt-1">Enter organization details</p>
              </div>
              <button onClick={() => !saving && setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Organization Name *</label>
                  <input type="text" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Acme Corp" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location / Address</label>
                  <input type="text" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. New York, NY" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Brief description..." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 px-6 py-2.5 text-sm">
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Organization')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Organization Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => !saving && setShowBulk(false)}
          />

          <div className="relative z-[110] bg-white rounded-3xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Bulk Upload Organizations
              </h2>

              <button
                onClick={() => setShowBulk(false)}
                className="btn-ghost px-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-500 mb-4">
                Upload an Excel or CSV file containing organizations details.
              </p>

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('organizationsBulkUpload')?.click()}
              >
                {saving ? (
                  <Spinner className="w-7 h-7 text-blue-600 mx-auto" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                )}

                <p className="text-sm text-slate-500 mt-2">
                  Click to select an .xlsx or .csv file
                </p>
              </div>

              <input
                id="organizationsBulkUpload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleBulkSubmit(f);
                  }
                }}
              />

              <button
                onClick={downloadOrganizationTemplate}
                className="btn-secondary w-full mt-4"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linking Products Modal */}
      {linkingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" onClick={() => setLinkingOrg(null)} />
          <div className="relative z-[110] bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <button onClick={() => setLinkingOrg(null)} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 border-b pb-3">
              🔗 Link Products to {linkingOrg.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Select the products you want to associate with this organization.</p>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {products.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No products created yet.</p>
              ) : (
                products.map((p) => {
                  const isLinked = p.organization_id === linkingOrg.id;
                  return (
                    <label key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-55 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">📦</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.name}</div>
                          <div className="text-[10px] text-slate-450">
                            {p.supplier ? `Supplier: ${p.supplier}` : 'Supplier details pending'}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={async (e) => {
                          const newOrgId = e.target.checked ? linkingOrg.id : null;
                          await updateProduct(p.id, { organization_id: newOrgId });
                          success(`Product "${p.name}" ${newOrgId ? 'linked to' : 'unlinked from'} organization.`);
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                      />
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setLinkingOrg(null)} className="btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Linking Suppliers Modal */}
      {linkingSupplierOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm" onClick={() => setLinkingSupplierOrg(null)} />
          <div className="relative z-[110] bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6">
            <button onClick={() => setLinkingSupplierOrg(null)} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 border-b pb-3">
              👤 Link Suppliers to {linkingSupplierOrg.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Select the suppliers you want to associate directly with this organization.</p>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {suppliers.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No suppliers created yet.</p>
              ) : (
                suppliers.map((s) => {
                  const isLinked = (orgSuppliers[linkingSupplierOrg.id] || []).includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-55 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">👤</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{s.supplier_name}</div>
                          <div className="text-[10px] text-slate-400">
                            Category: {s.category || 'N/A'} {s.email && `• ${s.email}`}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isLinked}
                        onChange={() => toggleSupplierLink(linkingSupplierOrg.id, s.id)}
                        className="w-4 h-4 rounded text-purple-650 focus:ring-purple-500 cursor-pointer border-slate-300"
                      />
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setLinkingSupplierOrg(null)} className="btn-primary bg-purple-600 hover:bg-purple-750">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
