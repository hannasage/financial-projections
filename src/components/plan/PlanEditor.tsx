import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { MONTHS } from '../../lib/constants';
import { getTodayStartDate } from '../../lib/constants';
import { useColors, usePlanColors } from '../../stores/themeStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { absMo, money, shortK, stdPayment, payoffMonths, getReturnRate } from '../../lib/finance';
import { simulate } from '../../lib/simulate';
import { mergeIntoScenario } from '../../lib/resolveItems';
import { ChartTooltip } from './ChartTooltip';
import { DebtItem } from './DebtItem';
import { PurchaseItem } from './PurchaseItem';
import { RaiseItem } from './RaiseItem';
import { InvestmentItem } from './InvestmentItem';
import { RecurringChargeItem } from './RecurringChargeItem';
import type { Scenario, Debt, Purchase, Raise, Investment, RecurringCharge } from '../../lib/types';

const makeId = () => crypto.randomUUID();

const DEFAULT_SCENARIO: Scenario = {
  startMonthIdx: 0, startYear: 2026,
  envelope: 1_000, startSavings: 0, startAge: 30, horizonYears: 10,
  returnMode: 'hysa', taxPct: 25, baseSalary: 60_000, housingCost: 1_200, monthlyAllowance: 0,
  debts: [], purchases: [], raises: [],
  investments: [], recurringCharges: [],
  excludedDebtIds: [], excludedPurchaseIds: [], excludedRaiseIds: [],
  excludedInvestmentIds: [], excludedRecurringChargeIds: [],
};

interface SectionHeadProps {
  label:     string;
  onAdd?:    () => void;
  addLabel?: string;
  addBtnStyle: React.CSSProperties;
  labelStyle:  React.CSSProperties;
}

function SectionHead({ label, onAdd, addLabel = '+ Add', addBtnStyle, labelStyle }: SectionHeadProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
      <span style={labelStyle}>{label}</span>
      {onAdd && <button onClick={onAdd} style={addBtnStyle}>{addLabel}</button>}
    </div>
  );
}

interface Props {
  initialScenario?: Scenario;
  color?:         string;
  onSave:         (scenario: Scenario) => void;
  onCancel:       () => void;
  isSaving?:      boolean;
  footerPosition?: 'fixed' | 'sticky';
}

