import { useState, useEffect, useCallback, useMemo } from 'react';
import { Medicine, MedicinePriceHistory, ImportedMedicinePreview } from '../types/medicine';
import { medicineService } from '../services/medicineService';
import {
  matchesMedicineCategory,
  matchesMedicineQuery,
  calculateMedicineMargin,
  SeviorSubCategory,
  matchesSeviorSubCategory,
} from '../lib/medicineSearch';

export type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'rate_asc'
  | 'rate_desc'
  | 'margin_desc'
  | 'recent';

export type PriceFilter = 'all' | 'under100' | '100to300' | 'above300';
export type { SeviorSubCategory };

export function useMedicines() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [seviorSubCategory, setSeviorSubCategory] = useState<SeviorSubCategory>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

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

  const bulkImport = async (previews: ImportedMedicinePreview[], clearExisting = true): Promise<number> => {
    const count = await medicineService.bulkImportMedicines(previews, clearExisting);
    await fetchMedicines();
    return count;
  };

  // 1. Calculate how many medicines match search across the entire catalog (cross-category awareness)
  const globalSearchMatches = useMemo(() => {
    if (!searchQuery.trim()) return medicines;
    return medicines.filter((m) => matchesMedicineQuery(m, searchQuery));
  }, [medicines, searchQuery]);

  // 2. Dynamic Category Counts (based on current search query)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: globalSearchMatches.length };
    const categories = [
      'TAB/CAP',
      'OINTMENT',
      'SOAP/ LOTION',
      'FACE WASH',
      'INJECTION',
      'HAIRFLU KIT',
      'SERUM',
      'GENERAL RANGE',
      'FLUENT SEVIOR',
    ];

    categories.forEach((cat) => {
      counts[cat] = globalSearchMatches.filter((m) => matchesMedicineCategory(m, cat)).length;
    });

    return counts;
  }, [globalSearchMatches]);

  // Dynamic Sub-Category Counts for FLUENT SEVIOR
  const seviorSubCounts = useMemo(() => {
    const seviorMedicines = globalSearchMatches.filter((m) =>
      matchesMedicineCategory(m, 'FLUENT SEVIOR')
    );

    return {
      all: seviorMedicines.length,
      tab_cap: seviorMedicines.filter((m) => matchesSeviorSubCategory(m, 'tab_cap')).length,
      syp_powder: seviorMedicines.filter((m) => matchesSeviorSubCategory(m, 'syp_powder')).length,
      oil_gel: seviorMedicines.filter((m) => matchesSeviorSubCategory(m, 'oil_gel')).length,
      injection: seviorMedicines.filter((m) => matchesSeviorSubCategory(m, 'injection')).length,
    };
  }, [globalSearchMatches]);

  // 3. Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((m) => {
      // Category filter
      if (!matchesMedicineCategory(m, activeCategory)) {
        return false;
      }

      // FLUENT SEVIOR Sub-Category filter
      if (activeCategory === 'FLUENT SEVIOR' && seviorSubCategory !== 'all') {
        if (!matchesSeviorSubCategory(m, seviorSubCategory)) {
          return false;
        }
      }

      // Query Search filter (multi-keyword tokenized)
      if (!matchesMedicineQuery(m, searchQuery)) {
        return false;
      }

      // Price bracket filter
      const rate = Number(m.current_rate) || 0;
      if (priceFilter === 'under100' && rate >= 100) return false;
      if (priceFilter === '100to300' && (rate < 100 || rate > 300)) return false;
      if (priceFilter === 'above300' && rate <= 300) return false;

      return true;
    });
  }, [medicines, activeCategory, seviorSubCategory, searchQuery, priceFilter]);

  // 4. Sorted medicines
  const sortedMedicines = useMemo(() => {
    return [...filteredMedicines].sort((a, b) => {
      if (sortOption === 'name_asc') {
        return (a.medicine_name || '').localeCompare(b.medicine_name || '');
      }
      if (sortOption === 'name_desc') {
        return (b.medicine_name || '').localeCompare(a.medicine_name || '');
      }
      if (sortOption === 'rate_asc') {
        return (Number(a.current_rate) || 0) - (Number(b.current_rate) || 0);
      }
      if (sortOption === 'rate_desc') {
        return (Number(b.current_rate) || 0) - (Number(a.current_rate) || 0);
      }
      if (sortOption === 'margin_desc') {
        const marginA = calculateMedicineMargin(a.mrp, a.current_rate).marginPercent;
        const marginB = calculateMedicineMargin(b.mrp, b.current_rate).marginPercent;
        return marginB - marginA;
      }
      if (sortOption === 'recent') {
        const dateA = new Date(a.created_at || '').getTime();
        const dateB = new Date(b.created_at || '').getTime();
        return dateB - dateA;
      }
      return 0;
    });
  }, [filteredMedicines, sortOption]);

  // 5. Catalog Analytics Stats for Easy Comprehension
  const stats = useMemo(() => {
    const totalCount = medicines.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        avgRate: 0,
        avgMrp: 0,
        avgMarginPercent: 0,
        minRate: 0,
        maxRate: 0,
      };
    }

    let sumRate = 0;
    let sumMrp = 0;
    let sumMarginPercent = 0;
    let minRate = Infinity;
    let maxRate = -Infinity;

    medicines.forEach((m) => {
      const rate = Number(m.current_rate) || 0;
      const mrp = Number(m.mrp) || 0;
      sumRate += rate;
      sumMrp += mrp;

      const margin = calculateMedicineMargin(mrp, rate);
      sumMarginPercent += margin.marginPercent;

      if (rate < minRate) minRate = rate;
      if (rate > maxRate) maxRate = rate;
    });

    return {
      totalCount,
      avgRate: Math.round((sumRate / totalCount) * 100) / 100,
      avgMrp: Math.round((sumMrp / totalCount) * 100) / 100,
      avgMarginPercent: Math.round((sumMarginPercent / totalCount) * 10) / 10,
      minRate: minRate === Infinity ? 0 : minRate,
      maxRate: maxRate === -Infinity ? 0 : maxRate,
    };
  }, [medicines]);

  return {
    medicines: sortedMedicines,
    allMedicines: medicines,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    seviorSubCategory,
    setSeviorSubCategory,
    seviorSubCounts,
    sortOption,
    setSortOption,
    priceFilter,
    setPriceFilter,
    categoryCounts,
    globalSearchMatchesCount: globalSearchMatches.length,
    stats,
    refetch: fetchMedicines,
    saveMedicine,
    deleteMedicine,
    getPriceHistory,
    bulkImport,
  };
}
