import { ImportedMedicinePreview } from '../types/medicine';

export function detectCategory(name: string = '', comp: string = '', context: string = ''): string {
  const upper = (name + ' ' + comp + ' ' + context).toUpperCase();

  if (upper.includes('HAIRFLU') || (upper.includes('KIT') && upper.includes('HAIR'))) {
    return 'HAIRFLU KIT (HAIR HEALTH & GROWTH FORMULA...)';
  }
  if (upper.includes('FACE WASH') || upper.includes('FACEWASH')) {
    return 'FACE WASH';
  }
  if (upper.includes('SOAP') || upper.includes('LOTION') || upper.includes('SAMPOO') || upper.includes('SHAMPOO')) {
    return 'SOAP/ LOTION';
  }
  if (upper.includes('OINTMENT') || upper.includes('CREAM') || upper.includes('GEL')) {
    return 'OINTMENT';
  }
  if (upper.includes('INJ') || upper.includes('INJECTION') || upper.includes('VIAL') || upper.includes('VIL')) {
    return 'INJECTION';
  }
  if (upper.includes('SERUM')) {
    return 'SERUM';
  }
  if (upper.includes('TAB') || upper.includes('CAP') || upper.includes('TABLET') || upper.includes('CAPSULE') || upper.includes('SOFTGEL')) {
    return 'TAB/CAP';
  }
  return 'GENERAL RANGE';
}

export function extractMedicinesFromJSON(rawData: unknown): ImportedMedicinePreview[] {
  const results: ImportedMedicinePreview[] = [];

  const processItem = (item: Record<string, unknown>, categoryContext = '') => {
    if (!item || typeof item !== 'object') return;

    const name = String(item.brand_name || item['BRAND NAME'] || item['Brand Name'] || item.medicine_name || item['MEDICINE NAME'] || item.name || '');
    if (!name.trim()) return;

    const comp = String(item.composition || item['COMPOSITION'] || item['Composition'] || item.generic_name || name);
    const rate = parseFloat(String(item.current_rate || item.rate || item['RATE'] || item['Rate'] || item.price || item.kit_ret || 0)) || 0;
    const mrp = parseFloat(String(item.mrp || item['MRP'] || item.kit_mrp || 0)) || Math.round(rate * 1.25);
    const gst = parseFloat(String(item.gst_percent || item.gst || item['GST'] || 12)) || 12;
    const pkg = String(item.packing || item.pkg || item['PKG'] || item['Pkg'] || item['PACKING'] || 'Standard');
    
    const category = String(item.category || detectCategory(name, comp, categoryContext));

    results.push({
      medicine_name: name.trim(),
      brand_name: name.trim(),
      generic_name: comp.trim(),
      composition: comp.trim(),
      category: category,
      packing: pkg.trim(),
      mrp: mrp,
      base_price: Math.round(rate * 0.8),
      current_rate: rate,
      gst_percent: gst,
      company_name: String(item.company_name || item['COMPANY NAME'] || 'Fluent Health Care'),
      pdf_source: 'JSON Import',
      isSelected: true,
    });
  };

  const traverse = (node: unknown, categoryContext = '') => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach((child) => traverse(child, categoryContext));
    } else if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;

      if (obj.kit_mrp || obj.kit_ret || (obj.items && categoryContext.toUpperCase().includes('KIT'))) {
        const kitMrp = parseFloat(String(obj.kit_mrp || obj.mrp || 1499)) || 1499;
        const kitRet = parseFloat(String(obj.kit_ret || obj.rate || 500)) || 500;
        const subItems = (obj.items as Record<string, unknown>[]) || [];
        const itemCompositions = subItems.map((i) => i.brand_name || i.name).filter(Boolean).join(' + ');

        results.push({
          medicine_name: 'HAIRFLU KIT (COMBINATION OF 6 PRODUCTS)',
          brand_name: 'HAIRFLU KIT',
          generic_name: itemCompositions || 'Hair Health & Growth Formula Kit',
          composition: itemCompositions ? `${itemCompositions} (All 6 Products Included in 1 Kit)` : '6 Products Combination Kit',
          category: 'HAIRFLU KIT (HAIR HEALTH & GROWTH FORMULA...)',
          packing: '1 KIT (6 ITEMS)',
          mrp: kitMrp,
          base_price: kitRet,
          current_rate: kitRet,
          gst_percent: 12,
          company_name: String(obj.company_name || 'Fluent Health Care'),
          pdf_source: 'JSON Import',
          isSelected: true,
        });
        return;
      }

      if (obj.brand_name || obj.medicine_name || obj['BRAND NAME'] || obj['Brand Name']) {
        processItem(obj, categoryContext);
      } else {
        for (const [key, val] of Object.entries(obj)) {
          if (key === 'source' || key === 'company') continue;
          const nextCatContext = (key === 'items' || key === 'categories' || key === 'data') ? categoryContext : key;
          traverse(val, nextCatContext);
        }
      }
    }
  };

  traverse(rawData);
  return results;
}
