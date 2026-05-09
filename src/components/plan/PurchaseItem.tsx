import { useCallback } from 'react';
import { COLORS, MONTHS, YEARS } from '../../lib/constants';
import { money, stdPayment, payoffMonths, totalInterest, payoffLabel } from '../../lib/finance';
import type { Purchase } from '../../lib/types';

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

const chipStyle = (active: boolean, color: string = COLORS.accent): React.CSSProperties => ({
  padding: '5px 9px', fontSize: 11, borderRadius: 4,
  border:     `1px solid ${active ? color : COLORS.border}`,
  background:  active ? `${color}22` : 'transparent',
  color:       active ? color : COLORS.muted,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
});

interface Props {
  p:           Purchase;
  onChange:    (patch: Partial<Purchase>) => void;
  onRemove:    () => void;
  housingCost: number;
}

export function PurchaseItem({ p, onChange, onRemove, housingCost }: Props) {
  const isHouse    = p.type === 'house';
  const typeColor  = isHouse ? COLORS.blue : COLORS.orange;

  const payMo    = payoffMonths(p.loanAmount, p.rate, p.payment);
  const interest = totalInterest(p.loanAmount, p.rate, p.payment);
  const netImpact = isHouse ? p.payment - housingCost : null;

  const std60 = stdPayment(p.loanAmount, p.rate, 60);

  const applyTerm = useCallback((termMonths: number, multiplier: number = 1) =>
    onChange({ termMonths, multiplier, payment: Math.round(stdPayment(p.loanAmount, p.rate, termMonths) * multiplier) }),
    [p.loanAmount, p.rate, onChange],
  );

  const applyLoanAmount = useCallback((v: number) =>
    onChange({ loanAmount: v, payment: Math.round(stdPayment(v, p.rate, p.termMonths) * p.multiplier) }),
    [p.rate, p.termMonths, p.multiplier, onChange],
  );

  const applyRate = useCallback((v: number) =>
    onChange({ rate: v, payment: Math.round(stdPayment(p.loanAmount, v, p.termMonths) * p.multiplier) }),
    [p.loanAmount, p.termMonths, p.multiplier, onChange],
  );

  const applyPayment = useCallback((v: number) => {
    const base = stdPayment(p.loanAmount, p.rate, p.termMonths);
    onChange({ payment: v, multiplier: base > 0 ? v / base : 1 });
  }, [p.loanAmount, p.rate, p.termMonths, onChange]);

  const termOptions = [
    { mo: 12,  label: '12 mo. / 1 yr.'  },
    { mo: 24,  label: '24 mo. / 2 yr.'  },
    { mo: 36,  label: '36 mo. / 3 yr.'  },
    { mo: 48,  label: '48 mo. / 4 yr.'  },
    { mo: 60,  label: '60 mo. / 5 yr.'  },
    { mo: 84,  label: '84 mo. / 7 yr.'  },
    { mo: 120, label: '120 mo. / 10 yr.', minLoan: 10_000  },
    { mo: 180, label: '180 mo. / 15 yr.', minLoan: 50_000  },
    { mo: 240, label: '240 mo. / 20 yr.', minLoan: 100_000 },
    { mo: 360, label: '360 mo. / 30 yr.', minLoan: 100_000 },
  ].filter(o => !o.minLoan || p.loanAmount >= o.minLoan);

  const multOptions = [
    { mult: 1,   label: '1×',   color: COLORS.blue   },
    { mult: 1.5, label: '1.5×', color: COLORS.accent },
    { mult: 2,   label: '2×',   color: COLORS.orange },
  ];

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${typeColor}40`, padding: '14px', marginTop: 10,
    }}>
      {/* Row 1: type toggle · label · remove */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{
          display: 'flex', borderRadius: 4, overflow: 'hidden',
          border: `1px solid ${COLORS.border}`, flexShrink: 0,
        }}>
          {([['loan','🚗 Loan'],['house','🏠 House']] as const).map(([typeKey, typeLabel]) => (
            <button
              key={typeKey}
              onClick={() => onChange({ type: typeKey })}
              aria-pressed={p.type === typeKey}
              style={{
                padding: '6px 10px', fontSize: 10, border: 'none',
                cursor: 'pointer', transition: 'all 0.12s',
                fontFamily: "'IBM Plex Mono', monospace",
                background: p.type === typeKey
                  ? (typeKey === 'house' ? `${COLORS.blue}30` : `${COLORS.orange}30`)
                  : 'transparent',
                color: p.type === typeKey
                  ? (typeKey === 'house' ? COLORS.blue : COLORS.orange)
                  : COLORS.muted,
              }}
            >
              {typeLabel}
            </button>
          ))}
        </div>
        <input
          value={p.label}
          placeholder={isHouse ? 'e.g. First home, Condo…' : 'e.g. Corvette C8, Boat…'}
          aria-label="Purchase label"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <button onClick={onRemove} aria-label={`Remove: ${p.label || 'purchase'}`} style={iconBtn}>×</button>
      </div>

      {/* Row 2: purchase date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ ...S.label, letterSpacing: 1 }}>Purchase date</span>
        <select
          value={p.monthIdx} aria-label="Purchase month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={p.year} aria-label="Purchase year"
          onChange={e => onChange({ year: +e.target.value })}
          style={{ ...S.field, flex: '1 1 70px' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Row 3: down · loan · rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { id: `dp-${p.id}`,  labelText: 'Down Payment', prefix: '$', value: p.downPayment, step: 1000, onCh: (v: number) => onChange({ downPayment: v }) },
          { id: `la-${p.id}`,  labelText: 'Loan Amount',  prefix: '$', value: p.loanAmount,  step: 1000, onCh: applyLoanAmount },
          { id: `apr-${p.id}`, labelText: 'Rate (APR)',   suffix: '%', value: p.rate,         step: 0.1,  onCh: applyRate },
        ].map(({ id, labelText, prefix, suffix, value, step, onCh }) => (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor={id} style={S.label}>{labelText}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {prefix && <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>{prefix}</span>}
              <input
                id={id} type="number" value={value} min={0} step={step}
                onChange={e => onCh(+e.target.value)}
                style={{ ...S.field, width: '100%' }}
              />
              {suffix && <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>{suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: term + multiplier + manual payment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px' }}>
            <label htmlFor={`term-${p.id}`} style={S.label}>Loan Term</label>
            <select
              id={`term-${p.id}`} value={p.termMonths} aria-label="Loan term"
              onChange={e => applyTerm(+e.target.value, p.multiplier)}
              style={{ ...S.field, width: '100%' }}
            >
              {termOptions.map(o => <option key={o.mo} value={o.mo}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={S.label}>Payment speed</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {multOptions.map(o => (
                <button
                  key={o.mult}
                  onClick={() => applyTerm(p.termMonths, o.mult)}
                  style={chipStyle(Math.abs(p.multiplier - o.mult) < 0.001, o.color)}
                  aria-pressed={Math.abs(p.multiplier - o.mult) < 0.001}
                  aria-label={`${o.label} of standard payment`}
                >
                  {o.label} {money(stdPayment(p.loanAmount, p.rate, p.termMonths) * o.mult)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`pmt-${p.id}`} style={S.label}>Monthly Payment</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`pmt-${p.id}`} type="number" value={p.payment} min={0} step={25}
              aria-label="Monthly payment — type a custom amount or use term and speed controls above"
              onChange={e => applyPayment(+e.target.value)}
              style={{ ...S.field, flex: 1 }}
            />
            <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {p.loanAmount > 0 && p.payment > 0 && (
        <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'Payoff',   val: payoffLabel(p),                                           col: COLORS.accent },
              { key: 'Months',   val: payMo >= 9999 ? '∞' : `${payMo} mo`,                    col: COLORS.text   },
              { key: 'Interest', val: money(interest),                                           col: COLORS.red    },
              { key: 'vs 60mo',  val: std60 > 0 ? `${(p.payment / std60).toFixed(2)}×` : '—',  col: COLORS.orange },
            ].map(({ key, val, col }) => (
              <div key={key} style={{ flex: 1, padding: '8px 10px', borderRight: `1px solid ${COLORS.border}`, background: COLORS.faint }}>
                <div style={{ color: COLORS.muted, marginBottom: 3, fontSize: 10, letterSpacing: 1 }}>{key}</div>
                <div style={{ color: col, fontWeight: 500, fontSize: 11 }}>{val}</div>
              </div>
            ))}
          </div>
          {isHouse && netImpact !== null && (
            <div style={{
              padding: '8px 12px', background: `${COLORS.blue}0C`,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ color: COLORS.muted }}>vs rent {money(housingCost)}/mo</span>
              <span style={{ color: netImpact > 0 ? COLORS.red : COLORS.accent, fontWeight: 500 }}>
                {netImpact > 0 ? `+${money(netImpact)}/mo more` : `${money(Math.abs(netImpact))}/mo cheaper`}
              </span>
              <span style={{ color: COLORS.blue }}>
                · net impact: {netImpact > 0 ? '−' : '+'}{money(Math.abs(netImpact))}/mo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
