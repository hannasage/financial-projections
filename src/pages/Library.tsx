import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { COLORS, PLAN_COLORS, RETURN_RATES } from '../lib/constants';
import { usePlansStore } from '../stores/plansStore';
import { usePlans } from '../hooks/usePlans';
import { simulate } from '../lib/simulate';
import { money } from '../lib/finance';
import { useAuthStore } from '../stores/authStore';
import type { Plan } from '../lib/types';

function pickRandomColor(usedColors: string[]): string {
  const unused = PLAN_COLORS.filter(c => !usedColors.includes(c.value));
  const pool   = unused.length > 0 ? unused : [...PLAN_COLORS];
  return pool[Math.floor(Math.random() * pool.length)].value;
}

interface PlanCardProps {
  plan:        Plan;
  onDelete:    (id: string) => void;
  onDuplicate: (plan: Plan) => void;
}

function PlanCard({ plan, onDelete, onDuplicate }: PlanCardProps) {
  const navigate    = useNavigate();
  const returnRate  = RETURN_RATES[plan.scenario.returnMode] ?? 0;
  const rows        = simulate(plan.scenario, returnRate);
  const endM        = plan.scenario.horizonYears * 12;
  const midM        = Math.round(endM / 2);
  const start       = rows[0]?.savings ?? 0;
  const mid         = rows[Math.min(midM, rows.length - 1)]?.savings ?? 0;
  const end         = rows[Math.min(endM, rows.length - 1)]?.savings ?? 0;
  const growthLabel = plan.scenario.returnMode === 'none' ? '0% cash'
                    : plan.scenario.returnMode === 'hysa'  ? '4.5% HYSA'
                    : '7% invested';
  const [confirming, setConfirming] = useState(false);

  const btn = (accent?: string): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 12, borderRadius: 4,
    border: `1px solid ${accent ?? COLORS.border}`,
    background: accent ? `${accent}18` : 'transparent',
    color: accent ?? COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
  });

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 8, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 4, background: plan.color }} />

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <h2 className="syne" style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 3, lineHeight: 1.2 }}>
            {plan.title || 'Untitled'}
          </h2>
          {plan.description && (
            <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>
              {plan.description}
            </p>
          )}
        </div>

        {/* Milestones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: 'Start',                                     val: start },
            { label: `Yr ${Math.round(plan.scenario.horizonYears / 2)}`, val: mid   },
            { label: `Yr ${plan.scenario.horizonYears}`,          val: end   },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: COLORS.faint, borderRadius: 4, padding: '6px 8px' }}>
              <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: plan.color, fontWeight: 600 }}>{money(val)}</div>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 3, border: `1px solid ${COLORS.border}`, color: COLORS.muted, letterSpacing: 1 }}>
            {plan.scenario.horizonYears} YR
          </span>
          <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 3, border: `1px solid ${plan.color}40`, color: plan.color, letterSpacing: 1 }}>
            {growthLabel.toUpperCase()}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(`/plans/${plan.id}/edit`)} style={btn()}>Edit</button>
          <button onClick={() => onDuplicate(plan)} style={btn()}>Copy</button>
          {confirming ? (
            <button onClick={() => { onDelete(plan.id); setConfirming(false); }} style={btn(COLORS.red)}>
              Confirm?
            </button>
          ) : (
            <button onClick={() => setConfirming(true)} style={btn()}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const plans              = usePlansStore(s => s.plans);
  const logout             = useAuthStore(s => s.logout);
  const { deletePlan, createPlan } = usePlans();

  const handleDelete = async (id: string) => {
    try { await deletePlan(id); } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (plan: Plan) => {
    const usedColors = plans.map(p => p.color);
    const color      = pickRandomColor(usedColors);
    try {
      await createPlan({
        title:       `${plan.title} copy`,
        description: plan.description,
        color,
        scenario:    plan.scenario,
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace", paddingBottom: 0 }}>
      {/* Header */}
      <header style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 className="syne" style={{ fontSize: 18, fontWeight: 800 }}>Projection</h1>
          {/* Desktop nav tabs — hidden on mobile */}
          <nav className="desktop-only" style={{ gap: 4 }}>
            <Link to="/dashboard" style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>Dashboard</Link>
            <span style={{ padding: '5px 10px', fontSize: 12, color: COLORS.accent, borderRadius: 4, border: `1px solid ${COLORS.accent}30` }}>Scenarios</span>
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
              background: COLORS.accent, color: '#07090C',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600, textDecoration: 'none',
            }}
          >+ New Plan</Link>
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

      <main style={{ padding: '20px 18px 80px', maxWidth: 960, margin: '0 auto' }}>
        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div className="syne" style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>No scenarios yet</div>
            <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 24 }}>
              Create your first savings scenario to get started.
            </p>
            <Link
              to="/plans/new"
              style={{
                display: 'inline-block', padding: '10px 24px', fontSize: 13, borderRadius: 4,
                border: `1px solid ${COLORS.accent}`,
                background: COLORS.accent, color: '#07090C',
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600, textDecoration: 'none',
              }}
            >Create first scenario</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onDelete={handleDelete} onDuplicate={handleDuplicate} />
            ))}
          </div>
        )}
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <nav className="mobile-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 0 20px',
      }}>
        <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>DASHBOARD</Link>
        <Link to="/scenarios"  style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.accent, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>SCENARIOS</Link>
        <Link to="/plans/new"  style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>+ NEW</Link>
      </nav>
    </div>
  );
}
