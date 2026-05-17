import { describe, it, expect } from 'vitest';
import {
  parseBackupJson,
  BACKUP_FORMAT,
  BACKUP_VERSION,
} from '../dataBackup';
import {
  sanitizeDebt,
  sanitizePurchase,
  sanitizeInvestment,
  sanitizeRecurringCharge,
  sanitizeScenario,
  sanitizeMarker,
  sanitizePlan,
} from '../sanitizeFinanceData';
import { normalizeProfile } from '../../stores/libraryStore';

// ─── normalizeProfile ────────────────────────────────────────────────────────

describe('normalizeProfile', () => {
  it('clamps hysaRate above 50 down to 50', () => {
    const p = normalizeProfile({ hysaRate: 99 });
    expect(p.hysaRate).toBe(50);
  });

  it('clamps hysaRate at exactly 50 (boundary)', () => {
    const p = normalizeProfile({ hysaRate: 50 });
    expect(p.hysaRate).toBe(50);
  });

  it('clamps hysaRate below 0 up to 0 (negative → uses default 4.5)', () => {
    // Negative is not >= 0, so it falls back to DEFAULT_PROFILE.hysaRate (4.5)
    const p = normalizeProfile({ hysaRate: -1 });
    expect(p.hysaRate).toBe(4.5);
  });

  it('non-finite hysaRate falls back to DEFAULT (4.5)', () => {
    const p = normalizeProfile({ hysaRate: NaN });
    expect(p.hysaRate).toBe(4.5);
  });

  it('non-finite hysaRate (Infinity) falls back to DEFAULT (4.5)', () => {
    const p = normalizeProfile({ hysaRate: Infinity });
    expect(p.hysaRate).toBe(4.5);
  });

  it('housingAdjustments: corrupt entry is dropped, valid entry is preserved', () => {
    const p = normalizeProfile({
      housingAdjustments: [
        null, // corrupt — no object
        { id: 'h1', monthIdx: 0, year: 2027, amount: 1500 },
      ] as unknown as import('../types').BillAdjustment[],
    });
    expect(p.housingAdjustments).toEqual([
      { id: 'h1', monthIdx: 0, year: 2027, amount: 1500 },
    ]);
  });

  it('housingAdjustments: empty array yields undefined', () => {
    const p = normalizeProfile({ housingAdjustments: [] });
    expect(p.housingAdjustments).toBeUndefined();
  });

  it('housingAdjustments: null input yields undefined', () => {
    const p = normalizeProfile({ housingAdjustments: undefined });
    expect(p.housingAdjustments).toBeUndefined();
  });

  it('allowanceAdjustments: corrupt entry is dropped, valid entry is preserved', () => {
    const p = normalizeProfile({
      allowanceAdjustments: [
        { id: 'a1', monthIdx: 3, year: 2028, amount: 200 },
        'bad' as unknown as import('../types').BillAdjustment, // corrupt
      ],
    });
    expect(p.allowanceAdjustments).toEqual([
      { id: 'a1', monthIdx: 3, year: 2028, amount: 200 },
    ]);
  });

  it('allowanceAdjustments: empty array yields undefined', () => {
    const p = normalizeProfile({ allowanceAdjustments: [] });
    expect(p.allowanceAdjustments).toBeUndefined();
  });
});

// ─── sanitizeDebt ────────────────────────────────────────────────────────────

