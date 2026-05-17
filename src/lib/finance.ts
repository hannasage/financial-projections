import { START_YEAR, MONTHS, RETURN_RATES } from './constants';
import type { Purchase, Scenario } from './types';

export function remainingBalance(
  principal:     number,
  annualRate:    number,
  monthlyPmt:    number,
  monthsElapsed: number,
): number {
  if (!principal || principal <= 0 || monthsElapsed <= 0) return Math.max(0, principal);
  if (annualRate === 0) return Math.max(0, principal - monthlyPmt * monthsElapsed);
  const r = annualRate / 100 / 12;
  const b = principal * Math.pow(1 + r, monthsElapsed)
          - monthlyPmt * (Math.pow(1 + r, monthsElapsed) - 1) / r;
  return Math.max(0, b);
}

export function getReturnRate(scenario: Pick<Scenario, 'returnMode' | 'hysaRate'>): number {
  if (scenario.returnMode === 'hysa') return (scenario.hysaRate ?? 4.5) / 100;
  return RETURN_RATES[scenario.returnMode] ?? 0;
}

export const absMo = (
  year: number,
  monthIdx: number,
  startYear: number = START_YEAR,
  startMonthIdx: number = 0,
): number => (year - startYear) * 12 + (monthIdx - startMonthIdx);

export const money = (n: number): string =>
  `$${Math.round(n).toLocaleString()}`;

export const shortK = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1000).toFixed(0)}k`;

export const netMonthly = (annualSalary: number, taxPct: number): number =>
  (annualSalary * (1 - taxPct / 100)) / 12;

export function stdPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  if (!principal || principal <= 0 || !termMonths || termMonths <= 0) return 0;
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return (
    (principal * r * Math.pow(1 + r, termMonths)) /
    (Math.pow(1 + r, termMonths) - 1)
  );
}

export function payoffMonths(
  principal: number,
  annualRate: number,
  monthlyPmt: number,
): number {
  if (!principal || principal <= 0 || monthlyPmt <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / monthlyPmt);
  const r  = annualRate / 100 / 12;
  const rP = r * principal;
  if (monthlyPmt <= rP) return 9999;
  return Math.ceil(-Math.log(1 - rP / monthlyPmt) / Math.log(1 + r));
}

export const totalInterest = (
  principal: number,
  annualRate: number,
  monthlyPmt: number,
): number => {
  const mo = payoffMonths(principal, annualRate, monthlyPmt);
  return mo >= 9999 || mo === 0
    ? 0
    : Math.max(0, monthlyPmt * mo - principal);
};

/**
 * Simulate purchase loan amortization month-by-month, honoring any payment adjustments.
 * Returns the number of monthly payments needed from `purchaseAbsStartM` until the balance
 * reaches zero, plus the total interest accrued.
 *
 * For fresh loans pass `initialPrincipal = loanAmount` and `purchaseAbsStartM = startM`.
 * For historical (past) loans pass `initialPrincipal = remaining balance at plan start`
 * and `purchaseAbsStartM = 0` (plan-start-relative lookup is correct because `remaining`
 * already reflects everything before the plan started).
 *
 * Fast-paths to the closed-form formulas when there are no adjustments.
 */
export function adjustedPurchaseStats(
  initialPrincipal:  number,
  annualRate:        number,
  basePayment:       number,
  adjustments:       Array<{ year: number; monthIdx: number; payment: number }> | undefined,
  purchaseAbsStartM: number,
  simStartYear:      number,
  simStartMonthIdx:  number,
): { payoffMonths: number; totalInterest: number } {
  if (!adjustments?.length) {
    const mo = payoffMonths(initialPrincipal, annualRate, basePayment);
    return { payoffMonths: mo, totalInterest: totalInterest(initialPrincipal, annualRate, basePayment) };
  }
  const r = annualRate / 100 / 12;
  let bal = initialPrincipal;
  let accruedInterest = 0;
  for (let mo = 0; mo <= 9999; mo++) {
    const m = purchaseAbsStartM + mo;
    let pmt = basePayment;
    for (const a of adjustments) {
      if (m >= absMo(a.year, a.monthIdx, simStartYear, simStartMonthIdx)) pmt = a.payment;
    }
    accruedInterest += r > 0 ? bal * r : 0;
    bal = r > 0 ? Math.max(0, bal * (1 + r) - pmt) : Math.max(0, bal - pmt);
    if (bal <= 0) return { payoffMonths: mo + 1, totalInterest: Math.max(0, Math.round(accruedInterest)) };
  }
  return { payoffMonths: 9999, totalInterest: 0 };
}

export function payoffLabel(
  purchase: Purchase,
  startYear: number = START_YEAR,
  startMonthIdx: number = 0,
): string {
  const mo = payoffMonths(purchase.loanAmount, purchase.rate, purchase.payment);
  if (mo >= 9999) return 'never';
  if (mo === 0)   return '—';
  const abs = absMo(purchase.year, purchase.monthIdx, startYear, startMonthIdx) + mo;
  if (abs <= 0) return 'already paid off';
  const yr = startYear + Math.floor(abs / 12);
  const mi = ((abs % 12) + 12) % 12;
  return `${MONTHS[mi]} ${yr}`;
}
