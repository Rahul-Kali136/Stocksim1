import { type ReactNode } from 'react';

const iconBg: Record<string, string> = {
  blue: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20',
  amber: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20',
  violet: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20',
  teal: 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20',
  sky: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20',
};
export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  hint,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  hint?: string;
}) {
  const bgClass = iconBg[color] || iconBg.blue;

  return (
    <div className="card-pad flex items-center gap-3 card-hover overflow-hidden">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</div>
        <div className="text-base sm:text-lg lg:text-base xl:text-lg font-bold text-slate-800 mt-0.5 whitespace-nowrap tracking-tight">{value}</div>
        {hint && <div className="text-xs font-medium text-slate-500 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}
