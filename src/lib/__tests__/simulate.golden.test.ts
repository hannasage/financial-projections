import { describe, it, expect } from 'vitest';
import { simulate } from '../simulate';
import { runSimulationInvariantChecks } from '../simulateInvariants';
import type { Scenario } from '../types';

function scenarioBase(over: Partial<Scenario> = {}): Scenario {
  return {
    startMonthIdx: 0,
    startYear: 2026,
    envelope: 1200,
    startSavings: 0,
    startAge: 30,
    horizonYears: 1,
    returnMode: 'none',
    taxPct: 25,
    baseSalary: 60_000,
    housingCost: 0,
    monthlyAllowance: 0,
    debts: [],
    purchases: [],
    raises: [],
    investments: [],
    recurringCharges: [],
    inflationPctAnnual: 0,
    ...over,
  };
}

describe('simulate golden fixtures', () => {
  it('accumulates cash with flat envelope (no yield)', () => {
    const rows = simulate(scenarioBase({ horizonYears: 1 }), 0);
    runSimulationInvariantChecks(rows);
    expect(rows[0].savings).toBe(1200);
    expect(rows[12].savings).toBe(1200 * 13);
    expect(rows[0].liquidInflow).toBe(1200);
  });

  it('one-time investment funding debits liquidity same month', () => {
    const rows = simulate(
      scenarioBase({
        envelope: 1000,
        housingCost: 1000,
        startSavings: 10_000,
        investments: [{
          id: 'broker',
          label: 'Brokerage',
          initialAmount: 3000,
          annualReturnPct: 0,
          monthlyContribution: 0,
          startYear: 2026,
          startMonthIdx: 0,
        }],
      }),
      0,
    );
    runSimulationInvariantChecks(rows);
    expect(rows[0].investments).toBe(3000);
    expect(rows[0].savings).toBe(7000);
    expect(rows[0].netWorth).toBe(10_000);
  });

  it('uses chronologically earliest raise for baseline salary (array order ignored)', () => {
    const rows = simulate(
      scenarioBase({
        horizonYears: 5,
        raises: [
          {
            id: 'later',
            year: 2030,
            monthIdx: 0,
            salary: 120_000,
            baseSalary: 60_000,
          },
          {
            id: 'earlier',
            year: 2028,
            monthIdx: 0,
            salary: 80_000,
            baseSalary: 55_000,
          },
        ],
      }),
      0,
    );
    runSimulationInvariantChecks(rows);
    const moRaise2028 = (2028 - 2026) * 12;
    expect(rows[moRaise2028 - 1].raiseBonus).toBe(0);
    expect(rows[moRaise2028].raiseBonus).toBeGreaterThan(0);
  });

  it('raises nominal envelope on projection-year boundaries', () => {
    const base = scenarioBase({ horizonYears: 2, envelope: 1000 });
    const flat = simulate(base, 0);
    const bumped = simulate({ ...base, inflationPctAnnual: 10 }, 0);
    runSimulationInvariantChecks(flat);
    runSimulationInvariantChecks(bumped);
    expect(bumped[12].effectiveEnv).toBeGreaterThan(flat[12].effectiveEnv);
  });
});
