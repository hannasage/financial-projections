import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears, START_YEAR } from '../../lib/constants';
import { Input, Select, Button, Card } from '@hannasage/projection-ui';
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

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  };

  const yearOpts  = buildPurchaseYears(startYear, horizonYears).map(y => ({ value: String(y), label: String(y) }));
  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));
  const adjustments = c.adjustments ?? [];

  const addAdj = () => {
    const adj: BillAdjustment = { id: crypto.randomUUID(), year: startYear + 1, monthIdx: 0, amount: c.amount };
    onChange({ adjustments: [...adjustments, adj] });
  };
  const changeAdj = (id: string, patch: Partial<BillAdjustment>) =>
    onChange({ adjustments: adjustments.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAdj = (id: string) =>
    onChange({ adjustments: adjustments.filter(a => a.id !== id) });

  return (
    <Card style={{ marginTop: 8 }}>
      {/* Row 1: label · amount · remove */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap', marginBottom: adjustments.length > 0 ? 10 : 0 }}>
        <Input
          id={`rc-l-${c.id}`}
          label="Label"
          value={c.label}
          placeholder="e.g. Gym, Netflix…"
          onChange={e => onChange({ label: e.target.value })}
          containerStyle={{ flex: '1 1 160px' }}
        />
        <Input
          id={`rc-a-${c.id}`}
          label="Amount / mo"
          type="number" min={0} step={5}
          value={c.amount}
          prefix="$"
          onChange={e => onChange({ amount: Math.max(0, +e.target.value) })}
          containerStyle={{ flex: '0 1 120px' }}
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${c.label || 'charge'}`}
          style={{ ...iconBtn, marginBottom: 6 }}>×</button>
      </div>

      {/* Modifications */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjustments.length ? 8 : 0 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Amount modifications</span>
          <Button variant="primary" size="sm" onClick={addAdj}>+ Change</Button>
        </div>
        {adjustments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {adjustments.map((adj, i) => (
              <div key={adj.id} style={{
                background: COLORS.faint, border: `1px solid ${COLORS.border}`,
                borderRadius: 6, padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Mod {i + 1}</span>
                  <button type="button" onClick={() => removeAdj(adj.id)}
                    aria-label={`Remove modification ${i + 1}`}
                    style={iconBtn}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                  <Select label="Month" options={monthOpts} value={String(adj.monthIdx)}
                    aria-label={`Modification ${i + 1} month`}
                    onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })} />
                  <Select label="Year" options={yearOpts} value={String(adj.year)}
                    aria-label={`Modification ${i + 1} year`}
                    onChange={e => changeAdj(adj.id, { year: +e.target.value })} />
                  <Input label="New amount" type="number" min={0} step={5}
                    value={adj.amount} prefix="$" suffix="/mo"
                    aria-label={`Modification ${i + 1} amount`}
                    onChange={e => changeAdj(adj.id, { amount: Math.max(0, +e.target.value) })} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
