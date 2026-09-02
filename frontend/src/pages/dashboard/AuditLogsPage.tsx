import { useState } from 'react';
import { Scroll, Search, Trash2, ShieldCheck, User, Calendar, Cpu, Filter } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, EmptyState } from '@/components/ui';

export default function AuditLogsPage() {
  const { auditLogs, clearAuditLogs } = useData();
  const { success } = useToast();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const handleClearLogs = () => {
    if (!confirm('Are you sure you want to permanently clear all audit logs? This cannot be undone.')) return;
    clearAuditLogs();
    success('Audit logs purged successfully.');
  };

  const actions = Array.from(new Set(auditLogs.map((l) => l.action)));

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) || 
                          log.action.toLowerCase().includes(search.toLowerCase()) ||
                          log.user_email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = actionFilter === 'All' || log.action === actionFilter;
    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (action.includes('DELETE')) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (action.includes('UPDATE')) return 'bg-sky-50 text-sky-700 border-sky-100';
    if (action.includes('RUN')) return 'bg-purple-50 text-purple-700 border-purple-100';
    return 'bg-slate-50 text-slate-650 border-slate-100';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Track administrative events, data modifications, and Monte Carlo runs"
        icon={<Scroll className="w-5 h-5 text-slate-800" />}
        action={
          auditLogs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="btn flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Purge Logs
            </button>
          )
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Scroll className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{auditLogs.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Actions Logged</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">
              {Array.from(new Set(auditLogs.map((l) => l.user_email))).length}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Operators</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">100%</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Integrity</div>
          </div>
        </div>
      </div>

      {/* Search & Filters block */}
      {auditLogs.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter audits by keyword, details, operator..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="input py-2 px-3 text-xs bg-white font-semibold border border-slate-200 rounded-xl"
            >
              <option value="All">All Classifications</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Audit Logs table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title={search || actionFilter !== 'All' ? "No audit records found" : "No logs recorded"}
          message="Events will populate here as database updates or simulations run."
        />
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Action Code</th>
                  <th className="px-5 py-3">Event Details</th>
                  <th className="px-5 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-650 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 font-medium whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-semibold leading-relaxed max-w-md">
                      {log.details}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {log.user_email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
