import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useDoctors } from '../hooks/useDoctors';
import { useMedicines } from '../hooks/useMedicines';
import { useOrders } from '../hooks/useOrders';
import { orderService } from '../services/orderService';
import { OrderItem, PaymentStatus, PaymentMode, SpecialDiscountConfig } from '../types/order';
import { CalculationsEngine } from '../lib/calculations';
import { formatINR } from '../lib/formatters';
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle, AlertCircle, Filter, Pill, Search, Tag, Sparkles, Percent, Check, X, Save, Edit3, Loader2 } from 'lucide-react';
import { matchesMedicineCategory, matchesMedicineQuery } from '../lib/medicineSearch';

export const NewOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const isEditMode = Boolean(orderId);
  const { doctors, getDoctorRates } = useDoctors();
  const { medicines } = useMedicines();
  const { createOrder, updateOrder } = useOrders();
  const navigate = useNavigate();

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [existingOrderNumber, setExistingOrderNumber] = useState<string>('');
  const [isLoadingOrder, setIsLoadingOrder] = useState<boolean>(false);
  const initialDoctorIdRef = useRef<string | null>(null);
  const hasLoadedExistingRef = useRef<boolean>(false);
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

  // Special One-Time Order Discount State
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountInputValue, setDiscountInputValue] = useState<string>('');
  const [appliedSpecialDiscount, setAppliedSpecialDiscount] = useState<SpecialDiscountConfig | null>(null);
  const [discountSuccessNotice, setDiscountSuccessNotice] = useState<string | null>(null);

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

  // Global search matches across all categories to prevent getting stuck
  const globalOrderSearchMatches = searchFilter.trim()
    ? medicines.filter((m) => matchesMedicineQuery(m, searchFilter))
    : medicines;

  const filteredMedicines = medicines.filter((m) => {
    // 1. Category Filter
    if (!matchesMedicineCategory(m, selectedCategory)) {
      return false;
    }

    // 2. Multi-Keyword Tokenized Search Filter
    if (!matchesMedicineQuery(m, searchFilter)) {
      return false;
    }

    return true;
  });

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Load existing order details in Edit Mode
  useEffect(() => {
    if (!orderId) {
      setIsLoadingOrder(false);
      return;
    }

    let isMounted = true;
    setIsLoadingOrder(true);
    setErrorMsg(null);

    orderService
      .getOrderById(orderId)
      .then((existingOrder) => {
        if (!isMounted) return;
        if (!existingOrder) {
          setErrorMsg(`Order with reference ID "${orderId}" was not found.`);
          setIsLoadingOrder(false);
          return;
        }

        setExistingOrderNumber(existingOrder.order_number);
        if (existingOrder.doctor_id) {
          setSelectedDoctorId(existingOrder.doctor_id);
          initialDoctorIdRef.current = existingOrder.doctor_id;
        }
        if (existingOrder.payment_status) {
          setPaymentStatus(existingOrder.payment_status);
        }
        if (existingOrder.payment_mode) {
          setPaymentMode(existingOrder.payment_mode);
        }

        // Parse special discount from notes
        const rawNotes = existingOrder.notes || '';
        const match = rawNotes.match(/\[SPECIAL_DISCOUNT:amount=([0-9.]+);type=(percent|fixed);value=([0-9.]+);doctor=([^\]]*)\]/);
        if (match) {
          const type = match[2] as 'percent' | 'fixed';
          const val = parseFloat(match[3]) || 0;
          setDiscountType(type);
          setDiscountInputValue(String(val));
          setAppliedSpecialDiscount({
            type,
            value: val,
            doctor_name: decodeURIComponent(match[4] || existingOrder.doctor?.doctor_name || ''),
          });
          const cleaned = rawNotes
            .replace(/\[SPECIAL_DISCOUNT:[^\]]+\]\n?/, '')
            .replace(/🎯 Special One-Time Discount Applied:[^\n]+\n?/, '')
            .trim();
          setNotes(cleaned);
        } else {
          setNotes(rawNotes);
        }

        // Populate items
        if (existingOrder.order_items && existingOrder.order_items.length > 0) {
          const mappedItems: OrderItem[] = existingOrder.order_items.map((item) => ({
            medicine_id: item.medicine_id,
            medicine_name_snapshot: item.medicine_name_snapshot || item.medicine?.medicine_name || 'Medicine',
            medicine_name: item.medicine?.medicine_name || item.medicine_name_snapshot,
            packing: item.medicine?.packing || item.packing || '10 TAB',
            quantity: item.quantity,
            rate: item.rate,
            discount_percent: item.discount_percent || 0,
            gst_percent: item.gst_percent || 12,
          }));
          setOrderItems(mappedItems);
        }
        hasLoadedExistingRef.current = true;
      })
      .catch((err) => {
        console.error('Failed to load order for editing:', err);
        if (isMounted) setErrorMsg('Failed to load order details for editing.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrder(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

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

      // Recalculate existing line items if special rates exist, unless we just loaded an existing order with its saved rates
      if (!isEditMode || !hasLoadedExistingRef.current || selectedDoctorId !== initialDoctorIdRef.current) {
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
      }
    });
  }, [selectedDoctorId, getDoctorRates, isEditMode]);

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

  // Special discount handlers
  const handleApplySpecialDiscount = (typeToUse = discountType, valToUse = discountInputValue) => {
    const val = parseFloat(valToUse);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Please enter a valid special discount value greater than 0.');
      return;
    }

    if (typeToUse === 'percent' && val > 100) {
      setErrorMsg('Special discount percentage cannot exceed 100%.');
      return;
    }

    const config: SpecialDiscountConfig = {
      type: typeToUse,
      value: val,
      doctor_name: selectedDoctor?.doctor_name,
    };

    setAppliedSpecialDiscount(config);
    setErrorMsg(null);
    const label = typeToUse === 'percent' ? `${val}%` : formatINR(val);
    const docNotice = selectedDoctor ? ` for Dr. ${selectedDoctor.doctor_name}` : '';
    setDiscountSuccessNotice(`Special discount of ${label} calculated & applied successfully${docNotice}!`);
    setTimeout(() => setDiscountSuccessNotice(null), 3500);
  };

  const handleQuickPresetDiscount = (type: 'percent' | 'fixed', val: number) => {
    setDiscountType(type);
    setDiscountInputValue(String(val));
    handleApplySpecialDiscount(type, String(val));
  };

  const handleRemoveSpecialDiscount = () => {
    setAppliedSpecialDiscount(null);
    setDiscountInputValue('');
    setDiscountSuccessNotice(null);
  };

  const totals = CalculationsEngine.calculateOrderTotals(orderItems, appliedSpecialDiscount);

  const handleSubmitOrder = async () => {
    setErrorMsg(null);

    if (!selectedDoctorId) {
      setErrorMsg('Please select a doctor for this order.');
      return;
    }

    const validItems = orderItems.filter((item) => {
      const name = (item.medicine_name_snapshot || item.medicine_name || '').trim();
      const qty = Number(item.quantity);
      return Boolean(item.medicine_id) && name.length > 0 && !isNaN(qty) && qty > 0;
    });

    if (validItems.length === 0) {
      setErrorMsg('Order must contain at least one medicine item with valid quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && orderId) {
        await updateOrder(orderId, selectedDoctorId, validItems, paymentStatus, paymentMode, notes, appliedSpecialDiscount);
      } else {
        await createOrder(selectedDoctorId, validItems, paymentStatus, paymentMode, notes, appliedSpecialDiscount);
      }
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
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit3 className="h-5 w-5 text-indigo-600" />
                <span>Edit Order ({existingOrderNumber || '...'})</span>
              </>
            ) : (
              <span>New Order Entry</span>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? 'Modify doctor, line items, quantities, discounts, notes, and invoice details.'
              : 'Build transaction invoice receipts in 3 quick steps.'}
          </p>
        </div>
      </div>

      {isLoadingOrder && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-50 p-6 border border-indigo-100 text-xs text-indigo-700 font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading existing order data...</span>
        </div>
      )}

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
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Search Medicine Name</span>
                </span>
                {searchFilter && (
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    {filteredMedicines.length} found
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type formula, packing, brand..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none bg-white"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-2.5 rounded-md p-0.5 text-slate-400 hover:text-slate-600"
                    title="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cross-Category Search Match Helper */}
          {searchFilter.trim() && filteredMedicines.length === 0 && globalOrderSearchMatches.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 border border-amber-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  No matches in <strong>{selectedCategory}</strong>, but <strong>{globalOrderSearchMatches.length} items</strong> found in other categories!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700 shrink-0 transition-colors"
              >
                Switch to All
              </button>
            </div>
          )}

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

      {/* Special One-Time Order Discount Card */}
      <div
        className={`rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-5 shadow-xs space-y-4 transition-all ${
          orderItems.length === 0 || !selectedDoctorId ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>Special One-Time Order Discount</span>
                <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5">
                  One-Time Offer
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {selectedDoctor ? (
                  <span>
                    Apply special order-level discount for <strong>Dr. {selectedDoctor.doctor_name}</strong>
                    {selectedDoctor.clinic_name ? ` (${selectedDoctor.clinic_name})` : ''}
                  </span>
                ) : (
                  'Select a doctor above to unlock doctor-specific discount'
                )}
              </p>
            </div>
          </div>

          {appliedSpecialDiscount && (
            <button
              type="button"
              onClick={handleRemoveSpecialDiscount}
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Remove Discount</span>
            </button>
          )}
        </div>

        {discountSuccessNotice && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{discountSuccessNotice}</span>
          </div>
        )}

        {/* Discount Type Selector & Presets */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Unit Toggle: % vs ₹ */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit shrink-0">
              <button
                type="button"
                onClick={() => setDiscountType('percent')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  discountType === 'percent'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>Percentage (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  discountType === 'fixed'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Flat (₹)</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Presets:</span>
              {discountType === 'percent' ? (
                <>
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPresetDiscount('percent', pct)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                        appliedSpecialDiscount?.type === 'percent' && appliedSpecialDiscount.value === pct
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {[100, 200, 500, 1000].map((flat) => (
                    <button
                      key={flat}
                      type="button"
                      onClick={() => handleQuickPresetDiscount('fixed', flat)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                        appliedSpecialDiscount?.type === 'fixed' && appliedSpecialDiscount.value === flat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      ₹{flat}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Input & Specific "Apply Special Discount" Button */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <div className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">
                {discountType === 'percent' ? '%' : '₹'}
              </div>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : totals.taxable_amount}
                step={discountType === 'percent' ? '0.5' : '10'}
                value={discountInputValue}
                onChange={(e) => setDiscountInputValue(e.target.value)}
                placeholder={
                  discountType === 'percent'
                    ? 'Enter custom discount percentage (e.g. 12)'
                    : 'Enter custom discount rupee amount (e.g. 250)'
                }
                className="w-full rounded-xl border border-slate-200 pl-8 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none bg-white shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => handleApplySpecialDiscount()}
              disabled={!discountInputValue || parseFloat(discountInputValue) <= 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-indigo-700 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Calculate & Apply Discount</span>
            </button>
          </div>

          {/* Active Discount Callout */}
          {appliedSpecialDiscount && totals.special_discount_amount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-900 flex-wrap gap-2">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>
                    Special Discount Active: {appliedSpecialDiscount.type === 'percent' ? `${appliedSpecialDiscount.value}%` : formatINR(appliedSpecialDiscount.value)} Off
                  </span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Applied for <strong>Dr. {selectedDoctor?.doctor_name || 'Selected Doctor'}</strong> • You are saving {formatINR(totals.special_discount_amount)} on this order
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Special Discount</span>
                <div className="text-sm font-extrabold text-emerald-800">-{formatINR(totals.special_discount_amount)}</div>
              </div>
            </div>
          )}
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
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-bold transition-all focus:outline-none ${
                    paymentStatus === 'paid'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  <option value="pending">Unpaid / Pending ❌</option>
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
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-semibold">{formatINR(totals.gross_subtotal)}</span>
              </div>
              {totals.items_discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Line Item Discounts:</span>
                  <span className="font-semibold">-{formatINR(totals.items_discount_amount)}</span>
                </div>
              )}
              {totals.special_discount_amount > 0 && (
                <div className="flex justify-between items-center bg-emerald-100/70 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Special Doctor Discount ({selectedDoctor?.doctor_name ? `Dr. ${selectedDoctor.doctor_name}` : 'Special'}):</span>
                  </div>
                  <span className="font-extrabold text-emerald-900">-{formatINR(totals.special_discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-medium">
                <span>Taxable Amount (Total):</span>
                <span className="font-semibold">{formatINR(totals.taxable_amount)}</span>
              </div>

              {/* CGST & SGST Split Breakdown */}
              <div className="rounded-lg bg-amber-50/60 p-2.5 border border-amber-200/60 space-y-1.5">
                <div className="flex justify-between text-amber-900 font-semibold text-[11px]">
                  <span>CGST (Central Tax):</span>
                  <span>+{formatINR(totals.cgst_amount)}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-semibold text-[11px]">
                  <span>SGST (State Tax):</span>
                  <span>+{formatINR(totals.sgst_amount)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold border-t border-amber-200/60 pt-1 text-xs">
                  <span>Total GST (CGST + SGST):</span>
                  <span>+{formatINR(totals.gst_amount)}</span>
                </div>
              </div>

              {/* GST Slab Breakdown Table (Like PDF Invoice) */}
              {totals.tax_breakdown.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden text-[10px]">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-1">Tax Type</th>
                        <th className="px-2 py-1 text-right">Taxable</th>
                        <th className="px-2 py-1 text-right">CGST</th>
                        <th className="px-2 py-1 text-right">SGST</th>
                        <th className="px-2 py-1 text-right">Net Amt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {totals.tax_breakdown.map((slab) => (
                        <tr key={slab.gst_percent}>
                          <td className="px-2 py-1 font-semibold text-slate-800">{slab.tax_type}</td>
                          <td className="px-2 py-1 text-right text-slate-600">{formatINR(slab.taxable_amount)}</td>
                          <td className="px-2 py-1 text-right text-amber-700 font-medium">{formatINR(slab.cgst_amount)}</td>
                          <td className="px-2 py-1 text-right text-amber-700 font-medium">{formatINR(slab.sgst_amount)}</td>
                          <td className="px-2 py-1 text-right font-bold text-slate-900">{formatINR(slab.net_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Round Off (ROff) */}
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round Off (ROff):</span>
                <span className="font-semibold">
                  {totals.round_off >= 0 ? `+${formatINR(totals.round_off)}` : `-${formatINR(Math.abs(totals.round_off))}`}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center rounded-xl bg-indigo-50/80 p-3 border border-indigo-100 text-indigo-900">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Final Price Payable</span>
                    <div className="text-base font-extrabold text-indigo-950">{formatINR(totals.total_amount)}</div>
                    {totals.discount_amount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700">
                        Total Savings: {formatINR(totals.discount_amount)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {selectedDoctor && (
                      <div className="text-[11px] font-semibold text-indigo-800">
                        Dr. {selectedDoctor.doctor_name}
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500">CGST + SGST Included</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || isLoadingOrder}
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{isEditMode ? 'Updating Order Changes...' : 'Generating Invoice...'}</span>
                </>
              ) : isEditMode ? (
                <>
                  <Save className="h-5 w-5" />
                  <span>Update & Save Order Changes</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>Generate Order Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
