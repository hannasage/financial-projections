export const START_YEAR = 2026;

export const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export function getTodayStartDate(): { startYear: number; startMonthIdx: number } {
  const now = new Date();
  return { startYear: now.getFullYear(), startMonthIdx: now.getMonth() };
}

export const buildYears = (startYear: number, count = 20): number[] =>
  Array.from({ length: count }, (_, i) => startYear + i);

export const buildPurchaseYears = (startYear: number): number[] =>
  Array.from({ length: 36 }, (_, i) => startYear - 10 + i);

export const YEARS          = buildYears(START_YEAR, 20);
export const PURCHASE_YEARS = buildPurchaseYears(START_YEAR);

export const RETURN_RATES: Record<string, number> = {
  none:     0,
  hysa:     0.045,
  invested: 0.07,
};
