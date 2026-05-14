import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import type { ThemeColors } from '../lib/themes';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import { stdPayment, money } from '../lib/finance';
import { MONTHS, buildPurchaseYears } from '../lib/constants';
import { LOCAL_MODE } from '../lib/mode';
import { DebtItem } from '../components/plan/DebtItem';
import { PurchaseItem } from '../components/plan/PurchaseItem';
import { RaiseItem } from '../components/plan/RaiseItem';
import { InvestmentItem } from '../components/plan/InvestmentItem';
import { RecurringChargeItem } from '../components/plan/RecurringChargeItem';
import { MarkersEditor } from '../components/plan/MarkersEditor';
import { ThemeSelector } from '../components/shared/ThemeSelector';
import type { Marker, BillAdjustment } from '../lib/types';
import { scrollIoItemIntoViewAndFocus } from '../lib/ioScrollFocus';
import { applyBackup, downloadBackupJson, downloadSummaryCsv, parseBackupJson } from '../lib/dataBackup';

const ioItemAnchor: React.CSSProperties = {
  scrollMarginTop: 24,
  scrollMarginBottom: 100,
};

interface BillModSectionProps {
  label:       string;
  description: string;
  fieldId:     string;
  value:       number;
  onValueChange:       (v: number) => void;
  adjustments:         BillAdjustment[];
  onAdjustmentsChange: (next: BillAdjustment[]) => void;
  startYear:    number;
  startMonthIdx: number;
  horizonYears: number;
  fieldStyle:  React.CSSProperties;
  labelStyle:  React.CSSProperties;
  addBtnStyle: React.CSSProperties;
  COLORS:      ThemeColors;
}

