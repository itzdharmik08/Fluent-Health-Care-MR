import React from 'react';
import { Medicine } from '../../types/medicine';
import { Edit, Trash2, History, Tag, Box, Percent } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface MedicineCardProps {
  medicine: Medicine;
  onEdit: (medicine: Medicine) => void;
  onDelete: (id: string) => void;
  onViewHistory: (medicine: Medicine) => void;
  onSetDoctorRate: (medicine: Medicine) => void;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onEdit,
  onDelete,
  onViewHistory,
  onSetDoctorRate,
}) => {
  const isKit = (medicine.category || '').toUpperCase().includes('HAIRFLU');

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{medicine.medicine_name}</h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                {medicine.category || 'GENERAL RANGE'}
              </span>
              {medicine.company_name && (
                <span className="text-[11px] text-slate-400 font-medium">
                  {medicine.company_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {medicine.composition && (
          <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            <span className="font-semibold text-slate-600">Composition: </span>
            {medicine.composition}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 mb-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400">Packing</span>
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <Box className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{medicine.packing || 'Standard'}</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">GST %</span>
            <div className="flex items-center gap-1 font-semibold text-amber-600">
              <Percent className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{medicine.gst_percent}%</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">MRP</span>
            <div className="font-semibold text-slate-600">{formatINR(medicine.mrp)}</div>
          </div>
          <div>
            <span className="text-[11px] text-indigo-500 font-medium">Current Rate</span>
            <div className="font-bold text-indigo-600 text-sm">{formatINR(medicine.current_rate)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSetDoctorRate(medicine)}
            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            title="Doctor Specific Rate"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Doctor Rate</span>
          </button>
          <button
            onClick={() => onViewHistory(medicine)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Price History Log"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(medicine)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Edit Medicine"
          >
            <Edit className="h-4 w-4" />
          </button>
          {!isKit && (
            <button
              onClick={() => onDelete(medicine.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
