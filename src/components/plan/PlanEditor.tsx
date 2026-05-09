import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { START_YEAR, MONTHS } from '../../lib/constants';
import { useColors } from '../../stores/themeStore';
import { useThemeStore } from '../../stores/themeStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { absMo, money, shortK, stdPayment, payoffMonths, getReturnRate } from '../../lib/finance';
import { simulate } from '../../lib/simulate';
import { mergeIntoScenario } from '../../lib/resolveItems';
import { ChartTooltip } from './ChartTooltip';
import { DebtItem } from './DebtItem';
import { PurchaseItem } from './PurchaseItem';
import { RaiseItem } from './RaiseItem';
import type { Scenario, Debt, Purchase, Raise } from '../../lib/types';

const makeId = () => crypto.randomUUID();

const DEFAULT_SCENARIO: Scenario = {
  envelope: 1_000, startSavings: 0, startAge: 30, horizonYears: 10,
  returnMode: 'hysa', taxPct: 25, baseSalary: 60_000, housingCost: 1_200,
  debts: [], purchases: [], raises: [],
  excludedDebtIds: [], excludedPurchaseIds: [], excludedRaiseIds: [],
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
  color?:    string;
  onSave:    (scenario: Scenario) => void;
  onCancel:  () => void;
  isSaving?: boolean;
}

