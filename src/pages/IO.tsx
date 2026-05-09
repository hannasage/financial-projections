import { Link } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import { stdPayment, money } from '../lib/finance';
import { START_YEAR } from '../lib/constants';
import { LOCAL_MODE } from '../lib/mode';
import { DebtItem } from '../components/plan/DebtItem';
import { PurchaseItem } from '../components/plan/PurchaseItem';
import { RaiseItem } from '../components/plan/RaiseItem';
import { ThemeSelector } from '../components/shared/ThemeSelector';

export default function IO() {
  const COLORS  = useColors();
  const logout  = useAuthStore(s => s.logout);
  const library = useLibraryStore();

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
    library.addDebt({
      label: '', payment: 200, payoffMonthIdx: 0, payoffYear: 2027,
    });
  };

  const handleAddPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    library.addPurchase({
      type: 'loan', label: '',
      year: START_YEAR + 2, monthIdx: 0,
      downPayment: 0, loanAmount, rate, termMonths, multiplier,
      payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
    });
  };

  const handleAddRaise = () => {
    library.addRaise({
      year: 2027, monthIdx: 0, salary: 70_000, baseSalary: 60_000,
    });
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
            Define your debts, purchases, and raises once — then include them in any scenario.
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

          {/* Numeric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 14 }}>
            {([
              { id: 'io-age',     label: 'Current Age',      key: 'startAge',     step: 1,     min: 18 },
              { id: 'io-horizon', label: 'Horizon (years)',   key: 'horizonYears', step: 1,     min: 1  },
              { id: 'io-salary',  label: 'Base Salary ($)',   key: 'baseSalary',   step: 5_000, min: 0  },
              { id: 'io-rent',    label: 'Monthly Rent ($)',  key: 'housingCost',  step: 50,    min: 0  },
              { id: 'io-tax',     label: 'Effective Tax (%)', key: 'taxPct',       step: 1,     min: 0  },
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
            <button onClick={handleAddDebt} style={addBtnStyle}>+ Add Debt</button>
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
            <DebtItem
              key={d.id}
              d={d}
              onChange={patch => library.updateDebt(d.id, patch)}
              onRemove={() => library.removeDebt(d.id)}
            />
          ))}
        </section>

        {/* Major Purchases */}
        <section className="sec" aria-label="Library purchases">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>🛒 Major Purchases</span>
            <button onClick={handleAddPurchase} style={addBtnStyle}>+ Add Purchase</button>
          </div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: library.purchases.length ? 8 : 0 }}>
            Loans and house payments. Down payment hits savings at purchase date.
          </p>
          {library.purchases.length === 0 && (
            <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: 'italic' }}>
              None yet.
            </p>
          )}
          {library.purchases.map(pur => (
            <PurchaseItem
              key={pur.id}
              p={pur}
              housingCost={library.profile.housingCost}
              onChange={patch => library.updatePurchase(pur.id, patch)}
              onRemove={() => library.removePurchase(pur.id)}
            />
          ))}
        </section>

        {/* Raises */}
        <section className="sec" aria-label="Library raises">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <span style={labelStyle}>📈 Raises</span>
            <button onClick={handleAddRaise} style={addBtnStyle}>+ Add Raise</button>
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
            <RaiseItem
              key={r.id}
              r={r}
              taxPct={25}
              baseSalary={r.baseSalary}
              onChange={patch => library.updateRaise(r.id, patch)}
              onRemove={() => library.removeRaise(r.id)}
            />
          ))}
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
