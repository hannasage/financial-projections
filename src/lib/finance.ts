import { START_YEAR, MONTHS } from './constants';
import type { Purchase } from './types';

export const absMo = (year: number, monthIdx: number): number =>
  (year - START_YEAR) * 12 + monthIdx;

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

export function payoffLabel(purchase: Purchase): string {
  const mo = payoffMonths(purchase.loanAmount, purchase.rate, purchase.payment);
  if (mo >= 9999) return 'never';
  if (mo === 0)   return '—';
  const abs = absMo(purchase.year, purchase.monthIdx) + mo;
  const yr  = START_YEAR + Math.floor(abs / 12);
  return `${MONTHS[abs % 12]} ${yr}`;
}
