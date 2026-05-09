import { COLORS, MONTHS, YEARS } from '../../lib/constants';
import { money } from '../../lib/finance';
import type { Debt } from '../../lib/types';

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

interface Props {
  d:        Debt;
  onChange: (patch: Partial<Debt>) => void;
  onRemove: () => void;
}

export function DebtItem({ d, onChange, onRemove }: Props) {
  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${COLORS.border}20` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          value={d.label}
          placeholder="Label (e.g. CC, student loan…)"
          aria-label="Debt label"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden="true" style={{ color: COLORS.red, fontSize: 10 }}>−$</span>
          <input
            type="number" value={d.payment} min={0} max={99999} step={25}
            aria-label={`Monthly payment for ${d.label || 'this debt'}`}
            onChange={e => onChange({ payment: +e.target.value })}
            style={{ ...S.field, width: 80 }}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
        </div>
        <button onClick={onRemove} aria-label={`Remove debt: ${d.label || 'unnamed'}`} style={iconBtn}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>Pays off</span>
        <select
          value={d.payoffMonthIdx} aria-label="Payoff month"
          onChange={e => onChange({ payoffMonthIdx: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={d.payoffYear} aria-label="Payoff year"
          onChange={e => onChange({ payoffYear: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: 11, color: COLORS.dim }}>→ {money(d.payment)}/mo freed</span>
      </div>
    </div>
  );
}
