import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, START_YEAR } from '../../lib/constants';
import { money, netMonthly } from '../../lib/finance';
import { Input, Select } from '@hannasage/projection-ui';
import type { Raise } from '../../lib/types';

interface Props {
  r:          Raise;
  taxPct:     number;
  baseSalary: number;
  startYear?: number;
  onChange:   (patch: Partial<Raise>) => void;
  onRemove:   () => void;
}

export function RaiseItem({ r, taxPct, baseSalary, startYear = START_YEAR, onChange, onRemove }: Props) {
  const COLORS = useColors();

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', minWidth: 32, minHeight: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };

  const boost    = netMonthly(r.salary, taxPct) - netMonthly(baseSalary, taxPct);
  const years    = buildYears(startYear, 30);
  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));
  const yearOpts  = years.map(y => ({ value: String(y), label: String(y) }));

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}20` }}>
      {/* Date + salary in a responsive grid */}
      <div className="igr3" style={{ gap: 8, marginBottom: 8 }}>
        <Select
          label="Month"
          options={monthOpts}
          value={String(r.monthIdx)}
          aria-label="Raise effective month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
        />
        <Select
          label="Year"
          options={yearOpts}
          value={String(r.year)}
          aria-label="Raise effective year"
          onChange={e => onChange({ year: +e.target.value })}
        />
        <Input
          label="New salary"
          type="number"
          value={r.salary}
          step={5000}
          min={0}
          prefix="$"
          aria-label="New annual salary"
          onChange={e => onChange({ salary: +e.target.value })}
        />
      </div>

      {/* Net monthly boost + remove */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: boost >= 0 ? COLORS.accent : COLORS.red }}>
          {boost >= 0 ? '+' : ''}{money(boost)}/mo net after tax
        </span>
        <button onClick={onRemove} aria-label="Remove this raise" style={iconBtn}>×</button>
      </div>
    </div>
  );
}
