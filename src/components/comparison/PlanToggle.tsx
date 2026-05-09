import { COLORS } from '../../lib/constants';
import { usePlansStore } from '../../stores/plansStore';
import type { Plan } from '../../lib/types';

interface Props {
  plans: Plan[];
}

export function PlanToggle({ plans }: Props) {
  const activePlanIds = usePlansStore(s => s.activePlanIds);
  const toggle        = usePlansStore(s => s.toggle);
  const setAll        = usePlansStore(s => s.setAll);
  const setNone       = usePlansStore(s => s.setNone);

  if (plans.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '12px 0' }}>
      <button
        onClick={setAll}
        style={{
          padding: '4px 10px', fontSize: 10, borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
          background: 'transparent', color: COLORS.muted,
          fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
        }}
      >All</button>
      <button
        onClick={setNone}
        style={{
          padding: '4px 10px', fontSize: 10, borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
          background: 'transparent', color: COLORS.muted,
          fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
        }}
      >None</button>
      <div style={{ width: 1, height: 20, background: COLORS.border, flexShrink: 0 }} />
      {plans.map(plan => {
        const active = activePlanIds.has(plan.id);
        return (
          <button
            key={plan.id}
            onClick={() => toggle(plan.id)}
            aria-pressed={active}
            style={{
              padding: '5px 12px', fontSize: 11, borderRadius: 4,
              border: `1px solid ${active ? plan.color : COLORS.border}`,
              background: active ? `${plan.color}22` : 'transparent',
              color: active ? plan.color : COLORS.muted,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: 'pointer', transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? plan.color : COLORS.border, flexShrink: 0 }} />
            {plan.title || 'Untitled'}
          </button>
        );
      })}
    </div>
  );
}
