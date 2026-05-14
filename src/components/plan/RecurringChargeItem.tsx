import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears, START_YEAR } from '../../lib/constants';
import type { RecurringCharge, BillAdjustment } from '../../lib/types';

interface Props {
  c:             RecurringCharge;
  onChange:      (patch: Partial<RecurringCharge>) => void;
  onRemove:      () => void;
  startYear?:    number;
  horizonYears?: number;
}

export function RecurringChargeItem({ c, onChange, onRemove, startYear = START_YEAR, horizonYears = 20 }: Props) {
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

  const yearOpts = buildPurchaseYears(startYear, horizonYears);
  const adjustments = c.adjustments ?? [];

  const addAdj = () => {
    const adj: BillAdjustment = {
      id: crypto.randomUUID(),
      year: startYear + 1,
      monthIdx: 0,
      amount: c.amount,
    };
    onChange({ adjustments: [...adjustments, adj] });
  };
  const changeAdj = (id: string, patch: Partial<BillAdjustment>) =>
    onChange({ adjustments: adjustments.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAdj = (id: string) =>
    onChange({ adjustments: adjustments.filter(a => a.id !== id) });

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${COLORS.border}`,
      padding: '12px 14px', marginTop: 8,
    }}>
      {/* Row 1: label · amount · remove */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', marginBottom: adjustments.length > 0 ? 10 : 0 }}>
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
        <button type="button" onClick={onRemove} aria-label={`Remove ${c.label || 'charge'}`}
          style={{ ...iconBtn, marginBottom: 6 }}>×</button>
      </div>

      {/* Modifications */}
      {adjustments.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ ...S.label, fontSize: 9, letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>Amount modifications</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {adjustments.map((adj, i) => (
              <div key={adj.id} style={{
                background: COLORS.faint,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ ...S.label, fontSize: 9 }}>Mod {i + 1}</span>
                  <button type="button" onClick={() => removeAdj(adj.id)}
                    aria-label={`Remove modification ${i + 1}`}
                    style={{ ...iconBtn, fontSize: 15 }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`rcm-m-${adj.id}`} style={S.label}>Month</label>
                    <select id={`rcm-m-${adj.id}`}
                      value={adj.monthIdx} aria-label={`Modification ${i + 1} month`}
                      onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })}
                      style={{ ...S.field, width: '100%' }}>
                      {MONTHS.map((mo, mi) => <option key={mi} value={mi}>{mo}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`rcm-y-${adj.id}`} style={S.label}>Year</label>
                    <select id={`rcm-y-${adj.id}`}
                      value={adj.year} aria-label={`Modification ${i + 1} year`}
                      onChange={e => changeAdj(adj.id, { year: +e.target.value })}
                      style={{ ...S.field, width: '100%' }}>
                      {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`rcm-a-${adj.id}`} style={S.label}>New amount</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                      <input id={`rcm-a-${adj.id}`}
                        type="number" min={0} step={5} value={adj.amount}
                        aria-label={`Modification ${i + 1} amount`}
                        onChange={e => changeAdj(adj.id, { amount: Math.max(0, +e.target.value) })}
                        style={{ ...S.field, width: '100%' }} />
                      <span aria-hidden="true" style={{ fontSize: 10, color: COLORS.muted }}>/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={addAdj}
        style={{
          marginTop: adjustments.length > 0 ? 0 : 8,
          fontSize: 10, letterSpacing: 1,
          background: 'none', border: `1px dashed ${COLORS.border}`,
          color: COLORS.muted, borderRadius: 4, padding: '5px 10px',
          cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
        }}
      >+ Add Modification</button>
    </div>
  );
}
