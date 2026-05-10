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
  taxPct:              number;
  baseSalary:   number;
  housingCost:  number;
  /** Misc monthly spending drawn from envelope (discretionary allowance, etc.) */
  monthlyAllowance: number;
  debts:        Debt[];
  purchases:    Purchase[];
  raises:       Raise[];
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

export interface SimRow {
  m:               number;
  yr:              number;
  /** Calendar month index (0–11) for this simulation month */
  calendarMonthIdx: number;
  age:             number;
  ageFloor:        number;
  savings:         number;
  savingsInflow:   number;
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
