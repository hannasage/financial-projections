import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useColors } from '../../stores/themeStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { simulate } from '../../lib/simulate';
import { money, getReturnRate, payoffLabel } from '../../lib/finance';
import { mergeIntoScenario } from '../../lib/resolveItems';
import { MONTHS } from '../../lib/constants';
import type { Plan } from '../../lib/types';

interface PlanCardProps {
  plan:        Plan;
  onEdit:      (id: string) => void;
  onDelete:    (id: string) => void;
  onDuplicate: (plan: Plan) => void;
}

export function PlanCard({ plan, onEdit, onDelete, onDuplicate }: PlanCardProps) {
  const COLORS  = useColors();
  const library = useLibraryStore();
  const merged  = mergeIntoScenario(plan.scenario, library);
  const rows    = simulate(merged, getReturnRate(plan.scenario));
  const endM    = plan.scenario.horizonYears * 12;
  const midM    = Math.round(endM / 2);
  const start   = rows[0]?.savings ?? 0;
  const mid     = rows[Math.min(midM, rows.length - 1)]?.savings ?? 0;
  const end     = rows[Math.min(endM, rows.length - 1)]?.savings ?? 0;
  const growthLabel =
    plan.scenario.returnMode === 'none'   ? '0% cash' :
    plan.scenario.returnMode === 'hysa'   ? `${plan.scenario.hysaRate ?? 4.5}% HYSA` :
                                            '7% invested';

  const payoffItems = [
    ...merged.debts.map(d => ({
      label: d.label || 'Debt',
      date:  d.payoffYear ? `${MONTHS[d.payoffMonthIdx ?? 0]} ${d.payoffYear}` : '—',
    })),
    ...merged.purchases.map(p => ({
      label: p.label || (p.type === 'house' ? 'Mortgage' : 'Loan'),
      date:  payoffLabel(p),
    })),
  ];

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

      {/* Drag handle */}
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
          padding: 0, touchAction: 'none', borderRadius: 4,
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
            <p style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.5 }}>{plan.description}</p>
          )}
        </div>

        {/* Milestones */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[
            { label: 'Start',                                            val: start },
            { label: `Yr ${Math.round(plan.scenario.horizonYears / 2)}`, val: mid   },
            { label: `Yr ${plan.scenario.horizonYears}`,                 val: end   },
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

        {/* Payoff dates */}
        {payoffItems.length > 0 && (
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }}>Payoff Dates</div>
            {payoffItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 11 }}>
                <span style={{ color: COLORS.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.label}</span>
                <span style={{ color: COLORS.text, whiteSpace: 'nowrap', fontWeight: 600 }}>{item.date}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
          <button onClick={() => onEdit(plan.id)} style={btn()}>Edit</button>
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
