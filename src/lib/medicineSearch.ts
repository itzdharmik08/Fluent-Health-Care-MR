import { Medicine } from '../types/medicine';

/**
 * Normalizes text for lenient searching (lowercases, removes special characters, collapses spaces)
 */
export function normalizeSearchString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[/\\(),.+_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Robust category matcher supporting common aliases and abbreviations
 */
export function matchesMedicineCategory(medicine: Medicine, targetCategory: string): boolean {
  if (!targetCategory || targetCategory === 'All') return true;

  const cat = (medicine.category || '').toUpperCase().trim();
  const name = (medicine.medicine_name || '').toUpperCase().trim();
  const target = targetCategory.toUpperCase().trim();

  // If the medicine explicitly belongs to HAIRFLU KIT
  if (target.startsWith('HAIRFLU')) {
    return cat.includes('HAIRFLU') || cat.includes('KIT') || name.includes('HAIRFLU');
  }

  // If the target is GENERAL RANGE, match items explicitly categorized as GENERAL RANGE (never specific categories)
  if (target === 'GENERAL RANGE') {
    return cat === 'GENERAL RANGE' || !cat;
  }

  // Exact category match
  if (cat === target) return true;

  if (target === 'FACE WASH' || target === 'FACEWASH') {
    return cat.includes('FACE WASH') || cat.includes('FACEWASH');
  }

  if (target.includes('SOAP') || target.includes('LOTION')) {
    return (
      cat.includes('SOAP') ||
      cat.includes('LOTION') ||
      cat.includes('SHAMPOO') ||
      cat.includes('SAMPOO')
    );
  }

  if (target === 'OINTMENT' || target === 'CREAM' || target === 'GEL') {
    return cat.includes('OINTMENT') || cat.includes('CREAM') || cat.includes('GEL');
  }

  if (target === 'TAB/CAP' || target === 'TAB' || target === 'CAP' || target === 'TABLET' || target === 'CAPSULE') {
    return cat.includes('TAB') || cat.includes('CAP');
  }

  if (target === 'INJECTION' || target === 'INJ') {
    return cat.includes('INJ') || cat.includes('VIAL') || cat.includes('AMPOULE');
  }

  if (target === 'SERUM') {
    return cat.includes('SERUM');
  }

  if (target.includes('SEVIOR') || target === 'FLUENT SEVIOR') {
    return (
      cat.includes('SEVIOR') ||
      name.includes('SEVIOR') ||
      name.includes('CEFSEV') ||
      name.includes('DEFSEV') ||
      name.includes('BECTOSEV') ||
      name.includes('IROSEV') ||
      (medicine.company_name || '').toUpperCase().includes('SEVIOR')
    );
  }

  return cat === target || cat.includes(target);
}

export type SeviorSubCategory = 'all' | 'tab_cap' | 'syp_powder' | 'oil_gel' | 'injection';

/**
 * Filter medicines within FLUENT SEVIOR by sub-category:
 * 💊 TAB/CAP, 🧪 SYP/POWDER, 💧 OIL/GEL, 💉 INJECTION
 */
export function matchesSeviorSubCategory(
  medicine: Medicine,
  subCategory: SeviorSubCategory
): boolean {
  if (!subCategory || subCategory === 'all') return true;

  const desc = ((medicine.description || (medicine as any).sub_category) || '').toUpperCase().trim();
  const name = (medicine.medicine_name || '').toUpperCase();
  const pkg = (medicine.packing || '').toUpperCase();
  const comp = (medicine.composition || '').toUpperCase();

  if (subCategory === 'injection') {
    if (desc === 'INJECTION' || desc.includes('INJ')) return true;
    if (desc && !desc.includes('INJ')) return false;
    return (
      name.includes('INJ') ||
      pkg.includes('VIAL') ||
      pkg.includes('DISPO') ||
      comp.includes('INJ')
    );
  }

  if (subCategory === 'oil_gel') {
    if (desc === 'OIL/GEL' || desc.includes('OIL') || desc.includes('GEL')) return true;
    if (desc && !desc.includes('OIL') && !desc.includes('GEL')) return false;
    return (
      name.includes('OIL') ||
      name.includes('GEL') ||
      comp.includes('OIL') ||
      comp.includes('GEL')
    );
  }

  if (subCategory === 'syp_powder') {
    if (desc === 'SYP/POWDER' || desc.includes('SYP') || desc.includes('POWDER')) return true;
    if (desc && !desc.includes('SYP') && !desc.includes('POWDER')) return false;
    return (
      name.includes('SYP') ||
      name.includes('POWDER') ||
      pkg.includes('SYP') ||
      pkg.includes('POWDER') ||
      name.includes('DEW Z') ||
      name.includes('FLUCEE Z')
    );
  }

  if (subCategory === 'tab_cap') {
    if (desc === 'TAB/CAP' || desc.includes('TAB') || desc.includes('CAP')) return true;
    if (desc && !desc.includes('TAB') && !desc.includes('CAP')) return false;
    return (
      name.includes('TAB') ||
      name.includes('CAP') ||
      pkg.includes('TAB') ||
      pkg.includes('CAP') ||
      comp.includes('TAB') ||
      comp.includes('CAP')
    );
  }

  return true;
}

/**
 * Tokenized multi-keyword search algorithm.
 * Splits user query into tokens. Every token must be matched in any of the medicine fields.
 * Supports units normalization (e.g., '100mg' matches '100 mg').
 */
export function matchesMedicineQuery(medicine: Medicine, query: string): boolean {
  const cleanQuery = query.trim();
  if (!cleanQuery) return true;

  // Split query into keywords/tokens
  const rawTokens = cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  // Build searchable text corpus
  const fields = [
    medicine.medicine_name,
    medicine.brand_name,
    medicine.generic_name,
    medicine.composition,
    medicine.packing,
    medicine.category,
    medicine.company_name,
  ];

  const rawCorpus = fields.filter(Boolean).join(' ').toLowerCase();
  const normalizedCorpus = normalizeSearchString(rawCorpus);

  // Check that every token matches in either raw or normalized corpus
  return rawTokens.every((token) => {
    // 1. Direct substring in raw corpus
    if (rawCorpus.includes(token)) return true;

    // 2. Direct substring in normalized corpus
    const normToken = normalizeSearchString(token);
    if (normToken && normalizedCorpus.includes(normToken)) return true;

    // 3. Separated unit check (e.g. '100mg' -> '100 mg', '15gm' -> '15 gm', '10tab' -> '10 tab')
    const unitMatch = token.match(/^(\d+)(mg|gm|g|ml|tab|cap|tabs|caps|iu|mcg|kg|l)$/i);
    if (unitMatch) {
      const spaced = `${unitMatch[1]} ${unitMatch[2]}`;
      if (rawCorpus.includes(spaced) || normalizedCorpus.includes(spaced)) return true;
    }

    return false;
  });
}

/**
 * Calculate retail profit margin & percentage (MRP vs Net Rate)
 */
export function calculateMedicineMargin(mrp: number, currentRate: number): {
  marginAmount: number;
  marginPercent: number;
  isDiscounted: boolean;
} {
  const numMrp = Number(mrp) || 0;
  const numRate = Number(currentRate) || 0;
  const marginAmount = Math.max(0, numMrp - numRate);
  const marginPercent = numMrp > 0 ? (marginAmount / numMrp) * 100 : 0;

  return {
    marginAmount: Math.round(marginAmount * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
    isDiscounted: marginAmount > 0,
  };
}

/**
 * Aesthetic category badges with tailored color styling
 */
export function getCategoryBadgeStyle(category: string | null | undefined): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  const cat = (category || 'GENERAL RANGE').toUpperCase();

  if (cat.includes('HAIRFLU')) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      label: 'HAIRFLU KIT 🌟',
    };
  }
  if (cat.includes('TAB') || cat.includes('CAP')) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      label: 'TAB / CAP',
    };
  }
  if (cat.includes('OINTMENT') || cat.includes('CREAM') || cat.includes('GEL')) {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      label: 'OINTMENT / GEL',
    };
  }
  if (cat.includes('SOAP') || cat.includes('LOTION') || cat.includes('SHAMPOO')) {
    return {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      label: 'SOAP / LOTION',
    };
  }
  if (cat.includes('FACE')) {
    return {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      label: 'FACE WASH',
    };
  }
  if (cat.includes('INJ')) {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      label: 'INJECTION',
    };
  }
  if (cat.includes('SERUM')) {
    return {
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-200',
      label: 'SERUM',
    };
  }

  if (cat.includes('SEVIOR')) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      label: 'FLUENT SEVIOR',
    };
  }

  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: category || 'GENERAL RANGE',
  };
}
