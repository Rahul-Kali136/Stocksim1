import os

plans_page_code = """
import { useState, useEffect } from 'react';
import { CreditCard, Check, Zap } from 'lucide-react';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/plans/')
      .then(res => res.json())
      .then(data => {
        setPlans(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSubscribe = async (planId, planName, amount) => {
    try {
      const token = localStorage.getItem('access');
      const res = await fetch('http://127.0.0.1:8000/api/payments/charge/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan_id: planId })
      });
      const data = await res.json();
      
      if (data.success) {
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: 'StockSim',
          description: `${data.plan} Subscription`,
          order_id: data.order_id,
          handler: async function (response) {
            const verifyRes = await fetch('http://127.0.0.1:8000/api/payments/verify/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_name: planName
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert('Payment successful! Subscription activated.');
              window.location.href = '/dashboard/subscription';
            } else {
              alert('Payment verification failed.');
            }
          },
          theme: {
            color: '#3b82f6'
          }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.open();
      } else {
        alert(data.message || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to payment gateway.');
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading plans...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">Choose Your StockSim Plan</h1>
        <p className="mt-4 text-slate-500">Professional inventory risk forecasting for businesses of all sizes.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map(plan => {
          const isPremium = plan.name.toLowerCase().includes('premium');
          return (
            <div 
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-all hover:shadow-md ${
                isPremium ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
              }`}
            >
              {isPremium && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  RECOMMENDED
                </div>
              )}
              
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline text-4xl font-extrabold text-slate-900">
                ₹{plan.amount}
                <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>
              </div>
              <p className="mt-4 text-sm text-slate-500">{plan.description}</p>
              
              <ul className="mt-6 flex-1 space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-700 font-semibold">{plan.run_limit} Simulation Runs</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-700">Detailed Risk Reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-700">Basic Policy Comparison</span>
                </li>
              </ul>
              
              <button
                onClick={() => handleSubscribe(plan.id, plan.name, plan.amount)}
                className={`mt-8 w-full rounded-xl py-3 text-sm font-bold transition-all ${
                  isPremium
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {parseFloat(plan.amount) === 0 ? 'Current Plan' : 'Subscribe Now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"""

subscription_dashboard_code = """
import { useState, useEffect } from 'react';
import { CreditCard, Zap, Calendar, Package, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubscriptionDashboard() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentSub = async () => {
      try {
        const token = localStorage.getItem('access');
        const res = await fetch('http://127.0.0.1:8000/api/subscriptions/current/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSub(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentSub();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading subscription details...</div>;
  if (!sub) return <div className="p-8 text-center text-red-500">Failed to load subscription.</div>;

  const progress = Math.min(100, Math.max(0, (sub.used_runs / sub.run_limit) * 100)) || 0;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Subscription & Usage</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Current Plan</h2>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
              sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {sub.status}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{sub.plan}</p>
              <p className="text-sm text-slate-500">StockSim {sub.plan}</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
            <div>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3"/> Started On</p>
              <p className="mt-1 font-semibold text-slate-900">{sub.invoice_date || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3"/> Renews On</p>
              <p className="mt-1 font-semibold text-slate-900">{sub.renewal_date || 'N/A'}</p>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            <Link to="/dashboard/plans" className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-bold text-white hover:bg-blue-700 transition-colors">
              Upgrade Plan
            </Link>
            <Link to="/dashboard/invoices" className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              View Invoices
            </Link>
          </div>
        </div>

        {/* Usage Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
           <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Simulation Usage</h2>
            <Package className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="mt-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-3xl font-bold text-slate-900">{sub.used_runs}</span>
                <span className="text-slate-500 font-medium"> / {sub.run_limit} runs</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{sub.remaining_runs} remaining</span>
            </div>
            
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : progress > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Limits are reset at the beginning of each billing cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

invoices_page_code = """
import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle2, XCircle } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem('access');
        const res = await fetch('http://127.0.0.1:8000/api/invoices/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setInvoices(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const downloadPdf = async (id, invoiceNumber) => {
    try {
      const token = localStorage.getItem('access');
      const res = await fetch(`http://127.0.0.1:8000/api/invoices/${id}/pdf/`, {
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

  if (loading) return <div className="p-8 text-center">Loading invoices...</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Billing History</h1>
      <p className="text-slate-500 mb-8">View and download past invoices.</p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Invoice Number</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Plan</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No invoices found.</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400"/>
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-4">{inv.invoice_date}</td>
                  <td className="px-6 py-4">{inv.plan_name}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">₹{inv.total_amount}</td>
                  <td className="px-6 py-4">
                    {inv.payment_status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                        <XCircle className="h-3.5 w-3.5" /> {inv.payment_status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""

import os
base_path = r"d:\clone_repo\StockSim\Development\Project\frontend\src\pages\dashboard"
with open(os.path.join(base_path, "PlansPage.tsx"), "w", encoding="utf-8") as f:
    f.write(plans_page_code.strip())
with open(os.path.join(base_path, "SubscriptionDashboard.tsx"), "w", encoding="utf-8") as f:
    f.write(subscription_dashboard_code.strip())
with open(os.path.join(base_path, "InvoicesPage.tsx"), "w", encoding="utf-8") as f:
    f.write(invoices_page_code.strip())
