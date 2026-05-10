import type { Scenario, SimRow, Debt } from './types';
import { absMo, netMonthly, payoffMonths, stdPayment, remainingBalance } from './finance';
import { getTodayStartDate } from './constants';

function effectivePayment(d: Debt, m: number, startYear: number, startMonthIdx: number): number {
  if (!d.adjustments?.length) return d.payment;
  let payment = d.payment;
  for (const a of d.adjustments) {
    if (m >= absMo(a.year, a.monthIdx, startYear, startMonthIdx)) payment = a.payment;
  }
  return payment;
}

/** Liabilities from non-purchase debts at the start of simulation month `m` (before that month’s payments). */
function nonPurchaseDebtOutstandingAtMonthStart(
  debts: Debt[],
  m: number,
  startYear: number,
  startMonthIdx: number,
): number {
  let total = 0;
  for (const d of debts) {
    const payoffM = absMo(d.payoffYear, d.payoffMonthIdx, startYear, startMonthIdx);
    if (m >= payoffM) continue;
    const pmt = effectivePayment(d, m, startYear, startMonthIdx);
    const hasBal = (d.balance ?? 0) > 0;
    if (hasBal) total += d.balance ?? 0;
    else total += pmt * Math.max(0, payoffM - m);
  }
  return total;
}

function preStartNetWorthFloat(
  startSavings: number,
  purchaseMeta: Array<{ startM: number; initialPrincipal: number; marketValue?: number }>,
  debts: Debt[],
  startYear: number,
  startMonthIdx: number,
): number {
  let nw = startSavings;
  for (const p of purchaseMeta) {
    const mv = p.marketValue;
    if (mv != null && mv > 0 && p.startM < 0) nw += mv;
  }
  for (const p of purchaseMeta) {
    if (p.startM < 0) nw -= p.initialPrincipal;
  }
  nw -= nonPurchaseDebtOutstandingAtMonthStart(debts, 0, startYear, startMonthIdx);
  return nw;
}

