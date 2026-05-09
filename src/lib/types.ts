export interface Scenario {
  envelope:     number;
  startSavings: number;
  startAge:     number;
  horizonYears: number;
  returnMode:   'none' | 'hysa' | 'invested';
  taxPct:       number;
  baseSalary:   number;
  housingCost:  number;
  debts:        Debt[];
  purchases:    Purchase[];
  raises:       Raise[];
}

export interface Debt {
  id:             string;
  label:          string;
  payment:        number;
  payoffMonthIdx: number;
  payoffYear:     number;
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
  age:             number;
  ageFloor:        number;
  savings:         number;
  savingsInflow:   number;
  debtBurden:      number;
  purchaseOutflow: number;
  raiseBonus:      number;
  rentRelief:      number;
  effectiveEnv:    number;
  activePurchases: string[];
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
