import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, START_YEAR } from '../../lib/constants';
import { money, payoffMonths, totalInterest } from '../../lib/finance';
import type { Debt, DebtAdjustment } from '../../lib/types';

interface Props {
  d:        Debt;
  startYear?: number;
  onChange: (patch: Partial<Debt>) => void;
  onRemove: () => void;
}

export function DebtItem({ d, startYear = START_YEAR, onChange, onRemove }: Props) {
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

  const balance = d.balance ?? 0;
  const apr     = d.apr     ?? 0;
  const hasStats = balance > 0;

  // Computed from balance + APR + payment
  const moRemaining   = hasStats ? payoffMonths(balance, apr, d.payment) : 0;
  const interest      = hasStats ? totalInterest(balance, apr, d.payment) : 0;
  const moInterest    = apr > 0  ? (balance * apr) / 100 / 12 : 0;
  const paymentTooLow = hasStats && apr > 0 && d.payment <= moInterest;

  const computedYear     = startYear + Math.floor(moRemaining / 12);
  const computedMonthIdx = moRemaining % 12;
  const computedLabel    = moRemaining >= 9999
    ? 'never'
    : `${MONTHS[computedMonthIdx]} ${computedYear}`;

  // Auto-compute payoff date from balance math and include in patch.
  const withPayoff = (bal: number, rate: number, pmt: number, patch: Partial<Debt>): Partial<Debt> => {
    if (bal <= 0 || pmt <= 0) return patch;
    const mo = payoffMonths(bal, rate, pmt);
    if (mo <= 0 || mo >= 9999) return patch;
    return { ...patch, payoffYear: startYear + Math.floor(mo / 12), payoffMonthIdx: mo % 12 };
  };
  const years = buildYears(startYear, 30);

  return (
    <div style={{ padding: '12px 0', borderBottom: `1px solid ${COLORS.border}20` }}>

      {/* Row 1: label · payment · remove */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <input
          value={d.label}
          placeholder="Label (e.g. Visa, student loan…)"
          aria-label="Debt label"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden="true" style={{ color: COLORS.red, fontSize: 10 }}>−$</span>
          <input
            type="number" value={d.payment} min={0} max={99999} step={25}
            aria-label={`Monthly payment for ${d.label || 'this debt'}`}
            onChange={e => onChange(withPayoff(balance, apr, +e.target.value, { payment: +e.target.value }))}
            style={{ ...S.field, width: 80 }}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
        </div>
        <button onClick={onRemove} aria-label={`Remove debt: ${d.label || 'unnamed'}`} style={iconBtn}>×</button>
      </div>

      {/* Row 2: balance · APR (optional context fields) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor={`bal-${d.id}`} style={S.label}>Balance (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`bal-${d.id}`} type="number" value={balance || ''} min={0} step={100}
              placeholder="0"
              aria-label={`Current balance for ${d.label || 'this debt'}`}
              onChange={e => onChange(withPayoff(+e.target.value || 0, apr, d.payment, { balance: +e.target.value || 0 }))}
              style={{ ...S.field, width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor={`apr-${d.id}`} style={S.label}>APR (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id={`apr-${d.id}`} type="number" value={apr || ''} min={0} max={100} step={0.1}
              placeholder="0"
              aria-label={`APR for ${d.label || 'this debt'}`}
              onChange={e => onChange(withPayoff(balance, +e.target.value || 0, d.payment, { apr: +e.target.value || 0 }))}
              style={{ ...S.field, width: '100%' }}
            />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>%</span>
          </div>
        </div>
      </div>

      {/* Stats bar — shown when balance is set */}
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

      {/* Computed payoff (non-editable) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>Pays off</span>
        <span style={{ ...S.field, color: COLORS.accent, minWidth: 120, textAlign: 'center' }}>
          {hasStats && !paymentTooLow ? computedLabel : `${MONTHS[d.payoffMonthIdx]} ${d.payoffYear}`}
        </span>
        <span style={{ fontSize: 11, color: COLORS.dim }}>→ {money(d.payment)}/mo freed</span>
      </div>

      {/* Payment adjustments */}
      {(d.adjustments ?? []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <span style={{ ...S.label, fontSize: 9, letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>Payment modifications</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {(d.adjustments ?? []).map((adj, i) => (
              <div key={adj.id} style={{
                background: COLORS.faint,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '10px 12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ ...S.label, fontSize: 9 }}>Mod {i + 1}</span>
                  <button
                    onClick={() => onChange({ adjustments: (d.adjustments ?? []).filter(a => a.id !== adj.id) })}
                    aria-label={`Remove adjustment ${i + 1}`}
                    style={{ ...iconBtn, fontSize: 15 }}
                  >×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`adj-m-${adj.id}`} style={S.label}>Month</label>
                    <select id={`adj-m-${adj.id}`}
                      value={adj.monthIdx} aria-label={`Adjustment ${i + 1} month`}
                      onChange={e => {
                        const next = (d.adjustments ?? []).map(a => a.id === adj.id ? { ...a, monthIdx: +e.target.value } : a);
                        onChange({ adjustments: next });
                      }}
                      style={{ ...S.field, width: '100%' }}
                    >
                      {MONTHS.map((mo, mi) => <option key={mi} value={mi}>{mo}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`adj-y-${adj.id}`} style={S.label}>Year</label>
                    <select id={`adj-y-${adj.id}`}
                      value={adj.year} aria-label={`Adjustment ${i + 1} year`}
                      onChange={e => {
                        const next = (d.adjustments ?? []).map(a => a.id === adj.id ? { ...a, year: +e.target.value } : a);
                        onChange({ adjustments: next });
                      }}
                      style={{ ...S.field, width: '100%' }}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={`adj-p-${adj.id}`} style={S.label}>New payment</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span aria-hidden="true" style={{ color: COLORS.red, fontSize: 10 }}>−$</span>
                      <input id={`adj-p-${adj.id}`}
                        type="number" value={adj.payment} min={0} max={99999} step={25}
                        aria-label={`Adjustment ${i + 1} payment amount`}
                        onChange={e => {
                          const next = (d.adjustments ?? []).map(a => a.id === adj.id ? { ...a, payment: +e.target.value } : a);
                          onChange({ adjustments: next });
                        }}
                        style={{ ...S.field, width: '100%' }}
                      />
                      <span aria-hidden="true" style={{ fontSize: 10, color: COLORS.muted }}>/mo</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          const adj: DebtAdjustment = {
            id:       crypto.randomUUID(),
            monthIdx: 0,
            year:     startYear + 1,
            payment:  d.payment,
          };
          onChange({ adjustments: [...(d.adjustments ?? []), adj] });
        }}
        style={{
          marginTop: 8, fontSize: 10, letterSpacing: 1,
          background: 'none', border: `1px dashed ${COLORS.border}`,
          color: COLORS.muted, borderRadius: 4, padding: '5px 10px',
          cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
        }}
      >+ Add Modification</button>
    </div>
  );
}