export function simulate(
  scenario: Scenario,
  returnRate: number,
): SimRow[] {
  const {
    envelope, startSavings, startAge, startYear, startMonthIdx,
    debts, purchases, raises, taxPct, horizonYears, housingCost, monthlyAllowance,
    cascadeDebts,
  } = scenario;
  const today = getTodayStartDate();
  const safeStartYear = Number.isFinite(startYear) ? startYear : today.startYear;
  const safeStartMonthIdx = Number.isFinite(startMonthIdx) ? Math.max(0, Math.min(11, startMonthIdx)) : today.startMonthIdx;

  const totalMonths = horizonYears * 12;
  const sortedRaises = [...raises].sort(
    (a, b) => absMo(a.year, a.monthIdx, safeStartYear, safeStartMonthIdx) - absMo(b.year, b.monthIdx, safeStartYear, safeStartMonthIdx),
  );

  type PurchaseMetaRow = (typeof purchases)[number] & {
    startM: number;
    payoffM: number;
    /** Principal balance at the first simulated month this loan is active */
    initialPrincipal: number;
  };
  const purchaseMeta: PurchaseMetaRow[] = purchases.map(p => {
    const startM = absMo(p.year, p.monthIdx, safeStartYear, safeStartMonthIdx);
    if (startM >= 0) {
      return {
        ...p,
        startM,
        payoffM: startM + payoffMonths(p.loanAmount, p.rate, p.payment),
        initialPrincipal: p.loanAmount,
      };
    }
    // Past loan: remaining balance uses the 1× std payment as historical baseline,
    // so the multiplier only accelerates payments from simulation start onward.
    const basePmt   = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
    const remaining = remainingBalance(p.loanAmount, p.rate, basePmt, -startM);
    return {
      ...p,
      startM,
      payoffM: startM + payoffMonths(remaining, p.rate, p.payment),
      initialPrincipal: remaining,
    };
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
        fixedPayoffM: absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx),
        hasBalance:   (d.balance ?? 0) > 0,
        dynBal:       d.balance ?? 0,
        done:         false,
      }))
    : null;

  const baseSalary = raises[0]?.baseSalary ?? null;
  let savings = startSavings;
  const rows: SimRow[] = [];

  // Month-by-month outstanding balances for visualization (non-cascade path).
  type NonCascadeDebtState = { dynBal: number; hasBal: boolean; payoffM: number };
  const ncDebtBal: NonCascadeDebtState[] | null = !debtTrackers && debts.length > 0
    ? debts.map(d => ({
        dynBal: Math.max(0, d.balance ?? 0),
        hasBal: (d.balance ?? 0) > 0,
        payoffM: absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx),
      }))
    : null;

  /** End-of-month remaining principal per purchase loan (for debt paydown chart) */
  const purchaseLoanDyn: number[] = purchaseMeta.map(() => 0);

  let prevNWForChange = preStartNetWorthFloat(
    startSavings, purchaseMeta, debts, safeStartYear, safeStartMonthIdx,
  );

  for (let m = 0; m <= totalMonths; m++) {
    const yr  = safeStartYear + Math.floor((safeStartMonthIdx + m) / 12);
    const calendarMonthIdx = ((safeStartMonthIdx + m) % 12 + 12) % 12;
    const age = startAge + m / 12;

    let raiseBonus = 0;
    if (baseSalary !== null && sortedRaises.length > 0) {
      let currentSalary = baseSalary;
      for (const r of sortedRaises) {
        if (m >= absMo(r.year, r.monthIdx, safeStartYear, safeStartMonthIdx)) currentSalary = r.salary;
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
        if (!dt.done) dt.payment = effectivePayment(dt.debt, m, safeStartYear, safeStartMonthIdx);
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
        (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx) ? effectivePayment(d, m, safeStartYear, safeStartMonthIdx) : 0),
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

    // Amortize purchase-loan principal (same schedule as purchaseOutflow) for debtOutstanding chart.
    for (let i = 0; i < purchaseMeta.length; i++) {
      const p = purchaseMeta[i];
      if (!p.loanAmount || p.loanAmount <= 0 || !p.payment || p.payment <= 0) {
        purchaseLoanDyn[i] = 0;
        continue;
      }
      if (m < p.startM || m >= p.payoffM) {
        purchaseLoanDyn[i] = 0;
        continue;
      }
      const atFirstSimMonth =
        (p.startM >= 0 && m === p.startM) || (p.startM < 0 && m === 0);
      const balStart = atFirstSimMonth ? p.initialPrincipal : purchaseLoanDyn[i];
      const rMo = p.rate / 100 / 12;
      purchaseLoanDyn[i] = rMo > 0
        ? Math.max(0, balStart * (1 + rMo) - p.payment)
        : Math.max(0, balStart - p.payment);
    }

    if (downThisMonth > 0) savings -= downThisMonth;

    const allowance = monthlyAllowance ?? 0;
    // Housing + allowance come out of envelope; buying a house offsets rent via rentRelief.
    const effectiveEnv  = envelope + raiseBonus - housingCost - allowance + rentRelief;
    const savingsInflow = effectiveEnv - debtBurden - purchaseOutflow;

    savings =
      returnRate > 0
        ? savings * (1 + returnRate / 12) + savingsInflow
        : savings + savingsInflow;

    let debtOutstanding = 0;
    if (debtTrackers && debtTrackers.length > 0) {
      for (const dt of debtTrackers) {
        if (dt.done) continue;
        if (dt.hasBalance) {
          debtOutstanding += dt.dynBal;
        } else {
          const rem = dt.fixedPayoffM - m;
          if (rem > 0) debtOutstanding += dt.payment * rem;
        }
      }
    } else if (ncDebtBal && debts.length > 0) {
      for (let i = 0; i < debts.length; i++) {
        const d = debts[i];
        const st = ncDebtBal[i];
        if (m >= st.payoffM) {
          st.dynBal = 0;
          continue;
        }
        if (!st.hasBal) continue;
        const pmt = effectivePayment(d, m, safeStartYear, safeStartMonthIdx);
        const rMo = (d.apr ?? 0) / 100 / 12;
        st.dynBal = rMo > 0
          ? Math.max(0, st.dynBal * (1 + rMo) - pmt)
          : Math.max(0, st.dynBal - pmt);
      }
      for (let i = 0; i < debts.length; i++) {
        const d = debts[i];
        const st = ncDebtBal[i];
        if (m >= st.payoffM) continue;
        const pmt = effectivePayment(d, m, safeStartYear, safeStartMonthIdx);
        if (st.hasBal) debtOutstanding += st.dynBal;
        else debtOutstanding += pmt * Math.max(0, st.payoffM - m);
      }
    }

    for (let i = 0; i < purchaseLoanDyn.length; i++) {
      debtOutstanding += purchaseLoanDyn[i];
    }

    let purchaseAssetMV = 0;
    for (const p of purchaseMeta) {
      const mv = p.marketValue;
      if (mv != null && mv > 0 && m >= p.startM) purchaseAssetMV += mv;
    }
    const rawNetWorth    = savings + purchaseAssetMV - debtOutstanding;
    const netWorth       = Math.round(rawNetWorth);
    const netWorthChange = Math.round(rawNetWorth - prevNWForChange);
    prevNWForChange      = rawNetWorth;

    rows.push({
      m,
      yr,
      calendarMonthIdx,
      age:             parseFloat(age.toFixed(2)),
      ageFloor:        Math.floor(age),
      savings:         Math.round(savings),
      savingsInflow:   Math.round(savingsInflow),
      debtBurden:      Math.round(debtBurden),
      debtOutstanding: Math.round(debtOutstanding),
      purchaseOutflow: Math.round(purchaseOutflow),
      raiseBonus:      Math.round(raiseBonus),
      rentRelief:      Math.round(rentRelief),
      effectiveEnv:    Math.round(effectiveEnv),
      monthlyAllowance: Math.round(allowance),
      activePurchases,
      netWorth,
      netWorthChange,
    });
  }

  return rows;
}

