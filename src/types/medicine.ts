export interface Medicine {
  id: string;
  user_id: string;
  medicine_name: string;
  brand_name?: string | null;
  generic_name?: string | null;
  composition?: string | null;
  company_name?: string | null;
  strength?: string | null;
  category?: string | null;
  sub_category?: string | null;
  description?: string | null;
  packing?: string | null;
  mrp: number;
  base_price: number;
  current_rate: number;
  gst_percent: number;
  min_rate?: number | null;
  max_rate?: number | null;
  is_active: boolean;
  status?: string | null;
  pdf_source?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface MedicinePriceHistory {
  id: string;
  medicine_id: string;
  old_rate: number;
  new_rate: number;
  old_mrp: number;
  new_mrp: number;
  reason?: string | null;
  effective_date: string;
  created_at: string;
}

export interface ImportedMedicinePreview {
  medicine_name: string;
  brand_name: string;
  generic_name: string;
  composition: string;
  category: string;
  sub_category?: string;
  description?: string;
  packing: string;
  mrp: number;
  base_price: number;
  current_rate: number;
  gst_percent: number;
  company_name: string;
  pdf_source?: string;
  isSelected?: boolean;
}
