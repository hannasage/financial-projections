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

export const buildPurchaseYears = (
  startYear: number,
  horizonYears = 25,
  pastYears = 10,
): number[] => {
  const futureYears = Math.max(0, Math.round(horizonYears));
  return Array.from(
    { length: pastYears + futureYears + 1 },
    (_, i) => startYear - pastYears + i,
  );
};

export const YEARS          = buildYears(START_YEAR, 20);
export const PURCHASE_YEARS = buildPurchaseYears(START_YEAR);

export const RETURN_RATES: Record<string, number> = {
  none:     0,
  hysa:     0.045,
  invested: 0.07,
};
