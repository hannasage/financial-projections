export const START_YEAR = 2026;

export const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export const YEARS          = Array.from({ length: 20 }, (_, i) => START_YEAR + i);
export const PURCHASE_YEARS = Array.from({ length: 36 }, (_, i) => 2010 + i); // 2010–2045

export const RETURN_RATES: Record<string, number> = {
  none:     0,
  hysa:     0.045,
  invested: 0.07,
};
