import React, { useState, useEffect } from 'react';
import { Medicine, MedicinePriceHistory } from '../../types/medicine';
import { medicineService } from '../../services/medicineService';
import { X, History, TrendingUp, TrendingDown } from 'lucide-react';
import { formatINR, formatDate } from '../../lib/formatters';

interface RateHistoryModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  onClose: () => void;
}

export const RateHistoryModal: React.FC<RateHistoryModalProps> = ({
  isOpen,
  medicine,
  onClose,
}) => {
  const [history, setHistory] = useState<MedicinePriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && medicine) {
      setIsLoading(true);
      medicineService
        .getPriceHistory(medicine.id)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, medicine]);

  if (!isOpen || !medicine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">{medicine.medicine_name}</h2>
              <p className="text-xs text-slate-400">Price Change Audit Timeline</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading rate history log...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No historical price changes recorded for this medicine.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {history.map((h) => {
                const isIncrease = h.new_rate > h.old_rate;
                return (
                  <div key={h.id} className="relative pl-6">
                    <div
                      className={`absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full ${
                        isIncrease ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">
                        {formatDate(h.effective_date || h.created_at)}
                      </span>
                      <span
                        className={`flex items-center gap-1 font-bold ${
                          isIncrease ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatINR(h.old_rate)} → {formatINR(h.new_rate)}
                      </span>
                    </div>

                    <div className="mt-1 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600">
                      <div>
                        <strong>Reason: </strong>
                        {h.reason || 'General Rate Adjustment'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        MRP: {formatINR(h.old_mrp)} → {formatINR(h.new_mrp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
