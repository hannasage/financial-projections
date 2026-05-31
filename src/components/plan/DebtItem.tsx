import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, START_YEAR } from '../../lib/constants';
import { money, payoffMonths, totalInterest } from '../../lib/finance';
import { Input, Select, Button } from '@hannasage/projection-ui';
import type { Debt, DebtAdjustment } from '../../lib/types';

interface Props {
  d:        Debt;
  startYear?: number;
  onChange: (patch: Partial<Debt>) => void;
  onRemove: () => void;
}

export function DebtItem({ d, startYear = START_YEAR, onChange, onRemove }: Props) {
  const COLORS = useColors();

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  };

  const balance = d.balance ?? 0;
  const apr     = d.apr     ?? 0;
  const hasStats = balance > 0;

  const moRemaining   = hasStats ? payoffMonths(balance, apr, d.payment) : 0;
  const interest      = hasStats ? totalInterest(balance, apr, d.payment) : 0;
  const moInterest    = apr > 0  ? (balance * apr) / 100 / 12 : 0;
  const paymentTooLow = hasStats && apr > 0 && d.payment <= moInterest;

  const computedYear     = startYear + Math.floor(moRemaining / 12);
  const computedMonthIdx = moRemaining % 12;
  const computedLabel    = moRemaining >= 9999
    ? 'never'
    : `${MONTHS[computedMonthIdx]} ${computedYear}`;

  const withPayoff = (bal: number, rate: number, pmt: number, patch: Partial<Debt>): Partial<Debt> => {
    if (bal <= 0 || pmt <= 0) return patch;
    const mo = payoffMonths(bal, rate, pmt);
    if (mo <= 0 || mo >= 9999) return patch;
    return { ...patch, payoffYear: startYear + Math.floor(mo / 12), payoffMonthIdx: mo % 12 };
  };

  const years     = buildYears(startYear, 30);
  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));
  const yearOpts  = years.map(y => ({ value: String(y), label: String(y) }));

  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${COLORS.border}20` }}>

      {/* Row 1: label · payment · remove */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
        <Input
          value={d.label}
          placeholder="Label (e.g. Visa, student loan…)"
          aria-label="Debt label"
          onChange={e => onChange({ label: e.target.value })}
          containerStyle={{ flex: 1, minWidth: 0 }}
        />
        <Input
          type="number"
          value={d.payment}
          min={0}
          max={99999}
          step={25}
          prefix="−$"
          suffix="/mo"
          aria-label={`Monthly payment for ${d.label || 'this debt'}`}
          onChange={e => onChange(withPayoff(balance, apr, +e.target.value, { payment: +e.target.value }))}
          containerStyle={{ width: 130, flexShrink: 0 }}
        />
        <button onClick={onRemove} aria-label={`Remove debt: ${d.label || 'unnamed'}`} style={{ ...iconBtn, marginBottom: 4 }}>×</button>
      </div>

      {/* Payment schedule adjustments */}
      {(() => {
        const adjs = d.adjustments ?? [];
        const addAdj = () => {
          const adj: DebtAdjustment = { id: crypto.randomUUID(), monthIdx: 0, year: startYear + 1, payment: d.payment };
          onChange({ adjustments: [...adjs, adj] });
        };
        const changeAdj = (id: string, patch: Partial<DebtAdjustment>) =>
          onChange({ adjustments: adjs.map(a => a.id === id ? { ...a, ...patch } : a) });
        const removeAdj = (id: string) =>
          onChange({ adjustments: adjs.filter(a => a.id !== id) });

        return (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjs.length ? 8 : 0 }}>
              <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Payment schedule</span>
              <Button variant="primary" size="sm" onClick={addAdj}>+ Change</Button>
            </div>
            {adjs.length > 0 && (
              <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                Override the monthly payment from a specific date onward.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adjs.map((adj, i) => (
                <div key={adj.id} style={{
                  background: COLORS.faint, border: `1px solid ${COLORS.border}`,
                  borderRadius: 6, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>From</span>
                    <button type="button" onClick={() => removeAdj(adj.id)}
                      aria-label={`Remove payment change ${i + 1}`}
                      style={iconBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                    <Select label="Month" options={monthOpts} value={String(adj.monthIdx)}
                      aria-label={`Change ${i + 1} month`}
                      onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })} />
                    <Select label="Year" options={yearOpts} value={String(adj.year)}
                      aria-label={`Change ${i + 1} year`}
                      onChange={e => changeAdj(adj.id, { year: +e.target.value })} />
                    <Input label="New /mo" type="number" min={0} max={99999} step={25}
                      value={adj.payment} prefix="−$"
                      aria-label={`Change ${i + 1} payment amount`}
                      onChange={e => changeAdj(adj.id, { payment: Math.max(0, +e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Balance · APR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <Input
          id={`bal-${d.id}`}
          label="Balance (optional)"
          type="number" value={balance || ''} min={0} step={100} placeholder="0"
          prefix="$"
          aria-label={`Current balance for ${d.label || 'this debt'}`}
          onChange={e => onChange(withPayoff(+e.target.value || 0, apr, d.payment, { balance: +e.target.value || 0 }))}
        />
        <Input
          id={`apr-${d.id}`}
          label="APR (optional)"
          type="number" value={apr || ''} min={0} max={100} step={0.1} placeholder="0"
          suffix="%"
          aria-label={`APR for ${d.label || 'this debt'}`}
          onChange={e => onChange(withPayoff(balance, +e.target.value || 0, d.payment, { apr: +e.target.value || 0 }))}
        />
      </div>

      {/* Stats bar */}
      {hasStats && (
        <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
          {paymentTooLow ? (
            <div style={{ padding: '8px 12px', background: `${COLORS.red}0F`, fontSize: 11, color: COLORS.red }}>
              Payment ${d.payment}/mo doesn't cover monthly interest ({money(moInterest)}) — balance will grow.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {[
                { key: 'Mo. interest', val: money(moInterest),   col: COLORS.red    },
                { key: 'Total interest', val: money(interest),   col: COLORS.orange },
                { key: 'Pays off',     val: computedLabel,        col: COLORS.accent },
                { key: 'Months left',  val: moRemaining >= 9999 ? '∞' : `${moRemaining} mo`, col: COLORS.text },
              ].map(({ key, val, col }) => (
                <div key={key} style={{ flex: '1 1 90px', padding: '7px 10px', borderRight: `1px solid ${COLORS.border}`, background: COLORS.faint }}>
                  <div style={{ color: COLORS.muted, fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>{key}</div>
                  <div style={{ color: col, fontWeight: 500, fontSize: 11 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Computed payoff */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>Pays off</span>
        <span style={{
          background: COLORS.faint, color: COLORS.accent, minWidth: 120, textAlign: 'center',
          border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: '7px 9px',
          fontFamily: 'var(--ui-font)', fontSize: 11,
        }}>
          {hasStats && !paymentTooLow ? computedLabel : `${MONTHS[d.payoffMonthIdx]} ${d.payoffYear}`}
        </span>
        <span style={{ fontSize: 11, color: COLORS.dim }}>→ {money(d.payment)}/mo freed</span>
      </div>
    </div>
  );
}
