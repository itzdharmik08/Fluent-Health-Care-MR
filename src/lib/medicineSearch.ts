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

  const cat = (medicine.category || '').toUpperCase();
  const name = (medicine.medicine_name || '').toUpperCase();
  const comp = (medicine.composition || '').toUpperCase();
  const target = targetCategory.toUpperCase().trim();

  if (target.startsWith('HAIRFLU')) {
    return cat.includes('HAIRFLU') || name.includes('HAIRFLU') || comp.includes('HAIR');
  }

  if (target === 'FACE WASH' || target === 'FACEWASH') {
    return cat.includes('FACE WASH') || cat.includes('FACEWASH') || name.includes('FACE WASH') || name.includes('FACEWASH');
  }

  if (target.includes('SOAP') || target.includes('LOTION')) {
    return (
      cat.includes('SOAP') ||
      cat.includes('LOTION') ||
      cat.includes('SHAMPOO') ||
      name.includes('SOAP') ||
      name.includes('LOTION') ||
      name.includes('SHAMPOO') ||
      name.includes('SAMPOO')
    );
  }

  if (target === 'OINTMENT' || target === 'CREAM' || target === 'GEL') {
    return (
      cat.includes('OINTMENT') ||
      cat.includes('CREAM') ||
      cat.includes('GEL') ||
      name.includes('OINTMENT') ||
      name.includes('CREAM') ||
      name.includes('GEL')
    );
  }

  if (target === 'TAB/CAP' || target === 'TAB' || target === 'CAP' || target === 'TABLET' || target === 'CAPSULE') {
    return (
      cat.includes('TAB') ||
      cat.includes('CAP') ||
      name.includes('TAB') ||
      name.includes('CAP') ||
      name.includes('TABLET') ||
      name.includes('CAPSULE')
    );
  }

  if (target === 'INJECTION' || target === 'INJ') {
    return (
      cat.includes('INJ') ||
      cat.includes('VIAL') ||
      cat.includes('AMPOULE') ||
      name.includes('INJ') ||
      name.includes('VIAL') ||
      name.includes('VIL')
    );
  }

  if (target === 'SERUM') {
    return cat.includes('SERUM') || name.includes('SERUM');
  }

  if (target === 'GENERAL RANGE') {
    const isSpecific =
      cat.includes('TAB') ||
      cat.includes('CAP') ||
      cat.includes('CREAM') ||
      cat.includes('OINTMENT') ||
      cat.includes('SOAP') ||
      cat.includes('LOTION') ||
      cat.includes('INJ') ||
      cat.includes('SERUM') ||
      cat.includes('FACE') ||
      cat.includes('HAIRFLU');
    return !isSpecific || cat === 'GENERAL RANGE';
  }

  return cat === target || cat.includes(target);
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

  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    label: category || 'GENERAL RANGE',
  };
}