describe('sanitizeDebt', () => {
  it('preserves all fields: id, label, payment, payoffMonthIdx, payoffYear, balance, apr, adjustments', () => {
    const raw = {
      id: 'debt-1',
      label: 'Car loan',
      payment: 350,
      payoffMonthIdx: 5,
      payoffYear: 2029,
      balance: 8000,
      apr: 6.9,
      adjustments: [
        { id: 'adj-1', monthIdx: 0, year: 2027, payment: 400 },
      ],
    };
    const result = sanitizeDebt(raw);
    expect(result).toEqual({
      id: 'debt-1',
      label: 'Car loan',
      payment: 350,
      payoffMonthIdx: 5,
      payoffYear: 2029,
      balance: 8000,
      apr: 6.9,
      adjustments: [{ id: 'adj-1', monthIdx: 0, year: 2027, payment: 400 }],
    });
  });

  it('returns null for missing id', () => {
    expect(sanitizeDebt({ label: 'no id', payment: 100, payoffMonthIdx: 0, payoffYear: 2030 })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(sanitizeDebt(null)).toBeNull();
    expect(sanitizeDebt('string')).toBeNull();
    expect(sanitizeDebt(42)).toBeNull();
  });

  it('clamps payment to non-negative (negative → 0)', () => {
    const result = sanitizeDebt({ id: 'd1', label: '', payment: -100, payoffMonthIdx: 0, payoffYear: 2030 });
    expect(result?.payment).toBe(0);
  });

  it('adjustments array sanitized — corrupt entry dropped, valid entry preserved', () => {
    const raw = {
      id: 'debt-2',
      label: 'Card',
      payment: 100,
      payoffMonthIdx: 0,
      payoffYear: 2028,
      adjustments: [
        null, // corrupt
        { id: 'adj-ok', monthIdx: 2, year: 2027, payment: 150 },
      ],
    };
    const result = sanitizeDebt(raw);
    expect(result?.adjustments).toEqual([
      { id: 'adj-ok', monthIdx: 2, year: 2027, payment: 150 },
    ]);
  });

  it('adjustments omitted when array is empty after sanitization', () => {
    const result = sanitizeDebt({
      id: 'd3',
      label: '',
      payment: 100,
      payoffMonthIdx: 0,
      payoffYear: 2028,
      adjustments: [null, null],
    });
    expect(result?.adjustments).toBeUndefined();
  });
});

// ─── sanitizePurchase ────────────────────────────────────────────────────────

describe('sanitizePurchase', () => {
  const base = {
    id: 'p1',
    type: 'house',
    label: 'My Home',
    year: 2026,
    monthIdx: 3,
    downPayment: 60000,
    loanAmount: 240000,
    rate: 6.5,
    termMonths: 360,
    multiplier: 1,
    payment: 1517,
  };

  it('preserves marketValue when present', () => {
    const result = sanitizePurchase({ ...base, marketValue: 300000 });
    expect(result?.marketValue).toBe(300000);
  });

  it('omits marketValue when absent', () => {
    const result = sanitizePurchase(base);
    expect(result?.marketValue).toBeUndefined();
  });

  it('preserves adjustments (PurchasePaymentAdjustment)', () => {
    const result = sanitizePurchase({
      ...base,
      adjustments: [{ id: 'pa1', monthIdx: 6, year: 2027, payment: 1600 }],
    });
    expect(result?.adjustments).toEqual([
      { id: 'pa1', monthIdx: 6, year: 2027, payment: 1600 },
    ]);
  });

  it("defaults type to 'loan' for unknown type strings", () => {
    const result = sanitizePurchase({ ...base, type: 'spaceship' });
    expect(result?.type).toBe('loan');
  });

  it("preserves 'house' type", () => {
    const result = sanitizePurchase({ ...base, type: 'house' });
    expect(result?.type).toBe('house');
  });

  it('returns null for missing id', () => {
    expect(sanitizePurchase({ ...base, id: undefined })).toBeNull();
  });
});

// ─── sanitizeInvestment ──────────────────────────────────────────────────────

describe('sanitizeInvestment', () => {
  const base = {
    id: 'inv-1',
    label: 'Brokerage',
    initialAmount: 10000,
    annualReturnPct: 7,
    monthlyContribution: 500,
  };

  it('preserves adjustments with recurrence (everyMonths, untilYear, untilMonthIdx)', () => {
    const result = sanitizeInvestment({
      ...base,
      adjustments: [{
        id: 'a1',
        monthIdx: 0,
        year: 2027,
        monthlyContributionDelta: 100,
        recurrence: { everyMonths: 12, untilYear: 2030, untilMonthIdx: 11 },
      }],
    });
    expect(result?.adjustments).toEqual([{
      id: 'a1',
      monthIdx: 0,
      year: 2027,
      monthlyContributionDelta: 100,
      recurrence: { everyMonths: 12, untilYear: 2030, untilMonthIdx: 11 },
    }]);
  });

  it('preserves lumpSum adjustments', () => {
    const result = sanitizeInvestment({
      ...base,
      adjustments: [{
        id: 'a2',
        monthIdx: 6,
        year: 2026,
        lumpSum: 5000,
      }],
    });
    expect(result?.adjustments?.[0].lumpSum).toBe(5000);
  });

  it('preserves legacy monthlyContribution field in adjustment', () => {
    const result = sanitizeInvestment({
      ...base,
      adjustments: [{
        id: 'a3',
        monthIdx: 0,
        year: 2027,
        monthlyContribution: 800,
      }],
    });
    expect(result?.adjustments?.[0].monthlyContribution).toBe(800);
  });

  it('preserves signed monthlyContributionDelta including negative values', () => {
    const result = sanitizeInvestment({
      ...base,
      adjustments: [{
        id: 'a4',
        monthIdx: 0,
        year: 2028,
        monthlyContributionDelta: -200,
      }],
    });
    expect(result?.adjustments?.[0].monthlyContributionDelta).toBe(-200);
  });

  it('drops adjustment with zero delta AND no lumpSum AND no legacy contribution (no effect)', () => {
    const result = sanitizeInvestment({
      ...base,
      adjustments: [{
        id: 'a5',
        monthIdx: 1,
        year: 2027,
        monthlyContributionDelta: 0, // zero — no effect
      }],
    });
    expect(result?.adjustments).toBeUndefined();
  });

  it('preserves sell fields (sellYear, sellMonthIdx, salePrice, capitalGainsTaxPct)', () => {
    const result = sanitizeInvestment({
      ...base,
      sellYear: 2035,
      sellMonthIdx: 11,
      salePrice: 50000,
      capitalGainsTaxPct: 15,
    });
    expect(result?.sellYear).toBe(2035);
    expect(result?.sellMonthIdx).toBe(11);
    expect(result?.salePrice).toBe(50000);
    expect(result?.capitalGainsTaxPct).toBe(15);
  });

  it('returns null for missing id', () => {
    expect(sanitizeInvestment({ ...base, id: undefined })).toBeNull();
  });
});

// ─── sanitizeScenario ────────────────────────────────────────────────────────

describe('sanitizeScenario', () => {
  const base = {
    startMonthIdx: 0,
    startYear: 2026,
    envelope: 1200,
    startSavings: 5000,
    startAge: 30,
    horizonYears: 10,
    returnMode: 'hysa',
    taxPct: 25,
    baseSalary: 60000,
    housingCost: 1500,
    monthlyAllowance: 200,
    debts: [],
    purchases: [],
    raises: [],
    investments: [],
    recurringCharges: [],
  };

  it('preserves housingAdjustments', () => {
    const result = sanitizeScenario({
      ...base,
      housingAdjustments: [{ id: 'h1', monthIdx: 0, year: 2027, amount: 1800 }],
    });
    expect(result.housingAdjustments).toEqual([
      { id: 'h1', monthIdx: 0, year: 2027, amount: 1800 },
    ]);
  });

  it('preserves allowanceAdjustments', () => {
    const result = sanitizeScenario({
      ...base,
      allowanceAdjustments: [{ id: 'a1', monthIdx: 6, year: 2027, amount: 300 }],
    });
    expect(result.allowanceAdjustments).toEqual([
      { id: 'a1', monthIdx: 6, year: 2027, amount: 300 },
    ]);
  });

  it('preserves cascadeDebts: true', () => {
    const result = sanitizeScenario({ ...base, cascadeDebts: true });
    expect(result.cascadeDebts).toBe(true);
  });

  it('preserves excludedDebtIds, excludedPurchaseIds, excludedRaiseIds, excludedInvestmentIds, excludedRecurringChargeIds', () => {
    const result = sanitizeScenario({
      ...base,
      excludedDebtIds: ['d1', 'd2'],
      excludedPurchaseIds: ['p1'],
      excludedRaiseIds: ['r1'],
      excludedInvestmentIds: ['i1'],
      excludedRecurringChargeIds: ['rc1'],
    });
    expect(result.excludedDebtIds).toEqual(['d1', 'd2']);
    expect(result.excludedPurchaseIds).toEqual(['p1']);
    expect(result.excludedRaiseIds).toEqual(['r1']);
    expect(result.excludedInvestmentIds).toEqual(['i1']);
    expect(result.excludedRecurringChargeIds).toEqual(['rc1']);
  });

  it('preserves inflationPctAnnual', () => {
    const result = sanitizeScenario({ ...base, inflationPctAnnual: 3.5 });
    expect(result.inflationPctAnnual).toBe(3.5);
  });

  it('preserves retirementAge and retirementEnvelope', () => {
    const result = sanitizeScenario({ ...base, retirementAge: 65, retirementEnvelope: 3000 });
    expect(result.retirementAge).toBe(65);
    expect(result.retirementEnvelope).toBe(3000);
  });
});

// ─── sanitizeMarker ──────────────────────────────────────────────────────────

describe('sanitizeMarker', () => {
  it('preserves endYear/endMonthIdx when both are set', () => {
    const result = sanitizeMarker({
      id: 'm1',
      title: 'Retirement',
      color: 'blue',
      startYear: 2030,
      startMonthIdx: 0,
      endYear: 2040,
      endMonthIdx: 11,
    });
    expect(result?.endYear).toBe(2040);
    expect(result?.endMonthIdx).toBe(11);
  });

  it('omits endYear/endMonthIdx when only one is provided', () => {
    const resultEndYearOnly = sanitizeMarker({
      id: 'm2',
      title: 'Partial',
      color: 'accent',
      startYear: 2030,
      startMonthIdx: 0,
      endYear: 2040, // only endYear, no endMonthIdx
    });
    expect(resultEndYearOnly?.endYear).toBeUndefined();
    expect(resultEndYearOnly?.endMonthIdx).toBeUndefined();

    const resultEndMonthOnly = sanitizeMarker({
      id: 'm3',
      title: 'Partial2',
      color: 'accent',
      startYear: 2030,
      startMonthIdx: 0,
      endMonthIdx: 5, // only endMonthIdx, no endYear
    });
    expect(resultEndMonthOnly?.endYear).toBeUndefined();
    expect(resultEndMonthOnly?.endMonthIdx).toBeUndefined();
  });

  it("falls back to 'accent' for unknown color key", () => {
    const result = sanitizeMarker({
      id: 'm4',
      title: 'Test',
      color: 'neon-pink',
      startYear: 2026,
      startMonthIdx: 0,
    });
    expect(result?.color).toBe('accent');
  });

  it('returns null for missing id', () => {
    expect(sanitizeMarker({ title: 'No ID', color: 'accent', startYear: 2026, startMonthIdx: 0 })).toBeNull();
  });

  it('preserves valid color keys', () => {
    for (const color of ['accent', 'blue', 'orange', 'red', 'purple', 'dim'] as const) {
      const result = sanitizeMarker({ id: `m-${color}`, title: color, color, startYear: 2026, startMonthIdx: 0 });
      expect(result?.color).toBe(color);
    }
  });
});

// ─── sanitizePlan ────────────────────────────────────────────────────────────

describe('sanitizePlan', () => {
  const baseScenario = {
    startMonthIdx: 0,
    startYear: 2026,
    envelope: 1000,
    startSavings: 0,
    startAge: 30,
    horizonYears: 5,
    returnMode: 'hysa',
    taxPct: 25,
    baseSalary: 60000,
    housingCost: 1000,
    monthlyAllowance: 0,
    debts: [],
    purchases: [],
    raises: [],
  };

  const basePlan = {
    id: 'plan-1',
    user: 'user-1',
    title: 'Main Plan',
    description: 'A plan',
    color: '#C9F53A',
    scenario: baseScenario,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  };

  it('preserves plan.markers array', () => {
    const result = sanitizePlan({
      ...basePlan,
      markers: [
        { id: 'pm1', title: 'Goal', color: 'orange', startYear: 2027, startMonthIdx: 0 },
      ],
    });
    expect(result?.markers).toEqual([
      { id: 'pm1', title: 'Goal', color: 'orange', startYear: 2027, startMonthIdx: 0 },
    ]);
  });

  it('preserves plan.excludedMarkerIds array', () => {
    const result = sanitizePlan({
      ...basePlan,
      excludedMarkerIds: ['lib-m1', 'lib-m2'],
    });
    expect(result?.excludedMarkerIds).toEqual(['lib-m1', 'lib-m2']);
  });

  it('returns null when id is missing', () => {
    expect(sanitizePlan({ ...basePlan, id: undefined })).toBeNull();
  });

  it('returns null when title is missing', () => {
    expect(sanitizePlan({ ...basePlan, title: undefined })).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(sanitizePlan(null)).toBeNull();
    expect(sanitizePlan('bad')).toBeNull();
  });
});

// ─── sanitizeRecurringCharge ─────────────────────────────────────────────────

describe('sanitizeRecurringCharge', () => {
  it('preserves adjustments', () => {
    const result = sanitizeRecurringCharge({
      id: 'rc1',
      label: 'Netflix',
      amount: 18,
      adjustments: [
        { id: 'rca1', monthIdx: 0, year: 2027, amount: 22 },
      ],
    });
    expect(result?.adjustments).toEqual([
      { id: 'rca1', monthIdx: 0, year: 2027, amount: 22 },
    ]);
  });

  it('returns null for missing id', () => {
    expect(sanitizeRecurringCharge({ label: 'X', amount: 10 })).toBeNull();
  });

  it('preserves id, label, amount', () => {
    const result = sanitizeRecurringCharge({ id: 'rc2', label: 'Spotify', amount: 11 });
    expect(result).toEqual({ id: 'rc2', label: 'Spotify', amount: 11 });
  });
});

// ─── parseBackupJson ─────────────────────────────────────────────────────────

describe('parseBackupJson', () => {
  it('returns null for null input', () => {
    expect(parseBackupJson('null')).toBeNull();
  });

  it('returns null for non-JSON input', () => {
    expect(parseBackupJson('not valid json {')).toBeNull();
  });

  it('returns null for wrong format string', () => {
    const bad = JSON.stringify({
      format: 'wrong-format',
      version: BACKUP_VERSION,
      library: {},
    });
    expect(parseBackupJson(bad)).toBeNull();
  });

  it('returns null for wrong version number', () => {
    const bad = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 999,
      library: {},
    });
    expect(parseBackupJson(bad)).toBeNull();
  });

  it('returns null when library is not a record', () => {
    const bad = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      library: null,
    });
    expect(parseBackupJson(bad)).toBeNull();
  });

  it('full round-trip: serialized backup is re-parsed preserving all fields', () => {
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: '2026-05-17T00:00:00Z',
      exportedFrom: 'local' as const,
      library: {
        profile: {
          startMonthIdx: 4,
          startYear: 2026,
          envelope: 2000,
          startSavings: 10000,
          startAge: 35,
          horizonYears: 20,
          returnMode: 'hysa' as const,
          hysaRate: 4.5,
          taxPct: 22,
          baseSalary: 90000,
          housingCost: 2000,
          monthlyAllowance: 300,
          inflationPctAnnual: 2,
          retirementAge: 65,
          retirementEnvelope: 3500,
          housingAdjustments: [{ id: 'h1', monthIdx: 0, year: 2028, amount: 2200 }],
          allowanceAdjustments: [{ id: 'a1', monthIdx: 0, year: 2029, amount: 400 }],
        },
        debts: [
          {
            id: 'debt-1',
            label: 'Student loan',
            payment: 400,
            payoffMonthIdx: 8,
            payoffYear: 2031,
            balance: 12000,
            apr: 5.5,
            adjustments: [{ id: 'da1', monthIdx: 0, year: 2027, payment: 500 }],
          },
        ],
        purchases: [
          {
            id: 'purch-1',
            type: 'house',
            label: 'Home',
            year: 2026,
            monthIdx: 5,
            downPayment: 80000,
            loanAmount: 320000,
            rate: 6.75,
            termMonths: 360,
            multiplier: 1,
            payment: 2075,
            marketValue: 400000,
            adjustments: [{ id: 'pa1', monthIdx: 0, year: 2030, payment: 2100 }],
          },
        ],
        investments: [
          {
            id: 'inv-1',
            label: '401k',
            initialAmount: 50000,
            annualReturnPct: 7,
            monthlyContribution: 1000,
            sellYear: 2055,
            sellMonthIdx: 11,
            salePrice: 1000000,
            capitalGainsTaxPct: 15,
            adjustments: [
              {
                id: 'ia1',
                monthIdx: 0,
                year: 2027,
                monthlyContributionDelta: 200,
                lumpSum: 5000,
                recurrence: { everyMonths: 12, untilYear: 2040, untilMonthIdx: 0 },
              },
            ],
          },
        ],
        recurringCharges: [
          {
            id: 'rc-1',
            label: 'Gym',
            amount: 60,
            adjustments: [{ id: 'rca1', monthIdx: 6, year: 2027, amount: 75 }],
          },
        ],
        raises: [
          { id: 'raise-1', year: 2027, monthIdx: 0, salary: 95000, baseSalary: 90000 },
        ],
        markers: [
          { id: 'lib-m1', title: 'College Phase', color: 'orange', startYear: 2030, startMonthIdx: 8, endYear: 2034, endMonthIdx: 5 },
          { id: 'lib-m2', title: 'Retirement', color: 'purple', startYear: 2046, startMonthIdx: 0 },
        ],
      },
      plans: [
        {
          id: 'plan-1',
          user: 'user-1',
          title: 'Base Plan',
          description: 'My plan',
          color: '#C9F53A',
          scenario: {
            startMonthIdx: 0,
            startYear: 2026,
            envelope: 2000,
            startSavings: 10000,
            startAge: 35,
            horizonYears: 20,
            returnMode: 'hysa',
            hysaRate: 4.5,
            taxPct: 22,
            baseSalary: 90000,
            housingCost: 2000,
            monthlyAllowance: 300,
            inflationPctAnnual: 2,
            retirementAge: 65,
            retirementEnvelope: 3500,
            cascadeDebts: true,
            excludedDebtIds: ['debt-old'],
            excludedPurchaseIds: ['purch-old'],
            excludedRaiseIds: [],
            excludedInvestmentIds: ['inv-old'],
            excludedRecurringChargeIds: ['rc-old'],
            housingAdjustments: [{ id: 'sh1', monthIdx: 0, year: 2028, amount: 2500 }],
            allowanceAdjustments: [{ id: 'sa1', monthIdx: 0, year: 2029, amount: 350 }],
            debts: [],
            purchases: [],
            raises: [],
            investments: [],
            recurringCharges: [],
          },
          markers: [
            { id: 'pm1', title: 'Side Hustle', color: 'blue', startYear: 2028, startMonthIdx: 0 },
          ],
          excludedMarkerIds: ['lib-m2'],
          created: '2026-01-01T00:00:00Z',
          updated: '2026-01-01T00:00:00Z',
        },
      ],
      planOrder: ['plan-1'],
      planActive: ['plan-1'],
    };

    const json = JSON.stringify(backup);
    const result = parseBackupJson(json);

    expect(result).not.toBeNull();
    expect(result?.format).toBe(BACKUP_FORMAT);
    expect(result?.version).toBe(BACKUP_VERSION);
    expect(result?.exportedAt).toBe('2026-05-17T00:00:00Z');

    // Library profile
    const prof = result?.library.profile;
    expect(prof?.hysaRate).toBe(4.5);
    expect(prof?.startMonthIdx).toBe(4);
    expect(prof?.startYear).toBe(2026);
    expect(prof?.retirementAge).toBe(65);
    expect(prof?.retirementEnvelope).toBe(3500);
    expect(prof?.inflationPctAnnual).toBe(2);
    expect(prof?.housingAdjustments).toEqual([{ id: 'h1', monthIdx: 0, year: 2028, amount: 2200 }]);
    expect(prof?.allowanceAdjustments).toEqual([{ id: 'a1', monthIdx: 0, year: 2029, amount: 400 }]);

    // Debts with adjustments
    expect(result?.library.debts).toHaveLength(1);
    const debt = result?.library.debts[0];
    expect(debt?.id).toBe('debt-1');
    expect(debt?.balance).toBe(12000);
    expect(debt?.apr).toBe(5.5);
    expect(debt?.adjustments).toEqual([{ id: 'da1', monthIdx: 0, year: 2027, payment: 500 }]);

    // Purchases with adjustments and marketValue
    expect(result?.library.purchases).toHaveLength(1);
    const purch = result?.library.purchases[0];
    expect(purch?.marketValue).toBe(400000);
    expect(purch?.adjustments).toEqual([{ id: 'pa1', monthIdx: 0, year: 2030, payment: 2100 }]);

    // Investments with adjustments + recurrence + sell fields
    expect(result?.library.investments).toHaveLength(1);
    const inv = result?.library.investments[0];
    expect(inv?.sellYear).toBe(2055);
    expect(inv?.sellMonthIdx).toBe(11);
    expect(inv?.salePrice).toBe(1000000);
    expect(inv?.capitalGainsTaxPct).toBe(15);
    expect(inv?.adjustments).toHaveLength(1);
    const adj = inv?.adjustments?.[0];
    expect(adj?.monthlyContributionDelta).toBe(200);
    expect(adj?.lumpSum).toBe(5000);
    expect(adj?.recurrence).toEqual({ everyMonths: 12, untilYear: 2040, untilMonthIdx: 0 });

    // RecurringCharges with adjustments
    expect(result?.library.recurringCharges).toHaveLength(1);
    expect(result?.library.recurringCharges[0].adjustments).toEqual([
      { id: 'rca1', monthIdx: 6, year: 2027, amount: 75 },
    ]);

    // Raises
    expect(result?.library.raises).toHaveLength(1);
    expect(result?.library.raises[0].id).toBe('raise-1');

    // Library markers
    expect(result?.library.markers).toHaveLength(2);
    expect(result?.library.markers[0]).toEqual({
      id: 'lib-m1',
      title: 'College Phase',
      color: 'orange',
      startYear: 2030,
      startMonthIdx: 8,
      endYear: 2034,
      endMonthIdx: 5,
    });
    expect(result?.library.markers[1]).toEqual({
      id: 'lib-m2',
      title: 'Retirement',
      color: 'purple',
      startYear: 2046,
      startMonthIdx: 0,
    });

    // Plans with scenario, markers, excludedMarkerIds
    expect(result?.plans).toHaveLength(1);
    const plan = result?.plans[0];
    expect(plan?.id).toBe('plan-1');
    expect(plan?.title).toBe('Base Plan');
    expect(plan?.scenario.cascadeDebts).toBe(true);
    expect(plan?.scenario.excludedDebtIds).toEqual(['debt-old']);
    expect(plan?.scenario.excludedPurchaseIds).toEqual(['purch-old']);
    expect(plan?.scenario.excludedInvestmentIds).toEqual(['inv-old']);
    expect(plan?.scenario.excludedRecurringChargeIds).toEqual(['rc-old']);
    expect(plan?.scenario.housingAdjustments).toEqual([
      { id: 'sh1', monthIdx: 0, year: 2028, amount: 2500 },
    ]);
    expect(plan?.scenario.allowanceAdjustments).toEqual([
      { id: 'sa1', monthIdx: 0, year: 2029, amount: 350 },
    ]);
    expect(plan?.markers).toEqual([
      { id: 'pm1', title: 'Side Hustle', color: 'blue', startYear: 2028, startMonthIdx: 0 },
    ]);
    expect(plan?.excludedMarkerIds).toEqual(['lib-m2']);

    // planOrder / planActive
    expect(result?.planOrder).toEqual(['plan-1']);
    expect(result?.planActive).toEqual(['plan-1']);
  });
});
