import type {
  Debt, DebtAdjustment, Purchase, Raise, Investment, RecurringCharge, Scenario, Plan,
  InvestmentContributionAdjustment, InvestmentAdjustmentRecurrence,
  Marker, MarkerColorKey, BillAdjustment, PurchasePaymentAdjustment,
} from './types';
import { MARKER_COLOR_KEYS } from './types';

export function sanitizeBillAdjustment(raw: unknown, fallbackId: string): BillAdjustment | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === 'string' ? x.id : fallbackId;
  return {
    id,
    monthIdx: clampInt(x.monthIdx, 0, 11),
    year: clampFinite(x.year, 1970, 2200, new Date().getFullYear()),
    amount: clampFinite(x.amount, 0, 1e9),
  };
}

export function sanitizeBillAdjustmentArray(arr: unknown, idPrefix: string = 'b-adj'): BillAdjustment[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((a, i) => sanitizeBillAdjustment(a, `${idPrefix}-${i}`))
    .filter((x): x is BillAdjustment => x != null);
}

function sanitizePurchasePaymentAdjustment(raw: unknown, fallbackId: string): PurchasePaymentAdjustment | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as Record<string, unknown>;
  const id = typeof x.id === 'string' ? x.id : fallbackId;
  return {
    id,
    monthIdx: clampInt(x.monthIdx, 0, 11),
    year: clampFinite(x.year, 1970, 2200, new Date().getFullYear()),
    payment: clampFinite(x.payment, 0, 1e9),
  };
}

function clampFinite(n: unknown, min: number, max: number, fallback = 0): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

function clampInt(n: unknown, min: number, max: number, fallback = 0): number {
  return Math.round(clampFinite(n, min, max, fallback));
}

function safeString(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

function safeStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((i): i is string => typeof i === 'string');
}

export function sanitizeDebt(raw: unknown): Debt | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  const adjustments: DebtAdjustment[] | undefined = Array.isArray(r.adjustments)
    ? r.adjustments.map((a, idx): DebtAdjustment | null => {
        if (!a || typeof a !== 'object') return null;
        const x = a as Record<string, unknown>;
        return {
          id: typeof x.id === 'string' ? x.id : `adj-${id}-${idx}`,
          monthIdx: clampInt(x.monthIdx, 0, 11),
          year: clampFinite(x.year, 1970, 2200, new Date().getFullYear()),
          payment: clampFinite(x.payment, 0, 1e9),
        };
      }).filter((x): x is DebtAdjustment => x != null)
    : undefined;
  const adjustmentsClean = adjustments && adjustments.length > 0 ? adjustments : undefined;
  return {
    id,
    label: safeString(r.label),
    payment: clampFinite(r.payment, 0, 1e9),
    payoffMonthIdx: clampInt(r.payoffMonthIdx, 0, 11),
    payoffYear: clampFinite(r.payoffYear, 1970, 2200, new Date().getFullYear()),
    balance: r.balance != null ? clampFinite(r.balance, 0, 1e12) : undefined,
    apr: r.apr != null ? clampFinite(r.apr, 0, 100) : undefined,
    adjustments: adjustmentsClean,
  };
}

export function sanitizePurchase(raw: unknown): Purchase | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  const type = r.type === 'house' ? 'house' : 'loan';
  const adjustments: PurchasePaymentAdjustment[] | undefined = Array.isArray(r.adjustments)
    ? r.adjustments.map((a, i) => sanitizePurchasePaymentAdjustment(a, `pmt-adj-${id}-${i}`))
        .filter((x): x is PurchasePaymentAdjustment => x != null)
    : undefined;
  return {
    id,
    type,
    label: safeString(r.label),
    year: clampInt(r.year, 1970, 2200, new Date().getFullYear()),
    monthIdx: clampInt(r.monthIdx, 0, 11),
    downPayment: clampFinite(r.downPayment, 0, 1e12),
    loanAmount: clampFinite(r.loanAmount, 0, 1e12),
    rate: clampFinite(r.rate, 0, 100),
    termMonths: clampInt(r.termMonths, 1, 600, 60),
    multiplier: clampFinite(r.multiplier, 0.01, 100, 1),
    payment: clampFinite(r.payment, 0, 1e9),
    marketValue: r.marketValue != null ? clampFinite(r.marketValue, 0, 1e12) : undefined,
    ...(adjustments?.length ? { adjustments } : {}),
  };
}

export function sanitizeRaise(raw: unknown): Raise | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  return {
    id,
    year: clampInt(r.year, 1970, 2200, new Date().getFullYear()),
    monthIdx: clampInt(r.monthIdx, 0, 11),
    salary: clampFinite(r.salary, 0, 1e12),
    baseSalary: clampFinite(r.baseSalary, 0, 1e12),
  };
}

