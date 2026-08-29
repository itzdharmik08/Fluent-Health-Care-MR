export interface Doctor {
  id: string;
  user_id: string;
  doctor_name: string;
  clinic_name?: string | null;
  specialization?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  area?: string | null;
  gst_number?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DoctorMedicineRate {
  id: string;
  doctor_id: string;
  medicine_id: string;
  rate: number;
  discount_percent: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  medicine?: {
    id: string;
    medicine_name: string;
    brand_name?: string;
    packing?: string;
    mrp: number;
    current_rate: number;
    gst_percent: number;
  };
}
