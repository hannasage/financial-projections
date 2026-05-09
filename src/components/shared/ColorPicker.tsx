import { PLAN_COLORS, COLORS } from '../../lib/constants';

interface Props {
  value:    string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="radiogroup" aria-label="Plan color">
      {PLAN_COLORS.map(c => (
        <button
          key={c.value}
          role="radio"
          aria-checked={value === c.value}
          aria-label={c.label}
          onClick={() => onChange(c.value)}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: c.value,
            border: value === c.value ? `2px solid ${COLORS.text}` : `2px solid transparent`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#07090C', fontWeight: 700,
            transition: 'border-color 0.12s',
            outline: 'none',
          }}
        >
          {value === c.value ? '✓' : ''}
        </button>
      ))}
    </div>
  );
}
