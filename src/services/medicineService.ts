import { supabase } from '../lib/supabase';
import { Medicine, MedicinePriceHistory, ImportedMedicinePreview } from '../types/medicine';
import { authService } from './authService';
import { orderService } from './orderService';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const medicineService = {
  /**
   * Consolidate sub-items in HAIRFLU KIT category into 1 master card if needed
   */
  sanitizeMedicinesList(list: Medicine[]): Medicine[] {
    if (!list || !Array.isArray(list)) return [];

    const kitSubItems = list.filter((m) => {
      const cat = (m.category || '').toUpperCase();
      const name = (m.medicine_name || '').toUpperCase();
      return (
        (cat.includes('HAIRFLU') || name.startsWith('HAIR-') || name.includes('HAIRFLU')) &&
        (parseFloat(String(m.current_rate || 0)) === 0 || parseFloat(String(m.mrp || 0)) === 0)
      );
    });

    const masterKitExists = list.find(
      (m) => (m.medicine_name || '').toUpperCase().includes('HAIRFLU') && parseFloat(String(m.current_rate || 0)) > 0
    );

    if (kitSubItems.length > 0 && !masterKitExists) {
      const subNames = kitSubItems.map((k) => k.medicine_name).join(', ');
      const masterKit: Medicine = {
        id: kitSubItems[0].id,
        user_id: kitSubItems[0].user_id,
        medicine_name: 'HAIRFLU KIT (COMBINATION OF 6 PRODUCTS)',
        brand_name: 'HAIRFLU KIT',
        generic_name: subNames,
        composition: 'COLOSTRUM CAP + FOLIC CAP + MULTI CAP + BIOF TAB + CAL D3 TAB + Q10 TAB (All 6 Products Included in 1 Kit)',
        category: 'HAIRFLU KIT (HAIR HEALTH & GROWTH FORMULA...)',
        packing: '1 KIT (6 ITEMS)',
        mrp: 1499,
        base_price: 500,
        current_rate: 500,
        gst_percent: 12,
        company_name: 'Fluent Health Care',
        is_active: true,
        created_at: kitSubItems[0].created_at || new Date().toISOString(),
      };

      const nonSubKitItems = list.filter((m) => !kitSubItems.includes(m));
      return [masterKit, ...nonSubKitItems];
    }

    return list;
  },

  /**
   * Fetch all medicines for current user
   */
  async getMedicines(): Promise<Medicine[]> {
    await authService.ensureUserProfile();

    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .order('medicine_name', { ascending: true });

    if (error) throw error;
    return this.sanitizeMedicinesList((data || []) as Medicine[]);
  },

  /**
   * Fetch single medicine by ID
   */
  async getMedicineById(id: string): Promise<Medicine | null> {
    const { data, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Medicine;
  },

  /**
   * Save or update medicine, automatically logging price change history if rate changes
   */
  async saveMedicine(medicine: Partial<Medicine>, reason = 'Price update'): Promise<Medicine> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    let oldMedicine: Medicine | null = null;
    if (medicine.id) {
      oldMedicine = await this.getMedicineById(medicine.id);
    }

    const payload: Record<string, unknown> = {
      user_id: user?.id,
      medicine_name: medicine.medicine_name?.trim(),
      brand_name: medicine.brand_name || '',
      generic_name: medicine.generic_name || '',
      composition: medicine.composition || '',
      category: medicine.category || 'GENERAL RANGE',
      packing: medicine.packing || '',
      mrp: parseFloat(String(medicine.mrp || 0)),
      base_price: parseFloat(String(medicine.base_price || 0)),
      current_rate: parseFloat(String(medicine.current_rate || 0)),
      gst_percent: parseFloat(String(medicine.gst_percent || 12)),
      company_name: medicine.company_name || 'Fluent Health Care',
      pdf_source: medicine.pdf_source || 'Manual Entry',
      status: medicine.status || 'active',
      updated_at: new Date().toISOString(),
    };

    if (medicine.id) {
      payload.id = medicine.id;
    } else {
      payload.id = generateUUID();
    }

    const { data, error } = await supabase
      .from('medicines')
      .upsert([payload])
      .select()
      .single();

    if (error) throw error;
    const saved = data as Medicine;

    // Log price history and auto-update pending orders if rate changed
    if (
      oldMedicine &&
      (oldMedicine.current_rate !== saved.current_rate || oldMedicine.mrp !== saved.mrp || oldMedicine.gst_percent !== saved.gst_percent)
    ) {
      await this.addPriceHistory({
        medicine_id: saved.id,
        old_rate: oldMedicine.current_rate,
        new_rate: saved.current_rate,
        old_mrp: oldMedicine.mrp,
        new_mrp: saved.mrp,
        reason: reason,
        effective_date: new Date().toISOString().split('T')[0],
      });

      // Automatically recalculate and update all pending / unpaid orders containing this medicine
      try {
        await (orderService as any)?.syncPendingOrdersForMedicine?.(saved.id, saved.current_rate, saved.gst_percent);
      } catch (syncErr) {
        console.warn('Non-blocking error auto-syncing pending orders for updated medicine:', syncErr);
      }
    }

    return saved;

  },

  /**
   * Delete medicine
   */
  async deleteMedicine(id: string): Promise<void> {
    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch price history for a medicine
   */
  async getPriceHistory(medicineId: string): Promise<MedicinePriceHistory[]> {
    const { data, error } = await supabase
      .from('medicine_price_history')
      .select('*')
      .eq('medicine_id', medicineId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MedicinePriceHistory[];
  },

  /**
   * Log price history entry
   */
  async addPriceHistory(historyData: Partial<MedicinePriceHistory>): Promise<void> {
    const { error } = await supabase
      .from('medicine_price_history')
      .insert([historyData]);

    if (error) console.error('Failed to log price history:', error);
  },

  /**
   * Bulk import preview items into Supabase cleanly with batching and deduplication
   */
  async bulkImportMedicines(previews: ImportedMedicinePreview[]): Promise<number> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User authentication required for bulk import.');

    const selected = previews.filter((p) => p.isSelected !== false);
    if (selected.length === 0) return 0;

    // Deduplicate selected items by lowercase medicine_name to prevent batch conflicts
    const uniqueMap = new Map<string, ImportedMedicinePreview>();
    for (const item of selected) {
      const nameKey = (item.medicine_name || '').trim().toLowerCase();
      if (nameKey && !uniqueMap.has(nameKey)) {
        uniqueMap.set(nameKey, item);
      }
    }
    const uniquePreviews = Array.from(uniqueMap.values());

    // Fetch existing user medicines to match IDs for updating existing catalog items
    const { data: existingMedicines } = await supabase
      .from('medicines')
      .select('id, medicine_name')
      .eq('user_id', user.id);

    const existingIdMap = new Map<string, string>();
    if (existingMedicines && Array.isArray(existingMedicines)) {
      existingMedicines.forEach((m) => {
        if (m.medicine_name) {
          existingIdMap.set(m.medicine_name.trim().toLowerCase(), m.id);
        }
      });
    }

    // Build clean payloads matching exact Supabase database column schema
    const payloads = uniquePreviews.map((p) => {
      const nameKey = (p.medicine_name || '').trim().toLowerCase();
      const existingId = existingIdMap.get(nameKey);

      const payload: Record<string, unknown> = {
        id: existingId || generateUUID(),
        user_id: user.id,
        medicine_name: p.medicine_name.trim(),
        brand_name: p.brand_name || '',
        generic_name: p.generic_name || '',
        composition: p.composition || '',
        category: p.category || 'GENERAL RANGE',
        packing: p.packing || '',
        mrp: parseFloat(String(p.mrp || 0)),
        base_price: parseFloat(String(p.base_price || 0)),
        current_rate: parseFloat(String(p.current_rate || 0)),
        gst_percent: parseFloat(String(p.gst_percent || 12)),
        company_name: p.company_name || 'Fluent Health Care',
        pdf_source: p.pdf_source || 'Data Import',
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      return payload;
    });

    // Chunk upserts in batches of 50 for optimal database performance
    const BATCH_SIZE = 50;
    for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
      const batch = payloads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('medicines')
        .upsert(batch);

      if (error) {
        console.error('Supabase bulk import batch error:', error);
        throw new Error(error.message || 'Failed to import medicine batch into database');
      }
    }

    // Auto-sync all pending / unpaid orders to reflect newly updated medicine prices from the imported file
    try {
      const { data: allUserMeds } = await supabase
        .from('medicines')
        .select('id, current_rate, gst_percent')
        .eq('user_id', user.id);

      if (allUserMeds && allUserMeds.length > 0) {
        await (orderService as any)?.syncPendingOrdersForMedicines?.(allUserMeds);
      }
    } catch (syncErr) {
      console.warn('Non-blocking error auto-syncing pending orders after bulk import:', syncErr);
    }

    return payloads.length;
  },
};

