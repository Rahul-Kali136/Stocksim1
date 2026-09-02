const fs = require('fs');

let page = fs.readFileSync('src/pages/dashboard/SuppliersPage.tsx', 'utf8');

// 1. Add state variables
page = page.replace("const [search, setSearch] = useState('');", `const [search, setSearch] = useState('');
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
      performance_score: supplier.performance_score || 0
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
    if (!draft.supplier_name.trim()) {
      error('Supplier name is required.');
      return;
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
      error(err.message || 'Failed to save supplier.');
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
      const parsedData = await parseSupplierFile(uploadFile);
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
      success(\`Successfully uploaded \${successCount} supplier(s).\`);
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
page = page.replace(`onClick={() => navigate('/dashboard/suppliers/upload')}`, 'onClick={() => setShowBulk(true)}');
page = page.replace(`onClick={() => navigate('/dashboard/suppliers/add')}`, 'onClick={handleAdd}');
page = page.replace(`onClick={() => navigate('/dashboard/suppliers/upload')}`, 'onClick={() => setShowBulk(true)}');
page = page.replace(`onClick={() => navigate('/dashboard/suppliers/add')}`, 'onClick={handleAdd}');
page = page.replace(/onClick=\{\(\) \=\> navigate\(\`\/dashboard\/suppliers\/edit\/\$\{supplier\.id\}\`\)\}/g, 'onClick={() => handleEdit(supplier)}');

// 3. Append the modals before the closing div
const modalCode = `
      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => !saving && setShowForm(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                {editing ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={() => !saving && setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supplier Name *</label>
                  <input type="text" required value={draft.supplier_name} onChange={(e) => setDraft({ ...draft, supplier_name: e.target.value })} placeholder="e.g. Global Tech Supplies" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Person</label>
                  <input type="text" value={draft.contact_person} onChange={(e) => setDraft({ ...draft, contact_person: e.target.value })} placeholder="e.g. Jane Doe" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. Electronics, Raw Materials" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="e.g. jane@example.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
                  <input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="e.g. +1 (555) 000-0000" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                  <textarea rows={2} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} placeholder="Enter full address" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Performance Score (0-100)</label>
                  <input type="number" min="0" max="100" value={draft.performance_score || ''} onChange={(e) => setDraft({ ...draft, performance_score: parseInt(e.target.value) || 0 })} placeholder="e.g. 95" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700 px-6 py-2.5 text-sm">
                  {saving ? <Spinner className="w-4 h-4 mr-2 inline" /> : null}
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Supplier')}
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
                <Upload className="w-6 h-6 text-purple-600" />
                Bulk Upload Suppliers
              </h3>
              <button onClick={() => !saving && setShowBulk(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100">
                <h4 className="text-sm font-bold text-purple-900 mb-2">Instructions</h4>
                <ol className="text-sm text-purple-800/80 space-y-1.5 list-decimal list-inside">
                  <li>Download the CSV template</li>
                  <li>Fill in your supplier details</li>
                  <li>Upload the completed file below</li>
                </ol>
                <button onClick={downloadSupplierTemplate} className="mt-4 px-4 py-2 bg-white rounded-xl border border-purple-200 text-purple-700 text-sm font-bold hover:bg-purple-50 hover:border-purple-300 transition-colors flex items-center gap-2">
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
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-slate-200 rounded-xl"
                />
                {uploadError && <p className="text-sm text-rose-500 mt-2 font-medium">{uploadError}</p>}
                {uploadFile && !uploadError && <p className="text-sm text-emerald-600 mt-2 font-medium">Selected: {uploadFile.name}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulk(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleBulkSubmit} disabled={saving || !uploadFile} className="btn-primary bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700 px-6 py-2.5 text-sm">
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

fs.writeFileSync('src/pages/dashboard/SuppliersPage.tsx', page);
