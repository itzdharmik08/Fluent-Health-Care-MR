import { Doctor } from './doctor';
import { Medicine } from './medicine';

export type PaymentStatus = 'pending' | 'paid';
export type PaymentMode = 'Cash' | 'UPI';

export interface OrderItem {
  id?: string;
  order_id?: string;
  medicine_id: string;
  medicine_name_snapshot: string;
  medicine_name?: string;
  packing?: string;
  quantity: number;
  rate: number;
  discount_percent: number;
  discount_amount?: number;
  gst_percent: number;
  gst_amount?: number;
  subtotal?: number;
  total_amount?: number;
  medicine?: Medicine;
}

export interface Order {
  id: string;
  user_id: string;
  doctor_id?: string | null;
  order_number: string;
  order_date: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  notes?: string | null;
  status: string;
  created_at: string;
  cgst_amount?: number;
  sgst_amount?: number;
  round_off?: number;
  doctor?: Doctor | null;
  order_items?: OrderItem[];
}

export interface LineItemCalculation {
  gross_amount: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
}

export interface SpecialDiscountConfig {
  type: 'percent' | 'fixed';
  value: number; // percentage (e.g. 10) or fixed amount in INR (e.g. 250)
  amount?: number;
  doctor_name?: string;
  reason?: string;
}

export interface GstTaxBreakdownItem {
  tax_type: string; // e.g. "GST 18%", "GST 5%", "GST 12%"
  gst_percent: number;
  taxable_amount: number;
  cgst_percent: number;
  cgst_amount: number;
  sgst_percent: number;
  sgst_amount: number;
  igst_amount: number;
  net_amount: number;
}

export interface OrderTotalsCalculation {
  gross_subtotal: number;
  items_discount_amount: number;
  special_discount_amount: number;
  special_discount_percent?: number;
  discount_amount: number; // Combined total discount (items + special)
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  gst_amount: number;
  round_off: number;
  total_amount: number;
  subtotal: number;
  total_quantity: number;
  total_items: number;
  tax_breakdown: GstTaxBreakdownItem[];
}

