import React, { useState, useEffect } from 'react';
import { Medicine } from '../../types/medicine';
import { calculateMedicineMargin, getCategoryBadgeStyle } from '../../lib/medicineSearch';
import { formatINR } from '../../lib/formatters';
import { X, Check, IndianRupee, TrendingUp, AlertTriangle, ArrowRight, Sparkles, Tag, ShieldAlert } from 'lucide-react';

interface QuickPriceModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  onClose: () => void;
  onSave: (medicine: Medicine, newRate: number, newMrp: number, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Rate adjustment',
  'Manufacturer price hike',
  'Market promotional discount',
  'GST or slab revision',
  'Catalog data correction',
];

export const QuickPriceModal: React.FC<QuickPriceModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSave,
}) => {
  const [rate, setRate] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [reason, setReason] = useState<string>('Rate adjustment');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (medicine) {
      setRate(Number(medicine.current_rate) || 0);
      setMrp(Number(medicine.mrp) || 0);
      setReason('Rate adjustment');
      setErrorMsg(null);
    }
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  const currentRateOld = Number(medicine.current_rate) || 0;
  const currentMrpOld = Number(medicine.mrp) || 0;
  const isRateChanged = rate !== currentRateOld;
  const isMrpChanged = mrp !== currentMrpOld;
  const hasChanges = isRateChanged || isMrpChanged;

  const newMargin = calculateMedicineMargin(mrp, rate);
  const oldMargin = calculateMedicineMargin(currentMrpOld, currentRateOld);

  const isRateHigherThanMrp = mrp > 0 && rate > mrp;

  const handleAdjustRate = (delta: number) => {
    const updated = Math.max(0, Math.round((rate + delta) * 100) / 100);
    setRate(updated);
  };

  const handleAdjustPercent = (percentDelta: number) => {
    const factor = 1 + percentDelta / 100;
    const updated = Math.max(0, Math.round(rate * factor * 100) / 100);
    setRate(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rate <= 0) {
      setErrorMsg('Current Rate must be greater than ₹0');
      return;
    }
    if (mrp <= 0) {
      setErrorMsg('MRP must be greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSave(medicine, rate, mrp, reason || 'Rate adjustment');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update medicine price';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeStyle = getCategoryBadgeStyle(medicine.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">Quick Price Edit</h2>
              <p className="text-xs text-slate-500">Update MRP or Net Rate in 1-step</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Medicine Overview Banner */}
        <div className="bg-slate-50/70 px-6 py-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                {medicine.medicine_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                >
                  {badgeStyle.label}
                </span>
                {medicine.packing && (
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Packing: {medicine.packing}
                  </span>
                )}
                {medicine.gst_percent && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    GST: {medicine.gst_percent}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rate & MRP Input Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Current Selling Rate Input */}
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Current Selling Rate (₹)</span>
                </label>
                {isRateChanged && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                    Was {formatINR(currentRateOld)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-indigo-300 bg-white pl-7 pr-3 py-2 text-lg font-black text-indigo-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-xs"
                />
              </div>

              {/* Quick Adjustment Steppers */}
              <div className="flex items-center gap-1 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Quick:</span>
                <button
                  type="button"
                  onClick={() => handleAdjustRate(-10)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  -₹10
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustRate(+10)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  +₹10
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPercent(-5)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  -5%
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustPercent(+5)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  +5%
                </button>
              </div>
            </div>

            {/* 2. Maximum Retail Price (MRP) Input */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">MRP Printed (₹)</label>
                {isMrpChanged && (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    Was {formatINR(currentMrpOld)}
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-lg font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none shadow-xs"
                />
              </div>

              {/* Quick Rounding Helper */}
              <div className="flex items-center gap-1 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Round:</span>
                <button
                  type="button"
                  onClick={() => setMrp(Math.round(mrp / 10) * 10)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Nearest 10
                </button>
                <button
                  type="button"
                  onClick={() => setMrp(Math.round(mrp / 50) * 50)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Nearest 50
                </button>
              </div>
            </div>
          </div>

          {/* Live Retail Margin Breakdown Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>Doctor / Retailer Margin Analysis</span>
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-extrabold">
                {newMargin.marginPercent}% Margin
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="rounded-lg bg-white p-2 border border-emerald-100">
                <div className="text-[10px] text-slate-400 font-medium">Selling Rate</div>
                <div className="font-bold text-indigo-700 text-sm">{formatINR(rate)}</div>
              </div>
              <div className="rounded-lg bg-white p-2 border border-emerald-100">
                <div className="text-[10px] text-slate-400 font-medium">Retailer Profit</div>
                <div className="font-bold text-emerald-700 text-sm">
                  {formatINR(newMargin.marginAmount)}
                </div>
              </div>
              <div className="rounded-lg bg-white p-2 border border-emerald-100">
                <div className="text-[10px] text-slate-400 font-medium">Package MRP</div>
                <div className="font-bold text-slate-800 text-sm">{formatINR(mrp)}</div>
              </div>
            </div>

            {isRateHigherThanMrp && (
              <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-100/70 p-2 rounded-lg border border-amber-300 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Notice: Selling rate is currently set higher than MRP.</span>
              </div>
            )}
          </div>

          {/* Price Change Reason Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Audit Reason for Price Update</span>
              <span className="text-[11px] text-slate-400 font-normal">Logged in price audit history</span>
            </label>

            {/* Quick Reason Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    reason === preset
                      ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rate revision for 2026"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200/60 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              Saving will automatically update this product and recalculate all pending orders.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving Price...' : hasChanges ? 'Save New Price' : 'No Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
