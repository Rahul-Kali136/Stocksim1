import React from 'react';
import { useData } from '@/context/DataContext';
import { MousePointerClick } from 'lucide-react';

export function ProductDragBar() {
  const { products, activeProduct, setActiveProductId } = useData();

  if (!products || products.length === 0) return null;

  return (
    <div className="w-full flex justify-start mb-6">
      <div className="flex items-center gap-3 bg-[#f0f8ff] border border-[#bae6fd] rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-[#0369a1] font-bold">
          <MousePointerClick className="w-5 h-5" />
          <span>Product:</span>
        </div>
        <select
          value={activeProduct?.id || ''}
          onChange={(e) => setActiveProductId(e.target.value)}
          className="bg-white border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-1.5 min-w-[200px] outline-none shadow-sm cursor-pointer"
        >
          <option value="" disabled>-- Choose a Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
