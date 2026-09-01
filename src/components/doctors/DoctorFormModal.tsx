import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorSchema, DoctorFormValues } from '../../lib/validation';
import { Doctor } from '../../types/doctor';
import { X, Save } from 'lucide-react';

interface DoctorFormModalProps {
  isOpen: boolean;
  doctor?: Doctor | null;
  onClose: () => void;
  onSubmit: (data: DoctorFormValues) => Promise<void>;
}

export const DoctorFormModal: React.FC<DoctorFormModalProps> = ({
  isOpen,
  doctor,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      doctor_name: doctor?.doctor_name || '',
      clinic_name: doctor?.clinic_name || '',
      specialization: doctor?.specialization || '',
      phone: doctor?.phone || '',
      email: doctor?.email || '',
      address: doctor?.address || '',
      area: doctor?.area || 'Surat',
      gst_number: doctor?.gst_number || '',
      notes: doctor?.notes || '',
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900 text-lg">
            {doctor ? 'Edit Doctor Record' : 'Add New Doctor'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Doctor Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Name *</label>
            <input
              type="text"
              {...register('doctor_name')}
              placeholder="e.g. Dr. Bhautik Patel"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {errors.doctor_name && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.doctor_name.message}</p>
            )}
          </div>

          {/* Clinic Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Name</label>
            <input
              type="text"
              {...register('clinic_name')}
              placeholder="e.g. Fluent Skin Care Clinic"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Phone Number & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                {...register('phone')}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                {...register('area')}
                placeholder="e.g. Surat"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Clinic Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Address</label>
            <textarea
              {...register('address')}
              rows={3}
              placeholder="Full clinic street address..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
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
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Doctor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
