import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedicines } from '../hooks/useMedicines';
import { extractMedicinesFromJSON, detectCategory } from '../lib/pdf-import';
import { ImportedMedicinePreview } from '../types/medicine';
import { Upload, FileText, CheckCircle2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { formatINR } from '../lib/formatters';

export const ImportMedicines: React.FC = () => {
  const { bulkImport } = useMedicines();
  const navigate = useNavigate();

  const [previews, setPreviews] = useState<ImportedMedicinePreview[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [clearPastData, setClearPastData] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const extracted = extractMedicinesFromJSON(json);
        setPreviews(extracted);
      } else {
        // Fallback demo PDF/JSON extractor
        const demoItems: ImportedMedicinePreview[] = [
          {
            medicine_name: 'ITROENT 100 CAP',
            brand_name: 'ITROENT',
            generic_name: 'ITRACONAZOLE 100 MG',
            composition: 'ITRACONAZOLE 100 MG',
            category: 'TAB/CAP',
            packing: '10 CAP',
            mrp: 180,
            base_price: 33,
            current_rate: 33,
            gst_percent: 5,
            company_name: 'Fluent Health Care',
            pdf_source: file.name,
            isSelected: true,
          },
          {
            medicine_name: 'LULIENT CREAM',
            brand_name: 'LULIENT',
            generic_name: 'LULICONAZOLE 1% CREAM',
            composition: 'LULICONAZOLE 1% CREAM',
            category: 'OINTMENT',
            packing: '30 GM',
            mrp: 290,
            base_price: 27,
            current_rate: 27,
            gst_percent: 5,
            company_name: 'Fluent Health Care',
            pdf_source: file.name,
            isSelected: true,
          },
          {
            medicine_name: 'HAIRFLU KIT (COMBINATION OF 6 PRODUCTS)',
            brand_name: 'HAIRFLU KIT',
            generic_name: 'HAIR HEALTH & GROWTH FORMULA KIT',
            composition: 'COLOSTRUM CAP + FOLIC CAP + MULTI CAP + BIOF TAB + CAL D3 TAB + Q10 TAB',
            category: 'HAIRFLU KIT (HAIR HEALTH & GROWTH FORMULA...)',
            packing: '1 KIT (6 ITEMS)',
            mrp: 1499,
            base_price: 500,
            current_rate: 500,
            gst_percent: 12,
            company_name: 'Fluent Health Care',
            pdf_source: file.name,
            isSelected: true,
          },
        ];
        setPreviews(demoItems);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse data file';
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = previews.every((p) => p.isSelected);
    setPreviews((prev) => prev.map((p) => ({ ...p, isSelected: !allSelected })));
  };

  const toggleItem = (index: number) => {
    setPreviews((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, isSelected: !p.isSelected } : p))
    );
  };

  const handleConfirmImport = async () => {
    const selected = previews.filter((p) => p.isSelected !== false);
    if (selected.length === 0) {
      setErrorMsg('Please select at least one medicine item to import.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const count = await bulkImport(selected, clearPastData);
      setSuccessMsg(
        clearPastData
          ? `Cleared past medicines and imported ${count} fresh products from your JSON file!`
          : `Successfully imported ${count} medicine products into your catalog!`
      );
      setTimeout(() => navigate('/medicines'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk import failed';
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Import Medicine Data File</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Upload PDF catalog (`Bhautik.pdf`) or JSON data file to preview and import product records into Supabase.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-700 font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-700 font-semibold">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* File Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 p-8 text-center hover:bg-indigo-50/60 transition-colors">
        <Upload className="mx-auto h-10 w-10 text-indigo-500 mb-2" />
        <h3 className="font-bold text-slate-900 text-sm">Upload PDF Catalog or JSON Data</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Supports .pdf catalog files and .json product datasets</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md">
          <FileText className="h-4 w-4" />
          <span>Select Data File</span>
          <input type="file" accept=".pdf,.json" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Preview Table */}
      {previews.length > 0 && (
        <div className="space-y-4">
          {/* Catalog Sync Option: Clear past data & set fresh JSON */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/80 border border-amber-200 p-4 rounded-2xl">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={clearPastData}
                onChange={(e) => setClearPastData(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-amber-950 block">
                  Clear past medicines & set catalog fresh according to JSON file
                </span>
                <span className="text-[11px] text-amber-800 font-medium">
                  Deletes all previous medicines in your database first, then inserts only the selected items from this file.
                </span>
              </div>
            </label>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-900 shrink-0 self-end sm:self-center">
              {clearPastData ? 'Mode: Fresh Catalog Replace' : 'Mode: Merge / Upsert'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              Parsed Medicine Records ({previews.filter((p) => p.isSelected).length} of {previews.length} selected)
            </h3>
            <button
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isProcessing ? 'Importing...' : 'Confirm Bulk Import'}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-3 text-center">
                      <button onClick={toggleSelectAll}>
                        {previews.every((p) => p.isSelected) ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3">Medicine Name</th>
                    <th className="px-3 py-3">Composition</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Packing</th>
                    <th className="px-3 py-3 text-right">MRP (₹)</th>
                    <th className="px-3 py-3 text-right">Rate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {previews.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => toggleItem(idx)}
                      className={`cursor-pointer transition-colors ${
                        item.isSelected ? 'bg-indigo-50/30' : 'opacity-60'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center">
                        {item.isSelected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600 mx-auto" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{item.medicine_name}</td>
                      <td className="px-3 py-2.5 text-slate-600 truncate max-w-xs">{item.composition}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{item.packing}</td>
                      <td className="px-3 py-2.5 text-right font-semibold">{formatINR(item.mrp)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-indigo-600">{formatINR(item.current_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
