import os
import re

def main():
    base_dir = r"d:\clone_repo\StockSim\Development\Project\frontend\src\pages\dashboard"
    
    for page, entity_name, download_func, parse_func in [
        ("SuppliersPage.tsx", "Suppliers", "downloadSupplierTemplate", "parseSupplierFile"),
        ("OrganizationsPage.tsx", "Organizations", "downloadOrganizationTemplate", "parseOrganizationFile")
    ]:
        filepath = os.path.join(base_dir, page)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update handleBulkSubmit
        # Find const handleBulkSubmit = async () => { ... }
        # Replace with const handleBulkSubmit = async (file: File) => { ... }
        
        # Handle the function signature
        content = re.sub(
            r'const handleBulkSubmit = async \(\) => \{',
            r'const handleBulkSubmit = async (file: File) => {',
            content
        )
        
        # Remove the if (!uploadFile) check
        content = re.sub(
            r'if \(!uploadFile\) \{\s*setUploadError\([^\)]+\);\s*return;\s*\}',
            r'',
            content
        )
        
        # Replace await parse...File(uploadFile); with await parse...File(file);
        content = re.sub(
            rf'await {parse_func}\(uploadFile\);',
            rf'await {parse_func}(file);',
            content
        )

        # Replace the showBulk JSX
        # Find everything between {showBulk && ( and the matching )} for it.
        # Actually it's easier to find {/* Bulk Upload... Modal */} or {showBulk && ( and replace to the end of that block.
        
        modal_start = content.find('{showBulk && (')
        if modal_start == -1:
            continue
            
        # The modal ends before {/* Linking Products Modal */} or just before </> or {showForm &&
        # Let's use regex or just string replacement
        # We know the modal starts with {showBulk && ( and ends with )} followed by either another {show... or </>
        
        # Let's just build the new modal JSX
        new_modal = f"""{{showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={{() => !saving && setShowBulk(false)}}
          />

          <div className="relative z-[110] bg-white rounded-3xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Bulk Upload {entity_name}
              </h2>

              <button
                onClick={{() => setShowBulk(false)}}
                className="btn-ghost px-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-500 mb-4">
                Upload an Excel or CSV file containing {entity_name.lower()} details.
              </p>

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={{() => document.getElementById('{entity_name.lower()}BulkUpload')?.click()}}
              >
                {{saving ? (
                  <Spinner className="w-7 h-7 text-blue-600 mx-auto" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                )}}

                <p className="text-sm text-slate-500 mt-2">
                  Click to select an .xlsx or .csv file
                </p>
              </div>

              <input
                id="{entity_name.lower()}BulkUpload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={{(e) => {{
                  const f = e.target.files?.[0];
                  if (f) {{
                    handleBulkSubmit(f);
                  }}
                }}}}
              />

              <button
                onClick={{{download_func}}}
                className="btn-secondary w-full mt-4"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
          </div>
        </div>
      )}}"""

        # We need to find the exact boundaries of the old showBulk block
        # In both files, the {showBulk block is near the end, right before {/* Linking Products Modal */} in Org or </> in Sup.
        
        # We can extract everything from {showBulk && ( to the matching )} that closes it.
        import string
        
        start_idx = content.find('{showBulk && (')
        # To find the end, count { and }
        brace_count = 0
        in_string = False
        end_idx = -1
        
        for i in range(start_idx, len(content)):
            if content[i] == '{' and not in_string:
                brace_count += 1
            elif content[i] == '}' and not in_string:
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
                    
        old_modal = content[start_idx:end_idx]
        
        content = content.replace(old_modal, new_modal)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        print(f"Updated {page}")

if __name__ == "__main__":
    main()
