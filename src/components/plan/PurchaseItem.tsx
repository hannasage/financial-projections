import { useCallback } from 'react';
import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears, START_YEAR } from '../../lib/constants';
import { absMo, money, stdPayment, remainingBalance, adjustedPurchaseStats } from '../../lib/finance';
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
  p,
  onChange,
  onRemove,
  housingCost,
  startYear = START_YEAR,
  startMonthIdx = 0,
  horizonYears = 25,
}: Props) {
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

  const chipStyle = (active: boolean, color: string = COLORS.accent): React.CSSProperties => ({
    padding: '5px 9px', fontSize: 11, borderRadius: 4,
    border:     `1px solid ${active ? color : COLORS.border}`,
    background:  active ? `${color}22` : 'transparent',
    color:       active ? color : COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', transition: 'all 0.12s', whiteSpace: 'nowrap',
  });

  const isHouse      = p.type === 'house';
  const typeColor    = isHouse ? COLORS.blue : COLORS.orange;
  const startM       = absMo(p.year, p.monthIdx, startYear, startMonthIdx);
  const isHistorical = startM < 0;

  // For past loans, remaining balance uses the 1× std payment as historical baseline
  // (matches simulate.ts) so that changing the multiplier doesn't retroactively alter history.
  const stdPmt           = stdPayment(p.loanAmount, p.rate, p.termMonths) || p.payment;
  const effectivePrincipal = isHistorical
    ? remainingBalance(p.loanAmount, p.rate, stdPmt, -startM)
    : p.loanAmount;

  const alreadyDone = isHistorical && effectivePrincipal <= 0;

  // Use adjustedPurchaseStats so the display reflects payment adjustments.
  // Historical loans start from plan-month 0 (effectivePrincipal is already the plan-start balance).
  // Future/current loans start from their own startM so adjustments resolve at the right dates.
  const adjStats = adjustedPurchaseStats(
    effectivePrincipal, p.rate, p.payment, p.adjustments,
    isHistorical ? 0 : startM,
    startYear, startMonthIdx,
  );
  const payMo    = adjStats.payoffMonths;
  const interest = adjStats.totalInterest;
  const netImpact = isHouse ? p.payment - housingCost : null;

  const std60 = stdPayment(p.loanAmount, p.rate, 60);

  // Payoff label — both branches resolve to a plan-absolute month index then format.
  // Historical: payMo is already plan-relative (purchaseAbsStartM=0). Future: offset by startM.
  const payoffAbsM = isHistorical ? payMo : startM + payMo;
  const payoffLabelStr = payMo >= 9999 ? 'never'
    : payMo === 0 ? '—'
    : `${MONTHS[((payoffAbsM % 12) + 12) % 12]} ${startYear + Math.floor(payoffAbsM / 12)}`;
  const purchaseYears = buildPurchaseYears(startYear, horizonYears);

  const multOptions = [
    { mult: 1,   label: '1×',   color: COLORS.blue   },
    { mult: 1.5, label: '1.5×', color: COLORS.accent },
    { mult: 2,   label: '2×',   color: COLORS.orange },
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
          {purchaseYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {isHistorical && !alreadyDone && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${COLORS.blue}50`, color: COLORS.blue, letterSpacing: 1, whiteSpace: 'nowrap' }}>
            IN PROGRESS
          </span>
        )}
        {alreadyDone && (
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, border: `1px solid ${COLORS.muted}40`, color: COLORS.muted, letterSpacing: 1, whiteSpace: 'nowrap' }}>
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

      {/* Optional: asset value for net worth (equity = value − loan balance in sim) */}
      <div style={{ marginBottom: 10 }}>
        <label htmlFor={`mv-${p.id}`} style={S.label}>Market value (optional)</label>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '4px 0 6px', lineHeight: 1.45 }}>
          Estimated value of the asset while you own it (e.g. home Zestimate). Leave blank for standard loans with no tracked asset.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, maxWidth: 220 }}>
          <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
          <input
            id={`mv-${p.id}`}
            type="number"
            min={0}
            step={1000}
            value={p.marketValue === undefined ? '' : p.marketValue}
            placeholder="—"
            aria-label="Market value for net worth, optional"
            onChange={e => {
              const v = e.target.value;
              if (v === '') onChange({ marketValue: undefined });
              else onChange({ marketValue: Math.max(0, +v) });
            }}
            style={{ ...S.field, flex: 1 }}
          />
        </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: adjs.length ? 8 : 0 }}>
              <span style={S.label}>Payment modifications</span>
              <button type="button" onClick={addAdj}
                style={{
                  padding: '5px 12px', fontSize: 10, letterSpacing: 1,
                  borderRadius: 4, border: `1px solid ${COLORS.purple}`,
                  background: `${COLORS.purple}18`, color: COLORS.purple,
                  fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer', flexShrink: 0,
                }}
              >+ Change</button>
            </div>
            {adjs.length > 0 && (
              <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                Change the monthly payment from a specific date onward. The payoff date and interest shown above will update to reflect the new schedule.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {adjs.map((adj, i) => (
                <div key={adj.id} style={{
                  background: COLORS.faint,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ ...S.label, fontSize: 9 }}>Mod {i + 1}</span>
                    <button type="button" onClick={() => removeAdj(adj.id)}
                      aria-label={`Remove payment modification ${i + 1}`}
                      style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 15, padding: '0 2px', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 7 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label htmlFor={`pm-m-${adj.id}`} style={S.label}>Month</label>
                      <select id={`pm-m-${adj.id}`} value={adj.monthIdx}
                        aria-label={`Modification ${i + 1} month`}
                        onChange={e => changeAdj(adj.id, { monthIdx: +e.target.value })}
                        style={{ ...S.field, width: '100%' }}>
                        {MONTHS.map((mo, mi) => <option key={mi} value={mi}>{mo}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label htmlFor={`pm-y-${adj.id}`} style={S.label}>Year</label>
                      <select id={`pm-y-${adj.id}`} value={adj.year}
                        aria-label={`Modification ${i + 1} year`}
                        onChange={e => changeAdj(adj.id, { year: +e.target.value })}
                        style={{ ...S.field, width: '100%' }}>
                        {purchaseYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label htmlFor={`pm-p-${adj.id}`} style={S.label}>New payment</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                        <input id={`pm-p-${adj.id}`} type="number" min={0} step={25} value={adj.payment}
                          aria-label={`Modification ${i + 1} payment amount`}
                          onChange={e => changeAdj(adj.id, { payment: Math.max(0, +e.target.value) })}
                          style={{ ...S.field, width: '100%' }} />
                        <span aria-hidden="true" style={{ fontSize: 10, color: COLORS.muted }}>/mo</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Already-paid-off warning */}
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
              { key: 'Payoff',    val: payoffLabelStr,                                                               col: COLORS.accent },
              { key: 'Months',    val: payMo >= 9999 ? '∞' : `${payMo} mo`,                                      col: COLORS.text   },
              { key: 'Interest',  val: money(interest),                                                            col: COLORS.red    },
              isHistorical
                ? { key: 'Remaining', val: money(effectivePrincipal),                                             col: COLORS.blue   }
                : { key: 'vs 60mo',   val: std60 > 0 ? `${(p.payment / std60).toFixed(2)}×` : '—',               col: COLORS.orange },
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
