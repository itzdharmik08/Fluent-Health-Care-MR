import { supabase } from '../lib/supabase';
import { Medicine, MedicinePriceHistory, ImportedMedicinePreview } from '../types/medicine';
import { authService } from './authService';

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
      ...medicine,
      user_id: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (!payload.id || payload.id === '') {
      delete payload.id;
    }

    const { data, error } = await supabase
      .from('medicines')
      .upsert([payload])
      .select()
      .single();

    if (error) throw error;
    const saved = data as Medicine;

    // Log price history if rate changed
    if (
      oldMedicine &&
      (oldMedicine.current_rate !== saved.current_rate || oldMedicine.mrp !== saved.mrp)
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
   * Bulk import preview items into Supabase
   */
  async bulkImportMedicines(previews: ImportedMedicinePreview[]): Promise<number> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    const payloads = previews
      .filter((p) => p.isSelected !== false)
      .map((p) => ({
        user_id: user?.id,
        medicine_name: p.medicine_name,
        brand_name: p.brand_name,
        generic_name: p.generic_name,
        composition: p.composition,
        category: p.category,
        packing: p.packing,
        mrp: p.mrp,
        base_price: p.base_price,
        current_rate: p.current_rate,
        gst_percent: p.gst_percent,
        company_name: p.company_name,
        pdf_source: p.pdf_source || 'PDF Import',
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

    if (payloads.length === 0) return 0;

    const { error } = await supabase
      .from('medicines')
      .upsert(payloads, { onConflict: 'medicine_name' });

    if (error) throw error;
    return payloads.length;
  },
};
