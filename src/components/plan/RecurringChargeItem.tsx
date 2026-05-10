import { useColors } from '../../stores/themeStore';
import type { RecurringCharge } from '../../lib/types';

interface Props {
  c:          RecurringCharge;
  onChange:   (patch: Partial<RecurringCharge>) => void;
  onRemove:   () => void;
}

export function RecurringChargeItem({ c, onChange, onRemove }: Props) {
  const COLORS = useColors();
  const S = {
    label: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' as const },
    field: {
      background: COLORS.faint, color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4, padding: '7px 9px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, outline: 'none',
      WebkitAppearance: 'none' as const, appearance: 'none' as const,
    },
  };
  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap',
      padding: '12px 0', borderBottom: `1px solid ${COLORS.border}20`,
    }}>
      <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label htmlFor={`rc-l-${c.id}`} style={S.label}>Label</label>
        <input
          id={`rc-l-${c.id}`}
          value={c.label}
          placeholder="e.g. Gym, Netflix…"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '0 1 120px' }}>
        <label htmlFor={`rc-a-${c.id}`} style={S.label}>Amount / mo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
          <input
            id={`rc-a-${c.id}`}
            type="number"
            min={0}
            step={5}
            value={c.amount}
            onChange={e => onChange({ amount: Math.max(0, +e.target.value) })}
            style={{ ...S.field, width: '100%' }}
          />
        </div>
      </div>
      <button type="button" onClick={onRemove} aria-label={`Remove ${c.label || 'charge'}`} style={{ ...iconBtn, marginBottom: 6 }}>×</button>
    </div>
  );
}
