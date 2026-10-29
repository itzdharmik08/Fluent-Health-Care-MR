import React from 'react';
import { Medicine } from '../../types/medicine';
import { Edit, Trash2, History, Tag, Box, Percent, IndianRupee, TrendingUp, Sparkles } from 'lucide-react';
import { formatINR } from '../../lib/formatters';
import { calculateMedicineMargin, getCategoryBadgeStyle } from '../../lib/medicineSearch';

interface MedicineCardProps {
  medicine: Medicine;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
  onViewHistory: (medicine: Medicine) => void;
  onSetDoctorRate: (medicine: Medicine) => void;
  onQuickPriceEdit?: (medicine: Medicine) => void;
  isHighlighted?: boolean;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onEdit,
  onDelete,
  onViewHistory,
  onSetDoctorRate,
  onQuickPriceEdit,
  isHighlighted = false,
}) => {
  const isKit = (medicine.category || '').toUpperCase().includes('HAIRFLU');
  const badgeStyle = getCategoryBadgeStyle(medicine.category);
  const margin = calculateMedicineMargin(medicine.mrp, medicine.current_rate);

  return (
    <div
      className={`group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 relative ${
        isHighlighted
          ? 'border-indigo-500 ring-4 ring-indigo-100 shadow-md scale-[1.01]'
          : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Header: Title & Category Pill */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
              {medicine.medicine_name}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
              >
                {badgeStyle.label}
              </span>
              {medicine.company_name && (
                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
                  {medicine.company_name}
                </span>
              )}
            </div>
          </div>

          {/* Quick Edit Price Button in Card Corner */}
          {onQuickPriceEdit && (
            <button
              onClick={() => onQuickPriceEdit(medicine)}
              className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-2xs shrink-0"
              title="Click to quickly edit price"
            >
              <IndianRupee className="h-3 w-3" />
              <span>Edit Price</span>
            </button>
          )}
        </div>

        {/* Composition Snippet */}
        {medicine.composition ? (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100">
            <span className="font-semibold text-slate-700">Formula: </span>
            {medicine.composition}
          </p>
        ) : (
          <div className="mb-3 h-2" />
        )}

        {/* Pricing & Packaging Data Grid */}
        <div className="rounded-xl bg-slate-50/90 border border-slate-100 p-3 mb-4 text-xs space-y-2.5">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-200/60">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Packing</span>
              <div className="flex items-center gap-1 font-bold text-slate-700 mt-0.5">
                <Box className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{medicine.packing || 'Standard'}</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium">GST Rate</span>
              <div className="flex items-center gap-1 font-bold text-amber-700 mt-0.5">
                <Percent className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{medicine.gst_percent}%</span>
              </div>
            </div>
          </div>

          {/* Price & Margin Row */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Printed MRP</span>
              <div className="font-semibold text-slate-500 text-xs sm:text-sm mt-0.5">
                {formatINR(medicine.mrp)}
              </div>
            </div>

            {/* Clickable Rate Area for fast quick edit */}
            <div
              onClick={() => onQuickPriceEdit && onQuickPriceEdit(medicine)}
              className="cursor-pointer group/rate"
              title="Click to edit selling rate"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-indigo-600 font-bold">Selling Rate</span>
                <span className="text-[10px] text-indigo-400 opacity-0 group-hover/rate:opacity-100 transition-opacity">
                  Edit ✏️
                </span>
              </div>
              <div className="font-black text-indigo-600 text-sm sm:text-base mt-0.5 flex items-center gap-1 group-hover/rate:text-indigo-800 transition-colors">
                <span>{formatINR(medicine.current_rate)}</span>
              </div>
            </div>
          </div>

          {/* Retail Margin / Profit Banner */}
          {margin.marginPercent > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-100">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span>Doctor/Retailer Margin:</span>
              </span>
              <span className="font-bold">
                {margin.marginPercent}% ({formatINR(margin.marginAmount)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onSetDoctorRate(medicine)}
            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Doctor Specific Rate"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Doctor Rate</span>
          </button>
          <button
            onClick={() => onViewHistory(medicine)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            title="Price History Audit Log"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(medicine)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Edit Full Medicine Details"
          >
            <Edit className="h-4 w-4" />
          </button>
          {!isKit && (
            <button
              onClick={() => onDelete(medicine.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Delete Medicine"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
