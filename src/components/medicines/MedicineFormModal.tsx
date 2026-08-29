import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicineSchema, MedicineFormValues } from '../../lib/validation';
import { Medicine } from '../../types/medicine';
import { X, Save } from 'lucide-react';

interface MedicineFormModalProps {
  isOpen: boolean;
  medicine?: Medicine | null;
  onClose: () => void;
  onSubmit: (data: MedicineFormValues, reason?: string) => Promise<void>;
}

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({
  isOpen,
  medicine,
  onClose,
  onSubmit,
}) => {
  const [priceChangeReason, setPriceChangeReason] = React.useState('Rate adjustment');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      medicine_name: medicine?.medicine_name || '',
      brand_name: medicine?.brand_name || '',
      generic_name: medicine?.generic_name || '',
      composition: medicine?.composition || '',
      company_name: medicine?.company_name || 'Fluent Health Care',
      packing: medicine?.packing || '10 TAB',
      mrp: medicine?.mrp || 100,
      base_price: medicine?.base_price || 80,
      current_rate: medicine?.current_rate || 80,
      gst_percent: medicine?.gst_percent || 12,
    },
  });

  const watchRate = watch('current_rate');
  const rateChanged = medicine && Number(medicine.current_rate) !== Number(watchRate);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: MedicineFormValues) => {
    await onSubmit(data, priceChangeReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900 text-lg">
            {medicine ? 'Edit Medicine Record' : 'Add New Medicine'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine / Product Name *</label>
            <input
              type="text"
              {...register('medicine_name')}
              placeholder="e.g. ITROENT 100 CAP"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {errors.medicine_name && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.medicine_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
              <input
                type="text"
                {...register('brand_name')}
                placeholder="e.g. ITROENT"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                {...register('company_name')}
                placeholder="Fluent Health Care"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Composition & Generic Formula</label>
            <textarea
              {...register('composition')}
              rows={2}
              placeholder="e.g. ITRACONAZOLE 100 MG"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Packing</label>
              <input
                type="text"
                {...register('packing')}
                placeholder="10 CAP"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹) *</label>
              <input
                type="number"
                step="0.01"
                {...register('mrp')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Rate (₹) *</label>
              <input
                type="number"
                step="0.01"
                {...register('current_rate')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none font-bold text-indigo-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST % *</label>
              <input
                type="number"
                step="1"
                {...register('gst_percent')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {rateChanged && (
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs">
              <label className="block font-semibold text-amber-800 mb-1">Price Change Audit Reason</label>
              <input
                type="text"
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                placeholder="e.g. Manufacturer rate hike"
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
              />
              <span className="text-[10px] text-amber-600 mt-1 block">
                This price change will be recorded in medicine price history audit log.
              </span>
            </div>
          )}

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
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Medicine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
