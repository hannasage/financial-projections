import type { Scenario, SimRow, Debt, Investment, InvestmentContributionAdjustment } from './types';
import { absMo, netMonthly, stdPayment, remainingBalance, adjustedPurchaseStats } from './finance';
import { getTodayStartDate } from './constants';
import { runSimulationInvariantChecks } from './simulateInvariants';

function effectivePayment(d: Debt, m: number, startYear: number, startMonthIdx: number): number {
  if (!d.adjustments?.length) return d.payment;
  let payment = d.payment;
  for (const a of d.adjustments) {
    if (m >= absMo(a.year, a.monthIdx, startYear, startMonthIdx)) payment = a.payment;
  }
  return payment;
}

function effectiveBillAmount(
  adjustments: Array<{ year: number; monthIdx: number; amount: number }> | undefined,
  base: number,
  m: number,
  startYear: number,
  startMonthIdx: number,
): number {
  if (!adjustments?.length) return base;
  let amount = base;
  for (const a of adjustments) {
    if (m >= absMo(a.year, a.monthIdx, startYear, startMonthIdx)) amount = a.amount;
  }
  return amount;
}

function effectivePurchasePayment(
  adjustments: Array<{ year: number; monthIdx: number; payment: number }> | undefined,
  base: number,
  m: number,
  startYear: number,
  startMonthIdx: number,
): number {
  if (!adjustments?.length) return base;
  let payment = base;
  for (const a of adjustments) {
    if (m >= absMo(a.year, a.monthIdx, startYear, startMonthIdx)) payment = a.payment;
  }
  return payment;
}

/**
 * All occurrence months ≤ {@link maxM} for an adjustment. Single-shot adjustments yield one
 * value (their `year`/`monthIdx`); recurring adjustments yield `first, first+everyMonths, …`
 * up to {@link maxM} or the optional `untilYear`/`untilMonthIdx` end.
 *
 * Implemented as a plain array so the result can be reused without re-iterating.
 */
function adjustmentOccurrences(
  a: InvestmentContributionAdjustment,
  startYear: number,
  startMonthIdx: number,
  maxM: number,
): number[] {
  const first = absMo(a.year, a.monthIdx, startYear, startMonthIdx);
  if (first > maxM) return [];
  if (!a.recurrence) return first < 0 ? [] : [first];
  const step = Math.max(1, Math.floor(a.recurrence.everyMonths));
  const endM = a.recurrence.untilYear != null && a.recurrence.untilMonthIdx != null
    ? absMo(a.recurrence.untilYear, a.recurrence.untilMonthIdx, startYear, startMonthIdx)
    : maxM;
  const upper = Math.min(maxM, endM);
  if (first > upper) return [];
  const out: number[] = [];
  for (let w = first; w <= upper; w += step) {
    if (w >= 0) out.push(w);
  }
  return out;
}

function effectiveInvestmentMonthlyContribution(
  inv: Investment,
  m: number,
  startYear: number,
  startMonthIdx: number,
): number {
  let contrib = Math.max(0, inv.monthlyContribution ?? 0);
  if (!inv.adjustments?.length) return contrib;
  // Build an event timeline of all adjustment occurrences ≤ m, in chronological order.
  // - `monthlyContribution` (legacy absolute) resets the running contribution.
  // - `monthlyContributionDelta` (signed) adds to it. Either field can be paired with recurrence
  //   so deltas can simulate gradual increases (+50/yr) and absolutes can simulate stepwise resets.
  const events: Array<{ at: number; adj: InvestmentContributionAdjustment }> = [];
  for (const a of inv.adjustments) {
    for (const at of adjustmentOccurrences(a, startYear, startMonthIdx, m)) {
      events.push({ at, adj: a });
    }
  }
  events.sort((x, y) => x.at - y.at);
  for (const { adj } of events) {
    if (adj.monthlyContribution != null) {
      contrib = Math.max(0, adj.monthlyContribution);
    }
    if (adj.monthlyContributionDelta != null) {
      contrib = Math.max(0, contrib + adj.monthlyContributionDelta);
    }
  }
  return contrib;
}

