export interface Scenario {
  startMonthIdx: number;
  startYear:     number;
  envelope:     number;
  startSavings: number;
  startAge:     number;
  horizonYears: number;
  returnMode:   'none' | 'hysa' | 'invested';
  hysaRate?:           number;   // percent, e.g. 4.5 — overrides the default when set
  cascadeDebts?:       boolean;  // freed debt payments redirect to remaining debts before savings
  excludedDebtIds?:     string[]; // library item IDs excluded from this scenario
  excludedPurchaseIds?: string[];
  excludedRaiseIds?:    string[];
  excludedInvestmentIds?:     string[];
  excludedRecurringChargeIds?: string[];
  taxPct:              number;
  baseSalary:   number;
  housingCost:  number;
  /** Misc monthly spending drawn from envelope (discretionary allowance, etc.) */
  monthlyAllowance: number;
  /** Annual nominal envelope growth (each full projection year). Optional; 0 = off. */
  inflationPctAnnual?: number;
  /** Optional retirement switch age. When reached, retirement envelope settings apply. */
  retirementAge?: number;
  /** Monthly envelope to use after retirement starts (defaults to working envelope if omitted). */
  retirementEnvelope?: number;
  debts:        Debt[];
  purchases:    Purchase[];
  raises:       Raise[];
  /** Brokerage / long-term buckets: separate return % and monthly buys from envelope. */
  investments?: Investment[];
  /** Subscriptions and other fixed monthly draws (in addition to allowance). */
  recurringCharges?: RecurringCharge[];
}

export interface DebtAdjustment {
  id:       string;
  monthIdx: number;
  year:     number;
  payment:  number;
}

export interface Debt {
  id:             string;
  label:          string;
  payment:        number;
  payoffMonthIdx: number;
  payoffYear:     number;
  balance?:       number;  // current outstanding balance
  apr?:           number;  // annual percentage rate (%)
  adjustments?:   DebtAdjustment[];
}

export interface Purchase {
  id:          string;
  type:        'loan' | 'house';
  label:       string;
  year:        number;
  monthIdx:    number;
  downPayment: number;
  loanAmount:  number;
  rate:        number;
  termMonths:  number;
  multiplier:  number;
  payment:     number;
  /** If set (>0), counts toward net worth (e.g. home/car resale value). Omit or 0 = liability-only (typical unsecured/vehicle loan). */
  marketValue?: number;
}

export interface Raise {
  id:         string;
  year:       number;
  monthIdx:   number;
  salary:     number;
  baseSalary: number;
}

export interface Investment {
  id:                  string;
  label:               string;
  initialAmount:       number;
  /** Annual return % (e.g. 7). Compounded monthly. */
  annualReturnPct:     number;
  monthlyContribution: number;
  /** First month this bucket exists; defaults to scenario plan start when omitted. */
  startYear?:          number;
  startMonthIdx?:      number;
  /** Sell the entire position in this month; net proceeds after tax go to cash. Omit both for hold. */
  sellYear?:           number;
  sellMonthIdx?:       number;
  /** Gross sale proceeds. Omit to use the modeled balance that month (growth + contributions). */
  salePrice?:          number;
  /** Capital gains tax on realized gain only: max(0, proceeds − cost basis) × pct/100. Basis = initial + contributions while held. */
  capitalGainsTaxPct?: number;
  /** Optional contribution plan changes by month (set new monthly add and/or one-time lump sum). */
  adjustments?: InvestmentContributionAdjustment[];
}

export interface InvestmentContributionAdjustment {
  id:                  string;
  monthIdx:            number;
  year:                number;
  /**
   * LEGACY: absolute monthly contribution set from this month onward. Prefer
   * `monthlyContributionDelta` for new adjustments — this field is retained so
   * existing plan data keeps simulating correctly.
   */
  monthlyContribution?: number;
  /**
   * Signed delta added to the prevailing monthly contribution from this month onward.
   * e.g. +50 means "bump contributions by $50/mo". When recurring, the delta is
   * re-applied at each occurrence so a "+50 every January" walks contributions up
   * gradually over time.
   */
  monthlyContributionDelta?: number;
  /** One-time add in this exact month (or per-occurrence when {@link recurrence} is set). */
  lumpSum?:            number;
  /** Optional repetition. Omit for a one-time adjustment. */
  recurrence?:         InvestmentAdjustmentRecurrence;
}

/** Defines how an {@link InvestmentContributionAdjustment} repeats over time. */
export interface InvestmentAdjustmentRecurrence {
  /** Months between occurrences (1 = monthly, 3 = quarterly, 12 = annually, etc.). */
  everyMonths:   number;
  /** Optional inclusive end month — omit to repeat through the projection horizon. */
  untilYear?:    number;
  untilMonthIdx?: number;
}

export interface RecurringCharge {
  id:     string;
  label:  string;
  amount: number;
}

export interface SimRow {
  m:               number;
  yr:              number;
  /** Calendar month index (0–11) for this simulation month */
  calendarMonthIdx: number;
  age:             number;
  ageFloor:        number;
  savings:         number;
  savingsInflow:   number;
  /** Separate investment / brokerage balances (each account’s own return + contributions). */
  investments:     number;
  /** Total contributed to investments this month (from envelope, before growth). */
  investmentContributions: number;
  /** Sum of itemized recurring charges / month. */
  recurringTotal:  number;
  /** Cash savings balance only (excludes invested balances). */
  liquidTotal:     number;
  /** Net monthly change in cash savings (envelope, yield, purchase downs, one-time investment funding, sale proceeds, etc.). */
  liquidInflow:    number;
  debtBurden:      number;
  /** Estimated total debt still owed (amortized balances + linear est. for payment-only debts) */
  debtOutstanding: number;
  purchaseOutflow: number;
  raiseBonus:      number;
  rentRelief:      number;
  effectiveEnv:    number;
  /** Monthly allowance deducted from envelope (same each month; for tooltips) */
  monthlyAllowance: number;
  activePurchases: string[];
  /** Liquid savings + owned purchase market values − total liabilities (debts + loan principals). */
  netWorth:        number;
  /** Month-over-month change in net worth (first month vs pre-projection baseline). */
  netWorthChange:  number;
  /** End-of-month balance per investment id (0 before start, after sale, or if excluded). */
  investmentBalancesById: Record<string, number>;
}

/** Semantic theme color keys allowed for plan markers (resolved at render via the active theme). */
export type MarkerColorKey = 'accent' | 'blue' | 'orange' | 'red' | 'purple' | 'dim';

export const MARKER_COLOR_KEYS: MarkerColorKey[] = ['accent', 'blue', 'orange', 'red', 'purple', 'dim'];

/** Plan-level annotation rendered on charts (e.g. "Asset Phase", "Kids in College"). */
export interface Marker {
  id:            string;
  title:         string;
  /** Theme color key — resolved against the active theme so markers track the user's palette. */
  color:         MarkerColorKey;
  startYear:     number;
  startMonthIdx: number;
  /** Optional ending date — when both endYear and endMonthIdx are set, marker renders as a range. */
  endYear?:      number;
  endMonthIdx?:  number;
}

export interface Plan {
  id:          string;
  user:        string;
  title:       string;
  description: string;
  color:       string;
  scenario:    Scenario;
  /** Plan-specific custom markers (in addition to library markers, minus excluded ones). */
  markers?:    Marker[];
  /** Library marker IDs hidden from this plan (e.g. after forking, or just per-plan opt-out). */
  excludedMarkerIds?: string[];
  created:     string;
  updated:     string;
}
