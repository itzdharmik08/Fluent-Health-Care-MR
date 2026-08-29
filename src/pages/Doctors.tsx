import React, { useState } from 'react';
import { useDoctors } from '../hooks/useDoctors';
import { DoctorCard } from '../components/doctors/DoctorCard';
import { DoctorFormModal } from '../components/doctors/DoctorFormModal';
import { Doctor, DoctorMedicineRate } from '../types/doctor';
import { Plus, Search, UserCheck, Tag, X } from 'lucide-react';
import { formatINR } from '../lib/formatters';

export const Doctors: React.FC = () => {
  const {
    doctors,
    isLoading,
    searchQuery,
    setSearchQuery,
    saveDoctor,
    deleteDoctor,
    getDoctorRates,
  } = useDoctors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Rate Matrix Modal state
  const [ratesDoctor, setRatesDoctor] = useState<Doctor | null>(null);
  const [ratesList, setRatesList] = useState<DoctorMedicineRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    await saveDoctor({
      ...editingDoctor,
      ...data,
    });
    setIsFormOpen(false);
  };

  const handleManageRates = async (doctor: Doctor) => {
    setRatesDoctor(doctor);
    setIsLoadingRates(true);
    try {
      const data = await getDoctorRates(doctor.id);
      setRatesList(data);
    } catch (err) {
      console.error('Failed to load doctor rates:', err);
    } finally {
      setIsLoadingRates(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Doctors & Clinics Directory</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage prescribers, clinic locations, GST numbers, and negotiated special rates.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Doctor</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by doctor name, clinic, area, phone..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <UserCheck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">No Doctors Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery ? `No doctor matching "${searchQuery}".` : 'Get started by adding your first prescribing doctor or clinic.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Doctor Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onEdit={handleOpenEdit}
              onDelete={deleteDoctor}
              onManageRates={handleManageRates}
            />
          ))}
        </div>
      )}

      {/* Doctor Form Modal */}
      {isFormOpen && (
        <DoctorFormModal
          isOpen={isFormOpen}
          doctor={editingDoctor}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Doctor Rates Matrix Modal */}
      {ratesDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-indigo-600" />
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{ratesDoctor.doctor_name}</h2>
                  <p className="text-xs text-slate-400">Doctor-Specific Special Rates Matrix</p>
                </div>
              </div>
              <button
                onClick={() => setRatesDoctor(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingRates ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading special rates...</div>
              ) : ratesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No special negotiated rates configured for {ratesDoctor.doctor_name}. Standard catalog rates apply.
                </div>
              ) : (
                <div className="space-y-2">
                  {ratesList.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{r.medicine?.medicine_name || 'Medicine'}</div>
                        <div className="text-[11px] text-slate-400">
                          Standard: {formatINR(r.medicine?.current_rate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-600 text-sm">{formatINR(r.rate)}</div>
                        {r.discount_percent > 0 && (
                          <span className="text-[10px] font-semibold text-rose-600">
                            {r.discount_percent}% Disc
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
