import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function downloadSampleTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Day', 'Date', 'Demand', 'Lead Time'],
    [1, '2025-01-01', 18, 2],
    [2, '2025-01-02', 22, 3],
    [3, '2025-01-03', 20, 4],
    [4, '2025-01-04', 25, 2],
    [5, '2025-01-05', 19, 3],
    [6, '2025-01-06', 24, 5],
    [7, '2025-01-07', 21, 4],
    [8, '2025-01-08', 23, 3],
    [9, '2025-01-09', 20, 2],
    [10, '2025-01-10', 26, 4],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historical Data');
  XLSX.writeFile(wb, 'sample_data.xlsx');
}

export function parseHistoricalFile(file: File): Promise<{ day: number; demand: number; lead_time: number; date?: string | null }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          reject(new Error('File has no data rows.'));
          return;
        }
        const header = (rows[0] as unknown[]).map((h) => String(h).toLowerCase().trim());
        const dayIdx = header.findIndex((h) => h.includes('day'));
        const demandIdx = header.findIndex((h) => h.includes('demand'));
        const leadIdx = header.findIndex((h) => h.includes('lead'));
        const dateIdx = header.findIndex((h) => h === 'date' || h.includes('date'));
        if (dayIdx === -1 || demandIdx === -1 || leadIdx === -1) {
          reject(new Error('File must have columns: Day, Date, Demand, Lead Time.'));
          return;
        }
        const parsed: { day: number; demand: number; lead_time: number; date?: string | null }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as unknown[];
          if (!r || r.length === 0) continue;
          const day = Number(r[dayIdx]);
          const demand = Number(r[demandIdx]);
          const lead_time = Number(r[leadIdx]);
          if (Number.isNaN(day) || Number.isNaN(demand) || Number.isNaN(lead_time)) continue;
          let date: string | null = null;
          if (dateIdx !== -1 && r[dateIdx] != null && r[dateIdx] !== '') {
            const raw = r[dateIdx];
            if (raw instanceof Date) {
              date = raw.toISOString().split('T')[0];
            } else if (typeof raw === 'number' && raw > 10000) {
              // Convert Excel serial date to JS Date
              const d = new Date((raw - 25569) * 86400 * 1000);
              if (!Number.isNaN(d.getTime())) {
                date = d.toISOString().split('T')[0];
              }
            } else {
              const d = new Date(String(raw));
              if (!Number.isNaN(d.getTime())) {
                date = d.toISOString().split('T')[0];
              } else {
                date = String(raw);
              }
            }
          }
          parsed.push({ day, demand, lead_time, date });
        }
        if (parsed.length === 0) reject(new Error('No valid data rows found.'));
        else resolve(parsed);
      } catch {
        reject(new Error('Could not read the file. Please upload a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadProductTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product Name', 'Category', 'Supplier', 'Organization', 'Unit Price', 'Opening Stock'],
    ['Chocolate Cake', 'Bakery', 'Sweet Bakery Supplies Co.', 'My First Org', 250, 100],
    ['Vanilla Cupcake', 'Bakery', 'FreshDairy Ltd.', 'My First Org', 150, 200],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'product_template.xlsx');
}

export type ParsedProduct = {
  name: string;
  category: string;
  supplier: string;
  organization: string;
  unit_price: number;
  opening_stock: number;
};

