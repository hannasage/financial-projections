import type { Scenario, SimRow, Debt } from './types';
import { absMo, netMonthly, payoffMonths, stdPayment, remainingBalance } from './finance';

function effectivePayment(d: Debt, m: number): number {
  if (!d.adjustments?.length) return d.payment;
  let payment = d.payment;
  for (const a of d.adjustments) {
    if (m >= absMo(a.year, a.monthIdx)) payment = a.payment;
  }
  return payment;
}

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
    debt:         Debt;
    payment:      number;
    apr:          number;
    fixedPayoffM: number;
    hasBalance:   boolean;
    dynBal:       number;
    done:         boolean;
  };
  const debtTrackers: DebtTracker[] | null = cascadeDebts && debts.length > 0
    ? debts.map(d => ({
        debt:         d,
        payment:      d.payment,
        apr:          d.apr ?? 0,
        fixedPayoffM: absMo(d.payoffYear, d.payoffMonthIdx),
        hasBalance:   (d.balance ?? 0) > 0,
        dynBal:       d.balance ?? 0,
        done:         false,
      }))
    : null;

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
      // Update each tracker's payment to reflect any adjustment active this month.
      for (const dt of debtTrackers) {
        if (!dt.done) dt.payment = effectivePayment(dt.debt, m);
      }
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
      const currentBudget = debtTrackers.reduce((s, dt) => s + (dt.done ? 0 : dt.payment), 0);
      debtBurden = debtTrackers.some(dt => !dt.done) ? currentBudget : 0;
    } else {
      debtBurden = debts.reduce(
        (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx) ? effectivePayment(d, m) : 0),
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

export function computePayoffs(scenario: Scenario): {
  debtPayoffM:     Map<string, number>;
  purchasePayoffM: Map<string, number>;
} {
  const { debts, purchases, cascadeDebts, horizonYears } = scenario;
  const searchMonths = horizonYears * 12 + 120;

  const debtPayoffM     = new Map<string, number>();
  const purchasePayoffM = new Map<string, number>();

  for (const p of purchases) {
    const startM = absMo(p.year, p.monthIdx);
    if (startM >= 0) {
      purchasePayoffM.set(p.id, startM + payoffMonths(p.loanAmount, p.rate, p.payment));
    } else {
      const basePmt   = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
      const remaining = remainingBalance(p.loanAmount, p.rate, basePmt, -startM);
      purchasePayoffM.set(p.id, payoffMonths(remaining, p.rate, p.payment));
    }
  }

  if (!cascadeDebts || debts.length === 0) {
    for (const d of debts) {
      const bal = d.balance ?? 0;
      if (bal <= 0) {
        debtPayoffM.set(d.id, absMo(d.payoffYear, d.payoffMonthIdx));
        continue;
      }
      const r = (d.apr ?? 0) / 100 / 12;
      let dynBal = bal;
      let found  = false;
      for (let m = 0; m <= searchMonths; m++) {
        const pmt = effectivePayment(d, m);
        dynBal = r > 0 ? Math.max(0, dynBal * (1 + r) - pmt) : Math.max(0, dynBal - pmt);
        if (dynBal <= 0) { debtPayoffM.set(d.id, m); found = true; break; }
      }
      if (!found) debtPayoffM.set(d.id, Infinity);
    }
  } else {
    type Tracker = {
      debt: Debt; payment: number; apr: number;
      fixedPayoffM: number; hasBalance: boolean; dynBal: number; done: boolean;
    };
    const trackers: Tracker[] = debts.map(d => ({
      debt:         d,
      payment:      d.payment,
      apr:          d.apr ?? 0,
      fixedPayoffM: absMo(d.payoffYear, d.payoffMonthIdx),
      hasBalance:   (d.balance ?? 0) > 0,
      dynBal:       d.balance ?? 0,
      done:         false,
    }));

    for (let m = 0; m <= searchMonths; m++) {
      for (const dt of trackers) {
        if (!dt.done) dt.payment = effectivePayment(dt.debt, m);
      }
      let pool = 0;
      for (const dt of trackers) {
        if (dt.done) {
          pool += dt.payment;
        } else if (!dt.hasBalance && m >= dt.fixedPayoffM) {
          dt.done = true;
          debtPayoffM.set(dt.debt.id, m);
          pool += dt.payment;
        }
      }
      let poolLeft = pool;
      for (const dt of trackers) {
        if (dt.done || !dt.hasBalance) continue;
        const r   = dt.apr / 100 / 12;
        const pmt = dt.payment + poolLeft;
        poolLeft  = 0;
        dt.dynBal = r > 0
          ? Math.max(0, dt.dynBal * (1 + r) - pmt)
          : Math.max(0, dt.dynBal - pmt);
        if (dt.dynBal <= 0) { dt.done = true; debtPayoffM.set(dt.debt.id, m); }
      }
      if (trackers.every(dt => dt.done)) break;
    }
    for (const dt of trackers) {
      if (!debtPayoffM.has(dt.debt.id)) debtPayoffM.set(dt.debt.id, Infinity);
    }
  }

  return { debtPayoffM, purchasePayoffM };
}
