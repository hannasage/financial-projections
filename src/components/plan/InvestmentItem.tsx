import { useColors } from '../../stores/themeStore';
import type { Investment } from '../../lib/types';

interface Props {
  i:          Investment;
  onChange:   (patch: Partial<Investment>) => void;
  onRemove:   () => void;
}

export function InvestmentItem({ i, onChange, onRemove }: Props) {
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
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${COLORS.accent}35`, padding: '14px', marginTop: 10,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input
          value={i.label}
          placeholder="e.g. Brokerage, 401k…"
          aria-label="Investment name"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${i.label || 'investment'}`} style={iconBtn}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ia-${i.id}`} style={S.label}>Starting balance</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ia-${i.id}`} type="number" value={i.initialAmount} min={0} step={500}
              onChange={e => onChange({ initialAmount: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ir-${i.id}`} style={S.label}>Avg. return</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id={`ir-${i.id}`} type="number" value={i.annualReturnPct} min={0} step={0.5}
              onChange={e => onChange({ annualReturnPct: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>% APY</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ic-${i.id}`} style={S.label}>Monthly add</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ic-${i.id}`} type="number" value={i.monthlyContribution} min={0} step={25}
              onChange={e => onChange({ monthlyContribution: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 10, lineHeight: 1.45 }}>
        Grows at your rate monthly; contributions are paid from the envelope after debts and purchase loans (same as savings).
      </p>
    </div>
  );
}
