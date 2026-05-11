import type { SimRow } from './types';

const NUM_KEYS: (keyof SimRow)[] = [
  'm', 'yr', 'calendarMonthIdx', 'age', 'ageFloor', 'savings', 'savingsInflow',
  'investments', 'investmentContributions', 'recurringTotal', 'liquidTotal', 'liquidInflow',
  'debtBurden', 'debtOutstanding', 'purchaseOutflow', 'raiseBonus', 'rentRelief',
  'effectiveEnv', 'monthlyAllowance', 'netWorth', 'netWorthChange',
];

/** Throws if simulation output violates sanity checks (used in dev + tests). */
export function runSimulationInvariantChecks(rows: SimRow[]): void {
  if (rows.length === 0) throw new Error('simulate: empty rows');

  let prevSavings: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    for (const k of NUM_KEYS) {
      const v = row[k];
      if (typeof v === 'number' && !Number.isFinite(v)) {
        throw new Error(`simulate invariant: non-finite ${String(k)} at m=${row.m}`);
      }
    }
    if (row.liquidTotal !== row.savings) {
      throw new Error(`simulate invariant: liquidTotal !== savings at m=${row.m}`);
    }
    const sumIds = Object.values(row.investmentBalancesById).reduce((a, b) => a + b, 0);
    if (Math.abs(sumIds - row.investments) > 3) {
      throw new Error(`simulate invariant: investmentBalancesById sum drift at m=${row.m}`);
    }
    if (prevSavings !== null) {
      const delta = row.savings - prevSavings;
      // liquidInflow is rounded from float Δcash while savings rows round monthly balances → small drift
      if (Math.abs(delta - row.liquidInflow) > 12) {
        throw new Error(`simulate invariant: liquidInflow vs Δsavings drift at m=${row.m}`);
      }
    }
    prevSavings = row.savings;
  }
}
