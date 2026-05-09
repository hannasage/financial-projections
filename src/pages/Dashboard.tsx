import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { usePlansStore } from '../stores/plansStore';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import { simulate } from '../lib/simulate';
import { money, getReturnRate } from '../lib/finance';
import { mergeIntoScenario } from '../lib/resolveItems';
import { PlanToggle } from '../components/comparison/PlanToggle';
import { ComparisonChart } from '../components/comparison/ComparisonChart';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { ThemeSelector } from '../components/shared/ThemeSelector';

export default function Dashboard() {
  const COLORS        = useColors();
  const plans         = usePlansStore(s => s.plans);
  const activePlanIds = usePlansStore(s => s.activePlanIds);
  const logout        = useAuthStore(s => s.logout);

  const library     = useLibraryStore();
  const activePlans = plans.filter(p => activePlanIds.has(p.id));

  const maxHorizon = useMemo(
    () => plans.reduce((mx, p) => Math.max(mx, p.scenario.horizonYears), 0),
    [plans],
  );
  const clipOptions = useMemo(
    () => [1, 3, 5, 10].filter(v => v < maxHorizon),
    [maxHorizon],
  );
  const [clipYears, setClipYears] = useState<number | null>(null);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 11, borderRadius: 4,
    border:     `1px solid ${active ? COLORS.accent : COLORS.border}`,
    background:  active ? `${COLORS.accent}22` : 'transparent',
    color:       active ? COLORS.accent : COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', transition: 'all 0.12s',
  });

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace", paddingBottom: 0 }}>
      <a href="#main" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 className="syne" style={{ fontSize: 18, fontWeight: 800 }}>Projection</h1>
          {/* Desktop nav tabs — hidden on mobile */}
          <nav className="desktop-only" style={{ gap: 4 }}>
            <span style={{ padding: '5px 10px', fontSize: 12, color: COLORS.accent, borderRadius: 4, border: `1px solid ${COLORS.accent}30` }}>Dashboard</span>
            <Link to="/io"        style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>I/O</Link>
            <Link to="/scenarios" style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>Plans</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* New Plan button — desktop only */}
          <Link
            to="/plans/new"
            className="desktop-only"
            style={{
              padding: '7px 14px', fontSize: 12, borderRadius: 4,
              border: `1px solid ${COLORS.accent}`,
              background: COLORS.accent, color: COLORS.textOnAccent,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600, textDecoration: 'none',
            }}
          >+ New Plan</Link>
          <ThemeSelector />
          <button
            onClick={logout}
            style={{
              padding: '7px 14px', fontSize: 12, borderRadius: 4,
              border: `1px solid ${COLORS.border}`,
              background: 'transparent', color: COLORS.muted,
              fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
            }}
          >Sign out</button>
        </div>
      </header>

      <main id="main" style={{ maxWidth: 960, margin: '0 auto', padding: '0 18px 80px' }}>

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div className="syne" style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>
              No scenarios yet
            </div>
            <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>
              Create your first scenario to start comparing savings trajectories.
            </p>
            <Link
              to="/plans/new"
              style={{
                display: 'inline-block', padding: '10px 24px', fontSize: 13, borderRadius: 4,
                border: `1px solid ${COLORS.accent}`,
                background: COLORS.accent, color: COLORS.textOnAccent,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600, textDecoration: 'none',
              }}
            >Create first scenario</Link>
          </div>
        ) : (
          <>
            {/* Plan toggles */}
            <section aria-label="Plan visibility toggles" className="sec">
              <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Scenarios</div>
              <PlanToggle plans={plans} />
            </section>

            {/* Comparison chart */}
            <section aria-label="Savings comparison chart" className="sec">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', margin: 0 }}>
                  Trajectory Comparison
                </h2>
                {clipOptions.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {clipOptions.map(yr => (
                      <button key={yr} onClick={() => setClipYears(clipYears === yr ? null : yr)} style={chipStyle(clipYears === yr)} aria-pressed={clipYears === yr}>
                        {yr}yr
                      </button>
                    ))}
                    <button onClick={() => setClipYears(null)} style={chipStyle(clipYears === null)} aria-pressed={clipYears === null}>
                      All
                    </button>
                  </div>
                )}
              </div>
              <ComparisonChart plans={plans} activePlanIds={activePlanIds} clipYears={clipYears} />
            </section>

            {/* Milestone cards */}
            {activePlans.length > 0 && (
              <section aria-label="Plan milestones" className="sec">
                <h2 style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 12 }}>
                  Milestones
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {activePlans.map(plan => {
                    const returnRate = getReturnRate(plan.scenario);
                    const rows       = simulate(mergeIntoScenario(plan.scenario, library), returnRate);
                    const endM       = plan.scenario.horizonYears * 12;
                    const midM       = Math.round(endM / 2);
                    const start      = rows[0]?.savings ?? 0;
                    const mid        = rows[Math.min(midM, rows.length - 1)]?.savings ?? 0;
                    const end        = rows[Math.min(endM, rows.length - 1)]?.savings ?? 0;
                    return (
                      <div key={plan.id} style={{
                        padding: '12px 14px',
                        background: COLORS.surface,
                        border: `1px solid ${plan.color}40`,
                        borderTop: `3px solid ${plan.color}`,
                        borderRadius: 6,
                      }}>
                        <div style={{ fontSize: 11, color: plan.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                          {plan.title || 'Untitled'}
                        </div>
                        {[
                          { label: 'Start',                                           val: start },
                          { label: `Yr ${Math.round(plan.scenario.horizonYears / 2)}`, val: mid   },
                          { label: `Yr ${plan.scenario.horizonYears}`,                val: end   },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: COLORS.muted }}>{label}</span>
                            <span style={{ fontSize: 12, color: COLORS.text, fontWeight: 500 }}>{money(val)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Comparison table */}
            <section aria-label="Year-by-year comparison table" className="sec">
              <h2 style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 12 }}>
                Year-by-Year
              </h2>
              <ComparisonTable plans={plans} activePlanIds={activePlanIds} clipYears={clipYears} />
            </section>
          </>
        )}
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="mobile-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 0 20px',
      }}>
        <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.accent, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>DASH</Link>
        <Link to="/io"        style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>I/O</Link>
        <Link to="/scenarios" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>PLANS</Link>
        <Link to="/plans/new" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>+ NEW</Link>
      </nav>
    </div>
  );
}