export function sanitizeInvestment(raw: unknown): Investment | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  const inv: Investment = {
    id,
    label: safeString(r.label),
    initialAmount: clampFinite(r.initialAmount, 0, 1e12),
    annualReturnPct: clampFinite(r.annualReturnPct, 0, 100),
    monthlyContribution: clampFinite(r.monthlyContribution, 0, 1e9),
  };
  if (r.startYear != null && Number.isFinite(Number(r.startYear))) inv.startYear = clampInt(r.startYear, 1970, 2200);
  if (r.startMonthIdx != null) inv.startMonthIdx = clampInt(r.startMonthIdx, 0, 11);
  if (r.sellYear != null && Number.isFinite(Number(r.sellYear))) inv.sellYear = clampInt(r.sellYear, 1970, 2200);
  if (r.sellMonthIdx != null) inv.sellMonthIdx = clampInt(r.sellMonthIdx, 0, 11);
  if (r.salePrice != null && Number.isFinite(Number(r.salePrice))) inv.salePrice = clampFinite(r.salePrice, 0, 1e12);
  if (r.capitalGainsTaxPct != null) inv.capitalGainsTaxPct = clampFinite(r.capitalGainsTaxPct, 0, 100);
  if (Array.isArray(r.adjustments)) {
    const adj = r.adjustments.map((a, idx): InvestmentContributionAdjustment | null => {
      if (!a || typeof a !== 'object') return null;
      const x = a as Record<string, unknown>;
      const monthlyContribution = x.monthlyContribution != null && Number.isFinite(Number(x.monthlyContribution))
        ? clampFinite(x.monthlyContribution, 0, 1e9)
        : undefined;
      // Signed delta — clamp to a wide bipolar range so users can subtract aggressively.
      const monthlyContributionDelta = x.monthlyContributionDelta != null && Number.isFinite(Number(x.monthlyContributionDelta))
        ? clampFinite(x.monthlyContributionDelta, -1e9, 1e9)
        : undefined;
      const lumpSum = x.lumpSum != null && Number.isFinite(Number(x.lumpSum))
        ? clampFinite(x.lumpSum, 0, 1e12)
        : undefined;

      let recurrence: InvestmentAdjustmentRecurrence | undefined;
      if (x.recurrence && typeof x.recurrence === 'object') {
        const rec = x.recurrence as Record<string, unknown>;
        const everyMonthsRaw = Number(rec.everyMonths);
        if (Number.isFinite(everyMonthsRaw) && everyMonthsRaw >= 1) {
          // Cap to 240 months (20yr) to avoid weird inputs; floor to integer.
          const everyMonths = Math.min(240, Math.max(1, Math.floor(everyMonthsRaw)));
          const hasEnd = rec.untilYear != null && rec.untilMonthIdx != null
            && Number.isFinite(Number(rec.untilYear)) && Number.isFinite(Number(rec.untilMonthIdx));
          recurrence = {
            everyMonths,
            ...(hasEnd
              ? {
                  untilYear: clampInt(rec.untilYear, 1970, 2200),
                  untilMonthIdx: clampInt(rec.untilMonthIdx, 0, 11),
                }
              : {}),
          };
        }
      }

      const hasAnyEffect = monthlyContribution != null
        || (monthlyContributionDelta != null && monthlyContributionDelta !== 0)
        || (lumpSum != null && lumpSum > 0);
      if (!hasAnyEffect) return null;
      return {
        id: typeof x.id === 'string' ? x.id : `inv-adj-${id}-${idx}`,
        monthIdx: clampInt(x.monthIdx, 0, 11),
        year: clampFinite(x.year, 1970, 2200, new Date().getFullYear()),
        ...(monthlyContribution != null ? { monthlyContribution } : {}),
        ...(monthlyContributionDelta != null ? { monthlyContributionDelta } : {}),
        ...(lumpSum != null ? { lumpSum } : {}),
        ...(recurrence ? { recurrence } : {}),
      };
    }).filter((x): x is InvestmentContributionAdjustment => x != null);
    if (adj.length > 0) inv.adjustments = adj;
  }
  return inv;
}

export function sanitizeMarker(raw: unknown): Marker | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  const color: MarkerColorKey = typeof r.color === 'string' && (MARKER_COLOR_KEYS as string[]).includes(r.color)
    ? r.color as MarkerColorKey
    : 'accent';
  const startYear = clampInt(r.startYear, 1970, 2200, new Date().getFullYear());
  const startMonthIdx = clampInt(r.startMonthIdx, 0, 11);
  const hasEnd = r.endYear != null && r.endMonthIdx != null
    && Number.isFinite(Number(r.endYear)) && Number.isFinite(Number(r.endMonthIdx));
  const marker: Marker = {
    id,
    title: safeString(r.title),
    color,
    startYear,
    startMonthIdx,
  };
  if (hasEnd) {
    marker.endYear = clampInt(r.endYear, 1970, 2200, startYear);
    marker.endMonthIdx = clampInt(r.endMonthIdx, 0, 11);
  }
  return marker;
}

export function sanitizeMarkerArray(arr: unknown): Marker[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeMarker).filter((m): m is Marker => m != null);
}

export function sanitizeRecurringCharge(raw: unknown): RecurringCharge | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  const adjustments: BillAdjustment[] | undefined = Array.isArray(r.adjustments)
    ? r.adjustments.map((a, i) => sanitizeBillAdjustment(a, `rc-adj-${id}-${i}`))
        .filter((x): x is BillAdjustment => x != null)
    : undefined;
  return {
    id,
    label: safeString(r.label),
    amount: clampFinite(r.amount, 0, 1e9),
    ...(adjustments?.length ? { adjustments } : {}),
  };
}

