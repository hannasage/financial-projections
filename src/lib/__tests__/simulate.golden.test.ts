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

  it('recurring contribution delta walks monthly buys up each year', () => {
    // Baseline $100/mo + annual "+$50" delta starting Jan 2027 should compound to $150/mo
    // in year 2 and $200/mo in year 3 (months 12 and 24 onward).
    const rows = simulate(
      scenarioBase({
        horizonYears: 3,
        envelope: 1000,
        investments: [{
          id: 'rampUp',
          label: 'Ramp',
          initialAmount: 0,
          annualReturnPct: 0,
          monthlyContribution: 100,
          startYear: 2026,
          startMonthIdx: 0,
          adjustments: [{
            id: 'adj-yr',
            year: 2027,
            monthIdx: 0,
            monthlyContributionDelta: 50,
            recurrence: { everyMonths: 12 },
          }],
        }],
      }),
      0,
    );
    runSimulationInvariantChecks(rows);
    // Year 1 buys: 12 × $100 = $1,200
    expect(rows[11].investments).toBeCloseTo(1200, 1);
    // Year 2 buys (after Jan 2027 occurrence): 12 × $150 = $1,800; cumulative $3,000
    expect(rows[23].investments).toBeCloseTo(3000, 1);
    // Year 3 buys (after Jan 2028 occurrence): 12 × $200 = $2,400; cumulative $5,400
    expect(rows[35].investments).toBeCloseTo(5400, 1);
  });

  it('recurring lump sum deposits at every occurrence and stops at the end date', () => {
    // $500 every April, ending April 2027 inclusive → two occurrences:
    //   month 3  (Apr 2026)
    //   month 15 (Apr 2027)
    // Month 27 (Apr 2028) should NOT fire because of the end-date.
    const rows = simulate(
      scenarioBase({
        horizonYears: 3,
        envelope: 1000,
        investments: [{
          id: 'lumps',
          label: 'Lump-sum bucket',
          initialAmount: 0,
          annualReturnPct: 0,
          monthlyContribution: 0,
          startYear: 2026,
          startMonthIdx: 0,
          adjustments: [{
            id: 'adj-lump',
            year: 2026,
            monthIdx: 3,
            lumpSum: 500,
            recurrence: { everyMonths: 12, untilYear: 2027, untilMonthIdx: 3 },
          }],
        }],
      }),
      0,
    );
    runSimulationInvariantChecks(rows);
    // Before first occurrence: zero contribution.
    expect(rows[2].investments).toBe(0);
    // First lump (month 3): $500.
    expect(rows[3].investments).toBe(500);
    // Between occurrences (month 14): still $500.
    expect(rows[14].investments).toBe(500);
    // Second lump (month 15): $1000 cumulative.
    expect(rows[15].investments).toBe(1000);
    // After end-date — no third lump at month 27.
    expect(rows[26].investments).toBe(1000);
    expect(rows[27].investments).toBe(1000);
  });
});
