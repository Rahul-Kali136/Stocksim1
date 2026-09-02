import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Pencil, Trash2, X, Star, Mail, Phone, MapPin, FileText, Database, Layers, ShieldCheck, Upload, Download, Package } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, StockSimLoader, EmptyState, Spinner } from '@/components/ui';
import { downloadSupplierTemplate, parseSupplierFile } from '@/lib/export';
import type { Supplier } from '@/lib/types';

type Draft = {
  supplier_name: string;
  email: string;
  phone: string;
  address: string;
  business_type: string;
  contact_person: string;
  category: string;
  rating: number;
  notes: string;
};

const emptyDraft: Draft = {
  supplier_name: '',
  email: '',
  phone: '',
  address: '',
  business_type: '',
  contact_person: '',
  category: '',
  rating: 0,
  notes: '',
};

const BUSINESS_TYPES = ['Raw Food Supplier', 'Food Supplier', 'Distributor', 'Logistics', 'Packaging', 'Other'];

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { suppliers, loadingSuppliers, deleteSupplier, products, organizations } = useData();
  const { success, error } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  useEffect(() => {
    if (showForm || showBulk) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm, showBulk]);

  const { createSupplier, updateSupplier } = useData();

  const handleEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setDraft({ 
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      category: supplier.category || '',
      business_type: supplier.business_type || '',
      rating: supplier.rating || 0,
      notes: supplier.notes || ''
    });
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
    if (!draft.supplier_name.trim()) {
      error('Supplier name is required.');
      return;
    }

    if (draft.email && draft.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(draft.email)) {
        error('Please enter a valid email address.');
        return;
      }
    }

    if (draft.phone && draft.phone.trim() !== '') {
      const phoneDigits = draft.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        error('Phone number must contain at least 10 digits.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, draft);
        success('Supplier updated.');
      } else {
        await createSupplier(draft);
        success('Supplier created.');
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
      const parsedData = await parseSupplierFile(file);
      if (parsedData.length === 0) throw new Error('No valid suppliers found in file.');
      let successCount = 0;
      for (const item of parsedData) {
        try {
          await createSupplier(item);
          successCount++;
        } catch (e) {
          console.error('Row insert failed:', e);
        }
      }
      success(`Successfully uploaded ${successCount} supplier(s).`);
      setShowBulk(false);
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process file.');
    } finally {
      setSaving(false);
    }
  };



  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.supplier_name}"?`)) return;
    await deleteSupplier(s.id);
    success('Supplier deleted.');
  };



  const totalSuppliers = suppliers.length;
  const totalBusinessTypes = new Set(suppliers.map((s) => s.business_type).filter(Boolean)).size;
  const linkedProductsCount = products.filter((p) => p.supplier || p.supplier_id).length;

  if (loadingSuppliers) return <StockSimLoader />;

  return (
    <>
      <PageHeader
        title="Supplier Management"
        subtitle="Manage vendor contact information, categories, and lead time partners"
        icon={<Users className="w-5 h-5" />}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowBulk(true)}>
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={() => handleAdd()} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Supplier
            </button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Suppliers</p>
            <h2 className="text-2xl font-bold text-slate-800">{totalSuppliers}</h2>
          </div>
        </div>

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Business Types</p>
            <h2 className="text-2xl font-bold text-slate-800">{totalBusinessTypes}</h2>
          </div>
        </div>

        <div className="card-pad flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Linked Products</p>
            <h2 className="text-2xl font-bold text-slate-800">{linkedProductsCount}</h2>
          </div>
        </div>
      </div>

      {loadingSuppliers ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-7 h-7 text-blue-600" />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          message="Add your suppliers manually one by one, or upload suppliers in bulk to get started."
          action={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setShowBulk(true)}>
                <Upload className="w-4 h-4" /> Bulk Upload
              </button>
              <button onClick={() => handleAdd()} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Supplier
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((s) => (
            <div key={s.id} className="card-pad border border-slate-200/90 rounded-2xl bg-white shadow-xs card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-tight">{s.supplier_name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1 items-center">
                        {s.business_type && (
                          <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {s.business_type}
                          </span>
                        )}
                        {(() => {
                          const org = organizations.find((o) => String(o.id) === String(s.organization_id));
                          if (org) {
                            return (
                              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                🏢 {org.name}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(s)} className="btn-ghost px-2 hover:text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s)} className="btn-ghost px-2 text-rose-600 hover:bg-rose-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs sm:text-sm">
                  {s.email && (
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 truncate">
                      <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-slate-800">{s.phone}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2 text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-xs font-medium text-slate-700">{s.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>

                {/* Associated Products & Organizations */}
                {(() => {
                  const linkedProducts = products.filter(
                    (p) => {
                      if (!p.supplier && !p.supplier_id) return false;
                      const pSupplierStr = String(p.supplier ?? p.supplier_id).trim().toLowerCase();
                      const sNameStr = String(s.supplier_name).trim().toLowerCase();
                      const sIdStr = String(s.id).trim().toLowerCase();
                      return pSupplierStr === sNameStr || pSupplierStr === sIdStr || String(p.supplier_id) === sIdStr;
                    }
                  );

                  return (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="pl-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Supplied Products ({linkedProducts.length}):</p>
                        {linkedProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                            {linkedProducts.map((p) => (
                              <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-150">
                                📦 {p.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No products linked</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {s.notes && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 bg-blue-50/60 rounded-xl p-2.5 border border-blue-100/60">
                    <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="font-medium">{s.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => !saving && setShowForm(false)} />
          <div className="relative z-[110] w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
                <p className="text-sm text-slate-500 mt-1">Enter vendor details and contact information</p>
              </div>
              <button onClick={() => !saving && setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier Name *</label>
                  <input type="text" required value={draft.supplier_name} onChange={(e) => setDraft({ ...draft, supplier_name: e.target.value })} placeholder="e.g. Global Tech Supplies" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Person</label>
                  <input type="text" value={draft.contact_person} onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })} placeholder="e.g. Jane Doe" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Electronics, Raw Materials" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="e.g. jane@example.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                  <input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="e.g. +1 (555) 000-0000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                  <textarea rows={2} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Enter full address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Enter any additional notes" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 px-6 py-2.5 text-sm">
                  {saving ? <Spinner className="w-4 h-4 mr-2 inline" /> : null}
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => !saving && setShowBulk(false)}
          />

          <div className="relative z-[110] bg-white rounded-3xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Bulk Upload Suppliers
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
                Upload an Excel or CSV file containing suppliers details.
              </p>

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('suppliersBulkUpload')?.click()}
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
                id="suppliersBulkUpload"
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
                onClick={downloadSupplierTemplate}
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
