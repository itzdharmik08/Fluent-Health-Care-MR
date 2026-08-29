import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMedicines } from '../hooks/useMedicines';
import { useDoctors } from '../hooks/useDoctors';
import { MedicineCard } from '../components/medicines/MedicineCard';
import { MedicineFormModal } from '../components/medicines/MedicineFormModal';
import { RateHistoryModal } from '../components/medicines/RateHistoryModal';
import { DoctorRateModal } from '../components/medicines/DoctorRateModal';
import { Medicine } from '../types/medicine';
import { Plus, Search, Upload, Pill } from 'lucide-react';

export const Medicines: React.FC = () => {
  const {
    medicines,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    saveMedicine,
    deleteMedicine,
    refetch,
  } = useMedicines();

  const { doctors } = useDoctors();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  // Modals state
  const [historyMedicine, setHistoryMedicine] = useState<Medicine | null>(null);
  const [doctorRateMedicine, setDoctorRateMedicine] = useState<Medicine | null>(null);

  const categories = [
    'All',
    'TAB/CAP',
    'OINTMENT',
    'SOAP/ LOTION',
    'FACE WASH',
    'INJECTION',
    'HAIRFLU KIT',
    'SERUM',
    'GENERAL RANGE',
  ];

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>, reason?: string) => {
    await saveMedicine(
      {
        ...editingMedicine,
        ...data,
      },
      reason
    );
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Medicines & Products Catalog</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage pharmaceutical formulas, packaging sizes, MRP, transaction rates, and GST tax brackets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
          <Link
            to="/import"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Upload className="h-4 w-4 text-slate-400" />
            <span>Import Data File</span>
          </Link>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'HAIRFLU KIT' ? 'HAIRFLU KIT 🌟' : cat}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by medicine name, brand, composition..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none shadow-2xs"
        />
      </div>

      {/* Medicines Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Pill className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">No Medicines Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No medicine matching "${searchQuery}".`
              : 'Get started by adding your first medicine formula or importing from PDF/JSON file.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              onEdit={handleOpenEdit}
              onDelete={deleteMedicine}
              onViewHistory={(m) => setHistoryMedicine(m)}
              onSetDoctorRate={(m) => setDoctorRateMedicine(m)}
            />
          ))}
        </div>
      )}

      {/* Medicine Form Modal */}
      {isFormOpen && (
        <MedicineFormModal
          isOpen={isFormOpen}
          medicine={editingMedicine}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Price Change Audit History Modal */}
      {historyMedicine && (
        <RateHistoryModal
          isOpen={!!historyMedicine}
          medicine={historyMedicine}
          onClose={() => setHistoryMedicine(null)}
        />
      )}

      {/* Doctor Special Rate Modal */}
      {doctorRateMedicine && (
        <DoctorRateModal
          isOpen={!!doctorRateMedicine}
          medicine={doctorRateMedicine}
          doctors={doctors}
          onClose={() => setDoctorRateMedicine(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
};
