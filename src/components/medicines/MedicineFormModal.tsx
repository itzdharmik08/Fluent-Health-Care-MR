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
      category: medicine?.category || 'GENERAL RANGE',
      sub_category: medicine?.sub_category || medicine?.description || 'TAB/CAP',
      description: medicine?.description || '',
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
  const watchCategory = watch('category');
  const watchSubCategory = watch('sub_category');
  const rateChanged = medicine && Number(medicine.current_rate) !== Number(watchRate);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: MedicineFormValues) => {
    const isSevior = (data.category || '').toUpperCase().includes('SEVIOR');
    const finalData = {
      ...data,
      description: isSevior ? (data.sub_category || 'TAB/CAP') : (data.description || ''),
    };
    await onSubmit(finalData, priceChangeReason);
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
              <input
                type="text"
                {...register('brand_name')}
                placeholder="e.g. ITROENT"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                {...register('category')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
              >
                <option value="TAB/CAP">TAB/CAP</option>
                <option value="OINTMENT">OINTMENT</option>
                <option value="SOAP/ LOTION">SOAP/ LOTION</option>
                <option value="FACE WASH">FACE WASH</option>
                <option value="INJECTION">INJECTION</option>
                <option value="HAIRFLU KIT (HAIR HEALTH & GROWTH FORMULA...)">HAIRFLU KIT</option>
                <option value="SERUM">SERUM</option>
                <option value="GENERAL RANGE">GENERAL RANGE</option>
                <option value="FLUENT SEVIOR">FLUENT SEVIOR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
              <input
                type="text"
                {...register('company_name')}
                placeholder="Fluent Health Care"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conditional Sevior Sub-Category Options: TAB/CAP, SYP/POWDER, OIL/GEL, INJECTION */}
          {(watchCategory || '').toUpperCase().includes('SEVIOR') && (
            <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-4 space-y-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span className="text-base">📁</span>
                  <span>FLUENT SEVIOR Sub-Category *</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900">
                  Required
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium">
                Select the exact product form to organize this medicine cleanly under its sub-filter:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { value: 'TAB/CAP', label: 'TAB/CAP', icon: '💊' },
                  { value: 'SYP/POWDER', label: 'SYP/POWDER', icon: '🧪' },
                  { value: 'OIL/GEL', label: 'OIL/GEL', icon: '💧' },
                  { value: 'INJECTION', label: 'INJECTION', icon: '💉' },
                ].map((sub) => {
                  const isChecked = (watchSubCategory || 'TAB/CAP') === sub.value;
                  return (
                    <label
                      key={sub.value}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]'
                          : 'bg-white text-emerald-950 border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={sub.value}
                        {...register('sub_category')}
                        className="sr-only"
                      />
                      <span className="text-sm shrink-0">{sub.icon}</span>
                      <span className="truncate">{sub.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
