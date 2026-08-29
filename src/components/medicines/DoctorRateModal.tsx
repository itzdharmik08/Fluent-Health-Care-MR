import React, { useState } from 'react';
import { Medicine } from '../../types/medicine';
import { Doctor } from '../../types/doctor';
import { doctorService } from '../../services/doctorService';
import { X, Tag, Check } from 'lucide-react';
import { formatINR } from '../../lib/formatters';

interface DoctorRateModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  doctors: Doctor[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DoctorRateModal: React.FC<DoctorRateModalProps> = ({
  isOpen,
  medicine,
  doctors,
  onClose,
  onSuccess,
}) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [customRate, setCustomRate] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (medicine) {
      setCustomRate(medicine.current_rate);
    }
  }, [medicine]);

  if (!isOpen || !medicine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      alert('Please select a doctor');
      return;
    }

    setIsSubmitting(true);
    try {
      await doctorService.saveDoctorRate({
        doctor_id: selectedDoctorId,
        medicine_id: medicine.id,
        rate: Number(customRate),
        discount_percent: Number(discountPercent),
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save doctor custom rate:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-base">Doctor Special Rate</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 border border-indigo-100">
            <div className="font-bold">{medicine.medicine_name}</div>
            <div>Standard Current Rate: <span className="font-bold">{formatINR(medicine.current_rate)}</span></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor *</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.doctor_name} ({d.clinic_name || 'Clinic'}) - {d.area || 'Surat'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Special Rate (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={customRate}
                onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-bold text-indigo-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Special Discount %</label>
              <input
                type="number"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Set Special Rate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
