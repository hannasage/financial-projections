import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useColors, usePlanColors } from '../stores/themeStore';
import { usePlansStore } from '../stores/plansStore';
import { useAuthStore } from '../stores/authStore';
import { usePlans } from '../hooks/usePlans';
import { LOCAL_MODE } from '../lib/mode';
import { PlanCard } from '../components/plan/PlanCard';
import { PlanEditDrawer } from '../components/plan/PlanEditDrawer';
import { PlanToggle } from '../components/comparison/PlanToggle';
import { ComparisonChart } from '../components/comparison/ComparisonChart';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { ThemeSelector } from '../components/shared/ThemeSelector';
import type { Plan } from '../lib/types';

function pickRandomColor(usedColors: string[], planColors: { value: string }[]): string {
  const unused = planColors.filter(c => !usedColors.includes(c.value));
  const pool   = unused.length > 0 ? unused : planColors;
  return pool[Math.floor(Math.random() * pool.length)].value;
}

export default function Dashboard() {
  const COLORS        = useColors();
  const planColors    = usePlanColors();
  const plans         = usePlansStore(s => s.plans);
  const activePlanIds = usePlansStore(s => s.activePlanIds);
  const reorderPlans  = usePlansStore(s => s.reorderPlans);
  const logout        = useAuthStore(s => s.logout);
  const { deletePlan, createPlan } = usePlans();

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [clipYears,     setClipYears]     = useState<number | null>(null);
  const [comparisonTab, setComparisonTab] = useState<'liquidity' | 'debt' | 'netWorth'>('liquidity');
  const cmpTabLabelId = comparisonTab === 'liquidity' ? 'cmp-tab-liquidity'
    : comparisonTab === 'debt' ? 'cmp-tab-debt'
      : 'cmp-tab-networth';

  const maxHorizon  = useMemo(() => plans.reduce((mx, p) => Math.max(mx, p.scenario.horizonYears), 0), [plans]);
  const clipOptions = useMemo(() => [1, 3, 5, 7, 10].filter(v => v < maxHorizon), [maxHorizon]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const order = plans.map(p => p.id);
    const from  = order.indexOf(active.id as string);
    const to    = order.indexOf(over.id   as string);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, active.id as string);
    reorderPlans(next);
  };

  const handleDelete = async (id: string) => {
    try { await deletePlan(id); } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (plan: Plan) => {
    const color = pickRandomColor(plans.map(p => p.color), planColors);
    try {
      await createPlan({ title: `${plan.title} copy`, description: plan.description, color, scenario: plan.scenario });
    } catch (e) { console.error(e); }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 11, borderRadius: 4,
    border:     `1px solid ${active ? COLORS.accent : COLORS.border}`,
    background:  active ? `${COLORS.accent}22` : 'transparent',
    color:       active ? COLORS.accent : COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', transition: 'all 0.12s',
  });

  const cmpTabBtn = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 11, borderRadius: 4,
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
          <nav className="desktop-only" style={{ gap: 4 }}>
            <span style={{ padding: '5px 10px', fontSize: 12, color: COLORS.accent, borderRadius: 4, border: `1px solid ${COLORS.accent}30` }}>Dashboard</span>
            <Link to="/io" style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>I/O</Link>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            <section aria-label="Trajectory comparison chart" className="sec">
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
              <div
                role="tablist"
                aria-label="Comparison metric"
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparisonTab === 'liquidity'}
                  aria-controls="cmp-chart-panel cmp-table-panel"
                  id="cmp-tab-liquidity"
                  onClick={() => setComparisonTab('liquidity')}
                  style={cmpTabBtn(comparisonTab === 'liquidity')}
                >
                  Liquidity
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparisonTab === 'debt'}
                  aria-controls="cmp-chart-panel cmp-table-panel"
                  id="cmp-tab-debt"
                  onClick={() => setComparisonTab('debt')}
                  style={cmpTabBtn(comparisonTab === 'debt')}
                >
                  Debt paydown
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparisonTab === 'netWorth'}
                  aria-controls="cmp-chart-panel cmp-table-panel"
                  id="cmp-tab-networth"
                  onClick={() => setComparisonTab('netWorth')}
                  style={cmpTabBtn(comparisonTab === 'netWorth')}
                >
                  Net worth
                </button>
              </div>
              <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 12, lineHeight: 1.5 }}>
                {comparisonTab === 'liquidity'
                  ? 'Cash savings plus investment accounts over time (matches year table).'
                  : comparisonTab === 'debt'
                    ? 'Debt and loan balances owed over time (matches year table balances).'
                    : 'Net worth: savings plus market value on purchases (when set) minus all debts and loan balances. Purchases without market value count as debt only.'}
              </p>
              <div id="cmp-chart-panel" role="tabpanel" aria-labelledby={cmpTabLabelId}>
                <ComparisonChart plans={plans} activePlanIds={activePlanIds} clipYears={clipYears} tab={comparisonTab} />
              </div>
            </section>

            {/* Plans grid — drag to reorder, edit opens drawer */}
            <section aria-label="Saved scenarios" className="sec">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', margin: 0 }}>
                  Plans
                </h2>
                <Link
                  to="/plans/new"
                  style={{
                    padding: '6px 13px', fontSize: 11, borderRadius: 4,
                    border: `1px solid ${COLORS.accent}`,
                    background: COLORS.accent, color: COLORS.textOnAccent,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600, textDecoration: 'none',
                  }}
                >+ New</Link>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={plans.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {plans.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        onEdit={setEditingPlanId}
                        onDelete={handleDelete}
                        onDuplicate={handleDuplicate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            {/* Comparison table */}
            <section aria-label="Year-by-year comparison table" className="sec">
              <h2 style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                Year-by-Year
              </h2>
              <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 12, lineHeight: 1.5 }}>
                {comparisonTab === 'liquidity'
                  ? 'Per plan: liquid total (cash + investments) and monthly add to liquid (/mo).'
                  : comparisonTab === 'debt'
                    ? 'Per plan: debt + loan balances owed and combined payments (/mo svc).'
                    : 'Per plan: net worth at year-end checkpoint and that month’s change (/mo Δ).'}
              </p>
              <div id="cmp-table-panel" role="tabpanel" aria-labelledby={cmpTabLabelId}>
                <ComparisonTable plans={plans} activePlanIds={activePlanIds} clipYears={clipYears} tab={comparisonTab} />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 0 20px',
      }}>
        <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.accent, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>DASH</Link>
        <Link to="/io"        style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>I/O</Link>
        <Link to="/plans/new" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>+ NEW</Link>
      </nav>

      {/* Edit drawer */}
      <PlanEditDrawer planId={editingPlanId} onClose={() => setEditingPlanId(null)} />
    </div>
  );
}
