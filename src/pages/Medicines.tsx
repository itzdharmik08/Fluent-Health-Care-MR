import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMedicines, SortOption, PriceFilter } from '../hooks/useMedicines';
import { useDoctors } from '../hooks/useDoctors';
import { MedicineCard } from '../components/medicines/MedicineCard';
import { MedicineTableView } from '../components/medicines/MedicineTableView';
import { MedicineFormModal } from '../components/medicines/MedicineFormModal';
import { QuickPriceModal } from '../components/medicines/QuickPriceModal';
import { RateHistoryModal } from '../components/medicines/RateHistoryModal';
import { DoctorRateModal } from '../components/medicines/DoctorRateModal';
import { Medicine } from '../types/medicine';
import { formatINR } from '../lib/formatters';
import {
  Plus,
  Search,
  Upload,
  Pill,
  LayoutGrid,
  List,
  IndianRupee,
  TrendingUp,
  Percent,
  X,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  PackageOpen,
} from 'lucide-react';

export const Medicines: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    medicines,
    allMedicines,
    isLoading,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    sortOption,
    setSortOption,
    priceFilter,
    setPriceFilter,
    categoryCounts,
    globalSearchMatchesCount,
    stats,
    saveMedicine,
    deleteMedicine,
    refetch,
  } = useMedicines();

  const { doctors } = useDoctors();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [quickPriceMedicine, setQuickPriceMedicine] = useState<Medicine | null>(null);
  const [historyMedicine, setHistoryMedicine] = useState<Medicine | null>(null);
  const [doctorRateMedicine, setDoctorRateMedicine] = useState<Medicine | null>(null);

  // View mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Success toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Read URL query params (?id=... or ?q=...)
  const urlId = searchParams.get('id');
  const urlQuery = searchParams.get('q');

  useEffect(() => {
    if (urlQuery && !searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery, searchQuery, setSearchQuery]);

  // Keyboard shortcut listener to focus search on '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    showToast(`Medicine "${(data.medicine_name as string) || 'Product'}" saved successfully!`);
  };

  const handleSaveQuickPrice = async (
    medicine: Medicine,
    newRate: number,
    newMrp: number,
    reason: string
  ) => {
    await saveMedicine(
      {
        ...medicine,
        current_rate: newRate,
        mrp: newMrp,
      },
      reason
    );
    showToast(`Price updated for "${medicine.medicine_name}" to ${formatINR(newRate)} (MRP: ${formatINR(newMrp)})!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchParams.has('q')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('q');
      setSearchParams(nextParams);
    }
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 rounded-md p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl flex items-center gap-2">
            <span>Medicines & Products Catalog</span>
            <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold">
              {allMedicines.length} Products
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View formulations, compare retail margins, and edit medicine rates with 1-click.
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
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <Upload className="h-4 w-4 text-slate-400" />
            <span>Import Catalog</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Analytics Cards for Easy Data Comprehension */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Products</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Pill className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Across 8 therapeutic categories
          </div>
        </div>

        {/* Average Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Selling Rate</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-blue-600">
            {formatINR(stats.avgRate)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Avg MRP: {formatINR(stats.avgMrp)}
          </div>
        </div>

        {/* Average Retailer Margin */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Retail Margin</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">
            {stats.avgMarginPercent}%
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Profit margin for doctors & retailers
          </div>
        </div>

        {/* Price Range */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Rate Range</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-black text-slate-900 truncate">
            {formatINR(stats.minRate)} - {formatINR(stats.maxRate)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
            Min to max selling prices
          </div>
        </div>
      </div>

      {/* Main Search, Filter & Controls Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Smart Search Input with Clear Button & Shortcut Hint */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-indigo-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, generic formula, composition, packing... (Press / to search)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-2.5 rounded-md p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                title="Clear Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Price Filter, Sort & View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
                <option value="rate_asc">Price: Low to High</option>
                <option value="rate_desc">Price: High to Low</option>
                <option value="margin_desc">Margin %: Highest First</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>

            {/* View Switcher: Grid vs Table */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Slider with Dynamic Live Item Counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          {categories.map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const isActive = activeCategory === cat;
            const label = cat === 'HAIRFLU KIT' ? 'HAIRFLU KIT 🌟' : cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive
                      ? 'bg-indigo-500/80 text-white'
                      : count > 0
                      ? 'bg-white text-slate-500 border border-slate-200'
                      : 'bg-slate-200/60 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Price Bracket Quick Filters */}
        <div className="flex items-center gap-2 pt-1 text-xs flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Price:</span>
          </span>
          {(
            [
              { id: 'all', label: 'All Prices' },
              { id: 'under100', label: 'Under ₹100' },
              { id: '100to300', label: '₹100 - ₹300' },
              { id: 'above300', label: 'Above ₹300' },
            ] as const
          ).map((bracket) => (
            <button
              key={bracket.id}
              onClick={() => setPriceFilter(bracket.id as PriceFilter)}
              className={`rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                priceFilter === bracket.id
                  ? 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              {bracket.label}
            </button>
          ))}

          {/* Results Counter */}
          <span className="ml-auto text-[11px] font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{medicines.length}</strong> of{' '}
            {allMedicines.length} items
          </span>
        </div>
      </div>

      {/* Cross-Category Search Match Helper Banner */}
      {searchQuery.trim() && medicines.length === 0 && globalSearchMatchesCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                No matching medicines found in category "{activeCategory}".
              </p>
              <p className="text-[11px] text-amber-700">
                However, <strong>{globalSearchMatchesCount} matching items</strong> exist across All Categories!
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveCategory('All')}
            className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-2xs self-start sm:self-auto"
          >
            Switch to All Categories ({globalSearchMatchesCount})
          </button>
        </div>
      )}

      {/* Medicines Display (Grid vs Table) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-52 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <PackageOpen className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No Medicines Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `No medicines matching "${searchQuery}" in ${activeCategory === 'All' ? 'the catalog' : activeCategory}. Try checking your spelling or clearing filters.`
              : `There are currently no medicines in the ${activeCategory} category.`}
          </p>

          <div className="flex items-center justify-center gap-2 pt-2">
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                <span>Clear Search</span>
              </button>
            )}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Medicine</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              isHighlighted={urlId === medicine.id}
              onEdit={handleOpenEdit}
              onDelete={deleteMedicine}
              onViewHistory={(m) => setHistoryMedicine(m)}
              onSetDoctorRate={(m) => setDoctorRateMedicine(m)}
              onQuickPriceEdit={(m) => setQuickPriceMedicine(m)}
            />
          ))}
        </div>
      ) : (
        /* Table / List View */
        <MedicineTableView
          medicines={medicines}
          highlightedId={urlId}
          onEdit={handleOpenEdit}
          onDelete={deleteMedicine}
          onViewHistory={(m) => setHistoryMedicine(m)}
          onSetDoctorRate={(m) => setDoctorRateMedicine(m)}
          onQuickPriceEdit={(m) => setQuickPriceMedicine(m)}
        />
      )}

      {/* 1-Step Quick Price Edit Modal */}
      {quickPriceMedicine && (
        <QuickPriceModal
          isOpen={!!quickPriceMedicine}
          medicine={quickPriceMedicine}
          onClose={() => setQuickPriceMedicine(null)}
          onSave={handleSaveQuickPrice}
        />
      )}

      {/* Full Medicine Edit/Add Modal */}
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
