import { useState, useEffect, useCallback } from 'react';
import { Medicine, MedicinePriceHistory, ImportedMedicinePreview } from '../types/medicine';
import { medicineService } from '../services/medicineService';

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const fetchMedicines = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await medicineService.getMedicines();
      setMedicines(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load medicines';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const saveMedicine = async (medicineData: Partial<Medicine>, reason?: string) => {
    const saved = await medicineService.saveMedicine(medicineData, reason);
    await fetchMedicines();
    return saved;
  };

  const deleteMedicine = async (id: string) => {
    await medicineService.deleteMedicine(id);
    await fetchMedicines();
  };

  const getPriceHistory = async (medicineId: string): Promise<MedicinePriceHistory[]> => {
    return medicineService.getPriceHistory(medicineId);
  };

  const bulkImport = async (previews: ImportedMedicinePreview[]): Promise<number> => {
    const count = await medicineService.bulkImportMedicines(previews);
    await fetchMedicines();
    return count;
  };

  const filteredMedicines = medicines.filter((m) => {
    // 1. Category Filtering
    if (activeCategory !== 'All') {
      const cat = (m.category || '').toUpperCase();
      const name = (m.medicine_name || '').toUpperCase();
      const target = activeCategory.toUpperCase();

      if (target.startsWith('HAIRFLU')) {
        const isMatch = cat.includes('HAIRFLU') || name.includes('HAIRFLU') || (m.composition && m.composition.toUpperCase().includes('HAIR'));
        if (!isMatch) return false;
      } else if (target === 'FACE WASH') {
        if (!cat.includes('FACE WASH') && !name.includes('FACE WASH') && !name.includes('FACEWASH')) return false;
      } else if (target === 'SOAP/ LOTION') {
        if (!cat.includes('SOAP') && !cat.includes('LOTION') && !name.includes('SOAP') && !name.includes('LOTION') && !name.includes('SAMPOO')) return false;
      } else if (target === 'OINTMENT') {
        if (!cat.includes('OINTMENT') && !name.includes('CREAM') && !name.includes('OINTMENT') && !name.includes('GEL')) return false;
      } else if (target === 'TAB/CAP') {
        if (!cat.includes('TAB') && !cat.includes('CAP') && !name.includes('TAB') && !name.includes('CAP') && !name.includes('TABLET')) return false;
      } else if (target === 'INJECTION') {
        if (!cat.includes('INJ') && !name.includes('INJ') && !name.includes('VIL')) return false;
      } else if (target === 'SERUM') {
        if (!cat.includes('SERUM') && !name.includes('SERUM')) return false;
      } else if (target === 'GENERAL RANGE') {
        if (cat.includes('TAB') || cat.includes('CREAM') || cat.includes('SOAP') || cat.includes('INJ') || cat.includes('SERUM') || cat.includes('FACE')) return false;
      } else if (cat !== target) {
        return false;
      }
    }

    // 2. Query Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (m.medicine_name && m.medicine_name.toLowerCase().includes(q)) ||
        (m.brand_name && m.brand_name.toLowerCase().includes(q)) ||
        (m.company_name && m.company_name.toLowerCase().includes(q)) ||
        (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
        (m.composition && m.composition.toLowerCase().includes(q))
      );
    }

    return true;
  });

  return {
    medicines: filteredMedicines,
    allMedicines: medicines,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    refetch: fetchMedicines,
    saveMedicine,
    deleteMedicine,
    getPriceHistory,
    bulkImport,
  };
}