function investmentLumpSumAtMonth(
  inv: Investment,
  m: number,
  startYear: number,
  startMonthIdx: number,
): number {
  if (!inv.adjustments?.length) return 0;
  let lump = 0;
  for (const a of inv.adjustments) {
    if (a.lumpSum == null || a.lumpSum <= 0) continue;
    for (const at of adjustmentOccurrences(a, startYear, startMonthIdx, m)) {
      if (at === m) lump += a.lumpSum;
    }
  }
  return lump;
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
  investmentInitialSum: number,
  purchaseMeta: Array<{ startM: number; initialPrincipal: number; marketValue?: number }>,
  debts: Debt[],
  startYear: number,
  startMonthIdx: number,
): number {
  let nw = startSavings + investmentInitialSum;
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
    retirementAge,
    retirementEnvelope,
    investments: investmentList = [],
    recurringCharges: recurringList = [],
  } = scenario;
  const today = getTodayStartDate();
  const safeStartYear = Number.isFinite(startYear) ? startYear : today.startYear;
  const safeStartMonthIdx = Number.isFinite(startMonthIdx) ? Math.max(0, Math.min(11, startMonthIdx)) : today.startMonthIdx;

  const totalMonths = horizonYears * 12;
  const sortedRaises = [...raises].sort(
    (a, b) => absMo(a.year, a.monthIdx, safeStartYear, safeStartMonthIdx) - absMo(b.year, b.monthIdx, safeStartYear, safeStartMonthIdx),
  );
  /** Chronologically earliest raise defines baseline salary (array order no longer matters). */
  const baseSalary = sortedRaises[0]?.baseSalary ?? null;

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
        payoffM: startM + adjustedPurchaseStats(
          p.loanAmount, p.rate, p.payment, p.adjustments, startM, safeStartYear, safeStartMonthIdx,
        ).payoffMonths,
        initialPrincipal: p.loanAmount,
      };
    }
    // Past loan: remaining balance uses the 1× std payment as historical baseline,
    // so the multiplier only accelerates payments from simulation start onward.
    // payoffM is plan-relative (not startM-relative) because `remaining` is already
    // the balance at plan-start month 0 — simulating from purchaseAbsStartM=0 is correct.
    const basePmt   = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
    const remaining = remainingBalance(p.loanAmount, p.rate, basePmt, -startM);
    return {
      ...p,
      startM,
      payoffM: adjustedPurchaseStats(
        remaining, p.rate, p.payment, p.adjustments, 0, safeStartYear, safeStartMonthIdx,
      ).payoffMonths,
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

  const inflationPctAnnual = Math.max(0, scenario.inflationPctAnnual ?? 0);
  let envelopeLive = envelope;
  let retirementEnvelopeLive = Math.max(0, retirementEnvelope ?? envelope);
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

  // recurringTotal is now computed per-month inside the loop to apply per-charge adjustments.

  type InvMeta = {
    id: string;
    startM: number;
    sellM: number;
    initial: number;
    cgPct: number;
    salePrice?: number;
  };

  const invMeta: InvMeta[] = investmentList.map((inv: Investment) => {
    const sy = inv.startYear ?? safeStartYear;
    const smi = inv.startMonthIdx ?? safeStartMonthIdx;
    const startM = absMo(sy, smi, safeStartYear, safeStartMonthIdx);
    let sellM = Infinity;
    if (inv.sellYear != null && inv.sellMonthIdx != null) {
      sellM = absMo(inv.sellYear, inv.sellMonthIdx, safeStartYear, safeStartMonthIdx);
      if (sellM < startM) sellM = Infinity;
    }
    return {
      id: inv.id,
      startM,
      sellM,
      initial: Math.max(0, inv.initialAmount ?? 0),
      cgPct: Math.max(0, inv.capitalGainsTaxPct ?? 0),
      salePrice: inv.salePrice,
    };
  });

  const nInv = investmentList.length;
  const invBalances = new Array<number>(nInv).fill(0);
  const invBasis    = new Array<number>(nInv).fill(0);
  const invSold     = new Array<boolean>(nInv).fill(false);
  const invRMonthly = investmentList.map(i => Math.max(0, i.annualReturnPct ?? 0) / 100 / 12);
  const invContrib  = investmentList.map(i => Math.max(0, i.monthlyContribution ?? 0));

  // Investments already held before the plan start (startM < 0): balances exist but no cash movement now.
  // startM ≥ 0: initial funding is applied in that simulation month and debited from cash (liquidity).
  for (let i = 0; i < nInv; i++) {
    if (invMeta[i].startM < 0) {
      invBalances[i] = invMeta[i].initial;
      invBasis[i]    = invMeta[i].initial;
    }
  }

  const investmentInitialSum = invMeta.reduce((s, meta) => s + (meta.startM < 0 ? meta.initial : 0), 0);

  let prevNWForChange = preStartNetWorthFloat(
    startSavings, investmentInitialSum, purchaseMeta, debts, safeStartYear, safeStartMonthIdx,
  );

  for (let m = 0; m <= totalMonths; m++) {
    const savingsAtMonthStart = savings;

    if (m > 0 && m % 12 === 0 && inflationPctAnnual > 0) {
      envelopeLive *= 1 + inflationPctAnnual / 100;
      retirementEnvelopeLive *= 1 + inflationPctAnnual / 100;
    }

    const yr  = safeStartYear + Math.floor((safeStartMonthIdx + m) / 12);
    const calendarMonthIdx = ((safeStartMonthIdx + m) % 12 + 12) % 12;
    const age = startAge + m / 12;
    const retired = retirementAge != null && age >= retirementAge;

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
      // poolApplied: freed payments actually redirected to a debt balance (not left as savings).
      // These must be debited from cash just like regular payments — the total outflow stays
      // constant while cascade is active; only the destination changes.
      const poolApplied = pool - poolLeft;
      const currentBudget = debtTrackers.reduce((s, dt) => s + (dt.done ? 0 : dt.payment), 0);
      debtBurden = currentBudget + poolApplied;
    } else {
      debtBurden = debts.reduce(
        (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx, safeStartYear, safeStartMonthIdx) ? effectivePayment(d, m, safeStartYear, safeStartMonthIdx) : 0),
        0,
      );
    }

    const housingCostM = effectiveBillAmount(scenario.housingAdjustments, housingCost, m, safeStartYear, safeStartMonthIdx);
    const allowanceM   = effectiveBillAmount(scenario.allowanceAdjustments, monthlyAllowance ?? 0, m, safeStartYear, safeStartMonthIdx);
    const recurringTotalM = recurringList.reduce(
      (s, c) => s + Math.max(0, effectiveBillAmount(c.adjustments, c.amount, m, safeStartYear, safeStartMonthIdx)), 0,
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
        const effPmt = effectivePurchasePayment(p.adjustments, p.payment, m, safeStartYear, safeStartMonthIdx);
        purchaseOutflow += effPmt;
        activePurchases.push(p.label || 'Purchase');
      }
      if (p.type === 'house' && m >= p.startM) {
        rentRelief += housingCostM;
      }
    }

    // Amortize purchase-loan principal (mirrors purchaseOutflow) for debtOutstanding chart.
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
      const effPmt = effectivePurchasePayment(p.adjustments, p.payment, m, safeStartYear, safeStartMonthIdx);
      purchaseLoanDyn[i] = rMo > 0
        ? Math.max(0, balStart * (1 + rMo) - effPmt)
        : Math.max(0, balStart - effPmt);
    }

    if (downThisMonth > 0) savings -= downThisMonth;

    let invContribSum = 0;
    for (let i = 0; i < nInv; i++) {
      if (invSold[i]) continue;
      const { startM, sellM } = invMeta[i];
      if (m < startM) continue;
      if (m > sellM) continue;
      invContrib[i] = effectiveInvestmentMonthlyContribution(investmentList[i], m, safeStartYear, safeStartMonthIdx);
      invContribSum += invContrib[i];
    }
    // Housing + allowance + itemized recurring come out of envelope; house offsets rent via rentRelief.
    // After retirement age, switch to retirement envelope and stop applying raise delta.
    const liveEnvelope = retired ? retirementEnvelopeLive : envelopeLive;
    const streamBonus = retired ? 0 : raiseBonus;
    const effectiveEnv  = liveEnvelope + streamBonus - housingCostM - allowanceM - recurringTotalM + rentRelief;
    const savingsInflow = effectiveEnv - debtBurden - purchaseOutflow - invContribSum;

    savings =
      returnRate > 0
        ? savings * (1 + returnRate / 12) + savingsInflow
        : savings + savingsInflow;

    let investmentBalance = 0;
    const investmentBalancesById: Record<string, number> = {};

    for (let i = 0; i < nInv; i++) {
      const meta = invMeta[i];
      const id   = meta.id;

      if (invSold[i]) {
        investmentBalancesById[id] = 0;
        continue;
      }
      if (m < meta.startM) {
        invBalances[i] = 0;
        investmentBalancesById[id] = 0;
        continue;
      }

      let bal = invBalances[i];
      if (m === meta.startM && meta.startM >= 0 && meta.initial > 0) {
        bal += meta.initial;
        invBasis[i] += meta.initial;
        savings -= meta.initial;
      }

      const c = invContrib[i];
      const lump = investmentLumpSumAtMonth(investmentList[i], m, safeStartYear, safeStartMonthIdx);
      if (lump > 0) {
        bal += lump;
        invBasis[i] += lump;
        savings -= lump;
      }
      bal = bal * (1 + invRMonthly[i]) + c;
      invBasis[i] += c;

      if (Number.isFinite(meta.sellM) && m === meta.sellM) {
        const modeledBal = bal;
        const proceeds = meta.salePrice != null && Number.isFinite(meta.salePrice)
          ? Math.max(0, meta.salePrice)
          : modeledBal;
        const gain = Math.max(0, proceeds - invBasis[i]);
        const tax  = gain * meta.cgPct / 100;
        savings += proceeds - tax;
        bal = 0;
        invBasis[i] = 0;
        invSold[i] = true;
      }

      invBalances[i] = bal;
      investmentBalance += bal;
      investmentBalancesById[id] = Math.round(bal);
    }

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
    // Liquidity = cash on hand (HYSA / checking path only). Investments stay in net worth, not "liquid".
    const liquidTotal   = savings;
    const liquidInflow  = savings - savingsAtMonthStart;
    const rawNetWorth    = savings + investmentBalance + purchaseAssetMV - debtOutstanding;
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
      investments:     Math.round(investmentBalance),
      investmentContributions: Math.round(invContribSum),
      recurringTotal:  Math.round(recurringTotalM),
      liquidTotal:     Math.round(liquidTotal),
      liquidInflow:    Math.round(liquidInflow),
      debtBurden:      Math.round(debtBurden),
      debtOutstanding: Math.round(debtOutstanding),
      purchaseOutflow: Math.round(purchaseOutflow),
      raiseBonus:      Math.round(raiseBonus),
      rentRelief:      Math.round(rentRelief),
      effectiveEnv:    Math.round(effectiveEnv),
      monthlyAllowance: Math.round(allowanceM),
      activePurchases,
      netWorth,
      netWorthChange,
      investmentBalancesById: { ...investmentBalancesById },
    });
  }

  if (import.meta.env.DEV) {
    try {
      runSimulationInvariantChecks(rows);
    } catch (e) {
      console.error('[simulate] invariant check failed:', e);
    }
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
      purchasePayoffM.set(p.id, startM + adjustedPurchaseStats(
        p.loanAmount, p.rate, p.payment, p.adjustments, startM, safeStartYear, safeStartMonthIdx,
      ).payoffMonths);
    } else {
      const basePmt   = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
      const remaining = remainingBalance(p.loanAmount, p.rate, basePmt, -startM);
      purchasePayoffM.set(p.id, adjustedPurchaseStats(
        remaining, p.rate, p.payment, p.adjustments, 0, safeStartYear, safeStartMonthIdx,
      ).payoffMonths);
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