function BillModificationSection({
  label, description, fieldId, value, onValueChange,
  adjustments, onAdjustmentsChange,
  startYear, startMonthIdx, horizonYears,
  fieldStyle, labelStyle, addBtnStyle, COLORS,
}: BillModSectionProps) {
  const yearOpts = buildPurchaseYears(startYear, horizonYears);

  const addAdj = () => {
    onAdjustmentsChange([
      ...adjustments,
      { id: crypto.randomUUID(), year: startYear + 1, monthIdx: startMonthIdx, amount: value },
    ]);
  };
  const changeAdj = (id: string, patch: Partial<BillAdjustment>) =>
    onAdjustmentsChange(adjustments.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeAdj = (id: string) =>
    onAdjustmentsChange(adjustments.filter(a => a.id !== id));

  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <label htmlFor={fieldId} style={labelStyle}>{label}</label>
        <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500 }}>{money(value)}/mo</span>
      </div>
      <input id={fieldId} type="number" value={value} min={0} step={25}
        onChange={e => onValueChange(Math.max(0, +e.target.value))}
        style={{ ...fieldStyle, width: '100%' }} />
      <p style={{ fontSize: 10, color: COLORS.muted, margin: '6px 0 8px', lineHeight: 1.5 }}>{description}</p>

      {adjustments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 8 }}>
          {adjustments.map((adj, i) => (
            <div key={adj.id} style={{
              background: COLORS.faint,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ ...labelStyle, fontSize: 9 }}>Modification {i + 1}</span>
                <button type="button" onClick={() => removeAdj(adj.id)}
                  style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>
                  ×
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={labelStyle}>Month</span>
                  <select value={adj.monthIdx} aria-label={`Modification ${i + 1} month`}
                    onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })}
                    style={{ ...fieldStyle, width: '100%' }}>
                    {MONTHS.map((mo, mi) => <option key={mi} value={mi}>{mo}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={labelStyle}>Year</span>
                  <select value={adj.year} aria-label={`Modification ${i + 1} year`}
                    onChange={e => changeAdj(adj.id, { year: +e.target.value })}
                    style={{ ...fieldStyle, width: '100%' }}>
                    {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={`adj-amt-${adj.id}`} style={labelStyle}>New amount / mo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                    <input id={`adj-amt-${adj.id}`} type="number" value={adj.amount} min={0} step={25}
                      onChange={e => changeAdj(adj.id, { amount: Math.max(0, +e.target.value) })}
                      style={{ ...fieldStyle, width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={addAdj} style={{ ...addBtnStyle, fontSize: 10, padding: '5px 10px' }}>
        + Add modification
      </button>
    </div>
  );
}

export default function IO() {
  const COLORS  = useColors();
  const logout  = useAuthStore(s => s.logout);
  const library = useLibraryStore();
  const location = useLocation();
  const [backupMsg, setBackupMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // When opened with `?focus=<id>` (e.g. via the "View it" modal action after copying a
  // scenario item into the library), scroll/focus that library row on mount.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focusId = params.get('focus');
    if (!focusId) return;
    scrollIoItemIntoViewAndFocus(focusId);
  }, [location.search]);

  const p = library.profile;
  const sp = (patch: Partial<typeof p>) => library.setProfile(patch);
  const hasRetirement = p.retirementAge != null;

  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: 2, color: COLORS.muted,
    textTransform: 'uppercase',
  };

  const addBtnStyle: React.CSSProperties = {
    padding: '6px 13px', fontSize: 11, borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
    background: 'transparent', color: COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', flexShrink: 0,
  };

  const field: React.CSSProperties = {
    background: COLORS.faint, color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4, padding: '7px 9px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, outline: 'none',
    WebkitAppearance: 'none' as const, appearance: 'none' as const,
  };

  const chip = (active: boolean): React.CSSProperties => ({
    padding: '5px 9px', fontSize: 11, borderRadius: 4,
    border:     `1px solid ${active ? COLORS.accent : COLORS.border}`,
    background:  active ? `${COLORS.accent}22` : 'transparent',
    color:       active ? COLORS.accent : COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', transition: 'all 0.12s', flex: 1, whiteSpace: 'nowrap' as const,
  });

  const handleAddDebt = () => {
    let id = '';
    flushSync(() => {
      id = library.addDebt({
        label: '', payment: 200, payoffMonthIdx: p.startMonthIdx, payoffYear: p.startYear + 1,
      });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    let id = '';
    flushSync(() => {
      id = library.addPurchase({
        type: 'loan', label: '',
        year: p.startYear + 2, monthIdx: p.startMonthIdx,
        downPayment: 0, loanAmount, rate, termMonths, multiplier,
        payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
      });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRaise = () => {
    let id = '';
    flushSync(() => {
      id = library.addRaise({
        year: p.startYear + 1, monthIdx: p.startMonthIdx, salary: 70_000, baseSalary: p.baseSalary,
      });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRecurring = () => {
    let id = '';
    flushSync(() => {
      id = library.addRecurringCharge({ label: '', amount: 15 });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddInvestment = () => {
    let id = '';
    flushSync(() => {
      id = library.addInvestment({
        label: '', initialAmount: 0, annualReturnPct: 7, monthlyContribution: 200,
        startYear: p.startYear, startMonthIdx: p.startMonthIdx,
      });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleExportBackupJson = () => {
    downloadBackupJson();
    setBackupMsg({ kind: 'ok', text: 'JSON backup downloaded.' });
  };

  const handleExportSummaryCsv = () => {
    downloadSummaryCsv();
    setBackupMsg({ kind: 'ok', text: 'CSV summary downloaded (for spreadsheets only — import uses JSON).' });
  };

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    const confirmMsg = LOCAL_MODE
      ? 'Replace all I/O data and every saved scenario on this device with this backup? This cannot be undone.'
      : 'Replace all I/O library data on this device? Your scenarios stay tied to your online account. This cannot be undone.';
    if (!window.confirm(confirmMsg)) {
      input.value = '';
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setBackupMsg({ kind: 'err', text: 'Could not read that file.' });
      input.value = '';
      return;
    }

    const parsed = parseBackupJson(text);
    if (!parsed) {
      setBackupMsg({ kind: 'err', text: 'Not a valid Projection backup (expected a JSON file from Export backup).' });
      input.value = '';
      return;
    }

    const result = applyBackup(parsed);
    if (!result.ok) {
      setBackupMsg({ kind: 'err', text: result.error });
      input.value = '';
      return;
    }
    setBackupMsg({ kind: 'ok', text: result.detail });
    input.value = '';
  };

  return (
    <div style={{
      background: COLORS.bg, minHeight: '100vh', color: COLORS.text,
      fontFamily: "'IBM Plex Mono', monospace", paddingBottom: 0,
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 className="syne" style={{ fontSize: 18, fontWeight: 800 }}>Projection</h1>
          <nav className="desktop-only" style={{ gap: 4 }}>
            <Link to="/dashboard" style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>Dashboard</Link>
            <span style={{ padding: '5px 10px', fontSize: 12, color: COLORS.accent, borderRadius: 4, border: `1px solid ${COLORS.accent}30` }}>I/O</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeSelector />
          {!LOCAL_MODE && (
            <button
              onClick={logout}
              style={{
                padding: '7px 14px', fontSize: 12, borderRadius: 4,
                border: `1px solid ${COLORS.border}`,
                background: 'transparent', color: COLORS.muted,
                fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
              }}
            >Sign out</button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '0 18px 80px' }}>

        {/* Hero */}
        <div style={{
          paddingTop: 32, paddingBottom: 28,
          borderBottom: `1px solid ${COLORS.border}`,
          marginBottom: 0,
        }}>
          <div className="syne" style={{ fontSize: 32, fontWeight: 800, color: COLORS.accent, lineHeight: 1 }}>
            I/O
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginTop: 6 }}>
            input · output
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10, maxWidth: 520, lineHeight: 1.7 }}>
            Define your financial facts once — debts, bills, purchases, investments, raises — then use them across any scenario.
          </p>
          <p style={{ fontSize: 10, color: COLORS.dim, marginTop: 10, maxWidth: 520, lineHeight: 1.65 }}>
            Month-by-month estimates in nominal dollars. Simplified taxes and yields, no Monte Carlo. Use as directional guides — not tax or investment advice.
          </p>
        </div>

        {/* ── CORE SETTINGS ── */}
        <section className="sec" aria-label="Core settings">
          <span style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>⚙️ Core Settings</span>
          <p style={{ fontSize: 10, color: COLORS.dim, marginBottom: 14, lineHeight: 1.55 }}>
            These numbers drive your entire projection — your monthly budget headroom, starting balances, and timeline. Get these right first; everything else adjusts around them.
          </p>

          {/* Monthly Budget Surplus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="io-envelope" style={labelStyle}>Monthly Budget Surplus</label>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(p.envelope)}/mo</span>
            </div>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
              The money left over each month after fixed bills — what the app distributes across saving, investing, and spending.
            </p>
            <input id="io-envelope" type="range" min={500} max={15_000} step={50}
              value={p.envelope} onChange={e => sp({ envelope: +e.target.value })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
              <input type="number" value={p.envelope} min={0} step={50}
                onChange={e => sp({ envelope: +e.target.value })}
                style={{ ...field, width: 90 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
            </div>
          </div>

          {/* Cash on Hand Today */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="io-savings" style={labelStyle}>Cash on Hand Today</label>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(p.startSavings)}</span>
            </div>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
              Your current liquid savings — money in checking or savings accounts you could access right now, not counting investments or retirement accounts.
            </p>
            <input id="io-savings" type="range" min={0} max={200_000} step={1_000}
              value={p.startSavings} onChange={e => sp({ startSavings: +e.target.value })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
              <input type="number" value={p.startSavings} min={0} step={500}
                onChange={e => sp({ startSavings: +e.target.value })}
                style={{ ...field, width: 110 }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 14 }}>
            <label htmlFor="io-inflation" style={labelStyle}>Annual Budget Growth</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                id="io-inflation"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={p.inflationPctAnnual ?? 0}
                onChange={e => sp({ inflationPctAnnual: Math.max(0, Math.min(50, +e.target.value || 0)) })}
                style={{ ...field, width: 72 }}
              />
              <span style={{ fontSize: 11, color: COLORS.muted }}>
                % — Grows your monthly surplus by this amount each year. Use to model expected raises or cost-of-living adjustments. Set <strong style={{ color: COLORS.text }}>0%</strong> to keep it flat.
              </span>
            </div>
          </div>

          <div style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={labelStyle}>Switch to Retirement Income</span>
              <button
                type="button"
                aria-pressed={hasRetirement}
                onClick={() => {
                  if (hasRetirement) {
                    sp({ retirementAge: undefined, retirementEnvelope: undefined });
                  } else {
                    sp({
                      retirementAge: Math.max(p.startAge + 1, 65),
                      retirementEnvelope: Math.round(Math.max(0, p.envelope * 0.8)),
                    });
                  }
                }}
                style={{ ...chip(hasRetirement), flex: '0 0 auto' }}
              >
                {hasRetirement ? 'Retirement on' : 'Enable'}
              </button>
            </div>
            <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 8, lineHeight: 1.55 }}>
              At retirement age, your working income envelope is <strong style={{ color: COLORS.text }}>replaced</strong> by a retirement income envelope — modeling the shift from paychecks to withdrawals or fixed income.
            </p>
            {hasRetirement && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label htmlFor="io-ret-age" style={labelStyle}>Retirement age</label>
                  <input
                    id="io-ret-age"
                    type="number"
                    value={p.retirementAge ?? ''}
                    min={Math.max(0, p.startAge)}
                    max={120}
                    step={1}
                    onChange={e => sp({ retirementAge: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
                    style={{ ...field, width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label htmlFor="io-ret-env" style={labelStyle}>Retirement budget ($/mo)</label>
                  <input
                    id="io-ret-env"
                    type="number"
                    value={p.retirementEnvelope ?? ''}
                    min={0}
                    step={50}
                    onChange={e => sp({ retirementEnvelope: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
                    style={{ ...field, width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Numeric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="io-start-month" style={labelStyle}>Projection Start</label>
              <select id="io-start-month" value={p.startMonthIdx} onChange={e => sp({ startMonthIdx: +e.target.value })} style={{ ...field, width: '100%' }}>
                {MONTHS.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="io-start-year" style={labelStyle}>Start Year</label>
              <input id="io-start-year" type="number" value={p.startYear} min={2010} max={2100} step={1}
                onChange={e => sp({ startYear: +e.target.value })}
                style={{ ...field, width: '100%' }} />
            </div>
            {([
              { id: 'io-age',     label: 'Your Age at Start',      key: 'startAge',     step: 1,     min: 18  },
              { id: 'io-horizon', label: 'Years to Project',        key: 'horizonYears', step: 1,     min: 1   },
              { id: 'io-salary',  label: 'Current Annual Salary ($)', key: 'baseSalary', step: 5_000, min: 0   },
            ] as const).map(({ id, label, key, step, min }) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor={id} style={labelStyle}>{label}</label>
                <input id={id} type="number" value={p[key]} min={min} step={step}
                  onChange={e => sp({ [key]: +e.target.value } as Partial<typeof p>)}
                  style={{ ...field, width: '100%' }} />
              </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="io-tax" style={labelStyle}>Est. Tax Rate (%)</label>
              <input
                id="io-tax"
                type="number"
                value={p.taxPct}
                min={0}
                max={60}
                step={1}
                onChange={e => sp({ taxPct: Math.max(0, Math.min(60, +e.target.value)) })}
                style={{ ...field, width: '100%' }}
              />
            </div>
          </div>
          <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
            <strong style={{ color: COLORS.text }}>Current Annual Salary</strong> is the baseline for raise calculations — the gross pre-tax amount a raise will be measured against. <strong style={{ color: COLORS.text }}>Est. Tax Rate</strong> determines how much of each raise actually lands in your paycheck.
          </p>

          {/* Savings Account Interest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 14 }}>
            <span style={labelStyle}>Savings Account Interest</span>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 6px', lineHeight: 1.5 }}>
              Annual interest earned on your uninvested cash balance. <strong style={{ color: COLORS.text }}>Does not affect investment accounts</strong> — each investment has its own return rate set separately below.
            </p>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['none', 'hysa', 'invested'] as const).map(k => (
                <button key={k} onClick={() => sp({ returnMode: k })}
                  aria-pressed={p.returnMode === k}
                  style={{ ...chip(p.returnMode === k), fontSize: 10, padding: '7px 6px' }}>
                  {k === 'none' ? 'No interest' : k === 'hysa' ? `${p.hysaRate ?? 4.5}% HYSA` : '7% assumed'}
                </button>
              ))}
            </div>
            {p.returnMode === 'hysa' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <input type="number" value={p.hysaRate ?? 4.5} min={0} max={20} step={0.1}
                  onChange={e => sp({ hysaRate: Math.max(0, Math.min(20, +e.target.value)) })}
                  style={{ ...field, width: 60, textAlign: 'right' as const }} />
                <span style={{ fontSize: 11, color: COLORS.muted }}>% APY</span>
                <input type="range" min={0} max={10} step={0.1} value={p.hysaRate ?? 4.5}
                  onChange={e => sp({ hysaRate: +e.target.value })}
                  style={{ flex: 1 }} />
              </div>
            )}
          </div>

          {/* ── HOUSING ── */}
          <BillModificationSection
            label="Housing Cost"
            description="Your monthly housing payment — rent, or the out-of-pocket portion of a mortgage not covered elsewhere. Deducted from your envelope each month. Homeowners with a financed purchase: add that in Major Purchases and set this to $0 or your remaining housing overhead."
            fieldId="io-rent"
            value={p.housingCost}
            onValueChange={v => sp({ housingCost: v })}
            adjustments={p.housingAdjustments ?? []}
            onAdjustmentsChange={next => sp({ housingAdjustments: next })}
            startYear={p.startYear}
            startMonthIdx={p.startMonthIdx}
            horizonYears={p.horizonYears}
            fieldStyle={field}
            labelStyle={labelStyle}
            addBtnStyle={addBtnStyle}
            COLORS={COLORS}
          />

          {/* ── SPENDING MONEY ── */}
          <BillModificationSection
            label="Spending Money"
            description="A set amount each month for discretionary purchases — dining, hobbies, shopping. This is spent, not saved; it reduces your monthly surplus directly. Add modifications to model lifestyle changes over time."
            fieldId="io-allowance"
            value={p.monthlyAllowance}
            onValueChange={v => sp({ monthlyAllowance: v })}
            adjustments={p.allowanceAdjustments ?? []}
            onAdjustmentsChange={next => sp({ allowanceAdjustments: next })}
            startYear={p.startYear}
            startMonthIdx={p.startMonthIdx}
            horizonYears={p.horizonYears}
            fieldStyle={field}
            labelStyle={labelStyle}
            addBtnStyle={addBtnStyle}
            COLORS={COLORS}
          />

          {/* ── PHASES ── */}
          <div style={{ marginTop: 20, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
            <MarkersEditor
              markers={library.markers}
              onChange={(next: Marker[]) => library.setMarkers(next)}
              defaultStartYear={p.startYear}
              defaultStartMonthIdx={p.startMonthIdx}
            />
          </div>
        </section>

        {/* ── DEBTS ── */}
        <section className="sec" aria-label="Library debts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>💳 Debts</span>
            <button type="button" onClick={handleAddDebt} style={addBtnStyle}>+ Add Debt</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.debts.length ? 8 : 0 }}>
            Recurring debt payments — credit cards, student loans, car payments, personal loans. Each payment reduces your envelope each month until the debt is paid off, at which point those funds free up automatically. Add balance and APR to get a payoff date and total interest estimate.
          </p>
          {library.debts.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.debts.map(d => (
            <div key={d.id} data-io-item={d.id} style={ioItemAnchor}>
              <DebtItem
                d={d}
                startYear={p.startYear}
                onChange={patch => library.updateDebt(d.id, patch)}
                onRemove={() => library.removeDebt(d.id)}
              />
            </div>
          ))}
        </section>

        {/* Recurring bills */}
        <section className="sec" aria-label="Library recurring charges">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📎 Recurring Bills</span>
            <button type="button" onClick={handleAddRecurring} style={addBtnStyle}>+ Add</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.recurringCharges.length ? 8 : 0 }}>
            Fixed non-discretionary costs that aren't debts — subscriptions, insurance premiums, utilities, phone bills. Unlike debts, these have no payoff date. Unlike spending money, they're obligations, not choices. Use modifications to model a subscription you plan to cancel or a bill that changes over time.
          </p>
          {library.recurringCharges.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.recurringCharges.map(c => (
            <div key={c.id} data-io-item={c.id} style={ioItemAnchor}>
              <RecurringChargeItem
                c={c}
                startYear={p.startYear}
                horizonYears={p.horizonYears}
                onChange={patch => library.updateRecurringCharge(c.id, patch)}
                onRemove={() => library.removeRecurringCharge(c.id)}
              />
            </div>
          ))}
        </section>

        {/* Major Purchases */}
        <section className="sec" aria-label="Library purchases">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>🛒 Major Purchases</span>
            <button type="button" onClick={handleAddPurchase} style={addBtnStyle}>+ Add Purchase</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.purchases.length ? 8 : 0 }}>
            Large financed purchases spread across monthly payments using standard amortization. The down payment reduces your cash savings on the purchase date. Use <strong>Loan</strong> for a car or personal loan. Use <strong>House</strong> for a home purchase — this activates mortgage amortization, replaces your housing cost in the simulation, and lets you track equity via a market value.
          </p>
          {library.purchases.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.purchases.map(pur => (
            <div key={pur.id} data-io-item={pur.id} style={ioItemAnchor}>
              <PurchaseItem
                p={pur}
                startYear={p.startYear}
                startMonthIdx={p.startMonthIdx}
                horizonYears={p.horizonYears}
                housingCost={library.profile.housingCost}
                onChange={patch => library.updatePurchase(pur.id, patch)}
                onRemove={() => library.removePurchase(pur.id)}
              />
            </div>
          ))}
        </section>

        {/* Investments */}
        <section className="sec" aria-label="Library investments">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📊 Investments</span>
            <button type="button" onClick={handleAddInvestment} style={addBtnStyle}>+ Add account</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.investments.length ? 8 : 0 }}>
            Each investment account grows at its own annual return rate, compounded monthly — meaning returns are reinvested automatically. Balances count toward net worth but aren't liquid; they're not available as cash until you sell. Each account has its own return rate — this is separate from the savings account interest set in Core Settings.
          </p>
          {library.investments.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.investments.map(inv => (
            <div key={inv.id} data-io-item={inv.id} style={ioItemAnchor}>
              <InvestmentItem
                i={inv}
                planStartYear={p.startYear}
                planStartMonthIdx={p.startMonthIdx}
                horizonYears={p.horizonYears}
                onChange={patch => library.updateInvestment(inv.id, patch)}
                onRemove={() => library.removeInvestment(inv.id)}
              />
            </div>
          ))}
        </section>

        {/* Raises */}
        <section className="sec" aria-label="Library raises">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📈 Raises</span>
            <button type="button" onClick={handleAddRaise} style={addBtnStyle}>+ Add Raise</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.raises.length ? 8 : 0 }}>
            Expected salary increases, taxed at your estimated rate — only the after-tax portion flows into your monthly surplus. Schedule raises by date to model a promotion, annual review, or career change. The net monthly boost is shown automatically based on the difference from your current salary.
          </p>
          {library.raises.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.raises.map(r => (
            <div key={r.id} data-io-item={r.id} style={ioItemAnchor}>
              <RaiseItem
                r={r}
                startYear={p.startYear}
                taxPct={p.taxPct}
                baseSalary={r.baseSalary}
                onChange={patch => library.updateRaise(r.id, patch)}
                onRemove={() => library.removeRaise(r.id)}
              />
            </div>
          ))}
        </section>

        <section className="sec" aria-label="Backup and restore">
          <span style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>💾 Backup & restore</span>
          <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.65, marginBottom: 12 }}>
            Export a JSON backup to move your I/O library{LOCAL_MODE ? ' and saved scenarios' : ''} to another browser or machine, then use Import on the new device.
            The CSV export is a flat summary for spreadsheets and cannot be re-imported.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={handleExportBackupJson} style={addBtnStyle}>
              Export backup (JSON)
            </button>
            <button type="button" onClick={handleExportSummaryCsv} style={addBtnStyle}>
              Export summary (CSV)
            </button>
            {/*
              Mobile Safari blocks programmatic .click() on file inputs with display:none.
              Full-opacity invisible input over a label (hit target) opens the picker from a real tap.
            */}
            <label
              style={{
                ...addBtnStyle,
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 40,
                border: `1px solid ${COLORS.accent}`,
                color: COLORS.accent,
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <span style={{ pointerEvents: 'none' }}>Import backup…</span>
              <input
                type="file"
                accept=".json,application/json,text/json,text/plain"
                aria-label="Import JSON backup"
                onChange={handleImportFile}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              />
            </label>
          </div>
          {backupMsg && (
            <div
              role="status"
              style={{
                fontSize: 11,
                padding: '8px 12px',
                borderRadius: 4,
                border: `1px solid ${backupMsg.kind === 'ok' ? `${COLORS.accent}45` : `${COLORS.red}45`}`,
                background: backupMsg.kind === 'ok' ? `${COLORS.accent}0F` : `${COLORS.red}12`,
                color: backupMsg.kind === 'ok' ? COLORS.text : COLORS.red,
                lineHeight: 1.5,
              }}
            >
              {backupMsg.text}
            </div>
          )}
        </section>

      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 0 20px',
      }}>
        <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>DASH</Link>
        <Link to="/io"        style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.accent, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>I/O</Link>
        <Link to="/plans/new" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>+ NEW</Link>
      </nav>
    </div>
  );
}
