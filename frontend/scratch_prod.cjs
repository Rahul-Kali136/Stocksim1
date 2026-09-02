const fs = require('fs');

let page = fs.readFileSync('src/pages/dashboard/ProductsPage.tsx', 'utf8');

// Ensure state is updated correctly without duplicating useData
page = page.replace("const [search, setSearch] = useState('');", `const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
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

  const handleEdit = (product: Product) => {
    setEditing(product);
    setDraft({ 
      product_name: product.name,
      category: product.category || '',
      supplier_id: String(product.supplier_id || ''),
      organization_id: String(product.organization_id || ''),
      unit_price: product.unit_price || 0,
      opening_stock: product.opening_stock || 0,
      ordering_cost: product.ordering_cost || 0,
      service_level: product.service_level || 0,
      stockout_cost: product.stockout_cost || 0,
      holding_cost: product.holding_cost || 0
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
    if (!draft.product_name.trim()) {
      error('Product name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateProduct(editing.id, draft);
        success('Product updated.');
      } else {
        await createProduct(draft);
        success('Product created.');
      }
      setShowForm(false);
    } catch (err: any) {
      error(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setSaving(true);
    setUploadError('');
    try {
      const parsedData = await parseProductFile(uploadFile);
      if (parsedData.length === 0) throw new Error('No valid products found in file.');
      await bulkCreateProducts(parsedData);
      success(\`Successfully uploaded products.\`);
      setShowBulk(false);
      setUploadFile(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process file.');
    } finally {
      setSaving(false);
    }
  };
`);

// 2. Fix the buttons
page = page.replace(`onClick={() => navigate('/dashboard/products/upload')}`, 'onClick={() => setShowBulk(true)}');
page = page.replace(`onClick={() => navigate('/dashboard/products/add')}`, 'onClick={handleAdd}');
page = page.replace(`onClick={() => navigate('/dashboard/products/upload')}`, 'onClick={() => setShowBulk(true)}');
page = page.replace(`onClick={() => navigate('/dashboard/products/add')}`, 'onClick={handleAdd}');
page = page.replace(/onClick=\{\(\) \=\> navigate\(\`\/dashboard\/products\/edit\/\$\{p\.id\}\`\)\}/g, 'onClick={() => handleEdit(p)}');
page = page.replace(/onClick=\{\(\) \=\> navigate\(\`\/dashboard\/products\/edit\/\$\{product\.id\}\`\)\}/g, 'onClick={() => handleEdit(product)}');

// 3. Append the modals before the closing div
const modalCode = `
      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => !saving && setShowForm(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                {editing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => !saving && setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product Name *</label>
                  <input type="text" required value={draft.product_name} onChange={(e) => setDraft({ ...draft, product_name: e.target.value })} placeholder="e.g. Premium Widget" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Electronics" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Organization</label>
                  <select value={draft.organization_id} onChange={(e) => setDraft({ ...draft, organization_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                    <option value="">No Organization</option>
                    {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier</label>
                  <select value={draft.supplier_id} onChange={(e) => setDraft({ ...draft, supplier_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                    <option value="">No Supplier</option>
                    {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.supplier_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit Price ($)</label>
                  <input type="number" step="0.01" min="0" value={draft.unit_price || ''} onChange={(e) => setDraft({ ...draft, unit_price: parseFloat(e.target.value) || 0 })} placeholder="e.g. 10.00" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Opening Stock</label>
                  <input type="number" min="0" value={draft.opening_stock || ''} onChange={(e) => setDraft({ ...draft, opening_stock: parseInt(e.target.value) || 0 })} placeholder="e.g. 100" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ordering Cost</label>
                  <input type="number" step="0.01" min="0" value={draft.ordering_cost || ''} onChange={(e) => setDraft({ ...draft, ordering_cost: parseFloat(e.target.value) || 0 })} placeholder="e.g. 50" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Level (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={draft.service_level || ''} onChange={(e) => setDraft({ ...draft, service_level: parseFloat(e.target.value) || 0 })} placeholder="e.g. 95" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stockout Cost</label>
                  <input type="number" step="0.01" min="0" value={draft.stockout_cost || ''} onChange={(e) => setDraft({ ...draft, stockout_cost: parseFloat(e.target.value) || 0 })} placeholder="e.g. 20" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Holding Cost</label>
                  <input type="number" step="0.01" min="0" value={draft.holding_cost || ''} onChange={(e) => setDraft({ ...draft, holding_cost: parseFloat(e.target.value) || 0 })} placeholder="e.g. 5" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
                  {saving ? <Spinner className="w-4 h-4 mr-2 inline" /> : null}
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => !saving && setShowBulk(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" />
                Bulk Upload Products
              </h3>
              <button onClick={() => !saving && setShowBulk(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-2">Instructions</h4>
                <ol className="text-sm text-blue-800/80 space-y-1.5 list-decimal list-inside">
                  <li>Download the CSV template</li>
                  <li>Fill in your product details</li>
                  <li>Upload the completed file below</li>
                </ol>
                <button onClick={downloadProductTemplate} className="mt-4 px-4 py-2 bg-white rounded-xl border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFile(file);
                    setUploadError('');
                  }}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl"
                />
                {uploadError && <p className="text-sm text-rose-500 mt-2 font-medium">{uploadError}</p>}
                {uploadFile && !uploadError && <p className="text-sm text-emerald-600 mt-2 font-medium">Selected: {uploadFile.name}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulk(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleBulkSubmit} disabled={saving || !uploadFile} className="btn-primary px-6 py-2.5 text-sm">
                  {saving ? <Spinner className="w-4 h-4 mr-2 inline" /> : null}
                  {saving ? 'Processing...' : 'Upload Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;

page = page.replace('    </div>\n  );\n}\n', modalCode + '\n    </div>\n  );\n}\n');

fs.writeFileSync('src/pages/dashboard/ProductsPage.tsx', page);
