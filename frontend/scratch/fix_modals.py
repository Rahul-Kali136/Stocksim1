import os
import sys

def main():
    base_dir = r"d:\clone_repo\StockSim\Development\Project\frontend\src\pages\dashboard"
    org_file = os.path.join(base_dir, "OrganizationsPage.tsx")
    prod_file = os.path.join(base_dir, "ProductsPage.tsx")

    with open(org_file, 'r', encoding='utf-8') as f:
        org_content = f.read()

    # Add showForm and showBulk modals to OrganizationsPage.tsx right before {linkingOrg && (
    org_modals = """
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
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => !saving && setShowBulk(false)} />
          <div className="relative z-[110] w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-600" />
                Bulk Upload Organizations
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
                <button onClick={handleBulkSubmit} disabled={saving || !uploadFile} className="btn-primary bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 px-6 py-2.5 text-sm">
                  {saving ? 'Processing...' : 'Upload Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Linking Products Modal */}"""
    org_content = org_content.replace("{/* Linking Products Modal */}", org_modals)

    # Add z-[110] to the other modals
    org_content = org_content.replace(
        '<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6">',
        '<div className="relative z-[110] bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6">'
    )
    with open(org_file, 'w', encoding='utf-8') as f:
        f.write(org_content)

    print("Updated OrganizationsPage.tsx")

    # Fix ProductsPage.tsx
    with open(prod_file, 'r', encoding='utf-8') as f:
        prod_content = f.read()
    
    prod_content = prod_content.replace(
        """          {/* Compact Modal */}
          <div
            className="
              relative
              bg-white
              rounded-2xl
              shadow-2xl
              w-full
              max-w-xl
              max-h-[85vh]
              overflow-hidden
            \"""",
        """          {/* Compact Modal */}
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
            \""""
    )
    prod_content = prod_content.replace(
        """          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">""",
        """          <div className="relative z-[110] bg-white rounded-3xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">"""
    )
    with open(prod_file, 'w', encoding='utf-8') as f:
        f.write(prod_content)
    print("Updated ProductsPage.tsx")

if __name__ == "__main__":
    main()
