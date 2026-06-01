import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
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
import { Button, Input, Select, Slider, ButtonGroup, Toggle } from '@hannasage/projection-ui';
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
}

function BillModificationSection({
  label, description, fieldId, value, onValueChange,
  adjustments, onAdjustmentsChange,
  startYear, startMonthIdx, horizonYears,
}: BillModSectionProps) {
  const COLORS   = useColors();
  const yearOpts = buildPurchaseYears(startYear, horizonYears).map(y => ({ value: String(y), label: String(y) }));
  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1,
  };

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
        <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500 }}>{money(value)}/mo</span>
      </div>
      <Input
        id={fieldId}
        aria-label={label}
        type="number"
        value={value}
        min={0}
        step={25}
        prefix="$"
        suffix="/mo"
        onChange={e => onValueChange(Math.max(0, +e.target.value))}
      />
      <p style={{ fontSize: 10, color: COLORS.muted, margin: '6px 0 0', lineHeight: 1.5 }}>{description}</p>

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjustments.length ? 8 : 0 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Modifications</span>
          <Button variant="primary" size="sm" onClick={addAdj}>+ Change</Button>
        </div>
        {adjustments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {adjustments.map((adj, i) => (
              <div key={adj.id} style={{
                background: COLORS.faint, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Mod {i + 1}</span>
                  <button type="button" onClick={() => removeAdj(adj.id)} style={iconBtn}>×</button>
                </div>
                <div className="igr3" style={{ gap: 8 }}>
                  <Select label="Month" options={monthOpts} value={String(adj.monthIdx)}
                    aria-label={`Modification ${i + 1} month`}
                    onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })} />
                  <Select label="Year" options={yearOpts} value={String(adj.year)}
                    aria-label={`Modification ${i + 1} year`}
                    onChange={e => changeAdj(adj.id, { year: +e.target.value })} />
                  <Input
                    id={`adj-amt-${adj.id}`}
                    label="New amount / mo"
                    type="number" min={0} step={25}
                    value={adj.amount} prefix="$"
                    onChange={e => changeAdj(adj.id, { amount: Math.max(0, +e.target.value) })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IO() {
  const COLORS  = useColors();
  const logout  = useAuthStore(s => s.logout);
  const library = useLibraryStore();
  const location = useLocation();
  const [backupMsg, setBackupMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const params  = new URLSearchParams(location.search);
    const focusId = params.get('focus');
    if (!focusId) return;
    scrollIoItemIntoViewAndFocus(focusId);
  }, [location.search]);

  const p   = library.profile;
  const sp  = (patch: Partial<typeof p>) => library.setProfile(patch);
  const hasRetirement = p.retirementAge != null;

  const returnModeOptions = [
    { value: 'none',     label: 'No interest' },
    { value: 'hysa',     label: `${p.hysaRate ?? 4.5}% HYSA` },
    { value: 'invested', label: '7% assumed' },
  ];

  const handleAddDebt = () => {
    let id = '';
    flushSync(() => {
      id = library.addDebt({ label: '', payment: 200, payoffMonthIdx: p.startMonthIdx, payoffYear: p.startYear + 1 });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    let id = '';
    flushSync(() => {
      id = library.addPurchase({
        type: 'loan', label: '', year: p.startYear + 2, monthIdx: p.startMonthIdx,
        downPayment: 0, loanAmount, rate, termMonths, multiplier,
        payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
      });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRaise = () => {
    let id = '';
    flushSync(() => {
      id = library.addRaise({ year: p.startYear + 1, monthIdx: p.startMonthIdx, salary: 70_000, baseSalary: p.baseSalary });
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRecurring = () => {
    let id = '';
    flushSync(() => { id = library.addRecurringCharge({ label: '', amount: 15 }); });
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
    const file  = input.files?.[0];
    if (!file) return;
    const confirmMsg = LOCAL_MODE
      ? 'Replace all I/O data and every saved scenario on this device with this backup? This cannot be undone.'
      : 'Replace all I/O library data on this device? Your scenarios stay tied to your online account. This cannot be undone.';
    if (!window.confirm(confirmMsg)) { input.value = ''; return; }
    let text: string;
    try { text = await file.text(); } catch {
      setBackupMsg({ kind: 'err', text: 'Could not read that file.' });
      input.value = ''; return;
    }
    const parsed = parseBackupJson(text);
    if (!parsed) {
      setBackupMsg({ kind: 'err', text: 'Not a valid Projection backup (expected a JSON file from Export backup).' });
      input.value = ''; return;
    }
    const result = applyBackup(parsed);
    if (!result.ok) { setBackupMsg({ kind: 'err', text: result.error }); input.value = ''; return; }
    setBackupMsg({ kind: 'ok', text: result.detail });
    input.value = '';
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase',
  };

  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: 'var(--ui-font)', paddingBottom: 0 }}>
      {/* Header */}
      <header style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Button variant="secondary" size="sm" onClick={logout}>Sign out</Button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '0 18px 80px' }}>

        {/* Hero */}
        <div style={{ paddingTop: 32, paddingBottom: 28, borderBottom: `1px solid ${COLORS.border}` }}>
          <div className="syne" style={{ fontSize: 32, fontWeight: 800, color: COLORS.accent, lineHeight: 1 }}>I/O</div>
          <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 3, marginTop: 6 }}>input · output</div>
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
            These numbers drive your entire projection. Get these right first; everything else adjusts around them.
          </p>

          {/* Monthly Budget Surplus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
              The money left over each month after fixed bills — what the app distributes across saving, investing, and spending.
            </p>
            <Slider
              label="Monthly Budget Surplus"
              min={500} max={15_000} step={50}
              value={p.envelope}
              onChange={v => sp({ envelope: v })}
              valueFormat={v => `${money(v)}/mo`}
            />
            <Input
              id="io-envelope"
              aria-label="Monthly Budget Surplus"
              type="number" min={0} step={50}
              value={p.envelope}
              prefix="$" suffix="/mo"
              onChange={e => sp({ envelope: +e.target.value })}
              containerStyle={{ width: 160 }}
            />
          </div>

          {/* Cash on Hand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 4px', lineHeight: 1.5 }}>
              Your current liquid savings — money in checking or savings accounts you could access right now.
            </p>
            <Slider
              label="Cash on Hand Today"
              min={0} max={200_000} step={1_000}
              value={p.startSavings}
              onChange={v => sp({ startSavings: v })}
              valueFormat={v => money(v)}
            />
            <Input
              id="io-savings"
              aria-label="Cash on Hand Today"
              type="number" min={0} step={500}
              value={p.startSavings}
              prefix="$"
              onChange={e => sp({ startSavings: +e.target.value })}
              containerStyle={{ width: 140 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Input
                id="io-inflation"
                label="Annual Budget Growth"
                type="number" min={0} max={50} step={0.5}
                value={p.inflationPctAnnual ?? 0}
                suffix="%"
                onChange={e => sp({ inflationPctAnnual: Math.max(0, Math.min(50, +e.target.value || 0)) })}
                containerStyle={{ width: 120 }}
              />
              <span style={{ fontSize: 11, color: COLORS.muted, marginTop: 20 }}>
                Grows your monthly surplus by this amount each year. Set <strong style={{ color: COLORS.text }}>0%</strong> to keep it flat.
              </span>
            </div>
          </div>

          {/* Retirement toggle */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
            <Toggle
              checked={hasRetirement}
              onChange={(checked) => {
                if (!checked) {
                  sp({ retirementAge: undefined, retirementEnvelope: undefined });
                } else {
                  sp({ retirementAge: Math.max(p.startAge + 1, 65), retirementEnvelope: Math.round(Math.max(0, p.envelope * 0.8)) });
                }
              }}
              label="Switch to Retirement Income"
            />
            <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 8, lineHeight: 1.55 }}>
              At retirement age, your working income envelope is <strong style={{ color: COLORS.text }}>replaced</strong> by a retirement income envelope.
            </p>
            {hasRetirement && (
              <div className="igra" style={{ gap: 10, marginTop: 10 }}>
                <Input
                  id="io-ret-age"
                  label="Retirement age"
                  type="number" min={Math.max(0, p.startAge)} max={120} step={1}
                  value={p.retirementAge ?? ''}
                  onChange={e => sp({ retirementAge: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
                />
                <Input
                  id="io-ret-env"
                  label="Retirement budget ($/mo)"
                  type="number" min={0} step={50}
                  value={p.retirementEnvelope ?? ''}
                  onChange={e => sp({ retirementEnvelope: e.target.value === '' ? undefined : Math.max(0, +e.target.value) })}
                />
              </div>
            )}
          </div>

          {/* Numeric grid */}
          <div className="igra" style={{ gap: 10, marginTop: 14 }}>
            <Select
              id="io-start-month"
              label="Projection Start"
              options={monthOpts}
              value={String(p.startMonthIdx)}
              onChange={e => sp({ startMonthIdx: +e.target.value })}
            />
            <Input
              id="io-start-year"
              label="Start Year"
              type="number" min={2010} max={2100} step={1}
              value={p.startYear}
              onChange={e => sp({ startYear: +e.target.value })}
            />
            {([
              { id: 'io-age',     label: 'Your Age at Start',        key: 'startAge',     step: 1,     min: 18  },
              { id: 'io-horizon', label: 'Years to Project',         key: 'horizonYears', step: 1,     min: 1   },
              { id: 'io-salary',  label: 'Current Annual Salary ($)', key: 'baseSalary', step: 5_000, min: 0   },
            ] as const).map(({ id, label, key, step, min }) => (
              <Input key={id} id={id} label={label} type="number" min={min} step={step}
                value={p[key]}
                onChange={e => sp({ [key]: +e.target.value } as Partial<typeof p>)} />
            ))}
            <Input
              id="io-tax"
              label="Est. Tax Rate (%)"
              type="number" min={0} max={60} step={1}
              value={p.taxPct}
              suffix="%"
              onChange={e => sp({ taxPct: Math.max(0, Math.min(60, +e.target.value)) })}
            />
          </div>
          <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
            <strong style={{ color: COLORS.text }}>Current Annual Salary</strong> is the baseline for raise calculations.{' '}
            <strong style={{ color: COLORS.text }}>Est. Tax Rate</strong> determines how much of each raise lands in your paycheck.
          </p>

          {/* Savings Account Interest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 14 }}>
            <span style={labelStyle}>Savings Account Interest</span>
            <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 6px', lineHeight: 1.5 }}>
              Annual interest earned on your uninvested cash balance. <strong style={{ color: COLORS.text }}>Does not affect investment accounts.</strong>
            </p>
            <ButtonGroup
              options={returnModeOptions}
              value={p.returnMode}
              variant="segmented"
              block
              onChange={v => sp({ returnMode: v as 'none' | 'hysa' | 'invested' })}
              size="sm"
            />
            {p.returnMode === 'hysa' && (
              <div style={{ marginTop: 8 }}>
                <Slider
                  aria-label="HYSA savings rate"
                  min={0} max={10} step={0.1}
                  value={p.hysaRate ?? 4.5}
                  onChange={v => sp({ hysaRate: v })}
                  valueFormat={v => `${v.toFixed(1)}% APY`}
                />
              </div>
            )}
          </div>

          {/* Housing & Spending via BillModificationSection */}
          <BillModificationSection
            label="Housing Cost"
            description="Your monthly housing payment — rent, or the out-of-pocket portion of a mortgage not covered elsewhere. Deducted from your envelope each month."
            fieldId="io-rent"
            value={p.housingCost}
            onValueChange={v => sp({ housingCost: v })}
            adjustments={p.housingAdjustments ?? []}
            onAdjustmentsChange={next => sp({ housingAdjustments: next })}
            startYear={p.startYear}
            startMonthIdx={p.startMonthIdx}
            horizonYears={p.horizonYears}
          />

          <BillModificationSection
            label="Spending Money"
            description="A set amount each month for discretionary purchases — dining, hobbies, shopping. This is spent, not saved."
            fieldId="io-allowance"
            value={p.monthlyAllowance}
            onValueChange={v => sp({ monthlyAllowance: v })}
            adjustments={p.allowanceAdjustments ?? []}
            onAdjustmentsChange={next => sp({ allowanceAdjustments: next })}
            startYear={p.startYear}
            startMonthIdx={p.startMonthIdx}
            horizonYears={p.horizonYears}
          />

          {/* Phases */}
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
            <Button variant="secondary" size="sm" onClick={handleAddDebt}>+ Add Debt</Button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.debts.length ? 8 : 0 }}>
            Recurring debt payments — credit cards, student loans, car payments. Each payment reduces your envelope until the debt is paid off.
          </p>
          {library.debts.length === 0 && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>None yet.</p>}
          {library.debts.map(d => (
            <div key={d.id} data-io-item={d.id} style={ioItemAnchor}>
              <DebtItem d={d} startYear={p.startYear} onChange={patch => library.updateDebt(d.id, patch)} onRemove={() => library.removeDebt(d.id)} />
            </div>
          ))}
        </section>

        {/* ── RECURRING BILLS ── */}
        <section className="sec" aria-label="Library recurring charges">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📎 Recurring Bills</span>
            <Button variant="secondary" size="sm" onClick={handleAddRecurring}>+ Add</Button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.recurringCharges.length ? 8 : 0 }}>
            Fixed non-discretionary costs that aren't debts — subscriptions, insurance premiums, utilities.
          </p>
          {library.recurringCharges.length === 0 && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>None yet.</p>}
          {library.recurringCharges.map(c => (
            <div key={c.id} data-io-item={c.id} style={ioItemAnchor}>
              <RecurringChargeItem c={c} startYear={p.startYear} horizonYears={p.horizonYears}
                onChange={patch => library.updateRecurringCharge(c.id, patch)}
                onRemove={() => library.removeRecurringCharge(c.id)} />
            </div>
          ))}
        </section>

        {/* ── MAJOR PURCHASES ── */}
        <section className="sec" aria-label="Library purchases">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>🛒 Major Purchases</span>
            <Button variant="secondary" size="sm" onClick={handleAddPurchase}>+ Add Purchase</Button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.purchases.length ? 8 : 0 }}>
            Large financed purchases spread across monthly payments. Use <strong>Loan</strong> for a car or personal loan, <strong>House</strong> for a home purchase.
          </p>
          {library.purchases.length === 0 && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>None yet.</p>}
          {library.purchases.map(pur => (
            <div key={pur.id} data-io-item={pur.id} style={ioItemAnchor}>
              <PurchaseItem p={pur} startYear={p.startYear} startMonthIdx={p.startMonthIdx}
                horizonYears={p.horizonYears} housingCost={library.profile.housingCost}
                onChange={patch => library.updatePurchase(pur.id, patch)}
                onRemove={() => library.removePurchase(pur.id)} />
            </div>
          ))}
        </section>

        {/* ── INVESTMENTS ── */}
        <section className="sec" aria-label="Library investments">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📊 Investments</span>
            <Button variant="secondary" size="sm" onClick={handleAddInvestment}>+ Add account</Button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.investments.length ? 8 : 0 }}>
            Each investment account grows at its own annual return rate, compounded monthly. Balances count toward net worth but aren't liquid.
          </p>
          {library.investments.length === 0 && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>None yet.</p>}
          {library.investments.map(inv => (
            <div key={inv.id} data-io-item={inv.id} style={ioItemAnchor}>
              <InvestmentItem i={inv} planStartYear={p.startYear} planStartMonthIdx={p.startMonthIdx}
                horizonYears={p.horizonYears}
                onChange={patch => library.updateInvestment(inv.id, patch)}
                onRemove={() => library.removeInvestment(inv.id)} />
            </div>
          ))}
        </section>

        {/* ── RAISES ── */}
        <section className="sec" aria-label="Library raises">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📈 Raises</span>
            <Button variant="secondary" size="sm" onClick={handleAddRaise}>+ Add Raise</Button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.raises.length ? 8 : 0 }}>
            Expected salary increases, taxed at your estimated rate. Schedule raises by date to model a promotion or career change.
          </p>
          {library.raises.length === 0 && <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>None yet.</p>}
          {library.raises.map(r => (
            <div key={r.id} data-io-item={r.id} style={ioItemAnchor}>
              <RaiseItem r={r} startYear={p.startYear} taxPct={p.taxPct} baseSalary={r.baseSalary}
                onChange={patch => library.updateRaise(r.id, patch)}
                onRemove={() => library.removeRaise(r.id)} />
            </div>
          ))}
        </section>

        {/* ── BACKUP & RESTORE ── */}
        <section className="sec" aria-label="Backup and restore">
          <span style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>💾 Backup &amp; restore</span>
          <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.65, marginBottom: 12 }}>
            Export a JSON backup to move your I/O library{LOCAL_MODE ? ' and saved scenarios' : ''} to another browser or machine.
            The CSV export is a flat summary for spreadsheets and cannot be re-imported.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <Button variant="secondary" size="sm" onClick={handleExportBackupJson}>Export backup (JSON)</Button>
            <Button variant="secondary" size="sm" onClick={handleExportSummaryCsv}>Export summary (CSV)</Button>
            {/*
              Mobile Safari blocks programmatic .click() on file inputs with display:none.
              Full-opacity invisible input over a label (hit target) opens the picker from a real tap.
            */}
            <label style={{
              padding: '7px 14px', fontSize: 13, borderRadius: 'var(--ui-radius-md)',
              border: `1px solid ${COLORS.accent}`,
              color: COLORS.accent, cursor: 'pointer', fontFamily: 'var(--ui-font)',
              position: 'relative', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', minHeight: 36, overflow: 'hidden',
            }}>
              <span style={{ pointerEvents: 'none' }}>Import backup…</span>
              <input
                type="file"
                accept=".json,application/json,text/json,text/plain"
                aria-label="Import JSON backup"
                onChange={handleImportFile}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16 }}
              />
            </label>
          </div>
          {backupMsg && (
            <div
              role="status"
              style={{
                fontSize: 11, padding: '8px 12px', borderRadius: 4, lineHeight: 1.5,
                border: `1px solid ${backupMsg.kind === 'ok' ? `${COLORS.accent}45` : `${COLORS.red}45`}`,
                background: backupMsg.kind === 'ok' ? `${COLORS.accent}0F` : `${COLORS.red}12`,
                color: backupMsg.kind === 'ok' ? COLORS.text : COLORS.red,
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
