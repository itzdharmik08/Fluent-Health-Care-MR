import { supabase } from '../lib/supabase';
import { Doctor, DoctorMedicineRate } from '../types/doctor';
import { authService } from './authService';

export const doctorService = {
  /**
   * Fetch all doctors for current user
   */
  async getDoctors(): Promise<Doctor[]> {
    await authService.ensureUserProfile();

    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('doctor_name', { ascending: true });

    if (error) throw error;
    return (data || []) as Doctor[];
  },

  /**
   * Fetch single doctor by ID
   */
  async getDoctorById(id: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Doctor;
  },

  /**
   * Save or update doctor record
   */
  async saveDoctor(doctor: Partial<Doctor>): Promise<Doctor> {
    await authService.ensureUserProfile();
    const { data: { user } } = await supabase.auth.getUser();

    const payload: Record<string, unknown> = {
      ...doctor,
      user_id: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (!payload.id || payload.id === '') {
      delete payload.id;
    }

    const { data, error } = await supabase
      .from('doctors')
      .upsert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as Doctor;
  },

  /**
   * Toggle doctor active status
   */
  async toggleDoctorActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('doctors')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete doctor record
   */
  async deleteDoctor(id: string): Promise<void> {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Fetch doctor custom rates
   */
  async getDoctorRates(doctorId: string): Promise<DoctorMedicineRate[]> {
    const { data, error } = await supabase
      .from('doctor_medicine_rates')
      .select(`
        *,
        medicine:medicines (
          id,
          medicine_name,
          brand_name,
          packing,
          mrp,
          current_rate,
          gst_percent
        )
      `)
      .eq('doctor_id', doctorId);

    if (error) throw error;
    return (data || []) as DoctorMedicineRate[];
  },

  /**
   * Save or update doctor custom rate
   */
  async saveDoctorRate(rateData: Partial<DoctorMedicineRate>): Promise<DoctorMedicineRate> {
    const payload: Record<string, unknown> = {
      doctor_id: rateData.doctor_id,
      medicine_id: rateData.medicine_id,
      rate: rateData.rate,
      discount_percent: rateData.discount_percent || 0,
      notes: rateData.notes || '',
    };

    if (rateData.id && rateData.id !== '') {
      payload.id = rateData.id;
    }

    const { data, error } = await supabase
      .from('doctor_medicine_rates')
      .upsert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as DoctorMedicineRate;
  },

  /**
   * Delete doctor rate
   */
  async deleteDoctorRate(id: string): Promise<void> {
    const { error } = await supabase
      .from('doctor_medicine_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
