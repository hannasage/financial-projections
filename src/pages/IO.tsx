import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import { stdPayment, money } from '../lib/finance';
import { MONTHS } from '../lib/constants';
import { LOCAL_MODE } from '../lib/mode';
import { DebtItem } from '../components/plan/DebtItem';
import { PurchaseItem } from '../components/plan/PurchaseItem';
import { RaiseItem } from '../components/plan/RaiseItem';
import { InvestmentItem } from '../components/plan/InvestmentItem';
import { RecurringChargeItem } from '../components/plan/RecurringChargeItem';
import { ThemeSelector } from '../components/shared/ThemeSelector';
import { scrollIoItemIntoViewAndFocus } from '../lib/ioScrollFocus';
import { applyBackup, downloadBackupJson, downloadSummaryCsv, parseBackupJson } from '../lib/dataBackup';

const ioItemAnchor: React.CSSProperties = {
  scrollMarginTop: 24,
  scrollMarginBottom: 100,
};

export default function IO() {
  const COLORS  = useColors();
  const logout  = useAuthStore(s => s.logout);
  const library = useLibraryStore();
  const backupFileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const p = library.profile;
  const sp = (patch: Partial<typeof p>) => library.setProfile(patch);

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
    const id = library.addDebt({
      label: '', payment: 200, payoffMonthIdx: p.startMonthIdx, payoffYear: p.startYear + 1,
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    const id = library.addPurchase({
      type: 'loan', label: '',
      year: p.startYear + 2, monthIdx: p.startMonthIdx,
      downPayment: 0, loanAmount, rate, termMonths, multiplier,
      payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRaise = () => {
    const id = library.addRaise({
      year: p.startYear + 1, monthIdx: p.startMonthIdx, salary: 70_000, baseSalary: p.baseSalary,
    });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddRecurring = () => {
    const id = library.addRecurringCharge({ label: '', amount: 15 });
    scrollIoItemIntoViewAndFocus(id);
  };

  const handleAddInvestment = () => {
    const id = library.addInvestment({
      label: '', initialAmount: 0, annualReturnPct: 7, monthlyContribution: 200,
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

  const handleImportPick = () => backupFileRef.current?.click();

  const handleImportFile: React.ChangeEventHandler<HTMLInputElement> = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const confirmMsg = LOCAL_MODE
      ? 'Replace all I/O data and every saved scenario on this device with this backup? This cannot be undone.'
      : 'Replace all I/O library data on this device? Your scenarios stay tied to your online account. This cannot be undone.';
    if (!window.confirm(confirmMsg)) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      setBackupMsg({ kind: 'err', text: 'Could not read that file.' });
      return;
    }

    const parsed = parseBackupJson(text);
    if (!parsed) {
      setBackupMsg({ kind: 'err', text: 'Not a valid Projection backup (expected a JSON file from Export backup).' });
      return;
    }

    const result = applyBackup(parsed);
    if (!result.ok) {
      setBackupMsg({ kind: 'err', text: result.error });
      return;
    }
    setBackupMsg({ kind: 'ok', text: result.detail });
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
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 10, maxWidth: 480, lineHeight: 1.7 }}>
            Define debts, recurring bills, purchases, investments, and raises once — then include them in any scenario.
          </p>
        </div>

        {/* ── CORE SETTINGS ── */}
        <section className="sec" aria-label="Core settings">
          <span style={{ ...labelStyle, display: 'block', marginBottom: 12 }}>⚙️ Core Settings</span>

          {/* Envelope */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="io-envelope" style={labelStyle}>Monthly Envelope</label>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(p.envelope)}/mo</span>
            </div>
            <input id="io-envelope" type="range" min={500} max={15_000} step={50}
              value={p.envelope} onChange={e => sp({ envelope: +e.target.value })} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: COLORS.muted }}>or type:</span>
              <span style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
              <input type="number" value={p.envelope} min={0} step={50}
                onChange={e => sp({ envelope: +e.target.value })}
                style={{ ...field, width: 90 }} />
              <span style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
            </div>
          </div>

          {/* Starting savings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label htmlFor="io-savings" style={labelStyle}>Starting Savings</label>
              <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(p.startSavings)}</span>
            </div>
            <input id="io-savings" type="range" min={0} max={200_000} step={1_000}
              value={p.startSavings} onChange={e => sp({ startSavings: +e.target.value })} />
          </div>

          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 12, lineHeight: 1.6 }}>
            Monthly allowance is discretionary spending (going out, hobbies, etc.) carved out of your envelope before what’s left flows to savings.
          </p>

          {/* Numeric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor="io-start-month" style={labelStyle}>Start Month</label>
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
              { id: 'io-age',     label: 'Current Age',      key: 'startAge',     step: 1,     min: 18 },
              { id: 'io-horizon', label: 'Horizon (years)',   key: 'horizonYears', step: 1,     min: 1  },
              { id: 'io-salary',  label: 'Base Salary ($)',   key: 'baseSalary',   step: 5_000, min: 0  },
              { id: 'io-rent',       label: 'Monthly Rent ($)',       key: 'housingCost',       step: 50, min: 0 },
              { id: 'io-allowance',  label: 'Monthly allowance ($)', key: 'monthlyAllowance', step: 25, min: 0 },
            ] as const).map(({ id, label, key, step, min }) => (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor={id} style={labelStyle}>{label}</label>
                <input id={id} type="number" value={p[key]} min={min} step={step}
                  onChange={e => sp({ [key]: +e.target.value } as Partial<typeof p>)}
                  style={{ ...field, width: '100%' }} />
              </div>
            ))}

            {/* Growth rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={labelStyle}>Growth Rate</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {(['none', 'hysa', 'invested'] as const).map(k => (
                  <button key={k} onClick={() => sp({ returnMode: k })}
                    aria-pressed={p.returnMode === k}
                    style={{ ...chip(p.returnMode === k), fontSize: 10, padding: '7px 4px' }}>
                    {k === 'none' ? '0%' : k === 'hysa' ? `${p.hysaRate ?? 4.5}% HYSA` : '7%'}
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
          </div>
        </section>

        {/* ── DEBTS ── */}
        <section className="sec" aria-label="Library debts">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>💳 Debts</span>
            <button type="button" onClick={handleAddDebt} style={addBtnStyle}>+ Add Debt</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.debts.length ? 8 : 0 }}>
            Standing payments that draw from your monthly envelope.
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
            <span style={labelStyle}>📎 Recurring bills</span>
            <button type="button" onClick={handleAddRecurring} style={addBtnStyle}>+ Add line item</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.recurringCharges.length ? 8 : 0 }}>
            Subscriptions and other fixed monthly costs. Deducted from your envelope with rent and allowance (itemize here instead of lumping into allowance if you prefer).
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
            Loans and house payments. Down payment hits savings at purchase date. Optional market value feeds net worth (equity); leave blank for debt-only loans.
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
            Separate from starting savings: each bucket has its own starting balance, average annual return, and monthly contribution. Counts toward liquid assets and net worth on charts.
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
            Salary changes that grow your effective savings rate.
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
            <button
              type="button"
              onClick={handleImportPick}
              style={{
                ...addBtnStyle,
                border: `1px solid ${COLORS.accent}`,
                color: COLORS.accent,
              }}
            >
              Import backup…
            </button>
            <input
              ref={backupFileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              aria-hidden
              onChange={handleImportFile}
            />
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
