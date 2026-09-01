import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDoctors } from '../hooks/useDoctors';
import { useMedicines } from '../hooks/useMedicines';
import { useOrders } from '../hooks/useOrders';
import { OrderItem, PaymentStatus, PaymentMode } from '../types/order';
import { CalculationsEngine } from '../lib/calculations';
import { formatINR } from '../lib/formatters';
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle, AlertCircle, Filter, Pill, Search } from 'lucide-react';

export const NewOrder: React.FC = () => {
  const { doctors, getDoctorRates } = useDoctors();
  const { medicines } = useMedicines();
  const { createOrder } = useOrders();
  const navigate = useNavigate();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorCustomRates, setDoctorCustomRates] = useState<Record<string, { rate: number; discount_percent: number }>>({});

  // Step 2 Selection & Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Step 3 Checkout State
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const categoryPresets = [
    'All',
    'TAB/CAP',
    'FACE WASH',
    'OINTMENT',
    'SOAP/ LOTION',
    'HAIRFLU KIT',
    'INJECTION',
    'SERUM',
    'GENERAL RANGE',
  ];

  // Extract dynamic custom categories from loaded medicines
  const extraCategories = Array.from(
    new Set(
      medicines
        .map((m) => m.category?.trim())
        .filter((cat): cat is string => Boolean(cat))
    )
  ).filter(
    (cat) =>
      !categoryPresets.some(
        (preset) => preset.toUpperCase() === cat.toUpperCase()
      )
  );

  const allCategoryOptions = [...categoryPresets, ...extraCategories];

  const handleCategoryChange = (newCategory: string) => {
    setSelectedCategory(newCategory);
    setSelectedMedicineId('');
  };

  const filteredMedicines = medicines.filter((m) => {
    // 1. Category Filter
    if (selectedCategory !== 'All') {
      const cat = (m.category || '').toUpperCase();
      const name = (m.medicine_name || '').toUpperCase();
      const target = selectedCategory.toUpperCase();

      if (target.startsWith('HAIRFLU')) {
        const isMatch =
          cat.includes('HAIRFLU') ||
          name.includes('HAIRFLU') ||
          (m.composition && m.composition.toUpperCase().includes('HAIR'));
        if (!isMatch) return false;
      } else if (target === 'FACE WASH') {
        if (!cat.includes('FACE WASH') && !name.includes('FACE WASH') && !name.includes('FACEWASH')) return false;
      } else if (target === 'SOAP/ LOTION' || target === 'SOAP' || target === 'LOTION') {
        if (!cat.includes('SOAP') && !cat.includes('LOTION') && !name.includes('SOAP') && !name.includes('LOTION') && !name.includes('SAMPOO') && !name.includes('SHAMPOO')) return false;
      } else if (target === 'OINTMENT') {
        if (!cat.includes('OINTMENT') && !name.includes('CREAM') && !name.includes('OINTMENT') && !name.includes('GEL')) return false;
      } else if (target === 'TAB/CAP' || target === 'TAB' || target === 'CAP') {
        if (!cat.includes('TAB') && !cat.includes('CAP') && !name.includes('TAB') && !name.includes('CAP') && !name.includes('TABLET') && !name.includes('CAPSULE')) return false;
      } else if (target === 'INJECTION') {
        if (!cat.includes('INJ') && !name.includes('INJ') && !name.includes('VIL')) return false;
      } else if (target === 'SERUM') {
        if (!cat.includes('SERUM') && !name.includes('SERUM')) return false;
      } else if (target === 'GENERAL RANGE') {
        if (cat.includes('TAB') || cat.includes('CREAM') || cat.includes('SOAP') || cat.includes('INJ') || cat.includes('SERUM') || cat.includes('FACE') || cat.includes('HAIRFLU')) return false;
      } else if (cat !== target) {
        return false;
      }
    }

    // 2. Text Search Filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchName = m.medicine_name && m.medicine_name.toLowerCase().includes(q);
      const matchBrand = m.brand_name && m.brand_name.toLowerCase().includes(q);
      const matchComp = m.composition && m.composition.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchComp) return false;
    }

    return true;
  });

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // When doctor is selected, fetch doctor-specific special rates
  useEffect(() => {
    if (!selectedDoctorId) {
      setDoctorCustomRates({});
      return;
    }

    getDoctorRates(selectedDoctorId).then((rates) => {
      const rateMap: Record<string, { rate: number; discount_percent: number }> = {};
      rates.forEach((r) => {
        rateMap[r.medicine_id] = {
          rate: r.rate,
          discount_percent: r.discount_percent || 0,
        };
      });
      setDoctorCustomRates(rateMap);

      // Recalculate existing line items if special rates exist
      setOrderItems((prev) =>
        prev.map((item) => {
          const custom = rateMap[item.medicine_id];
          if (custom) {
            return {
              ...item,
              rate: custom.rate,
              discount_percent: custom.discount_percent || item.discount_percent,
            };
          }
          return item;
        })
      );
    });
  }, [selectedDoctorId, getDoctorRates]);

  // Add selected medicine to order
  const handleAddMedicine = () => {
    if (!selectedMedicineId) return;

    const med = medicines.find((m) => m.id === selectedMedicineId);
    if (!med) return;

    const existingIdx = orderItems.findIndex((i) => i.medicine_id === selectedMedicineId);

    if (existingIdx !== -1) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += 1;
      setOrderItems(updated);
    } else {
      const custom = doctorCustomRates[med.id];
      const rate = custom ? custom.rate : med.current_rate;
      const discount = custom ? custom.discount_percent || 0 : 0;

      const newItem: OrderItem = {
        medicine_id: med.id,
        medicine_name_snapshot: med.medicine_name,
        medicine_name: med.medicine_name,
        packing: med.packing || '10 TAB',
        quantity: 1,
        rate: rate,
        discount_percent: discount,
        gst_percent: med.gst_percent || 12,
      };

      setOrderItems((prev) => [...prev, newItem]);
    }

    setSelectedMedicineId('');
  };

  const handleUpdateQty = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: validQty } : item))
    );
  };

  const handleUpdateField = (index: number, field: 'rate' | 'discount_percent', val: number) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: Math.max(0, val) } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totals = CalculationsEngine.calculateOrderTotals(orderItems);

  const handleSubmitOrder = async () => {
    setErrorMsg(null);

    if (!selectedDoctorId) {
      setErrorMsg('Please select a doctor for this order.');
      return;
    }
    if (orderItems.length === 0) {
      setErrorMsg('Order must contain at least one medicine item.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrder(selectedDoctorId, orderItems, paymentStatus, paymentMode, notes);
      navigate('/orders');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit order';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <Link
          to="/orders"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">New Order Entry</h1>
          <p className="text-xs text-slate-500">Build transaction invoice receipts in 3 quick steps.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-700 font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Select Doctor Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">1. Select Doctor</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              selectedDoctor ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {selectedDoctor ? 'Doctor Selected ✅' : 'Step 1'}
          </span>
        </div>

        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">-- Choose Doctor --</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.doctor_name} ({d.clinic_name || d.specialization || 'Clinic'}) - {d.area || 'Surat'}
            </option>
          ))}
        </select>

        {selectedDoctor && (
          <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 border border-indigo-100">
            <div>
              <strong>{selectedDoctor.doctor_name}</strong> • {selectedDoctor.clinic_name || ''}
              <div className="text-[11px] text-slate-500">GST: {selectedDoctor.gst_number || 'N/A'}</div>
            </div>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Special Rates Loaded
            </span>
          </div>
        )}
      </div>

      {/* Step 2: Add Medicines to Order Card */}
      <div
        className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 transition-all ${
          !selectedDoctorId ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>2. Add Medicines to Order</span>
            </h3>
            <p className="text-xs text-slate-500">First select category filter, then pick medicine line item</p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} in order
          </span>
        </div>

        {/* Category & Medicine Selection Bar */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Select Category Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-indigo-600" />
                  <span>1. Category Filter</span>
                </span>
                <span className="text-[11px] font-semibold text-indigo-700">
                  {filteredMedicines.length} available
                </span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white font-semibold text-slate-800 shadow-xs"
              >
                <option value="All">-- All Categories --</option>
                {allCategoryOptions
                  .filter((c) => c !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'HAIRFLU KIT' ? 'HAIRFLU KIT 🌟' : cat}
                    </option>
                  ))}
              </select>
            </div>

            {/* Quick Text Search */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-indigo-600" />
                <span>Search Medicine Name</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type to filter..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Select Medicine Dropdown & Add Button */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5 text-indigo-600" />
              <span>2. Select Medicine ({selectedCategory === 'All' ? 'All Range' : selectedCategory}):</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={selectedMedicineId}
                onChange={(e) => setSelectedMedicineId(e.target.value)}
                className="flex-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white font-medium text-slate-800 shadow-xs"
              >
                <option value="">
                  {filteredMedicines.length === 0
                    ? `-- No medicines found in ${selectedCategory} --`
                    : `-- Choose Medicine (${filteredMedicines.length} items) --`}
                </option>
                {filteredMedicines.map((m) => {
                  const custom = doctorCustomRates[m.id];
                  const badge = custom
                    ? ` (Doctor Special Rate: ₹${custom.rate})`
                    : ` (Rate: ₹${m.current_rate})`;
                  const pack = m.packing ? ` [${m.packing}]` : '';
                  return (
                    <option key={m.id} value={m.id}>
                      {m.medicine_name}{pack}{badge}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleAddMedicine}
                type="button"
                disabled={!selectedMedicineId}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-3 py-2.5">Medicine</th>
                <th className="px-3 py-2.5 text-center">Quantity</th>
                <th className="px-3 py-2.5">Rate (₹)</th>
                <th className="px-3 py-2.5">Disc %</th>
                <th className="px-3 py-2.5">GST %</th>
                <th className="px-3 py-2.5 text-right">Line Total</th>
                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    No medicines added to this order yet. Select a medicine above to start building the order.
                  </td>
                </tr>
              ) : (
                orderItems.map((item, idx) => {
                  const calc = CalculationsEngine.calculateLineItem(item);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-bold text-slate-900">{item.medicine_name}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            className="h-6 w-6 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value) || 1)}
                            className="w-12 rounded-md border border-slate-200 text-center py-0.5 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            className="h-6 w-6 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleUpdateField(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          step="0.1"
                          value={item.discount_percent}
                          onChange={(e) => handleUpdateField(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="w-14 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{item.gst_percent}%</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{formatINR(calc.total_amount)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 3: Tax Calculation & Checkout Card */}
      <div
        className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 transition-all ${
          orderItems.length === 0 ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          <span>3. Tax Calculation & Invoice Summary</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="pending">Pending ⏳</option>
                  <option value="paid">Paid ✅</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Notes / Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add invoice instructions, dispatch notes..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-semibold">{formatINR(totals.gross_subtotal)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discounts:</span>
                <span className="font-semibold">-{formatINR(totals.discount_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Total:</span>
                <span className="font-semibold">{formatINR(totals.taxable_amount)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>GST Tax Total:</span>
                <span className="font-semibold">+{formatINR(totals.gst_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-indigo-700">
                <span>Total Payable:</span>
                <span>{formatINR(totals.total_amount)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-5 w-5" />
              <span>{isSubmitting ? 'Generating Invoice...' : 'Generate Order Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
