import { supabase } from '../lib/supabase';
import { SearchResultItem } from '../types/auth';

export const searchService = {
  /**
   * Perform global search across Doctors, Medicines, and Orders
   */
  async searchAll(query: string): Promise<SearchResultItem[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const results: SearchResultItem[] = [];

    // 1. Search Doctors
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, doctor_name, clinic_name, area, phone')
      .or(`doctor_name.ilike.%${cleanQuery}%,clinic_name.ilike.%${cleanQuery}%,area.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`)
      .limit(5);

    if (doctors && doctors.length > 0) {
      doctors.forEach((d) => {
        results.push({
          id: d.id,
          type: 'doctor',
          title: d.doctor_name,
          subtitle: `${d.clinic_name || 'Clinic'} • ${d.area || 'Surat'} ${d.phone ? '• ' + d.phone : ''}`,
          badge: 'Doctor',
          url: `/doctors?id=${d.id}`,
        });
      });
    }

    // 2. Search Medicines
    const { data: medicines } = await supabase
      .from('medicines')
      .select('id, medicine_name, brand_name, composition, current_rate, mrp')
      .or(`medicine_name.ilike.%${cleanQuery}%,brand_name.ilike.%${cleanQuery}%,composition.ilike.%${cleanQuery}%`)
      .limit(5);

    if (medicines && medicines.length > 0) {
      medicines.forEach((m) => {
        results.push({
          id: m.id,
          type: 'medicine',
          title: m.medicine_name,
          subtitle: `${m.composition || 'Composition N/A'} • Rate: ₹${m.current_rate}`,
          badge: 'Medicine',
          url: `/medicines?id=${m.id}`,
        });
      });
    }

    // 3. Search Orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, payment_status, created_at, doctor:doctors(doctor_name)')
      .or(`order_number.ilike.%${cleanQuery}%`)
      .limit(5);

    if (orders && orders.length > 0) {
      orders.forEach((o) => {
        const docName = (o.doctor as unknown as { doctor_name?: string })?.doctor_name || 'Doctor';
        results.push({
          id: o.id,
          type: 'order',
          title: `${o.order_number} (${docName})`,
          subtitle: `Total: ₹${o.total_amount} • Status: ${o.payment_status.toUpperCase()}`,
          badge: 'Order',
          url: `/orders?id=${o.id}`,
        });
      });
    }

    return results;
  },
};