export function PlanEditor({ initialScenario, color, onSave, onCancel, isSaving, footerPosition = 'fixed' }: Props) {
  const COLORS = useColors();
  const planPalette = usePlanColors();
  const themeAccent = useThemeStore(s => s.theme.colors.accent);
  const accent = color ?? themeAccent;
  const init = initialScenario ?? DEFAULT_SCENARIO;
  const today = getTodayStartDate();
  const safeStartYear = Number.isFinite(Number(init.startYear)) ? Number(init.startYear) : today.startYear;
  const safeStartMonthIdx = Number.isFinite(Number(init.startMonthIdx))
    ? Math.max(0, Math.min(11, Number(init.startMonthIdx)))
    : today.startMonthIdx;

  const S = {
    label: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' as const },
    field: {
      background: COLORS.faint, color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4, padding: '7px 9px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, outline: 'none',
      WebkitAppearance: 'none' as const, appearance: 'none' as const,
    },
  };

  const chipStyle = (active: boolean, chipColor: string = accent): React.CSSProperties => ({
    padding: '5px 9px', fontSize: 11, borderRadius: 4,
    border:     `1px solid ${active ? chipColor : COLORS.border}`,
    background:  active ? `${chipColor}22` : 'transparent',
    color:       active ? chipColor : COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
  });

  const addBtnStyle: React.CSSProperties = {
    padding: '6px 13px', fontSize: 11, borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
    background: 'transparent', color: COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', flexShrink: 0,
  };

  const [tableYears, setTableYears] = useState<number | null>(null);
  const [debts,               setDebts]               = useState<Debt[]>(init.debts);
  const [cascadeDebts,        setCascadeDebts]        = useState(init.cascadeDebts ?? false);
  const [purchases,           setPurchases]           = useState<Purchase[]>(init.purchases);
  const [raises,              setRaises]              = useState<Raise[]>(init.raises);
  const [investments,         setInvestments]         = useState<Investment[]>(init.investments ?? []);
  const [recurringCharges,    setRecurringCharges]    = useState<RecurringCharge[]>(init.recurringCharges ?? []);
  const [excludedDebtIds,     setExcludedDebtIds]     = useState<string[]>(init.excludedDebtIds     ?? []);
  const [excludedPurchaseIds, setExcludedPurchaseIds] = useState<string[]>(init.excludedPurchaseIds ?? []);
  const [excludedRaiseIds,    setExcludedRaiseIds]    = useState<string[]>(init.excludedRaiseIds    ?? []);
  const [excludedInvestmentIds, setExcludedInvestmentIds] = useState<string[]>(init.excludedInvestmentIds ?? []);
  const [excludedRecurringChargeIds, setExcludedRecurringChargeIds] = useState<string[]>(init.excludedRecurringChargeIds ?? []);

  const library = useLibraryStore();

  const toggleDebt     = useCallback((id: string) => setExcludedDebtIds(ids     => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const togglePurchase = useCallback((id: string) => setExcludedPurchaseIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const toggleRaise    = useCallback((id: string) => setExcludedRaiseIds(ids    => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const toggleInvestment = useCallback((id: string) => setExcludedInvestmentIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const toggleRecurringCharge = useCallback((id: string) => setExcludedRecurringChargeIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);

  // Fork: copy a library item as a scenario-specific custom item, then exclude the library version.
  const forkDebt     = useCallback((d: Debt)     => { setDebts(ds => [...ds, { ...d, id: makeId() }]);     setExcludedDebtIds(ids     => ids.includes(d.id) ? ids : [...ids, d.id]); }, []);
  const forkPurchase = useCallback((p: Purchase) => { setPurchases(ps => [...ps, { ...p, id: makeId() }]); setExcludedPurchaseIds(ids => ids.includes(p.id) ? ids : [...ids, p.id]); }, []);
  const forkRaise    = useCallback((r: Raise)    => { setRaises(rs => [...rs, { ...r, id: makeId() }]);     setExcludedRaiseIds(ids    => ids.includes(r.id) ? ids : [...ids, r.id]); }, []);
  const forkInvestment = useCallback((i: Investment) => {
    setInvestments(xs => [...xs, { ...i, id: makeId() }]);
    setExcludedInvestmentIds(ids => ids.includes(i.id) ? ids : [...ids, i.id]);
  }, []);
  const forkRecurringCharge = useCallback((c: RecurringCharge) => {
    setRecurringCharges(xs => [...xs, { ...c, id: makeId() }]);
    setExcludedRecurringChargeIds(ids => ids.includes(c.id) ? ids : [...ids, c.id]);
  }, []);

  const resolvedDebts     = useMemo(() => [...library.debts.filter(d => !excludedDebtIds.includes(d.id)),         ...debts],     [library.debts,     excludedDebtIds,     debts]);
  const resolvedPurchases = useMemo(() => [...library.purchases.filter(p => !excludedPurchaseIds.includes(p.id)), ...purchases], [library.purchases, excludedPurchaseIds, purchases]);
  const resolvedInvestments = useMemo(
    () => [...library.investments.filter(i => !excludedInvestmentIds.includes(i.id)), ...investments],
    [library.investments, excludedInvestmentIds, investments],
  );
  const resolvedRecurringCharges = useMemo(
    () => [...library.recurringCharges.filter(c => !excludedRecurringChargeIds.includes(c.id)), ...recurringCharges],
    [library.recurringCharges, excludedRecurringChargeIds, recurringCharges],
  );
  const resolvedRaises = useMemo(
    () => [...library.raises.filter(r => !excludedRaiseIds.includes(r.id)), ...raises],
    [library.raises, excludedRaiseIds, raises],
  );

  const addDebt    = () => setDebts(d => [...d, { id: makeId(), label: '', payment: 200, payoffMonthIdx: safeStartMonthIdx, payoffYear: safeStartYear + 1 }]);
  const changeDebt = useCallback((id: string, patch: Partial<Debt>) => setDebts(d => d.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmDebt     = useCallback((id: string) => setDebts(d => d.filter(x => x.id !== id)), []);

  const addPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    setPurchases(ps => [...ps, {
      id: makeId(), type: 'loan', label: '',
      year: safeStartYear + 2, monthIdx: safeStartMonthIdx,
      downPayment: 0, loanAmount, rate, termMonths, multiplier,
      payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
    }]);
  };
  const changePurchase = useCallback((id: string, patch: Partial<Purchase>) => setPurchases(ps => ps.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmPurchase     = useCallback((id: string) => setPurchases(ps => ps.filter(x => x.id !== id)), []);

  const addRaise    = () => setRaises(r => [...r, { id: makeId(), year: safeStartYear + 3, monthIdx: safeStartMonthIdx, salary: init.baseSalary + 10_000, baseSalary: init.baseSalary }]);
  const changeRaise = useCallback((id: string, patch: Partial<Raise>) => setRaises(r => r.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmRaise     = useCallback((id: string) => setRaises(r => r.filter(x => x.id !== id)), []);

  const addInvestment = () => setInvestments(xs => [...xs, {
    id: makeId(), label: '', initialAmount: 0, annualReturnPct: 7, monthlyContribution: 0,
    startYear: safeStartYear, startMonthIdx: safeStartMonthIdx,
  }]);
  const changeInvestment = useCallback((id: string, patch: Partial<Investment>) => setInvestments(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmInvestment     = useCallback((id: string) => setInvestments(xs => xs.filter(x => x.id !== id)), []);

  const addRecurringCharge = () => setRecurringCharges(xs => [...xs, { id: makeId(), label: '', amount: 10 }]);
  const changeRecurringCharge = useCallback((id: string, patch: Partial<RecurringCharge>) => setRecurringCharges(xs => xs.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmRecurringCharge     = useCallback((id: string) => setRecurringCharges(xs => xs.filter(x => x.id !== id)), []);

  const scenario: Scenario = useMemo(() => ({
    startMonthIdx: safeStartMonthIdx,
    startYear: safeStartYear,
    envelope: init.envelope,
    startSavings: init.startSavings,
    startAge: init.startAge,
    horizonYears: init.horizonYears,
    returnMode: init.returnMode,
    hysaRate: init.hysaRate,
    taxPct: init.taxPct,
    baseSalary: init.baseSalary,
    housingCost: init.housingCost,
    monthlyAllowance: init.monthlyAllowance ?? 0,
    debts, cascadeDebts, purchases, raises,
    investments, recurringCharges,
    excludedDebtIds, excludedPurchaseIds, excludedRaiseIds,
    excludedInvestmentIds, excludedRecurringChargeIds,
  }), [safeStartMonthIdx, safeStartYear, init.envelope, init.startSavings, init.startAge, init.horizonYears, init.returnMode, init.hysaRate, init.taxPct, init.baseSalary, init.housingCost, init.monthlyAllowance, debts, cascadeDebts, purchases, raises, investments, recurringCharges, excludedDebtIds, excludedPurchaseIds, excludedRaiseIds, excludedInvestmentIds, excludedRecurringChargeIds]);

  const mergedScenario = useMemo(() => mergeIntoScenario(scenario, library), [scenario, library]);
  const returnRate = getReturnRate(mergedScenario);
  const data   = useMemo(() => simulate(mergedScenario, returnRate), [mergedScenario, returnRate]);
  const yearly = useMemo(() => data.filter(d => d.m % 12 === 0), [data]);
  // Align charts with merged scenario (same timeline simulate() uses — profile vs plan merged).
  const chartStart = mergedScenario.startYear + mergedScenario.startMonthIdx / 12;
  const chartMinYr = chartStart - 1 / 12;
  const chartHorizon = mergedScenario.horizonYears;
  const chart  = useMemo(() => data.map(row => ({ ...row, decimalYr: chartStart + row.m / 12 })), [data, chartStart]);
  const chartInvest = useMemo(() => data.map(row => {
    const pt: Record<string, unknown> = { ...row, decimalYr: chartStart + row.m / 12 };
    for (const inv of resolvedInvestments) {
      pt[`inv_${inv.id}`] = row.investmentBalancesById[inv.id] ?? 0;
    }
    return pt;
  }), [data, chartStart, resolvedInvestments]);
  const snap   = (m: number) => data[Math.min(m, data.length - 1)];
  const endM   = chartHorizon * 12;

  const nowDebtBurden = resolvedDebts.reduce(
    (s, d) => s + (absMo(d.payoffYear, d.payoffMonthIdx, mergedScenario.startYear, mergedScenario.startMonthIdx) > 0 ? d.payment : 0), 0,
  );
  const nowLoanBurden = resolvedPurchases.reduce((s, p) => {
    const sm = absMo(p.year, p.monthIdx, mergedScenario.startYear, mergedScenario.startMonthIdx);
    const pm = sm + payoffMonths(p.loanAmount, p.rate, p.payment);
    return s + (0 >= sm && 0 < pm ? p.payment : 0);
  }, 0);
  const allowance = mergedScenario.monthlyAllowance ?? 0;
  const nowRecurring = resolvedRecurringCharges.reduce((s, c) => s + Math.max(0, c.amount), 0);
  const nowInvContrib = useMemo(() => resolvedInvestments.reduce((s, i) => {
    const st = absMo(
      i.startYear ?? mergedScenario.startYear,
      i.startMonthIdx ?? mergedScenario.startMonthIdx,
      mergedScenario.startYear,
      mergedScenario.startMonthIdx,
    );
    if (st > 0) return s;
    if (i.sellYear != null && i.sellMonthIdx != null) {
      const sellM = absMo(i.sellYear, i.sellMonthIdx, mergedScenario.startYear, mergedScenario.startMonthIdx);
      if (sellM < 0) return s;
    }
    return s + Math.max(0, i.monthlyContribution);
  }, 0), [resolvedInvestments, mergedScenario.startYear, mergedScenario.startMonthIdx]);
  const effectiveNow = mergedScenario.envelope - mergedScenario.housingCost - allowance - nowRecurring - nowDebtBurden - nowLoanBurden - nowInvContrib;

  const scenarioOverviewChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    const nd = resolvedDebts.length;
    if (nd) chips.push({ key: 'debts', label: `${nd} active debt${nd === 1 ? '' : 's'}` });
    const nr = resolvedRecurringCharges.length;
    if (nr) chips.push({ key: 'rec', label: `${nr} recurring` });
    const np = resolvedPurchases.length;
    if (np) chips.push({ key: 'pur', label: `${np} major purchase${np === 1 ? '' : 's'}` });
    const ni = resolvedInvestments.length;
    if (ni) chips.push({ key: 'inv', label: `${ni} investment bucket${ni === 1 ? '' : 's'}` });
    const nz = resolvedRaises.length;
    if (nz) chips.push({ key: 'raise', label: `${nz} raise scenario${nz === 1 ? '' : 's'}` });
    return chips;
  }, [resolvedDebts, resolvedRecurringCharges, resolvedPurchases, resolvedInvestments, resolvedRaises]);

  const liquidityYieldSummary = useMemo(() => {
    if (mergedScenario.returnMode === 'none') return 'Liquidity yield: none (cash only)';
    if (mergedScenario.returnMode === 'hysa') return `Liquidity yield: ${mergedScenario.hysaRate ?? 4.5}% HYSA`;
    return 'Liquidity yield: 7% (invested cash mode)';
  }, [mergedScenario.returnMode, mergedScenario.hysaRate]);

  const envelopeDeductions = useMemo(() => {
    const rows: { key: string; label: string; amount: number; color: string }[] = [
      { key: 'housing', label: 'Housing', amount: mergedScenario.housingCost, color: COLORS.muted },
      { key: 'allow', label: 'Allowance', amount: allowance, color: COLORS.muted },
      { key: 'rec', label: 'Recurring bills', amount: nowRecurring, color: COLORS.muted },
      { key: 'debt', label: 'Debt payments', amount: nowDebtBurden, color: COLORS.red },
      { key: 'loan', label: 'Purchase loans', amount: nowLoanBurden, color: COLORS.orange },
      { key: 'inv', label: 'Investment contributions', amount: nowInvContrib, color: accent },
    ];
    return rows.filter(r => r.amount > 0);
  }, [mergedScenario.housingCost, allowance, nowRecurring, nowDebtBurden, nowLoanBurden, nowInvContrib, COLORS.muted, COLORS.red, COLORS.orange, accent]);

  const purchaseMarkers = resolvedPurchases
    .filter(p => p.loanAmount > 0 && p.payment > 0)
    .map(p => {
      const sm  = absMo(p.year, p.monthIdx, mergedScenario.startYear, mergedScenario.startMonthIdx);
      const pmo = payoffMonths(p.loanAmount, p.rate, p.payment);
      return {
        buyDecimalYr:   parseFloat((chartStart + sm / 12).toFixed(4)),
        paidDecimalYr:  parseFloat((chartStart + (sm + pmo) / 12).toFixed(4)),
        withinHorizon:  (sm + pmo) / 12 <= chartHorizon,
      };
    });

  const milestones = [
    { label: 'Start',                               m: 0     },
    { label: `Year ${Math.round(chartHorizon / 2)}`, m: Math.round(endM / 2) },
    { label: `Year ${chartHorizon}`,                m: endM, hi: true },
  ];

  const handleSave = () => onSave(scenario);

  return (
    <div style={{ '--plan-accent': accent, background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" } as React.CSSProperties}>
      <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 80 }}>

        <section className="sec" aria-label="Global settings summary">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
              <h2 style={{ ...S.label, marginBottom: 6 }}>Global settings</h2>
              <p style={{ fontSize: 11, color: COLORS.muted, margin: 0, lineHeight: 1.5, maxWidth: 420 }}>
                Snapshot of your I/O profile for this plan. Edit core inputs in I/O; below, toggle which library items apply to this scenario.
              </p>
            </div>
            <a
              href="/io"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                flexShrink: 0, padding: '8px 14px', borderRadius: 6,
                fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const,
                textDecoration: 'none', color: COLORS.textOnAccent, background: accent,
                border: `1px solid ${accent}`, fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              Edit in I/O
            </a>
          </div>

          <div style={{
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            borderLeft: `4px solid ${accent}`,
            background: COLORS.surface,
            overflow: 'hidden',
            boxShadow: `0 12px 40px ${COLORS.bg}88`,
          }}>
            <div style={{ padding: '10px 12px 12px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.faint }}>
              <div style={{ ...S.label, marginBottom: 6, fontSize: 9, letterSpacing: 1.5 }}>Start, envelope & horizon</div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
                gap: 6,
              }}>
                {[
                  { k: 'start', cap: 'Plan start', val: `${MONTHS[mergedScenario.startMonthIdx]} ${mergedScenario.startYear}` },
                  { k: 'env', cap: 'Monthly envelope', val: `${money(mergedScenario.envelope)}/mo` },
                  { k: 'hor', cap: 'Horizon', val: `${mergedScenario.horizonYears} yr` },
                ].map(({ k, cap, val }) => (
                  <div
                    key={k}
                    style={{
                      padding: '7px 9px',
                      borderRadius: 6,
                      background: COLORS.surface,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ fontSize: 8, letterSpacing: 1.2, color: COLORS.muted, textTransform: 'uppercase' as const, marginBottom: 4 }}>{cap}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ ...S.label, marginBottom: 10 }}>Profile & month-one envelope</div>
              <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 12px', lineHeight: 1.65 }}>
                Starting cash{' '}
                <strong style={{ color: COLORS.text }}>{money(mergedScenario.startSavings)}</strong>
                {' · '}Age <strong style={{ color: COLORS.text }}>{mergedScenario.startAge}</strong>
                {' · '}Salary <strong style={{ color: COLORS.text }}>{money(mergedScenario.baseSalary)}/yr</strong>
                {' · '}Tax <strong style={{ color: COLORS.text }}>{mergedScenario.taxPct}%</strong>
                <br />
                <span style={{ color: COLORS.text, opacity: 0.92 }}>{liquidityYieldSummary}</span>
              </p>

              <div style={{ fontSize: 11, color: COLORS.text, fontVariantNumeric: 'tabular-nums' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.muted }}>Envelope (in)</span>
                  <span style={{ fontWeight: 700 }}>{money(mergedScenario.envelope)}</span>
                </div>
                {envelopeDeductions.map(r => (
                  <div
                    key={r.key}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${COLORS.border}` }}
                  >
                    <span style={{ color: r.color }}>− {r.label}</span>
                    <span style={{ color: r.color, fontWeight: 600 }}>{money(r.amount)}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 12,
                padding: '12px 14px',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                background: effectiveNow < 0 ? `${COLORS.red}12` : `${accent}10`,
                border: `1px solid ${effectiveNow < 0 ? `${COLORS.red}45` : `${accent}38`}`,
              }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: COLORS.muted, textTransform: 'uppercase' as const, marginBottom: 4 }}>To liquidity (cash savings)</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.4 }}>After obligations in the first simulated month</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: effectiveNow < 0 ? COLORS.red : accent, fontVariantNumeric: 'tabular-nums' }}>
                  {money(effectiveNow)}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>/mo</span>
                </div>
              </div>

              {scenarioOverviewChips.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
                  <div style={{ ...S.label, marginBottom: 8 }}>In this scenario</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {scenarioOverviewChips.map(c => (
                      <span
                        key={c.key}
                        style={{
                          fontSize: 10,
                          padding: '5px 11px',
                          borderRadius: 999,
                          border: `1px solid ${COLORS.border}`,
                          background: COLORS.faint,
                          color: COLORS.text,
                        }}
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── DEBTS ── */}
        <section className="sec" aria-label="Active debts">
          <SectionHead label="💳 Active Debts" onAdd={addDebt} addLabel="+ Custom" addBtnStyle={addBtnStyle} labelStyle={S.label} />
          {library.debts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...S.label, display: 'block', marginBottom: 6 }}>From I/O</span>
              {library.debts.map(d => {
                const off = excludedDebtIds.includes(d.id);
                return (
                  <div key={d.id} role="button" tabIndex={0}
                    onClick={() => toggleDebt(d.id)}
                    onKeyDown={e => e.key === 'Enter' && toggleDebt(d.id)}
                    aria-pressed={!off}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${off ? COLORS.border : COLORS.accent}40`,
                      background: off ? 'transparent' : `${COLORS.accent}08`,
                      marginTop: 6, opacity: off ? 0.5 : 1, transition: 'all 0.12s',
                    }}>
                    <span style={{ color: off ? COLORS.muted : COLORS.accent, fontSize: 13 }}>{off ? '○' : '●'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: off ? COLORS.muted : COLORS.text }}>{d.label || 'Unnamed'}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>−{money(d.payment)}/mo · off {MONTHS[d.payoffMonthIdx]} {d.payoffYear}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); forkDebt(d); }}
                      title="Copy to scenario as a custom item"
                      style={{
                        padding: '4px 8px', fontSize: 10, borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  </div>
                );
              })}
            </div>
          )}
          {library.debts.length === 0 && debts.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' }}>
              Add debts in <a href="/io" style={{ color: COLORS.accent, textDecoration: 'none' }}>I/O</a> to include them here, or use + Custom for scenario-only items.
            </p>
          )}
          {resolvedDebts.length >= 2 && (
            <div style={{ margin: '8px 0' }}>
              <button onClick={() => setCascadeDebts(v => !v)} aria-pressed={cascadeDebts} style={chipStyle(cascadeDebts)}>
                {cascadeDebts ? '⛓ cascade on' : '⛓ cascade freed payments'}
              </button>
              <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 8, lineHeight: 1.55, maxWidth: 560 }}>
                Cascade rolls freed payments from paid-off debts into the next remaining debt in <strong style={{ color: COLORS.text }}>list order</strong> here (first eligible balance-tracked debt gets pooled extras); leftover envelope still flows to savings when debts finish.
              </p>
            </div>
          )}
          {debts.map(d => (
            <DebtItem key={d.id} d={d} startYear={mergedScenario.startYear} onChange={p => changeDebt(d.id, p)} onRemove={() => rmDebt(d.id)} />
          ))}
        </section>

        {/* ── RECURRING BILLS ── */}
        <section className="sec" aria-label="Recurring bills">
          <SectionHead label="📎 Recurring bills" onAdd={addRecurringCharge} addLabel="+ Custom" addBtnStyle={addBtnStyle} labelStyle={S.label} />
          {library.recurringCharges.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...S.label, display: 'block', marginBottom: 6 }}>From I/O</span>
              {library.recurringCharges.map(c => {
                const off = excludedRecurringChargeIds.includes(c.id);
                return (
                  <div key={c.id} role="button" tabIndex={0}
                    onClick={() => toggleRecurringCharge(c.id)}
                    onKeyDown={e => e.key === 'Enter' && toggleRecurringCharge(c.id)}
                    aria-pressed={!off}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${off ? COLORS.border : COLORS.muted}50`,
                      background: off ? 'transparent' : `${COLORS.muted}12`,
                      marginTop: 6, opacity: off ? 0.5 : 1, transition: 'all 0.12s',
                    }}>
                    <span style={{ color: off ? COLORS.muted : COLORS.text, fontSize: 13 }}>{off ? '○' : '●'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: off ? COLORS.muted : COLORS.text }}>{c.label || 'Unnamed'}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>−{money(c.amount)}/mo</div>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); forkRecurringCharge(c); }}
                      title="Copy to scenario as a custom item"
                      style={{
                        padding: '4px 8px', fontSize: 10, borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  </div>
                );
              })}
            </div>
          )}
          {library.recurringCharges.length === 0 && recurringCharges.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' }}>
              Add recurring bills in <a href="/io" style={{ color: COLORS.accent, textDecoration: 'none' }}>I/O</a> or use + Custom for scenario-only lines.
            </p>
          )}
          {recurringCharges.map(c => (
            <RecurringChargeItem key={c.id} c={c} onChange={p => changeRecurringCharge(c.id, p)} onRemove={() => rmRecurringCharge(c.id)} />
          ))}
        </section>

        {/* ── PURCHASES ── */}
        <section className="sec" aria-label="Major purchases">
          <SectionHead label="🛒 Major Purchases" onAdd={addPurchase} addLabel="+ Custom" addBtnStyle={addBtnStyle} labelStyle={S.label} />
          {library.purchases.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...S.label, display: 'block', marginBottom: 6 }}>From I/O</span>
              {library.purchases.map(p => {
                const off = excludedPurchaseIds.includes(p.id);
                return (
                  <div key={p.id} role="button" tabIndex={0}
                    onClick={() => togglePurchase(p.id)}
                    onKeyDown={e => e.key === 'Enter' && togglePurchase(p.id)}
                    aria-pressed={!off}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${off ? COLORS.border : COLORS.orange}40`,
                      background: off ? 'transparent' : `${COLORS.orange}08`,
                      marginTop: 6, opacity: off ? 0.5 : 1, transition: 'all 0.12s',
                    }}>
                    <span style={{ color: off ? COLORS.muted : COLORS.orange, fontSize: 13 }}>{off ? '○' : '●'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: off ? COLORS.muted : COLORS.text }}>{p.label || 'Unnamed'}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>−{money(p.payment)}/mo · {p.type === 'house' ? '🏠' : '🚗'} {p.year}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); forkPurchase(p); }}
                      title="Copy to scenario as a custom item"
                      style={{
                        padding: '4px 8px', fontSize: 10, borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  </div>
                );
              })}
            </div>
          )}
          {library.purchases.length === 0 && purchases.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' }}>
              Add purchases in <a href="/io" style={{ color: COLORS.accent, textDecoration: 'none' }}>I/O</a> to include them here, or use + Custom for scenario-only items.
            </p>
          )}
          {purchases.map(p => (
            <PurchaseItem key={p.id} p={p} startYear={mergedScenario.startYear} startMonthIdx={mergedScenario.startMonthIdx} housingCost={mergedScenario.housingCost}
              onChange={patch => changePurchase(p.id, patch)} onRemove={() => rmPurchase(p.id)} />
          ))}
        </section>

        {/* ── INVESTMENTS ── */}
        <section className="sec" aria-label="Investments">
          <SectionHead label="📊 Investments" onAdd={addInvestment} addLabel="+ Custom" addBtnStyle={addBtnStyle} labelStyle={S.label} />
          {library.investments.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...S.label, display: 'block', marginBottom: 6 }}>From I/O</span>
              {library.investments.map(inv => {
                const off = excludedInvestmentIds.includes(inv.id);
                return (
                  <div key={inv.id} role="button" tabIndex={0}
                    onClick={() => toggleInvestment(inv.id)}
                    onKeyDown={e => e.key === 'Enter' && toggleInvestment(inv.id)}
                    aria-pressed={!off}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${off ? COLORS.border : accent}40`,
                      background: off ? 'transparent' : `${accent}08`,
                      marginTop: 6, opacity: off ? 0.5 : 1, transition: 'all 0.12s',
                    }}>
                    <span style={{ color: off ? COLORS.muted : accent, fontSize: 13 }}>{off ? '○' : '●'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: off ? COLORS.muted : COLORS.text }}>{inv.label || 'Unnamed'}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>
                        {money(inv.initialAmount)} start · {inv.annualReturnPct}% · +{money(inv.monthlyContribution)}/mo
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); forkInvestment(inv); }}
                      title="Copy to scenario as a custom item"
                      style={{
                        padding: '4px 8px', fontSize: 10, borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  </div>
                );
              })}
            </div>
          )}
          {library.investments.length === 0 && investments.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' }}>
              Add investment accounts in <a href="/io" style={{ color: COLORS.accent, textDecoration: 'none' }}>I/O</a> or use + Custom for scenario-only buckets.
            </p>
          )}
          {investments.map(inv => (
            <InvestmentItem
              key={inv.id}
              i={inv}
              planStartYear={mergedScenario.startYear}
              planStartMonthIdx={mergedScenario.startMonthIdx}
              onChange={p => changeInvestment(inv.id, p)}
              onRemove={() => rmInvestment(inv.id)}
            />
          ))}
        </section>

        {/* ── RAISES ── */}
        <section className="sec" aria-label="Raise scenarios">
          <SectionHead label="📈 Raise Scenarios" onAdd={addRaise} addLabel="+ Custom" addBtnStyle={addBtnStyle} labelStyle={S.label} />
          {library.raises.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ ...S.label, display: 'block', marginBottom: 6 }}>From I/O</span>
              {library.raises.map(r => {
                const off = excludedRaiseIds.includes(r.id);
                return (
                  <div key={r.id} role="button" tabIndex={0}
                    onClick={() => toggleRaise(r.id)}
                    onKeyDown={e => e.key === 'Enter' && toggleRaise(r.id)}
                    aria-pressed={!off}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${off ? COLORS.border : COLORS.blue}40`,
                      background: off ? 'transparent' : `${COLORS.blue}08`,
                      marginTop: 6, opacity: off ? 0.5 : 1, transition: 'all 0.12s',
                    }}>
                    <span style={{ color: off ? COLORS.muted : COLORS.blue, fontSize: 13 }}>{off ? '○' : '●'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: off ? COLORS.muted : COLORS.text }}>{MONTHS[r.monthIdx]} {r.year}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{money(r.salary)}/yr</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); forkRaise(r); }}
                      title="Copy to scenario as a custom item"
                      style={{
                        padding: '4px 8px', fontSize: 10, borderRadius: 4,
                        border: `1px solid ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  </div>
                );
              })}
            </div>
          )}
          {library.raises.length === 0 && raises.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, fontStyle: 'italic' }}>
              Add raises in <a href="/io" style={{ color: COLORS.accent, textDecoration: 'none' }}>I/O</a> or use + Custom for scenario-only raises.
            </p>
          )}
          {raises.map(r => (
            <RaiseItem key={r.id} r={r} startYear={mergedScenario.startYear} taxPct={mergedScenario.taxPct} baseSalary={mergedScenario.baseSalary}
              onChange={patch => changeRaise(r.id, patch)} onRemove={() => rmRaise(r.id)} />
          ))}
        </section>

        {/* ── MILESTONES ── */}
        <section className="sec" aria-label="Cash savings milestones">
          <h2 style={{ ...S.label, marginBottom: 12 }}>Milestones</h2>
          <p style={{ fontSize: 10, color: COLORS.dim, marginBottom: 8, lineHeight: 1.55 }}>
            Charts reflect simplified timing and taxes—directionally useful, not exact balances at closing dates.
          </p>
          <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 10 }}>Cash on hand only. Investment balances count toward net worth, not liquidity.</p>
          <div className="mg">
            {milestones.map(s => (
              <div key={s.m} style={{
                padding: '14px 12px',
                background: s.hi ? `${accent}0E` : COLORS.surface,
                border: `1px solid ${s.hi ? accent : COLORS.border}`,
                borderRadius: 6,
              }}>
                <div style={{ ...S.label, marginBottom: 6 }}>Age {Math.floor(mergedScenario.startAge + s.m / 12)}</div>
                <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.hi ? accent : COLORS.text, lineHeight: 1, marginBottom: 5 }}>
                  {money(snap(s.m)?.liquidTotal ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
                {s.hi && (
                  <div style={{ fontSize: 10, color: `${accent}99`, marginTop: 3 }}>
                    {mergedScenario.returnMode === 'none' ? '0% · cash' : mergedScenario.returnMode === 'hysa' ? `${mergedScenario.hysaRate ?? 4.5}% HYSA` : '7% invested'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CHART ── */}
        <section className="sec" aria-label="Cash savings trajectory chart">
          <h2 style={{ ...S.label, marginBottom: 8 }}>Cash savings</h2>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>Liquid cash only (investment accounts are separate — see year table and net worth). 🛒 purchase · ✓ loan paid</p>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chart} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
              <XAxis
                dataKey="decimalYr" type="number"
                domain={[chartMinYr, chartStart + chartHorizon]}
                tickCount={Math.min(chartHorizon + 1, 16)}
                tickFormatter={v => (v % 1 < 0.05) ? String(Math.round(v)) : ''}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={shortK}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<ChartTooltip />} />
              {purchaseMarkers.map((m, i) => (
                <ReferenceLine key={`buy-${i}`} x={m.buyDecimalYr}
                  stroke={COLORS.orange} strokeDasharray="3 3" strokeWidth={1}
                  label={{ value: '🛒', fill: COLORS.orange, fontSize: 10, position: 'top' }} />
              ))}
              {purchaseMarkers.filter(m => m.withinHorizon).map((m, i) => (
                <ReferenceLine key={`paid-${i}`} x={m.paidDecimalYr}
                  stroke={COLORS.blue} strokeDasharray="3 3" strokeWidth={1}
                  label={{ value: '✓', fill: COLORS.blue, fontSize: 10, position: 'top' }} />
              ))}
              <Area
                type="monotone" dataKey="liquidTotal"
                stroke={accent} strokeWidth={2}
                fill="url(#chartGrad)" dot={false}
                activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="sec" aria-label="Debt paydown chart">
          <h2 style={{ ...S.label, marginBottom: 8 }}>Debt Paydown</h2>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chart} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COLORS.red} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
              <XAxis
                dataKey="decimalYr" type="number"
                domain={[chartMinYr, chartStart + chartHorizon]}
                tickFormatter={v => (v % 1 < 0.05) ? String(Math.round(v)) : ''}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={shortK}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<ChartTooltip variant="debt" />} />
              <Area
                type="monotone" dataKey="debtOutstanding"
                stroke={COLORS.red} strokeWidth={2}
                fill="url(#debtGrad)" dot={false}
                activeDot={{ r: 4, fill: COLORS.red, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="sec" aria-label="Investment balances chart">
          <h2 style={{ ...S.label, marginBottom: 8 }}>Investments</h2>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>
            Stacked balances: compounding and monthly adds. This is the full account value, not contributions alone. Sales move after-tax proceeds into cash savings.
          </p>
          {resolvedInvestments.length === 0 ? (
            <p style={{ fontSize: 11, color: COLORS.muted, fontStyle: 'italic' }}>No investment buckets in this scenario.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartInvest} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  {resolvedInvestments.map((inv, idx) => {
                    const c = planPalette[idx % planPalette.length].value;
                    return (
                      <linearGradient key={inv.id} id={`invGrad-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={c} stopOpacity={0.03} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
                <XAxis
                  dataKey="decimalYr" type="number"
                  domain={[chartMinYr, chartStart + chartHorizon]}
                  tickFormatter={v => (v % 1 < 0.05) ? String(Math.round(v)) : ''}
                  tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={shortK}
                  tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false} tickLine={false} width={44}
                />
                <Tooltip
                  content={({ active, payload: tipPayload }) => {
                    if (!active || !tipPayload?.length) return null;
                    const row = tipPayload[0].payload as (typeof data)[number];
                    const mo = row.calendarMonthIdx ?? 0;
                    return (
                      <div style={{
                        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                        borderRadius: 6, padding: '10px 14px',
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, minWidth: 180,
                      }}>
                        <div style={{ color: accent, fontWeight: 600, marginBottom: 6 }}>
                          Age {row.ageFloor} · {MONTHS[mo]} {row.yr}
                        </div>
                        <div style={{ color: COLORS.text, fontSize: 12, marginBottom: 6 }}>Total {money(row.investments)}</div>
                        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 6, lineHeight: 1.9 }}>
                          {resolvedInvestments.map((inv, idx) => {
                            const v = row.investmentBalancesById[inv.id] ?? 0;
                            const col = planPalette[idx % planPalette.length].value;
                            return (
                              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                                <span style={{ color: col }}>{inv.label || `Account ${idx + 1}`}</span>
                                <span style={{ color: COLORS.text }}>{money(v)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} iconType="circle" />
                {resolvedInvestments.map((inv, idx) => {
                  const c = planPalette[idx % planPalette.length].value;
                  return (
                    <Area
                      key={inv.id}
                      type="monotone"
                      stackId="inv"
                      dataKey={`inv_${inv.id}`}
                      name={inv.label || `Account ${idx + 1}`}
                      stroke={c}
                      strokeWidth={1.5}
                      fill={`url(#invGrad-${inv.id})`}
                      dot={false}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="sec" aria-label="Net worth chart">
          <h2 style={{ ...S.label, marginBottom: 8 }}>Net Worth</h2>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>
            Savings plus optional purchase market values minus all debts. Matches the dashboard net worth view.
          </p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chart} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
              <XAxis
                dataKey="decimalYr" type="number"
                domain={[chartMinYr, chartStart + chartHorizon]}
                tickFormatter={v => (v % 1 < 0.05) ? String(Math.round(v)) : ''}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tickFormatter={shortK}
                tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                axisLine={false} tickLine={false} width={44}
              />
              <Tooltip content={<ChartTooltip variant="netWorth" />} />
              {purchaseMarkers.map((m, i) => (
                <ReferenceLine key={`nw-buy-${i}`} x={m.buyDecimalYr}
                  stroke={COLORS.orange} strokeDasharray="3 3" strokeWidth={1}
                  label={{ value: '🛒', fill: COLORS.orange, fontSize: 10, position: 'top' }} />
              ))}
              {purchaseMarkers.filter(m => m.withinHorizon).map((m, i) => (
                <ReferenceLine key={`nw-paid-${i}`} x={m.paidDecimalYr}
                  stroke={COLORS.blue} strokeDasharray="3 3" strokeWidth={1}
                  label={{ value: '✓', fill: COLORS.blue, fontSize: 10, position: 'top' }} />
              ))}
              <Area
                type="monotone" dataKey="netWorth"
                stroke={COLORS.blue} strokeWidth={2}
                fill="url(#nwGrad)" dot={false}
                activeDot={{ r: 4, fill: COLORS.blue, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* ── YEAR TABLE ── */}
        <section className="sec" aria-label="Year-by-year breakdown">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ ...S.label, marginBottom: 0 }}>Year-by-Year</h2>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[3, 5, 7, 10].filter(y => y < mergedScenario.horizonYears).map(y => (
                <button key={y} onClick={() => setTableYears(tableYears === y ? null : y)} style={chipStyle(tableYears === y)} aria-pressed={tableYears === y}>
                  {y}yr
                </button>
              ))}
              <button onClick={() => setTableYears(null)} style={chipStyle(tableYears === null)} aria-pressed={tableYears === null}>All</button>
            </div>
          </div>
          <div className="tbl">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {[
                    ['Age',       'Your age'],
                    ['Year',      'Calendar year'],
                    ['Savings',   'Cash / HYSA balance'],
                    ['Invest',    'Investment account balances'],
                    ['To cash', 'Net change in cash this month (includes yield, one-time investment funding, sale proceeds, etc.)'],
                    ['Debt −',    'Monthly debt payments'],
                    ['Loans −',   'Monthly loan payments'],
                    ['Active',    'Active purchase loans'],
                  ].map(([h, desc]) => (
                    <th key={h} scope="col" title={desc} style={{
                      padding: '6px 10px 8px', textAlign: 'left',
                      color: COLORS.muted, fontWeight: 500,
                      fontSize: 10, letterSpacing: 1,
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yearly.filter(d => tableYears == null || d.m <= tableYears * 12).map((d, i) => (
                  <tr key={d.m} style={{
                    borderBottom: `1px solid ${COLORS.border}18`,
                    background: i % 2 === 0 ? `${COLORS.surface}80` : 'transparent',
                  }}>
                    <td style={{ padding: '8px 10px', color: accent, fontWeight: 500 }}>{d.ageFloor}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.muted }}>{d.yr}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{money(d.savings)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: COLORS.accent }}>{money(d.investments)}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.dim }}>{money(d.liquidInflow)}/mo</td>
                    <td style={{ padding: '8px 10px', color: d.debtBurden > 0 ? COLORS.red : COLORS.muted }}>
                      {d.debtBurden > 0 ? `−${money(d.debtBurden)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', color: d.purchaseOutflow > 0 ? COLORS.orange : COLORS.muted }}>
                      {d.purchaseOutflow > 0 ? `−${money(d.purchaseOutflow)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: COLORS.muted }}>
                      {d.activePurchases.length > 0 ? d.activePurchases.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── SAVE/CANCEL FOOTER ── */}
        <div style={{
          position: footerPosition,
          bottom: 0,
          ...(footerPosition === 'fixed' ? { left: 0, right: 0 } : {}),
          background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
          padding: '12px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end',
          zIndex: footerPosition === 'fixed' ? 100 : 10,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 20px', fontSize: 12, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              background: 'transparent', color: COLORS.muted,
              fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '9px 20px', fontSize: 12, borderRadius: 4,
              border: `1px solid ${accent}`,
              background: accent, color: COLORS.textOnAccent,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving…' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
