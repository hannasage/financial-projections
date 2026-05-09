import { COLORS } from '../../lib/constants';

const S = {
  label: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' as const },
};

const addBtnStyle: React.CSSProperties = {
  padding: '6px 13px', fontSize: 11, borderRadius: 4,
  border: `1px solid ${COLORS.border}`,
  background: 'transparent', color: COLORS.muted,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: 'pointer', flexShrink: 0,
};

interface Props {
  label:     string;
  onAdd?:    () => void;
  addLabel?: string;
}

export function SectionHead({ label, onAdd, addLabel = '+ Add' }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
      <span style={S.label}>{label}</span>
      {onAdd && <button onClick={onAdd} style={addBtnStyle}>{addLabel}</button>}
    </div>
  );
}
