import { useRef, useState, useEffect, useMemo } from 'react';
import { Database, Upload, Download, FileSpreadsheet, Table, CheckCircle2, AlertCircle, ShoppingBag, Truck, BarChart3, TrendingUp, Inbox, Pencil, Trash2, Check, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Spinner } from '@/components/ui';
import { downloadSampleTemplate, parseHistoricalFile, exportToExcel } from '@/lib/export';

export default function HistoricalDataPage() {
  const { 
    products, 
    activeProduct, 
    setActiveProductId, 
    historical, 
    loadingHistorical, 
    replaceHistorical,
    suppliers 
  } = useData();

  const { success, error } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDemand, setEditDemand] = useState<number>(0);
  const [editLeadTime, setEditLeadTime] = useState<number>(0);

  const handleDeleteRow = async (rowId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    const updatedRows = historical
      .filter((r) => r.id !== rowId)
      .map((r, idx) => ({
        day: idx + 1,
        demand: Number(r.demand),
        lead_time: Number(r.lead_time),
        date: r.date,
      }));
    try {
      await replaceHistorical(activeProduct!.id, updatedRows);
      success('Row deleted successfully.');
    } catch (err) {
      error('Failed to delete row.');
    }
  };

  const handleStartEdit = (row: any) => {
    setEditingRowId(row.id);
    setEditDemand(Number(row.demand));
    setEditLeadTime(Number(row.lead_time));
  };

  const handleSaveEdit = async (rowId: string) => {
    const updatedRows = historical.map((r, idx) => {
      if (r.id === rowId) {
        return {
          day: idx + 1,
          demand: Number(editDemand),
          lead_time: Number(editLeadTime),
          date: r.date,
        };
      }
      return {
        day: idx + 1,
        demand: Number(r.demand),
        lead_time: Number(r.lead_time),
        date: r.date,
      };
    });
    try {
      await replaceHistorical(activeProduct!.id, updatedRows);
      setEditingRowId(null);
      success('Row updated successfully.');
    } catch (err) {
      error('Failed to update row.');
    }
  };

  const handleClearAll = async () => {
    if (!activeProduct) return;
    if (!confirm('Are you sure you want to delete the ENTIRE historical demand dataset for this product? This action cannot be undone.')) return;
    try {
      await replaceHistorical(activeProduct.id, []);
      success('Cleared all historical data.');
    } catch (err) {
      error('Failed to clear historical data.');
    }
  };



  // Auto-select the first product if none is selected
  useEffect(() => {
    if (!activeProduct && products.length > 0) {
      setActiveProductId(products[0].id);
    }
  }, [products, activeProduct, setActiveProductId]);

  const handleUploadClick = (productId: string) => {
    setUploadingProductId(productId);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingProductId) return;

    setUploading(true);
    try {
      const rows = await parseHistoricalFile(file);
      await replaceHistorical(uploadingProductId, rows);
      success(`Imported ${rows.length} rows of historical data successfully.`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to import file.');
    } finally {
      setUploading(false);
      setUploadingProductId(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (!activeProduct || historical.length === 0) {
      error('No data to export.');
      return;
    }
    exportToExcel(
      [
        {
          name: 'Historical Data',
          rows: [
            ['Day', 'Date', 'Demand', 'Lead Time'],
            ...historical.map((h) => [h.day, h.date ?? '', Number(h.demand), Number(h.lead_time)]),
          ],
        },
      ],
      `historical_data_${activeProduct.name}.xlsx`,
    );
    success('Exported historical data.');
  };

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Compute stats in real-time for the selected product's loaded history
  const historyStats = useMemo(() => {
    if (historical.length === 0) return null;
    const demands = historical.map(h => Number(h.demand));
    const leads = historical.map(h => Number(h.lead_time));
    const totalDemand = demands.reduce((a, b) => a + b, 0);
    const totalLead = leads.reduce((a, b) => a + b, 0);
    return {
      avgDemand: Math.round(totalDemand / historical.length),
      maxDemand: Math.max(...demands),
      avgLead: (totalLead / historical.length).toFixed(1),
    };
  }, [historical]);

  return (
    <>
      <PageHeader 
        title="Historical Data Hub" 
        subtitle="Upload and manage demand and lead time spreadsheet records for each product catalog" 
        icon={<Database className="w-5 h-5 text-blue-600" />}
        action={
          <button 
            onClick={downloadSampleTemplate} 
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:border-blue-500 hover:text-blue-600 rounded-xl shadow-xs transition-all duration-200"
          >
            <Download className="w-4 h-4 text-blue-500" /> Download Sample Template
          </button>
        }
      />

      {/* Hidden File Input */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid lg:grid-cols-5 gap-8 items-start">
        
        {/* MASTER COLUMN: Dynamic Product Selector Cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Product Catalog</h3>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {filteredProducts.length} Items
            </span>
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 text-xs shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200"
          />

          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = activeProduct?.id === p.id;
              const supplierObj = suppliers.find((s) => String(s.id) === String(p.supplier));
              const supplierName = supplierObj?.supplier_name || 'Sweet Bakery';
              const hasPolicy = !!p.policy_id;

              return (
                <div
                  key={p.id}
                  onClick={() => setActiveProductId(p.id)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isSelected 
                      ? 'bg-gradient-to-br from-blue-50/70 to-indigo-50/20 border-blue-500/80 shadow-md shadow-blue-500/5' 
                      : 'bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors'
                      }`}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.category}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUploadClick(p.id);
                      }}
                      disabled={uploading && uploadingProductId === p.id}
                      className={`inline-flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                        isSelected 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 border border-slate-150'
                      }`}
                    >
                      {uploading && uploadingProductId === p.id ? (
                        <Spinner className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Supplier: <span className="text-slate-700">{supplierName}</span></span>
                    {hasPolicy ? (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 font-medium">
                No matching products found.
              </div>
            )}
          </div>
        </div>

        {/* DETAIL COLUMN: Data Preview and Analytics Panel */}
        <div className="lg:col-span-3 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col min-h-[450px] transition-all duration-300 hover:shadow-md">
          {activeProduct ? (
            <>
              {/* Product Header & Export */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{activeProduct.name}</h4>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 inline-block">
                    Historical Log
                  </span>
                </div>
                 {historical.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExport} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-xl transition-all duration-200 shadow-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export to Excel
                    </button>
                    <button 
                      onClick={handleClearAll} 
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 rounded-xl transition-all duration-200 shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" /> Clear All Data
                    </button>
                  </div>
                )}
              </div>

              {loadingHistorical ? (
                <div className="flex-grow flex items-center justify-center py-20">
                  <Spinner className="w-8 h-8 text-blue-600" />
                </div>
              ) : historical.length === 0 ? (
                /* Empty state */
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-blue-500" />
                  </div>
                  <h5 className="font-extrabold text-slate-700 text-xs">No Data Uploaded</h5>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mt-1.5 leading-relaxed font-semibold">
                    Upload an Excel/CSV demand sheet for this product to view and run simulations.
                  </p>
                  <button 
                    onClick={() => handleUploadClick(activeProduct.id)}
                    className="btn-primary text-xs py-2 px-4 rounded-xl mt-4 shadow-md shadow-blue-500/10"
                  >
                    <Upload className="w-3.5 h-3.5" /> Select History Sheet
                  </button>
                </div>
              ) : (
                /* Real Data Loaded */
                <div className="flex-grow flex flex-col overflow-hidden">
                  
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2.5">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4 text-blue-600" /> Sequence Records
                    </span>
                    <span className="font-mono text-blue-650 bg-blue-50 px-2 py-0.5 rounded text-[10px]">{historical.length} Days</span>
                  </div>

                  {/* Scrollable Records Table */}
                  <div className="overflow-y-auto max-h-[52vh] border border-slate-150 rounded-2xl bg-white/50 shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Day</th>
                          <th className="px-3 py-3 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-3 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Demand</th>
                          <th className="px-3 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Lead Time</th>
                          <th className="px-3 py-3 font-bold text-slate-500 uppercase tracking-wider text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150/40">
                        {historical.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/30">
                            <td className="px-3 py-2.5 font-mono font-bold text-slate-500">#{h.day}</td>
                            <td className="px-3 py-2.5 text-slate-400 font-medium">{h.date ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-extrabold text-slate-800">
                              {editingRowId === h.id ? (
                                <input
                                  type="number"
                                  className="w-16 px-1.5 py-0.5 border border-slate-300 rounded font-mono text-xs text-right font-semibold bg-white focus:outline-none focus:border-indigo-500"
                                  value={editDemand}
                                  onChange={(e) => setEditDemand(Number(e.target.value))}
                                />
                              ) : (
                                Number(h.demand)
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-600">
                              {editingRowId === h.id ? (
                                <input
                                  type="number"
                                  className="w-16 px-1.5 py-0.5 border border-slate-300 rounded font-mono text-xs text-right font-semibold bg-white focus:outline-none focus:border-indigo-500"
                                  value={editLeadTime}
                                  onChange={(e) => setEditLeadTime(Number(e.target.value))}
                                />
                              ) : (
                                `${Number(h.lead_time)}d`
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {editingRowId === h.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(h.id)}
                                    className="text-green-600 hover:text-green-700 p-1 transition-colors"
                                    title="Save"
                                  >
                                    <Check className="w-4 h-4 inline" />
                                  </button>
                                  <button
                                    onClick={() => setEditingRowId(null)}
                                    className="text-red-500 hover:text-red-650 p-1 ml-1.5 transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4 inline" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(h)}
                                    className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5 inline" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRow(h.id)}
                                    className="text-slate-400 hover:text-red-650 p-1 ml-1.5 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 inline" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-400 text-xs font-semibold">Select a product from catalog to load history</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
