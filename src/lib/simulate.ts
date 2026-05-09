import type { Scenario, SimRow } from './types';
import { absMo, netMonthly, payoffMonths } from './finance';

export function simulate(
  scenario: Scenario,
  returnRate: number,
): SimRow[] {
  const {
    envelope, startSavings, startAge,
    debts, purchases, raises, taxPct, horizonYears, housingCost,
  } = scenario;

  const totalMonths = horizonYears * 12;
  const START_YEAR  = 2026;

  const sortedRaises = [...raises].sort(
    (a, b) => absMo(a.year, a.monthIdx) - absMo(b.year, b.monthIdx),
  );

  const purchaseMeta = purchases.map(p => ({
    ...p,
    startM:  absMo(p.year, p.monthIdx),
    payoffM: absMo(p.year, p.monthIdx) + payoffMonths(p.loanAmount, p.rate, p.payment),
  }));

  const baseSalary = raises[0]?.baseSalary ?? null;
  let savings = startSavings;
  const rows: SimRow[] = [];

  for (let m = 0; m <= totalMonths; m++) {
    const yr  = START_YEAR + Math.floor(m / 12);
    const age = startAge + m / 12;

    let raiseBonus = 0;
    if (baseSalary !== null && sortedRaises.length > 0) {
      let currentSalary = baseSalary;
      for (const r of sortedRaises) {
        if (m >= absMo(r.year, r.monthIdx)) currentSalary = r.salary;
        else break;
      }
      raiseBonus = Math.max(
        0,
        netMonthly(currentSalary, taxPct) - netMonthly(baseSalary, taxPct),
      );
    }

    const debtBurden = debts.reduce(
      (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx) ? d.payment : 0),
      0,
    );

    let purchaseOutflow = 0;
    let downThisMonth   = 0;
    let rentRelief      = 0;
    const activePurchases: string[] = [];

    for (const p of purchaseMeta) {
      if (m === p.startM && p.downPayment > 0) {
        downThisMonth += p.downPayment;
      }
      if (m >= p.startM && m < p.payoffM) {
        purchaseOutflow += p.payment;
        activePurchases.push(p.label || 'Purchase');
      }
      if (p.type === 'house' && m >= p.startM) {
        rentRelief += housingCost;
      }
    }

    if (downThisMonth > 0) savings -= downThisMonth;

    const effectiveEnv  = envelope + raiseBonus + rentRelief;
    const savingsInflow = effectiveEnv - debtBurden - purchaseOutflow;

    savings =
      returnRate > 0
        ? savings * (1 + returnRate / 12) + savingsInflow
        : savings + savingsInflow;

    rows.push({
      m,
      yr,
      age:             parseFloat(age.toFixed(2)),
      ageFloor:        Math.floor(age),
      savings:         Math.round(savings),
      savingsInflow:   Math.round(savingsInflow),
      debtBurden:      Math.round(debtBurden),
      purchaseOutflow: Math.round(purchaseOutflow),
      raiseBonus:      Math.round(raiseBonus),
      rentRelief:      Math.round(rentRelief),
      effectiveEnv:    Math.round(effectiveEnv),
      activePurchases,
    });
  }

  return rows;
}
