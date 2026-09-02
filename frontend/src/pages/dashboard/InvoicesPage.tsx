import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, XCircle, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { motion } from 'framer-motion';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await apiFetch<any[]>('subscription/invoices/');
        setInvoices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000/api";
      const normalizedBase = API_BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${normalizedBase}/subscription/invoices/${id}/pdf/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF');
    }
  };

  const deleteInvoice = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await apiFetch(`subscription/invoices/${id}/`, { method: 'DELETE' });
      setInvoices(invoices.filter(inv => inv.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete invoice');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div className="py-2">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Billing History</h1>
        <p className="mt-2 text-slate-500">View and download past invoices and transaction receipts.</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400">Invoice</th>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400">Date</th>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400">Plan</th>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400">Amount</th>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400">Status</th>
                <th className="px-8 py-5 font-bold uppercase tracking-widest text-xs text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-10 w-10 mb-3 opacity-20" />
                      <p className="font-medium text-slate-500">No invoices found.</p>
                      <p className="text-xs mt-1">Your billing history will appear here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={inv.id} 
                    className="group hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <FileText className="h-5 w-5"/>
                        </div>
                        <span className="font-bold text-slate-900">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-600">{inv.invoice_date}</td>
                    <td className="px-8 py-5 font-bold text-slate-700">{inv.plan_name}</td>
                    <td className="px-8 py-5 font-black text-slate-900 text-base">₹{inv.total_amount}</td>
                    <td className="px-8 py-5">
                      {inv.payment_status === 'PAID' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/50 px-3 py-1.5 text-xs font-black text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={3} /> PAID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100/50 px-3 py-1.5 text-xs font-black text-red-600 border border-red-200">
                          <XCircle className="h-4 w-4" strokeWidth={3} /> {inv.payment_status}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                          className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/10 transition-all"
                        >
                          <Download className="h-4 w-4" /> 
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button 
                          onClick={() => deleteInvoice(inv.id)}
                          className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 h-[38px] w-[38px] text-slate-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50 hover:shadow-md hover:shadow-red-500/10 transition-all"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}