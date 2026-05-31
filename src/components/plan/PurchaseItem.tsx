import { useCallback } from 'react';
import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears, START_YEAR } from '../../lib/constants';
import { absMo, money, stdPayment, remainingBalance, adjustedPurchaseStats } from '../../lib/finance';
import { Input, Select, Button, ButtonGroup } from '@hannasage/projection-ui';
import type { Purchase, PurchasePaymentAdjustment } from '../../lib/types';

interface Props {
  p:           Purchase;
  onChange:    (patch: Partial<Purchase>) => void;
  onRemove:    () => void;
  housingCost: number;
  startYear?:  number;
  startMonthIdx?: number;
  horizonYears?: number;
}

export function PurchaseItem({
  p, onChange, onRemove, housingCost,
  startYear = START_YEAR, startMonthIdx = 0, horizonYears = 25,
}: Props) {
  const COLORS = useColors();

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', minWidth: 32, minHeight: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const isHouse       = p.type === 'house';
  const typeColor     = isHouse ? COLORS.blue : COLORS.orange;
  const startM        = absMo(p.year, p.monthIdx, startYear, startMonthIdx);
  const isHistorical  = startM < 0;
  const stdPmt        = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
  const effectivePrincipal = isHistorical
    ? remainingBalance(p.loanAmount, p.rate, stdPmt, -startM)
    : p.loanAmount;
  const alreadyDone = isHistorical && effectivePrincipal <= 0;

  const adjStats = adjustedPurchaseStats(
    effectivePrincipal, p.rate, p.payment, p.adjustments,
    isHistorical ? 0 : startM,
    startYear, startMonthIdx,
  );
  const payMo    = adjStats.payoffMonths;
  const interest = adjStats.totalInterest;
  const netImpact = isHouse ? p.payment - housingCost : null;
  const std60 = stdPayment(p.loanAmount, p.rate, 60);

  const payoffAbsM = isHistorical ? payMo : startM + payMo;
  const payoffLabelStr = payMo >= 9999 ? 'never'
    : payMo === 0 ? '—'
    : `${MONTHS[((payoffAbsM % 12) + 12) % 12]} ${startYear + Math.floor(payoffAbsM / 12)}`;

  const purchaseYears = buildPurchaseYears(startYear, horizonYears);
  const monthOpts     = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));
  const yearOpts      = purchaseYears.map(y => ({ value: String(y), label: String(y) }));

  const termOptions = [
    { mo: 12,  label: '12 mo. / 1 yr.'  },
    { mo: 24,  label: '24 mo. / 2 yr.'  },
    { mo: 36,  label: '36 mo. / 3 yr.'  },
    { mo: 48,  label: '48 mo. / 4 yr.'  },
    { mo: 60,  label: '60 mo. / 5 yr.'  },
    { mo: 72,  label: '72 mo. / 6 yr.'  },
    { mo: 84,  label: '84 mo. / 7 yr.'  },
    { mo: 120, label: '120 mo. / 10 yr.', minLoan: 10_000  },
    { mo: 180, label: '180 mo. / 15 yr.', minLoan: 50_000  },
    { mo: 240, label: '240 mo. / 20 yr.', minLoan: 100_000 },
    { mo: 360, label: '360 mo. / 30 yr.', minLoan: 100_000 },
  ].filter(o => !o.minLoan || p.loanAmount >= o.minLoan);

  const multOptions = [
    { mult: 1,   label: `1× ${money(stdPayment(p.loanAmount, p.rate, p.termMonths) * 1)}`,   color: COLORS.blue   },
    { mult: 1.5, label: `1.5× ${money(stdPayment(p.loanAmount, p.rate, p.termMonths) * 1.5)}`, color: COLORS.accent },
    { mult: 2,   label: `2× ${money(stdPayment(p.loanAmount, p.rate, p.termMonths) * 2)}`,   color: COLORS.orange },
  ];

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

  const typeGroupOptions = [
    { value: 'loan',  label: '🚗 Loan'  },
    { value: 'house', label: '🏠 House' },
  ];

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${typeColor}40`, padding: '14px', marginTop: 10,
    }}>
      {/* Row 1: type toggle · label · remove */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
        <ButtonGroup
          options={typeGroupOptions}
          value={p.type}
          onChange={v => onChange({ type: v as 'loan' | 'house' })}
          size="md"
          style={{ flexShrink: 0 }}
        />
        <Input
          value={p.label}
          placeholder={isHouse ? 'e.g. First home, Condo…' : 'e.g. Corvette C8, Boat…'}
          aria-label="Purchase label"
          onChange={e => onChange({ label: e.target.value })}
          containerStyle={{ flex: 1, minWidth: 80 }}
        />
        <button onClick={onRemove} aria-label={`Remove: ${p.label || 'purchase'}`} style={{ ...iconBtn, marginBottom: 4 }}>×</button>
      </div>

      {/* Row 2: purchase date */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 }}>Purchase date</span>
        <Select options={monthOpts} value={String(p.monthIdx)} aria-label="Purchase month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
          containerStyle={{ flex: '1 1 70px' }} />
        <Select options={yearOpts} value={String(p.year)} aria-label="Purchase year"
          onChange={e => onChange({ year: +e.target.value })}
          containerStyle={{ flex: '1 1 70px' }} />
        {isHistorical && !alreadyDone && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${COLORS.blue}50`, color: COLORS.blue, letterSpacing: 1, whiteSpace: 'nowrap', marginBottom: 4 }}>
            IN PROGRESS
          </span>
        )}
        {alreadyDone && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${COLORS.muted}40`, color: COLORS.muted, letterSpacing: 1, whiteSpace: 'nowrap', marginBottom: 4 }}>
            PAID OFF
          </span>
        )}
      </div>

      {/* Row 3: down · loan · rate */}
      <div style={{ display: 'grid', gridTemplateColumns: isHistorical ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          !isHistorical && { id: `dp-${p.id}`,  labelText: 'Down Payment', prefix: '$', value: p.downPayment, step: 1000, onCh: (v: number) => onChange({ downPayment: v }) },
          { id: `la-${p.id}`,  labelText: isHistorical ? 'Original Amount' : 'Loan Amount', prefix: '$', value: p.loanAmount, step: 1000, onCh: applyLoanAmount },
          { id: `apr-${p.id}`, labelText: 'Rate (APR)', suffix: '%', value: p.rate, step: 0.1, onCh: applyRate },
        ].filter((x): x is Exclude<typeof x, false> => x !== false).map(({ id, labelText, prefix, suffix, value, step, onCh }) => (
          <Input key={id} id={id} label={labelText} type="number" min={0} step={step}
            value={value} prefix={prefix} suffix={suffix}
            onChange={e => onCh(+e.target.value)} />
        ))}
      </div>

      {/* Market value */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 6px', lineHeight: 1.45 }}>
          Estimated value of the asset while you own it (e.g. home Zestimate). Leave blank for standard loans with no tracked asset.
        </p>
        <Input
          id={`mv-${p.id}`}
          label="Market value (optional)"
          type="number" min={0} step={1000}
          value={p.marketValue === undefined ? '' : p.marketValue}
          placeholder="—"
          prefix="$"
          aria-label="Market value for net worth, optional"
          onChange={e => {
            const v = e.target.value;
            if (v === '') onChange({ marketValue: undefined });
            else onChange({ marketValue: Math.max(0, +v) });
          }}
          containerStyle={{ maxWidth: 220 }}
        />
      </div>

      {/* Term + multiplier + payment */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            id={`term-${p.id}`}
            label="Loan Term"
            options={termOptions.map(o => ({ value: String(o.mo), label: o.label }))}
            value={String(p.termMonths)}
            aria-label="Loan term"
            onChange={e => applyTerm(+e.target.value, p.multiplier)}
            containerStyle={{ flex: '1 1 160px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Payment speed</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {multOptions.map(o => (
                <button
                  key={o.mult}
                  onClick={() => applyTerm(p.termMonths, o.mult)}
                  aria-pressed={Math.abs(p.multiplier - o.mult) < 0.001}
                  aria-label={`${o.mult}× of standard payment`}
                  style={{
                    padding: '5px 9px', fontSize: 11, borderRadius: 'var(--ui-radius-md)',
                    border: `1px solid ${Math.abs(p.multiplier - o.mult) < 0.001 ? o.color : COLORS.border}`,
                    background: Math.abs(p.multiplier - o.mult) < 0.001 ? `${o.color}22` : 'transparent',
                    color: Math.abs(p.multiplier - o.mult) < 0.001 ? o.color : COLORS.muted,
                    fontFamily: 'var(--ui-font)', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Input
          id={`pmt-${p.id}`}
          label="Monthly Payment"
          type="number" min={0} step={25}
          value={p.payment}
          prefix="$" suffix="/mo"
          aria-label="Monthly payment — type a custom amount or use term and speed controls above"
          onChange={e => applyPayment(+e.target.value)}
        />
      </div>

      {/* Payment adjustments */}
      {!alreadyDone && (() => {
        const adjs = p.adjustments ?? [];
        const addAdj = () => {
          const adj: PurchasePaymentAdjustment = {
            id: crypto.randomUUID(),
            year: p.year > startYear ? p.year + 1 : startYear + 1,
            monthIdx: p.monthIdx,
            payment: p.payment,
          };
          onChange({ adjustments: [...adjs, adj] });
        };
        const changeAdj = (id: string, patch: Partial<PurchasePaymentAdjustment>) =>
          onChange({ adjustments: adjs.map(a => a.id === id ? { ...a, ...patch } : a) });
        const removeAdj = (id: string) =>
          onChange({ adjustments: adjs.filter(a => a.id !== id) });

        return (
          <div style={{ paddingBottom: 24, borderTop: `1px solid ${COLORS.border}55` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjs.length ? 8 : 0, paddingTop: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Payment modifications</span>
              <Button variant="primary" size="sm" onClick={addAdj}>+ Change</Button>
            </div>
            {adjs.length > 0 && (
              <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                Change the monthly payment from a specific date onward.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {adjs.map((adj, i) => (
                <div key={adj.id} style={{
                  background: COLORS.faint, border: `1px solid ${COLORS.border}`,
                  borderRadius: 6, padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>Mod {i + 1}</span>
                    <button type="button" onClick={() => removeAdj(adj.id)}
                      aria-label={`Remove payment modification ${i + 1}`}
                      style={iconBtn}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                    <Select label="Month" options={monthOpts} value={String(adj.monthIdx)}
                      aria-label={`Modification ${i + 1} month`}
                      onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })} />
                    <Select label="Year" options={yearOpts} value={String(adj.year)}
                      aria-label={`Modification ${i + 1} year`}
                      onChange={e => changeAdj(adj.id, { year: +e.target.value })} />
                    <Input label="New payment" type="number" min={0} step={25}
                      value={adj.payment} prefix="$" suffix="/mo"
                      aria-label={`Modification ${i + 1} payment amount`}
                      onChange={e => changeAdj(adj.id, { payment: Math.max(0, +e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {alreadyDone && (
        <div style={{ padding: '8px 12px', borderRadius: 4, border: `1px solid ${COLORS.muted}30`, background: `${COLORS.muted}0A`, fontSize: 11, color: COLORS.muted }}>
          This loan would have paid off before the projection starts — it has no effect on the chart.
        </div>
      )}

      {/* Stats bar */}
      {!alreadyDone && p.loanAmount > 0 && p.payment > 0 && (
        <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${COLORS.border}`, marginTop: 4 }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'Payoff',   val: payoffLabelStr,                                         col: COLORS.accent },
              { key: 'Months',   val: payMo >= 9999 ? '∞' : `${payMo} mo`,                   col: COLORS.text   },
              { key: 'Interest', val: money(interest),                                        col: COLORS.red    },
              isHistorical
                ? { key: 'Remaining', val: money(effectivePrincipal),                         col: COLORS.blue   }
                : { key: 'vs 60mo',   val: std60 > 0 ? `${(p.payment / std60).toFixed(2)}×` : '—', col: COLORS.orange },
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