export function parseProductFile(file: File): Promise<ParsedProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          reject(new Error('File has no data rows.'));
          return;
        }
        const header = (rows[0] as unknown[]).map((h) => String(h).toLowerCase().trim());
        const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('product'));
        const categoryIdx = header.findIndex((h) => h.includes('category'));
        const supplierIdx = header.findIndex((h) => h.includes('supplier'));
        const organizationIdx = header.findIndex((h) => h.includes('organization') || h.includes('org'));
        const priceIdx = header.findIndex((h) => h.includes('price') || h.includes('unit price'));
        const openingIdx = header.findIndex((h) => h.includes('opening') || h.includes('stock'));

        if (nameIdx === -1 || openingIdx === -1) {
          reject(new Error('File must have columns: Product Name, Opening Stock.'));
          return;
        }
        const parsed: ParsedProduct[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as unknown[];
          if (!r || r.length === 0) continue;
          const name = String(r[nameIdx] ?? '').trim();
          if (!name) continue;
          const category = categoryIdx !== -1 ? String(r[categoryIdx] ?? '').trim() : 'Bakery';
          const supplier = supplierIdx !== -1 ? String(r[supplierIdx] ?? '').trim() : '';
          const organization = organizationIdx !== -1 ? String(r[organizationIdx] ?? '').trim() : '';
          const unit_price = priceIdx !== -1 && r[priceIdx] != null ? Number(r[priceIdx]) : 250;
          const opening_stock = openingIdx !== -1 && r[openingIdx] != null ? Number(r[openingIdx]) : 0;
          if (Number.isNaN(unit_price) || Number.isNaN(opening_stock)) continue;
          parsed.push({
            name,
            category,
            supplier,
            organization,
            unit_price,
            opening_stock,
          });
        }
        if (parsed.length === 0) reject(new Error('No valid product rows found.'));
        else resolve(parsed);
      } catch {
        reject(new Error('Could not read the file. Please upload a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSupplierTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Supplier Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Category', 'Rating', 'Notes'],
    ['Bakery Supplies Co.', 'Rajesh Kumar', 'rajesh@bakerysupplies.co', '+91 98765 43210', '12 Industrial Area, Mumbai, MH 400001', 'Raw Material', 4.5, 'Reliable supplier for flour and sugar.'],
    ['FreshDairy Ltd.', 'Priya Sharma', 'priya@freshdairy.in', '+91 98123 45678', '45 Dairy Road, Pune, MH 411001', 'Dairy', 4.8, 'Premium quality dairy products.'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, 'supplier_template.xlsx');
}

export type ParsedSupplier = {
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  rating: number;
  notes: string;
};

export function parseSupplierFile(file: File): Promise<ParsedSupplier[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          reject(new Error('File has no data rows.'));
          return;
        }
        const header = (rows[0] as unknown[]).map((h) => String(h).toLowerCase().trim());
        const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('supplier'));
        const contactIdx = header.findIndex((h) => h.includes('contact') || h.includes('person'));
        const emailIdx = header.findIndex((h) => h.includes('email'));
        const phoneIdx = header.findIndex((h) => h.includes('phone'));
        const addressIdx = header.findIndex((h) => h.includes('address'));
        const categoryIdx = header.findIndex((h) => h.includes('category'));
        const ratingIdx = header.findIndex((h) => h.includes('rating'));
        const notesIdx = header.findIndex((h) => h.includes('notes') || h.includes('note'));

        if (nameIdx === -1) {
          reject(new Error('File must have at least a "Supplier Name" column.'));
          return;
        }
        const parsed: ParsedSupplier[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as unknown[];
          if (!r || r.length === 0) continue;
          const supplier_name = String(r[nameIdx] ?? '').trim();
          if (!supplier_name) continue;
          
          const contact_person = contactIdx !== -1 ? String(r[contactIdx] ?? '').trim() : '';
          const email = emailIdx !== -1 ? String(r[emailIdx] ?? '').trim() : '';
          const phone = phoneIdx !== -1 ? String(r[phoneIdx] ?? '').trim() : '';
          const address = addressIdx !== -1 ? String(r[addressIdx] ?? '').trim() : '';
          const category = categoryIdx !== -1 ? String(r[categoryIdx] ?? '').trim() : 'Raw Material';
          const rating = ratingIdx !== -1 ? Number(r[ratingIdx] ?? 4.0) : 4.0;
          const notes = notesIdx !== -1 ? String(r[notesIdx] ?? '').trim() : '';

          parsed.push({
            supplier_name,
            contact_person,
            email,
            phone,
            address,
            category,
            rating: Number.isNaN(rating) ? 4.0 : rating,
            notes,
          });
        }
        if (parsed.length === 0) reject(new Error('No valid supplier rows found.'));
        else resolve(parsed);
      } catch {
        reject(new Error('Could not read the file. Please upload a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadOrganizationTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Organization Name', 'Description'],
    ['My First Org', 'Main corporate entity'],
    ['Secondary Org', 'Sub-business unit'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Organizations');
  XLSX.writeFile(wb, 'organization_template.xlsx');
}

export type ParsedOrganization = {
  name: string;
  description: string;
};

export function parseOrganizationFile(file: File): Promise<ParsedOrganization[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          reject(new Error('File has no data rows.'));
          return;
        }
        const header = (rows[0] as unknown[]).map((h) => String(h).toLowerCase().trim());
        const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('org'));
        const descIdx = header.findIndex((h) => h.includes('desc'));

        if (nameIdx === -1) {
          reject(new Error('File must have at least an "Organization Name" column.'));
          return;
        }
        const parsed: ParsedOrganization[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as unknown[];
          if (!r || r.length === 0) continue;
          const name = String(r[nameIdx] ?? '').trim();
          if (!name) continue;
          const description = descIdx !== -1 ? String(r[descIdx] ?? '').trim() : '';
          parsed.push({ name, description });
        }
        if (parsed.length === 0) reject(new Error('No valid organization rows found.'));
        else resolve(parsed);
      } catch {
        reject(new Error('Could not read the file. Please upload a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

type SheetSpec = {
  name: string;
  rows: (string | number)[][];
};

export function exportToExcel(sheets: SheetSpec[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const spec of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(spec.rows);
    
    // Auto-fit column widths dynamically to prevent truncating/overlapping cells
    const maxCols = spec.rows.reduce((max, r) => Math.max(max, r.length), 0);
    const cols = [];
    for (let c = 0; c < maxCols; c++) {
      let maxLen = 10;
      for (const r of spec.rows) {
        if (r[c] != null) {
          maxLen = Math.max(maxLen, String(r[c]).length);
        }
      }
      cols.push({ wch: maxLen + 3 });
    }
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, spec.name);
  }
  XLSX.writeFile(wb, filename);
}

type PdfSection = {
  title: string;
  head: string[];
  body: (string | number)[][];
};

export function exportToPdf(title: string, sections: PdfSection[], filename: string) {
  const doc = new jsPDF();
  
  // Replace Rupee symbol with 'Rs. ' to prevent PDF encoding issues
  const sanitizedSections = sections.map((sec) => ({
    ...sec,
    body: sec.body.map((row) =>
      row.map((cell) =>
        typeof cell === 'string' ? cell.replace(/₹/g, 'Rs. ') : cell
      )
    ),
  }));

  // Draw Top Corporate Header Band (Vibrant Blue)
  doc.setFillColor(30, 64, 175); // Blue 700
  doc.rect(0, 0, 210, 32, 'F');

  // Accent Line (Sky Blue)
  doc.setFillColor(56, 189, 248); // Sky Blue 400
  doc.rect(0, 32, 210, 2, 'F');

  // Brand Name (StockSim)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text("StockSim", 14, 21);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(224, 242, 254); // Light Sky Blue
  doc.text("INVENTORY OPTIMIZATION & POLICY ANALYSIS REPORT", 48, 21);

  // Title of the report on the first page
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title, 14, 46);

  // Meta Info Table
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 52);
  doc.text("Engine: Monte Carlo Distribution Simulation (30-Day Period)", 14, 56);

  let y = 64;
  for (const section of sanitizedSections) {
    // If it's a 2-column key-value list (like product config or statistics)
    if (section.head.length === 2 && section.body.length <= 8) {
      const itemsCount = section.body.length;
      const rowsCount = Math.ceil(itemsCount / 2);
      const gridHeight = rowsCount * 14 + 10;
      
      if (y + gridHeight > 270) {
        doc.addPage();
        y = 25;
      }
      
      // Draw Section Title
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(section.title.toUpperCase(), 14, y);
      
      doc.setDrawColor(224, 242, 254); // Light Sky Blue line
      doc.setLineWidth(0.5);
      doc.line(14, y + 2, 196, y + 2);
      y += 6;

      // Draw 2-column Grid of Cards
      const colWidth = 88;
      const gap = 6;
      for (let i = 0; i < itemsCount; i++) {
        const item = section.body[i];
        const label = String(item[0]);
        const value = String(item[1]);
        
        const colIdx = i % 2;
        const rowIdx = Math.floor(i / 2);
        
        const xPos = 14 + colIdx * (colWidth + gap);
        const yPos = y + rowIdx * 13;
        
        // Draw light background card
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(xPos, yPos, colWidth, 10, 'F');
        
        // Draw border
        doc.setDrawColor(241, 245, 249); // Slate 100
        doc.setLineWidth(0.5);
        doc.rect(xPos, yPos, colWidth, 10, 'D');
        
        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(label, xPos + 3, yPos + 6.5);
        
        // Value
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(value, xPos + colWidth - 3, yPos + 6.5, { align: 'right' });
      }
      
      y += rowsCount * 13 + 8;
    } else {
      // Regular table rendering with pageBreak: avoid
      const tableHeightEstimate = (section.body.length + 1) * 8 + 15;
      if (y + tableHeightEstimate > 270) {
        doc.addPage();
        y = 25;
      }
      
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text(section.title.toUpperCase(), 14, y);
      
      doc.setDrawColor(224, 242, 254);
      doc.setLineWidth(0.5);
      doc.line(14, y + 2, 196, y + 2);
      y += 5;
      
      autoTable(doc, {
        head: [section.head],
        body: section.body,
        startY: y,
        theme: 'striped',
        headStyles: { 
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
        },
        margin: { left: 14, right: 14 },
        pageBreak: 'avoid',
      });
      
      // @ts-expect-error lastAutoTable is injected by the plugin
      y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    }
  }

  // Footer: Add page numbers to all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Draw footer line
    doc.setDrawColor(241, 245, 249); // Slate 100
    doc.setLineWidth(0.5);
    doc.line(14, 280, 196, 280);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Page ${i} of ${pageCount}`,
      196 - 15,
      285,
      { align: 'right' }
    );
    doc.text(
      "CONFIDENTIAL - StockSim Inventory Optimization Systems",
      14,
      285
    );
  }

  doc.save(filename);
}