export function PlanEditor({ initialScenario, color, onSave, onCancel, isSaving }: Props) {
  const COLORS = useColors();
  const themeAccent = useThemeStore(s => s.theme.colors.accent);
  const accent = color ?? themeAccent;
  const init = initialScenario ?? DEFAULT_SCENARIO;

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

  const [envelope,     setEnvelope]     = useState(init.envelope);
  const [startSavings, setStartSavings] = useState(init.startSavings);
  const [startAge,     setStartAge]     = useState(init.startAge);
  const [horizonYears, setHorizonYears] = useState(init.horizonYears);
  const [returnMode,   setReturnMode]   = useState<Scenario['returnMode']>(init.returnMode);
  const [hysaRate,     setHysaRate]     = useState(init.hysaRate ?? 4.5);
  const [taxPct,       setTaxPct]       = useState(init.taxPct);
  const [baseSalary,   setBaseSalary]   = useState(init.baseSalary);
  const [housingCost,  setHousingCost]  = useState(init.housingCost);
  const [debts,               setDebts]               = useState<Debt[]>(init.debts);
  const [cascadeDebts,        setCascadeDebts]        = useState(init.cascadeDebts ?? false);
  const [purchases,           setPurchases]           = useState<Purchase[]>(init.purchases);
  const [raises,              setRaises]              = useState<Raise[]>(init.raises);
  const [excludedDebtIds,     setExcludedDebtIds]     = useState<string[]>(init.excludedDebtIds     ?? []);
  const [excludedPurchaseIds, setExcludedPurchaseIds] = useState<string[]>(init.excludedPurchaseIds ?? []);
  const [excludedRaiseIds,    setExcludedRaiseIds]    = useState<string[]>(init.excludedRaiseIds    ?? []);

  const library = useLibraryStore();

  const toggleDebt     = useCallback((id: string) => setExcludedDebtIds(ids     => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const togglePurchase = useCallback((id: string) => setExcludedPurchaseIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);
  const toggleRaise    = useCallback((id: string) => setExcludedRaiseIds(ids    => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]), []);

  // Fork: copy a library item as a scenario-specific custom item, then exclude the library version.
  const forkDebt     = useCallback((d: Debt)     => { setDebts(ds => [...ds, { ...d, id: makeId() }]);     setExcludedDebtIds(ids     => ids.includes(d.id) ? ids : [...ids, d.id]); }, []);
  const forkPurchase = useCallback((p: Purchase) => { setPurchases(ps => [...ps, { ...p, id: makeId() }]); setExcludedPurchaseIds(ids => ids.includes(p.id) ? ids : [...ids, p.id]); }, []);
  const forkRaise    = useCallback((r: Raise)    => { setRaises(rs => [...rs, { ...r, id: makeId() }]);     setExcludedRaiseIds(ids    => ids.includes(r.id) ? ids : [...ids, r.id]); }, []);

  const resolvedDebts     = useMemo(() => [...library.debts.filter(d => !excludedDebtIds.includes(d.id)),         ...debts],     [library.debts,     excludedDebtIds,     debts]);
  const resolvedPurchases = useMemo(() => [...library.purchases.filter(p => !excludedPurchaseIds.includes(p.id)), ...purchases], [library.purchases, excludedPurchaseIds, purchases]);
  const resolvedRaises    = useMemo(() => [...library.raises.filter(r => !excludedRaiseIds.includes(r.id)),       ...raises],    [library.raises,    excludedRaiseIds,    raises]);

  const addDebt    = () => setDebts(d => [...d, { id: makeId(), label: '', payment: 200, payoffMonthIdx: 0, payoffYear: START_YEAR + 1 }]);
  const changeDebt = useCallback((id: string, patch: Partial<Debt>) => setDebts(d => d.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmDebt     = useCallback((id: string) => setDebts(d => d.filter(x => x.id !== id)), []);

  const addPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    setPurchases(ps => [...ps, {
      id: makeId(), type: 'loan', label: '',
      year: START_YEAR + 2, monthIdx: 0,
      downPayment: 0, loanAmount, rate, termMonths, multiplier,
      payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
    }]);
  };
  const changePurchase = useCallback((id: string, patch: Partial<Purchase>) => setPurchases(ps => ps.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmPurchase     = useCallback((id: string) => setPurchases(ps => ps.filter(x => x.id !== id)), []);

  const addRaise    = () => setRaises(r => [...r, { id: makeId(), year: START_YEAR + 3, monthIdx: 0, salary: baseSalary + 10_000, baseSalary }]);
  const changeRaise = useCallback((id: string, patch: Partial<Raise>) => setRaises(r => r.map(x => x.id === id ? { ...x, ...patch } : x)), []);
  const rmRaise     = useCallback((id: string) => setRaises(r => r.filter(x => x.id !== id)), []);

  const scenario: Scenario = useMemo(() => ({
    envelope, startSavings, startAge, horizonYears,
    returnMode, hysaRate, taxPct, baseSalary, housingCost,
    debts, cascadeDebts, purchases, raises,
    excludedDebtIds, excludedPurchaseIds, excludedRaiseIds,
  }), [envelope, startSavings, startAge, horizonYears, returnMode, hysaRate, taxPct, baseSalary, housingCost, debts, cascadeDebts, purchases, raises, excludedDebtIds, excludedPurchaseIds, excludedRaiseIds]);

  const returnRate = getReturnRate(scenario);

  const data   = useMemo(() => simulate(mergeIntoScenario(scenario, library), returnRate), [scenario, library, returnRate]);
  const yearly = useMemo(() => data.filter(d => d.m % 12 === 0), [data]);
  // All monthly points with a decimal-year x key so Recharts draws smooth curves.
  const chart  = useMemo(() => data.map(row => ({ ...row, decimalYr: START_YEAR + row.m / 12 })), [data]);
  const snap   = (m: number) => data[Math.min(m, data.length - 1)];
  const endM   = horizonYears * 12;

  const nowDebtBurden = resolvedDebts.reduce(
    (s, d) => s + (absMo(d.payoffYear, d.payoffMonthIdx) > 0 ? d.payment : 0), 0,
  );
  const nowLoanBurden = resolvedPurchases.reduce((s, p) => {
    const sm = absMo(p.year, p.monthIdx);
    const pm = sm + payoffMonths(p.loanAmount, p.rate, p.payment);
    return s + (0 >= sm && 0 < pm ? p.payment : 0);
  }, 0);
  const effectiveNow = envelope - nowDebtBurden - nowLoanBurden;

  const purchaseMarkers = resolvedPurchases
    .filter(p => p.loanAmount > 0 && p.payment > 0)
    .map(p => {
      const sm  = absMo(p.year, p.monthIdx);
      const pmo = payoffMonths(p.loanAmount, p.rate, p.payment);
      return {
        buyDecimalYr:   parseFloat((START_YEAR + sm / 12).toFixed(4)),
        paidDecimalYr:  parseFloat((START_YEAR + (sm + pmo) / 12).toFixed(4)),
        withinHorizon:  (sm + pmo) / 12 <= horizonYears,
      };
    });

  const milestones = [
    { label: 'Start',                               m: 0     },
    { label: `Year ${Math.round(horizonYears / 2)}`, m: Math.round(endM / 2) },
    { label: `Year ${horizonYears}`,                m: endM, hi: true },
  ];

  const handleSave = () => onSave(scenario);

  return (
    <div style={{ '--plan-accent': accent, background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" } as React.CSSProperties}>
      <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 80 }}>

        {/* ── CORE SETTINGS ── */}
        <section className="sec" aria-label="Core settings">
          <SectionHead label="⚙️ Core Settings" addBtnStyle={addBtnStyle} labelStyle={S.label} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="envelope-range" style={S.label}>Monthly Envelope</label>
              <span aria-hidden="true" style={{ color: accent, fontSize: 12, fontWeight: 500 }}>{money(envelope)}/mo</span>
            </div>
            <input
              id="envelope-range" type="range" min={500} max={15_000} step={50}
              value={envelope}
              aria-label={`Monthly envelope: ${money(envelope)}`}
              aria-valuemin={500} aria-valuemax={15000} aria-valuenow={envelope}
              onChange={e => setEnvelope(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.muted }} aria-hidden="true">
              <span>$500</span><span>$15k</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: COLORS.muted }}>or type:</span>
              <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
              <input
                type="number" value={envelope} min={0} step={50}
                aria-label="Monthly envelope, typed"
                onChange={e => setEnvelope(+e.target.value)}
                style={{ ...S.field, width: 90 }}
              />
              <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="savings-range" style={S.label}>Starting Savings</label>
              <span aria-hidden="true" style={{ color: accent, fontSize: 12, fontWeight: 500 }}>{money(startSavings)}</span>
            </div>
            <input
              id="savings-range" type="range" min={0} max={200_000} step={1000}
              value={startSavings}
              aria-label={`Starting savings: ${money(startSavings)}`}
              onChange={e => setStartSavings(+e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.muted }} aria-hidden="true">
              <span>$0</span><span>$200k</span>
            </div>
          </div>

          <div className="g2" style={{ marginTop: 14 }}>
            {[
              { id: 'start-age',    labelText: 'Current Age',      val: startAge,     min: 18, max: 80,   step: 1,    set: setStartAge     },
              { id: 'horizon',      labelText: 'Horizon (years)',   val: horizonYears, min: 1,  max: 50,   step: 1,    set: setHorizonYears },
              { id: 'base-salary',  labelText: 'Base Salary ($)',   val: baseSalary,   min: 0,  max: null, step: 5000, set: setBaseSalary   },
              { id: 'housing-cost', labelText: 'Monthly Rent ($)',  val: housingCost,  min: 0,  max: null, step: 50,   set: setHousingCost  },
              { id: 'tax-pct',      labelText: 'Effective Tax (%)', val: taxPct,       min: 0,  max: 60,   step: 1,    set: setTaxPct       },
            ].map(({ id, labelText, val, min, max, step, set }) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor={id} style={S.label}>{labelText}</label>
                <input
                  id={id} type="number" value={val} min={min} step={step}
                  {...(max !== null ? { max } : {})}
                  onChange={e => set(+e.target.value)}
                  style={{ ...S.field, width: '100%' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={S.label} id="growth-label">Growth Rate</span>
              <fieldset style={{ border: 'none', padding: 0 }} aria-labelledby="growth-label">
                <div style={{ display: 'flex', gap: 5 }}>
                  {([['none','0% cash'],['hysa','HYSA'],['invested','7% index']] as const).map(([k, l]) => (
                    <button
                      key={k} onClick={() => setReturnMode(k)}
                      aria-pressed={returnMode === k}
                      style={{ ...chipStyle(returnMode === k, accent), flex: 1, padding: '7px 4px', fontSize: 10 }}
                    >{k === 'hysa' ? `${hysaRate}% HYSA` : l}</button>
                  ))}
                </div>
                {returnMode === 'hysa' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <input
                      type="number" value={hysaRate} min={0} max={20} step={0.1}
                      aria-label="Custom HYSA rate"
                      onChange={e => setHysaRate(Math.max(0, Math.min(20, +e.target.value)))}
                      style={{ ...S.field, width: 70, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 11, color: COLORS.muted }}>% APY</span>
                    <input
                      type="range" min={0} max={10} step={0.1} value={hysaRate}
                      aria-label="HYSA rate slider"
                      onChange={e => setHysaRate(+e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                )}
              </fieldset>
            </div>
          </div>

          {/* Summary bar */}
          <div role="status" aria-live="polite" style={{
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 6, padding: '10px 13px', fontSize: 11, lineHeight: 2.3, marginTop: 14,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
              <span style={{ color: COLORS.text }}>Envelope: <strong>{money(envelope)}/mo</strong></span>
              {nowDebtBurden > 0 && <span style={{ color: COLORS.red }}>− debt: {money(nowDebtBurden)}/mo</span>}
              {nowLoanBurden > 0 && <span style={{ color: COLORS.orange }}>− loans: {money(nowLoanBurden)}/mo</span>}
              <span style={{ color: accent }}>→ {money(effectiveNow)}/mo to savings now</span>
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
            </div>
          )}
          {debts.map(d => (
            <DebtItem key={d.id} d={d} onChange={p => changeDebt(d.id, p)} onRemove={() => rmDebt(d.id)} />
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
            <PurchaseItem key={p.id} p={p} housingCost={housingCost}
              onChange={patch => changePurchase(p.id, patch)} onRemove={() => rmPurchase(p.id)} />
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
            <RaiseItem key={r.id} r={r} taxPct={taxPct} baseSalary={baseSalary}
              onChange={patch => changeRaise(r.id, patch)} onRemove={() => rmRaise(r.id)} />
          ))}
        </section>

        {/* ── MILESTONES ── */}
        <section className="sec" aria-label="Savings milestones">
          <h2 style={{ ...S.label, marginBottom: 12 }}>Milestones</h2>
          <div className="mg">
            {milestones.map(s => (
              <div key={s.m} style={{
                padding: '14px 12px',
                background: s.hi ? `${accent}0E` : COLORS.surface,
                border: `1px solid ${s.hi ? accent : COLORS.border}`,
                borderRadius: 6,
              }}>
                <div style={{ ...S.label, marginBottom: 6 }}>Age {Math.floor(startAge + s.m / 12)}</div>
                <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.hi ? accent : COLORS.text, lineHeight: 1, marginBottom: 5 }}>
                  {money(snap(s.m)?.savings ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
                {s.hi && (
                  <div style={{ fontSize: 10, color: `${accent}99`, marginTop: 3 }}>
                    {returnMode === 'none' ? '0% · cash' : returnMode === 'hysa' ? `${hysaRate}% HYSA` : '7% invested'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CHART ── */}
        <section className="sec" aria-label="Savings trajectory chart">
          <h2 style={{ ...S.label, marginBottom: 8 }}>Savings Trajectory</h2>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>🛒 purchase date · ✓ loan paid off</p>
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
                domain={[START_YEAR, START_YEAR + horizonYears]}
                tickCount={Math.min(horizonYears + 1, 16)}
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
                type="monotone" dataKey="savings"
                stroke={accent} strokeWidth={2}
                fill="url(#chartGrad)" dot={false}
                activeDot={{ r: 4, fill: accent, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        {/* ── YEAR TABLE ── */}
        <section className="sec" aria-label="Year-by-year breakdown">
          <h2 style={{ ...S.label, marginBottom: 12 }}>Year-by-Year</h2>
          <div className="tbl">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {[
                    ['Age',       'Your age'],
                    ['Year',      'Calendar year'],
                    ['Balance',   'Total savings balance'],
                    ['Saving/mo', 'Net amount saved per month'],
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
                {yearly.map((d, i) => (
                  <tr key={d.m} style={{
                    borderBottom: `1px solid ${COLORS.border}18`,
                    background: i % 2 === 0 ? `${COLORS.surface}80` : 'transparent',
                  }}>
                    <td style={{ padding: '8px 10px', color: accent, fontWeight: 500 }}>{d.ageFloor}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.muted }}>{d.yr}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{money(d.savings)}</td>
                    <td style={{ padding: '8px 10px', color: COLORS.dim }}>{money(d.savingsInflow)}/mo</td>
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
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
          padding: '12px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end',
          zIndex: 100,
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
