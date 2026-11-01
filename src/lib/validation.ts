import { z } from 'zod';

export const doctorSchema = z.object({
  doctor_name: z.string().min(1, 'Doctor name is required'),
  clinic_name: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\+?\d{7,15}$/.test(val.replace(/[\s\-\(\)]/g, '')), {
      message: 'Please enter a valid phone number',
    }),
  email: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: 'Please enter a valid email address',
    }),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  gst_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const medicineSchema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required'),
  brand_name: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  sub_category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  generic_name: z.string().optional().nullable(),
  composition: z.string().optional().nullable(),
  company_name: z.string().optional().nullable(),
  packing: z.string().optional().nullable(),
  mrp: z.coerce.number().min(0, 'MRP must be a non-negative number'),
  base_price: z.coerce.number().min(0, 'Base price must be non-negative').optional(),
  current_rate: z.coerce.number().min(0, 'Current rate must be a non-negative number'),
  gst_percent: z.coerce.number().min(0, 'GST % cannot be negative').max(100, 'GST % max is 100'),
  min_rate: z.coerce.number().optional().nullable(),
  max_rate: z.coerce.number().optional().nullable(),
});

export const orderItemSchema = z.object({
  medicine_id: z.string().min(1, 'Medicine selection is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
  rate: z.coerce.number().min(0, 'Rate cannot be negative'),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  gst_percent: z.coerce.number().min(0).max(100).default(12),
});

export const orderSchema = z.object({
  doctor_id: z.string().min(1, 'Please select a doctor for this order'),
  payment_status: z.enum(['pending', 'paid']),
  payment_mode: z.enum(['Cash', 'UPI']),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one medicine item'),
});

export type DoctorFormValues = z.infer<typeof doctorSchema>;
export type MedicineFormValues = z.infer<typeof medicineSchema>;
export type OrderFormValues = z.infer<typeof orderSchema>;
