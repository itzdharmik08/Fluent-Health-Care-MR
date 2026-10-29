import React from 'react';
import { Medicine } from '../../types/medicine';
import { formatINR } from '../../lib/formatters';
import { calculateMedicineMargin, getCategoryBadgeStyle } from '../../lib/medicineSearch';
import { Edit, Trash2, History, Tag, IndianRupee, TrendingUp, Percent } from 'lucide-react';

interface MedicineTableViewProps {
  medicines: Medicine[];
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
  onViewHistory: (medicine: Medicine) => void;
  onSetDoctorRate: (medicine: Medicine) => void;
  onQuickPriceEdit: (medicine: Medicine) => void;
  highlightedId?: string | null;
}

export const MedicineTableView: React.FC<MedicineTableViewProps> = ({
  medicines,
  onEdit,
  onDelete,
  onViewHistory,
  onSetDoctorRate,
  onQuickPriceEdit,
  highlightedId,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Medicine & Packing</th>
              <th className="px-3 py-3.5">Category</th>
              <th className="px-3 py-3.5">MRP</th>
              <th className="px-3 py-3.5">Selling Rate</th>
              <th className="px-3 py-3.5">Margin / Profit</th>
              <th className="px-3 py-3.5">GST %</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {medicines.map((medicine) => {
              const badgeStyle = getCategoryBadgeStyle(medicine.category);
              const margin = calculateMedicineMargin(medicine.mrp, medicine.current_rate);
              const isKit = (medicine.category || '').toUpperCase().includes('HAIRFLU');
              const isHighlighted = highlightedId === medicine.id;

              return (
                <tr
                  key={medicine.id}
                  className={`hover:bg-indigo-50/40 transition-colors group ${
                    isHighlighted ? 'bg-indigo-50/80 font-medium' : ''
                  }`}
                >
                  {/* Medicine Name & Packaging */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm">
                      {medicine.medicine_name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Packing: <strong className="text-slate-600">{medicine.packing || 'Standard'}</strong></span>
                      {medicine.company_name && (
                        <span>• {medicine.company_name}</span>
                      )}
                    </div>
                    {medicine.composition && (
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {medicine.composition}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                    >
                      {badgeStyle.label}
                    </span>
                  </td>

                  {/* MRP */}
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-600">
                    {formatINR(medicine.mrp)}
                  </td>

                  {/* Selling Rate with 1-click Quick Edit button */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button
                      onClick={() => onQuickPriceEdit(medicine)}
                      className="flex items-center gap-1.5 rounded-lg border border-transparent hover:border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 px-2.5 py-1 text-left transition-all"
                      title="Click to quickly edit price"
                    >
                      <span className="font-extrabold text-indigo-700 text-sm">
                        {formatINR(medicine.current_rate)}
                      </span>
                      <IndianRupee className="h-3 w-3 text-indigo-400 group-hover:text-indigo-600" />
                    </button>
                  </td>

                  {/* Margin % */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {margin.marginPercent > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-100">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span>{margin.marginPercent}% ({formatINR(margin.marginAmount)})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-medium">-</span>
                    )}
                  </td>

                  {/* GST */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                      <span>{medicine.gst_percent}%</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onQuickPriceEdit(medicine)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700 shadow-2xs transition-colors"
                        title="Quick Edit Price"
                      >
                        <IndianRupee className="h-3 w-3" />
                        <span>Edit Price</span>
                      </button>

                      <button
                        onClick={() => onSetDoctorRate(medicine)}
                        className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        title="Doctor Rate"
                      >
                        <Tag className="h-3 w-3" />
                        <span className="hidden lg:inline">Doctor Rate</span>
                      </button>

                      <button
                        onClick={() => onViewHistory(medicine)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Price History Log"
                      >
                        <History className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => onEdit(medicine)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        title="Full Edit Details"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {!isKit && (
                        <button
                          onClick={() => onDelete(medicine.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Medicine"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
