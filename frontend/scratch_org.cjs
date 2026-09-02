const fs = require('fs');

let orgPage = fs.readFileSync('src/pages/dashboard/OrganizationsPage.tsx', 'utf8');

// 1. Add state variables
orgPage = orgPage.replace("const [search, setSearch] = useState('');", `const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

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
    if (!draft.name.trim()) {
      error('Organization name is required.');
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

  const handleBulkSubmit = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setSaving(true);
    setUploadError('');
    try {
      const parsedData = await parseOrganizationFile(uploadFile);
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
      success(\`Successfully uploaded \${successCount} organization(s).\`);
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
orgPage = orgPage.replace(`onClick={() => navigate('/dashboard/organizations/upload')}`, 'onClick={() => setShowBulk(true)}');
orgPage = orgPage.replace(`onClick={() => navigate('/dashboard/organizations/add')}`, 'onClick={handleAdd}');
orgPage = orgPage.replace(`onClick={() => navigate('/dashboard/organizations/upload')}`, 'onClick={() => setShowBulk(true)}');
orgPage = orgPage.replace(`onClick={() => navigate('/dashboard/organizations/add')}`, 'onClick={handleAdd}');
orgPage = orgPage.replace(/onClick=\{\(\) \=\> navigate\(\`\/dashboard\/organizations\/edit\/\$\{org\.id\}\`\)\}/g, 'onClick={() => handleEdit(org)}');

// 3. Append the modals before the closing div
const modalCode = `
      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur Overlay */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => !saving && setShowForm(false)} />
          {/* Modal */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                {editing ? 'Edit Organization' : 'Add New Organization'}
              </h3>
              <button onClick={() => !saving && setShowForm(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Organization Name *</label>
                <input type="text" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Acme Corp, South Division" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Describe this division or group" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                <input type="text" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="e.g. New York, NY" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm">
                  {saving ? <Spinner className="w-4 h-4 mr-2 inline" /> : null}
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Organization')}
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
                Bulk Upload
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
                  <li>Fill in your organization details</li>
                  <li>Upload the completed file below</li>
                </ol>
                <button onClick={downloadOrganizationTemplate} className="mt-4 px-4 py-2 bg-white rounded-xl border border-blue-200 text-blue-700 text-sm font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2">
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

orgPage = orgPage.replace('    </div>\n  );\n}\n', modalCode + '\n    </div>\n  );\n}\n');

fs.writeFileSync('src/pages/dashboard/OrganizationsPage.tsx', orgPage);
