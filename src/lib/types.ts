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
  /** Net monthly change to cash savings (excludes $ routed to investment accounts). */
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

export interface Plan {
  id:          string;
  user:        string;
  title:       string;
  description: string;
  color:       string;
  scenario:    Scenario;
  created:     string;
  updated:     string;
}
