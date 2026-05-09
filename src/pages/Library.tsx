import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useColors, usePlanColors } from '../stores/themeStore';
import { usePlansStore } from '../stores/plansStore';
import { usePlans } from '../hooks/usePlans';
import { simulate } from '../lib/simulate';
import { money, getReturnRate } from '../lib/finance';
import { useAuthStore } from '../stores/authStore';
import { ThemeSelector } from '../components/shared/ThemeSelector';
import type { Plan } from '../lib/types';

function pickRandomColor(usedColors: string[], planColors: { value: string }[]): string {
  const unused = planColors.filter(c => !usedColors.includes(c.value));
  const pool   = unused.length > 0 ? unused : planColors;
  return pool[Math.floor(Math.random() * pool.length)].value;
}

interface PlanCardProps {
  plan:        Plan;
  onDelete:    (id: string) => void;
  onDuplicate: (plan: Plan) => void;
}

function PlanCard({ plan, onDelete, onDuplicate }: PlanCardProps) {
  const COLORS      = useColors();
  const navigate    = useNavigate();
  const returnRate  = getReturnRate(plan.scenario);
  const rows        = simulate(plan.scenario, returnRate);
  const endM        = plan.scenario.horizonYears * 12;
  const midM        = Math.round(endM / 2);
  const start       = rows[0]?.savings ?? 0;
  const mid         = rows[Math.min(midM, rows.length - 1)]?.savings ?? 0;
  const end         = rows[Math.min(endM, rows.length - 1)]?.savings ?? 0;
  const growthLabel = plan.scenario.returnMode === 'none'
    ? '0% cash'
    : plan.scenario.returnMode === 'hysa'
    ? `${plan.scenario.hysaRate ?? 4.5}% HYSA`
    : '7% invested';
  const [confirming, setConfirming] = useState(false);

  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: plan.id });

  const btn = (accent?: string): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 12, borderRadius: 4,
    border: `1px solid ${accent ?? COLORS.border}`,
    background: accent ? `${accent}18` : 'transparent',
    color: accent ?? COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: COLORS.surface,
        border: `1px solid ${isDragging ? plan.color + '60' : COLORS.border}`,
        borderRadius: 8, overflow: 'hidden',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? `0 8px 24px ${COLORS.bg}cc` : 'none',
        cursor: 'default',
      }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: plan.color }} />

      {/* Drag handle — anchored to top-right of card body */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${plan.title || 'Untitled'}`}
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 32, height: 32,
          background: 'transparent', border: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: COLORS.muted, opacity: 0.5,
          padding: 0, touchAction: 'none',
          borderRadius: 4,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="2" y="3"  width="12" height="2" rx="1" />
          <rect x="2" y="7"  width="12" height="2" rx="1" />
          <rect x="2" y="11" width="12" height="2" rx="1" />
        </svg>
      </button>

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
  const COLORS             = useColors();
  const planColors         = usePlanColors();
  const plans              = usePlansStore(s => s.plans);
  const reorderPlans       = usePlansStore(s => s.reorderPlans);
  const logout             = useAuthStore(s => s.logout);
  const { deletePlan, createPlan } = usePlans();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = plans.map(p => p.id);
    const from = oldOrder.indexOf(active.id as string);
    const to   = oldOrder.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    const next = [...oldOrder];
    next.splice(from, 1);
    next.splice(to, 0, active.id as string);
    reorderPlans(next);
  };

  const handleDelete = async (id: string) => {
    try { await deletePlan(id); } catch (e) { console.error(e); }
  };

  const handleDuplicate = async (plan: Plan) => {
    const usedColors = plans.map(p => p.color);
    const color      = pickRandomColor(usedColors, planColors);
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
          <nav className="desktop-only" style={{ gap: 4 }}>
            <Link to="/dashboard" style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>Dashboard</Link>
            <Link to="/io"        style={{ padding: '5px 10px', fontSize: 12, color: COLORS.muted, textDecoration: 'none', borderRadius: 4 }}>I/O</Link>
            <span style={{ padding: '5px 10px', fontSize: 12, color: COLORS.accent, borderRadius: 4, border: `1px solid ${COLORS.accent}30` }}>Plans</span>
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
                background: COLORS.accent, color: COLORS.textOnAccent,
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 600, textDecoration: 'none',
              }}
            >Create first scenario</Link>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={plans.map(p => p.id)} strategy={rectSortingStrategy}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {plans.map(plan => (
                  <PlanCard key={plan.id} plan={plan} onDelete={handleDelete} onDuplicate={handleDuplicate} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Mobile navigation" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        padding: '10px 0 20px',
      }}>
        <Link to="/dashboard" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>DASHBOARD</Link>
        <Link to="/io"        style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>I/O</Link>
        <Link to="/scenarios"  style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.accent, textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>PLANS</Link>
        <Link to="/plans/new"  style={{ flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted,  textDecoration: 'none', letterSpacing: 1, padding: '4px 0' }}>+ NEW</Link>
      </nav>
    </div>
  );
}