export function computePayoffs(scenario: Scenario): {
  debtPayoffM:     Map<string, number>;
  purchasePayoffM: Map<string, number>;
} {
  const { debts, purchases, cascadeDebts, horizonYears, startYear, startMonthIdx } = scenario;
  const today = getTodayStartDate();
  const safeStartYear = Number.isFinite(startYear) ? startYear : today.startYear;
  const safeStartMonthIdx = Number.isFinite(startMonthIdx) ? Math.max(0, Math.min(11, startMonthIdx)) : today.startMonthIdx;
  const searchMonths = horizonYears * 12 + 120;

  const debtPayoffM     = new Map<string, number>();
  const purchasePayoffM = new Map<string, number>();

  for (const p of purchases) {
    const startM = absMo(p.year, p.monthIdx, safeStartYear, safeStartMonthIdx);
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
        debtPayoffM.set(d.id, absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx));
        continue;
      }
      const r = (d.apr ?? 0) / 100 / 12;
      let dynBal = bal;
      let found  = false;
      for (let m = 0; m <= searchMonths; m++) {
        const pmt = effectivePayment(d, m, safeStartYear, safeStartMonthIdx);
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
      fixedPayoffM: absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx),
      hasBalance:   (d.balance ?? 0) > 0,
      dynBal:       d.balance ?? 0,
      done:         false,
    }));

    for (let m = 0; m <= searchMonths; m++) {
      for (const dt of trackers) {
        if (!dt.done) dt.payment = effectivePayment(dt.debt, m, safeStartYear, safeStartMonthIdx);
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
