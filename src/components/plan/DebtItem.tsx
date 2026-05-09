import { useColors } from '../../stores/themeStore';
import { MONTHS, YEARS, START_YEAR } from '../../lib/constants';
import { money, payoffMonths, totalInterest } from '../../lib/finance';
import type { Debt } from '../../lib/types';

interface Props {
  d:        Debt;
  onChange: (patch: Partial<Debt>) => void;
  onRemove: () => void;
}

export function DebtItem({ d, onChange, onRemove }: Props) {
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

  const computedYear     = START_YEAR + Math.floor(moRemaining / 12);
  const computedMonthIdx = moRemaining % 12;
  const computedLabel    = moRemaining >= 9999
    ? 'never'
    : `${MONTHS[computedMonthIdx]} ${computedYear}`;

  // Auto-compute payoff date from balance math and include in patch.
  const withPayoff = (bal: number, rate: number, pmt: number, patch: Partial<Debt>): Partial<Debt> => {
    if (bal <= 0 || pmt <= 0) return patch;
    const mo = payoffMonths(bal, rate, pmt);
    if (mo <= 0 || mo >= 9999) return patch;
    return { ...patch, payoffYear: START_YEAR + Math.floor(mo / 12), payoffMonthIdx: mo % 12 };
  };

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

      {/* Row 3: manual payoff date */}
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
