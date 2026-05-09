import { useColors } from '../../stores/themeStore';
import { MONTHS, YEARS } from '../../lib/constants';
import { money, netMonthly } from '../../lib/finance';
import type { Raise } from '../../lib/types';

interface Props {
  r:          Raise;
  taxPct:     number;
  baseSalary: number;
  onChange:   (patch: Partial<Raise>) => void;
  onRemove:   () => void;
}

export function RaiseItem({ r, taxPct, baseSalary, onChange, onRemove }: Props) {
  const COLORS = useColors();

  const S = {
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

  const boost = netMonthly(r.salary, taxPct) - netMonthly(baseSalary, taxPct);

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}20` }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={r.monthIdx} aria-label="Raise effective month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={r.year} aria-label="Raise effective year"
          onChange={e => onChange({ year: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 120px' }}>
          <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
          <input
            type="number" value={r.salary} step={5000} min={0}
            aria-label="New annual salary"
            onChange={e => onChange({ salary: +e.target.value })}
            style={{ ...S.field, width: '100%' }}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/yr</span>
        </div>
        <span style={{ fontSize: 11, color: boost >= 0 ? COLORS.accent : COLORS.red, whiteSpace: 'nowrap' }}>
          {boost >= 0 ? '+' : ''}{money(boost)}/mo net
        </span>
        <button onClick={onRemove} aria-label="Remove this raise" style={iconBtn}>×</button>
      </div>
    </div>
  );
}