/** Merge incoming scenario with safe defaults; clamps numeric junk from imports. */
export function sanitizeScenario(raw: unknown): Scenario {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const debts = Array.isArray(r.debts) ? r.debts.map(sanitizeDebt).filter(Boolean) as Debt[] : [];
  const purchases = Array.isArray(r.purchases) ? r.purchases.map(sanitizePurchase).filter(Boolean) as Purchase[] : [];
  const raises = Array.isArray(r.raises) ? r.raises.map(sanitizeRaise).filter(Boolean) as Raise[] : [];
  const investments = Array.isArray(r.investments) ? r.investments.map(sanitizeInvestment).filter(Boolean) as Investment[] : [];
  const recurringCharges = Array.isArray(r.recurringCharges)
    ? r.recurringCharges.map(sanitizeRecurringCharge).filter(Boolean) as RecurringCharge[]
    : [];
  const rm = r.returnMode === 'none' || r.returnMode === 'invested' ? r.returnMode : 'hysa';
  return {
    startMonthIdx: clampInt(r.startMonthIdx, 0, 11),
    startYear: clampFinite(r.startYear, 1970, 2200, new Date().getFullYear()),
    envelope: clampFinite(r.envelope, 0, 1e9),
    startSavings: clampFinite(r.startSavings, -1e9, 1e12),
    startAge: clampFinite(r.startAge, 0, 120, 30),
    horizonYears: clampInt(r.horizonYears, 1, 80, 10),
    returnMode: rm,
    hysaRate: r.hysaRate != null ? clampFinite(r.hysaRate, 0, 50) : undefined,
    cascadeDebts: Boolean(r.cascadeDebts),
    excludedDebtIds: safeStringArray(r.excludedDebtIds),
    excludedPurchaseIds: safeStringArray(r.excludedPurchaseIds),
    excludedRaiseIds: safeStringArray(r.excludedRaiseIds),
    excludedInvestmentIds: safeStringArray(r.excludedInvestmentIds),
    excludedRecurringChargeIds: safeStringArray(r.excludedRecurringChargeIds),
    taxPct: clampFinite(r.taxPct, 0, 100, 25),
    baseSalary: clampFinite(r.baseSalary, 0, 1e12),
    housingCost: clampFinite(r.housingCost, 0, 1e9),
    housingAdjustments: Array.isArray(r.housingAdjustments)
      ? r.housingAdjustments.map((a, i) => sanitizeBillAdjustment(a, `h-adj-${i}`)).filter((x): x is BillAdjustment => x != null)
      : undefined,
    monthlyAllowance: clampFinite(r.monthlyAllowance, 0, 1e9),
    allowanceAdjustments: Array.isArray(r.allowanceAdjustments)
      ? r.allowanceAdjustments.map((a, i) => sanitizeBillAdjustment(a, `a-adj-${i}`)).filter((x): x is BillAdjustment => x != null)
      : undefined,
    retirementAge: r.retirementAge != null ? clampFinite(r.retirementAge, 0, 120) : undefined,
    retirementEnvelope: r.retirementEnvelope != null ? clampFinite(r.retirementEnvelope, 0, 1e9) : undefined,
    debts,
    purchases,
    raises,
    investments,
    recurringCharges,
    inflationPctAnnual: r.inflationPctAnnual != null ? clampFinite(r.inflationPctAnnual, 0, 50, 0) : undefined,
  };
}

export function sanitizePlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
  const scenario = sanitizeScenario(r.scenario);
  const markers = sanitizeMarkerArray(r.markers);
  const excludedMarkerIds = safeStringArray(r.excludedMarkerIds);
  return {
    id: r.id,
    user: typeof r.user === 'string' ? r.user : '',
    title: r.title,
    description: typeof r.description === 'string' ? r.description : '',
    color: typeof r.color === 'string' ? r.color : '#C9F53A',
    scenario,
    markers: markers.length > 0 ? markers : undefined,
    excludedMarkerIds: excludedMarkerIds.length > 0 ? excludedMarkerIds : undefined,
    created: typeof r.created === 'string' ? r.created : new Date().toISOString(),
    updated: typeof r.updated === 'string' ? r.updated : new Date().toISOString(),
  };
}

export function sanitizeDebtArray(arr: unknown): Debt[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeDebt).filter(Boolean) as Debt[];
}

export function sanitizePurchaseArray(arr: unknown): Purchase[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizePurchase).filter(Boolean) as Purchase[];
}

export function sanitizeRaiseArray(arr: unknown): Raise[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeRaise).filter(Boolean) as Raise[];
}

export function sanitizeInvestmentArray(arr: unknown): Investment[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeInvestment).filter(Boolean) as Investment[];
}

export function sanitizeRecurringChargeArray(arr: unknown): RecurringCharge[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(sanitizeRecurringCharge).filter(Boolean) as RecurringCharge[];
}
