import type { Scenario, SimRow } from './types';
import { absMo, netMonthly, payoffMonths, stdPayment, remainingBalance } from './finance';

export function simulate(
  scenario: Scenario,
  returnRate: number,
): SimRow[] {
  const {
    envelope, startSavings, startAge,
    debts, purchases, raises, taxPct, horizonYears, housingCost,
    cascadeDebts,
  } = scenario;

  const totalMonths = horizonYears * 12;
  const START_YEAR  = 2026;

  const sortedRaises = [...raises].sort(
    (a, b) => absMo(a.year, a.monthIdx) - absMo(b.year, b.monthIdx),
  );

  const purchaseMeta = purchases.map(p => {
    const startM = absMo(p.year, p.monthIdx);
    if (startM >= 0) {
      return { ...p, startM, payoffM: startM + payoffMonths(p.loanAmount, p.rate, p.payment) };
    }
    // Past loan: remaining balance uses the 1× std payment as historical baseline,
    // so the multiplier only accelerates payments from simulation start onward.
    const basePmt   = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
    const remaining = remainingBalance(p.loanAmount, p.rate, basePmt, -startM);
    return { ...p, startM, payoffM: payoffMonths(remaining, p.rate, p.payment) };
  });

  // Cascade: mutable per-debt trackers persist across the month loop.
  type DebtTracker = {
    id:           string;
    payment:      number;
    apr:          number;
    fixedPayoffM: number;
    hasBalance:   boolean;
    dynBal:       number;
    done:         boolean;
  };
  const debtTrackers: DebtTracker[] | null = cascadeDebts && debts.length > 0
    ? debts.map(d => ({
        id:           d.id,
        payment:      d.payment,
        apr:          d.apr ?? 0,
        fixedPayoffM: absMo(d.payoffYear, d.payoffMonthIdx),
        hasBalance:   (d.balance ?? 0) > 0,
        dynBal:       d.balance ?? 0,
        done:         false,
      }))
    : null;
  const totalDebtBudget = debtTrackers
    ? debtTrackers.reduce((s, dt) => s + dt.payment, 0)
    : 0;

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

    let debtBurden: number;
    if (debtTrackers) {
      // Cascade mode: pool freed payments from paid-off debts → apply to remaining debts.
      let pool = 0;
      for (const dt of debtTrackers) {
        if (dt.done) {
          pool += dt.payment;
        } else if (!dt.hasBalance && m >= dt.fixedPayoffM) {
          dt.done = true;
          pool += dt.payment;
        }
      }
      // Apply pool + regular payment to balance-tracked debts (pool goes to first active one).
      let poolLeft = pool;
      for (const dt of debtTrackers) {
        if (dt.done || !dt.hasBalance) continue;
        const r = dt.apr / 100 / 12;
        const pmt = dt.payment + poolLeft;
        poolLeft = 0;
        dt.dynBal = r > 0
          ? Math.max(0, dt.dynBal * (1 + r) - pmt)
          : Math.max(0, dt.dynBal - pmt);
        if (dt.dynBal <= 0) dt.done = true;
      }
      debtBurden = debtTrackers.some(dt => !dt.done) ? totalDebtBudget : 0;
    } else {
      debtBurden = debts.reduce(
        (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx) ? d.payment : 0),
        0,
      );
    }

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
