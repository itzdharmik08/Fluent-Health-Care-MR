import React from 'react';
import { Doctor } from '../../types/doctor';
import { Building2, Phone, PhoneCall, MapPin, Edit, Trash2, Tag } from 'lucide-react';

interface DoctorCardProps {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
  onManageRates: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onEdit,
  onDelete,
  onManageRates,
}) => {
  const cleanPhone = doctor.phone ? doctor.phone.replace(/[^0-9+]/g, '') : '';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{doctor.doctor_name}</h3>
            {doctor.specialization && (
              <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 mt-0.5">
                {doctor.specialization}
              </span>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              doctor.is_active !== false
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {doctor.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-600 mb-4">
          {doctor.clinic_name && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{doctor.clinic_name}</span>
            </div>
          )}
          {doctor.phone && (
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-2 group hover:text-indigo-600 transition-colors"
              title="Click to dial phone"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              <span className="group-hover:underline font-medium">{doctor.phone}</span>
            </a>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.area || doctor.address || 'Surat'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onManageRates(doctor)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Special Rates</span>
          </button>

          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs"
              title={`Direct Call to Dr. ${doctor.doctor_name} (${doctor.phone})`}
            >
              <PhoneCall className="h-3.5 w-3.5 text-emerald-600" />
              <span>Call</span>
            </a>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(doctor)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Edit Doctor"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(doctor.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Delete Doctor"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
