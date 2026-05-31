import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears } from '../../lib/constants';
import { Input, Select, Button, ButtonGroup } from '@hannasage/projection-ui';
import type { Investment, InvestmentContributionAdjustment, InvestmentAdjustmentRecurrence } from '../../lib/types';

const RECURRENCE_PRESETS: ReadonlyArray<{ value: 'once' | number; label: string }> = [
  { value: 'once', label: 'One time' },
  { value: 1,      label: 'Every month' },
  { value: 3,      label: 'Every 3 months' },
  { value: 6,      label: 'Every 6 months' },
  { value: 12,     label: 'Every year' },
];

interface Props {
  i:                 Investment;
  planStartYear:     number;
  planStartMonthIdx: number;
  horizonYears:      number;
  onChange:          (patch: Partial<Investment>) => void;
  onRemove:          () => void;
}

export function InvestmentItem({ i, onChange, onRemove, planStartYear, planStartMonthIdx, horizonYears }: Props) {
  const COLORS = useColors();

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', minWidth: 32, minHeight: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const startY    = i.startYear      ?? planStartYear;
  const startM    = i.startMonthIdx  ?? planStartMonthIdx;
  const yearOpts  = buildPurchaseYears(planStartYear, horizonYears).map(y => ({ value: String(y), label: String(y) }));
  const monthOpts = MONTHS.map((mo, idx) => ({ value: String(idx), label: mo }));
  const hasSale   = i.sellYear != null && i.sellMonthIdx != null;
  const adjustments = i.adjustments ?? [];

  const upsertAdjustments = (next: InvestmentContributionAdjustment[]) => {
    onChange({ adjustments: next.length > 0 ? next : undefined });
  };
  const addAdjustment = () => upsertAdjustments([...adjustments, {
    id: crypto.randomUUID(),
    year: planStartYear + 1, monthIdx: planStartMonthIdx,
    monthlyContributionDelta: 0, lumpSum: 0,
  }]);
  const changeAdjustment = (id: string, patch: Partial<InvestmentContributionAdjustment>) =>
    upsertAdjustments(adjustments.map(a => a.id === id ? { ...a, ...patch } : a));
  const removeAdjustment = (id: string) =>
    upsertAdjustments(adjustments.filter(a => a.id !== id));
  const replaceAdjustment = (id: string, next: InvestmentContributionAdjustment) =>
    upsertAdjustments(adjustments.map(a => a.id === id ? next : a));

  const cardStyle: React.CSSProperties = {
    background: COLORS.faint, border: `1px solid ${COLORS.border}`,
    borderRadius: 6, padding: '8px 10px',
    display: 'flex', flexDirection: 'column', gap: 5,
  };

  const cardInputStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', padding: '2px 0',
    fontSize: 13, fontWeight: 600, color: 'var(--ui-text)', fontFamily: 'var(--ui-font)',
    outline: 'none', width: '100%',
  };

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 8,
      border: `1px solid ${COLORS.accent}35`, padding: '14px', marginTop: 10,
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
        <Input
          value={i.label}
          placeholder="e.g. Brokerage, 401k…"
          aria-label="Investment name"
          onChange={e => onChange({ label: e.target.value })}
          containerStyle={{ flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${i.label || 'investment'}`}
          style={{ ...iconBtn, marginBottom: 4 }}>×</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div style={cardStyle}>
          <label htmlFor={`ia-${i.id}`} style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Balance</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input id={`ia-${i.id}`} type="number" value={i.initialAmount} min={0} step={500}
              onChange={e => onChange({ initialAmount: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }} />
          </div>
        </div>
        <div style={cardStyle}>
          <label htmlFor={`ir-${i.id}`} style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Annual Return Rate</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <input id={`ir-${i.id}`} type="number" value={i.annualReturnPct} min={0} step={0.5}
              onChange={e => onChange({ annualReturnPct: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }} />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>% / yr</span>
          </div>
        </div>
        <div style={cardStyle}>
          <label htmlFor={`ic-${i.id}`} style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Monthly add</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input id={`ic-${i.id}`} type="number" value={i.monthlyContribution} min={0} step={25}
              onChange={e => onChange({ monthlyContribution: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }} />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>/mo</span>
          </div>
        </div>
      </div>

      {/* Start date */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 6 }}>Start date</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <Select options={monthOpts} value={String(startM)} aria-label="Investment start month"
            onChange={e => onChange({ startMonthIdx: +e.target.value })}
            containerStyle={{ flex: '1 1 80px' }} />
          <Select options={yearOpts} value={String(startY)} aria-label="Investment start year"
            onChange={e => onChange({ startYear: +e.target.value })}
            containerStyle={{ flex: '1 1 80px' }} />
        </div>
      </div>

      {/* Sale */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 6 }}>Sale (optional)</div>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
          Model cashing out this account on a future date. Leave as "hold" to keep it invested.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
          <Select
            aria-label="Sale timing"
            value={hasSale ? 'sell' : 'hold'}
            options={[{ value: 'hold', label: 'Hold (no sale)' }, { value: 'sell', label: 'Sell on date…' }]}
            onChange={e => {
              if (e.target.value === 'hold') {
                onChange({ sellYear: undefined, sellMonthIdx: undefined, salePrice: undefined, capitalGainsTaxPct: undefined });
              } else {
                onChange({ sellYear: planStartYear + 2, sellMonthIdx: planStartMonthIdx });
              }
            }}
            containerStyle={{ flex: '1 1 120px' }}
          />
          {hasSale && (
            <>
              <Select options={monthOpts} value={String(i.sellMonthIdx ?? 0)} aria-label="Sale month"
                onChange={e => onChange({ sellMonthIdx: +e.target.value })}
                containerStyle={{ flex: '1 1 80px' }} />
              <Select options={yearOpts} value={String(i.sellYear ?? planStartYear)} aria-label="Sale year"
                onChange={e => onChange({ sellYear: +e.target.value })}
                containerStyle={{ flex: '1 1 80px' }} />
            </>
          )}
        </div>
        {hasSale && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            <Input id={`isp-${i.id}`} label="Sale price ($)" type="number" min={0} step={500}
              placeholder="Modeled balance" value={i.salePrice ?? ''}
              onChange={e => {
                const v = e.target.value;
                if (v === '') onChange({ salePrice: undefined });
                else onChange({ salePrice: Math.max(0, +v) });
              }} />
            <Input id={`icg-${i.id}`} label="Cap. gains tax %" type="number" min={0} max={100} step={0.5}
              value={i.capitalGainsTaxPct ?? ''}
              onChange={e => {
                const v = e.target.value;
                if (v === '') onChange({ capitalGainsTaxPct: undefined });
                else onChange({ capitalGainsTaxPct: Math.max(0, Math.min(100, +v)) });
              }} />
          </div>
        )}
      </div>

      {/* Contribution adjustments */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Contribution adjustments</div>
          <Button variant="primary" size="sm" onClick={addAdjustment}>+ Add Adjustment</Button>
        </div>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
          Each adjustment can increase (+) or decrease (−) monthly contributions, drop a one-time lump sum, or both.
        </p>
        {adjustments.length === 0 && (
          <div style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic' }}>No adjustments scheduled.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {adjustments.map(adj => {
            const isLegacy = adj.monthlyContribution != null && adj.monthlyContributionDelta == null;
            const delta    = adj.monthlyContributionDelta ?? 0;
            const sign: '+' | '−' = delta < 0 || Object.is(delta, -0) ? '−' : '+';
            const magnitude = Math.abs(delta);
            const recurrence = adj.recurrence;
            const presetValue: 'once' | number = recurrence ? recurrence.everyMonths : 'once';
            const isPreset = recurrence == null || RECURRENCE_PRESETS.some(p => p.value === presetValue);
            const recurrenceSelectValue = recurrence == null ? 'once'
              : (isPreset ? String(recurrence.everyMonths) : 'custom');
            const hasRecurrenceEnd = recurrence?.untilYear != null && recurrence?.untilMonthIdx != null;

            const setSign = (nextSign: '+' | '−') => {
              const signed = nextSign === '−' ? -magnitude : magnitude;
              changeAdjustment(adj.id, { monthlyContributionDelta: signed });
            };
            const setMagnitude = (nextMag: number) => {
              const clamped = Math.max(0, nextMag);
              changeAdjustment(adj.id, { monthlyContributionDelta: sign === '−' ? -clamped : clamped });
            };
            const setRecurrenceValue = (value: string) => {
              if (value === 'once') {
                const next: InvestmentContributionAdjustment = { ...adj };
                delete next.recurrence;
                replaceAdjustment(adj.id, next);
                return;
              }
              if (value === 'custom') {
                changeAdjustment(adj.id, { recurrence: { ...(recurrence ?? {}), everyMonths: recurrence?.everyMonths ?? 2 } });
                return;
              }
              changeAdjustment(adj.id, { recurrence: { ...(recurrence ?? {}), everyMonths: Math.max(1, Math.floor(Number(value))) } });
            };
            const toggleRecurrenceEnd = () => {
              if (!recurrence) return;
              if (hasRecurrenceEnd) {
                replaceAdjustment(adj.id, { ...adj, recurrence: { everyMonths: recurrence.everyMonths } });
              } else {
                changeAdjustment(adj.id, {
                  recurrence: { everyMonths: recurrence.everyMonths, untilYear: planStartYear + Math.max(1, horizonYears), untilMonthIdx: planStartMonthIdx },
                });
              }
            };
            const convertLegacyToDelta = () => {
              const next: InvestmentContributionAdjustment = { ...adj };
              delete next.monthlyContribution;
              next.monthlyContributionDelta = 0;
              replaceAdjustment(adj.id, next);
            };

            const cellStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 };
            const signOptions = [{ value: '+', label: '+' }, { value: '−', label: '−' }];

            return (
              <div key={adj.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '10px 12px', background: COLORS.faint }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' }}>
                    Contribution adjustment {adjustments.indexOf(adj) + 1}
                  </span>
                  <button type="button" onClick={() => removeAdjustment(adj.id)} style={iconBtn}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {/* Date */}
                  <div style={cellStyle}>
                    <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Date</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Select options={monthOpts} value={String(adj.monthIdx)} aria-label="Adjustment month"
                        onChange={e => changeAdjustment(adj.id, { monthIdx: +e.target.value })}
                        containerStyle={{ flex: 1 }} />
                      <Select options={yearOpts} value={String(adj.year)} aria-label="Adjustment year"
                        onChange={e => changeAdjustment(adj.id, { year: +e.target.value })}
                        containerStyle={{ flex: 1 }} />
                    </div>
                  </div>

                  {/* Monthly delta */}
                  <div style={cellStyle}>
                    <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Monthly Δ</span>
                    {isLegacy ? (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                        padding: '5px 8px', border: `1px dashed ${COLORS.border}`, borderRadius: 4,
                        background: COLORS.surface, minHeight: 28,
                      }}>
                        <span style={{ fontSize: 11, color: COLORS.muted, flex: 1, minWidth: 0 }}>
                          Set to <strong style={{ color: COLORS.text }}>${adj.monthlyContribution}</strong>
                        </span>
                        <Button variant="ghost" size="sm" onClick={convertLegacyToDelta}>to ±</Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <ButtonGroup
                          options={signOptions}
                          value={sign}
                          onChange={v => setSign(v as '+' | '−')}
                          size="sm"
                          style={{ flexShrink: 0 }}
                        />
                        <Input
                          type="number" min={0} step={25}
                          value={magnitude || ''}
                          placeholder="0"
                          prefix="$" suffix="/mo"
                          aria-label={`Amount to ${sign === '+' ? 'add to' : 'subtract from'} monthly contribution`}
                          onChange={e => setMagnitude(+e.target.value)}
                          containerStyle={{ flex: 1, minWidth: 0 }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Lump sum */}
                  <div style={cellStyle}>
                    <Input
                      id={`adjl-${adj.id}`}
                      label="Lump sum"
                      type="number" min={0} step={100}
                      value={adj.lumpSum ?? ''}
                      placeholder="0"
                      prefix="$"
                      onChange={e => {
                        const v = e.target.value;
                        changeAdjustment(adj.id, { lumpSum: v === '' ? undefined : Math.max(0, +v) });
                      }}
                    />
                  </div>

                  {/* Repeats */}
                  <div style={cellStyle}>
                    <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>Repeats</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => recurrence ? setRecurrenceValue('once') : setRecurrenceValue('12')}
                        aria-pressed={!!recurrence}
                        title={recurrence ? 'Disable recurrence' : 'Enable recurrence'}
                        style={{
                          padding: '5px 8px', borderRadius: 'var(--ui-radius-md)', fontSize: 14, lineHeight: 1,
                          border: `1px solid ${recurrence ? COLORS.accent : COLORS.border}`,
                          background: recurrence ? `${COLORS.accent}20` : 'transparent',
                          color: recurrence ? COLORS.accent : COLORS.muted,
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >↻</button>
                      {recurrence && (
                        <Select
                          aria-label="Recurrence period"
                          value={recurrenceSelectValue}
                          options={[
                            ...RECURRENCE_PRESETS.filter(p => p.value !== 'once').map(p => ({ value: String(p.value), label: p.label })),
                            ...(!isPreset && recurrence != null ? [{ value: 'custom', label: `Every ${recurrence.everyMonths} months` }] : []),
                            { value: 'custom', label: 'Custom…' },
                          ]}
                          onChange={e => setRecurrenceValue(e.target.value)}
                          containerStyle={{ flex: 1, minWidth: 0 }}
                        />
                      )}
                    </div>
                    {recurrenceSelectValue === 'custom' && recurrence && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Input
                          type="number" min={1} max={240} step={1}
                          value={recurrence.everyMonths ?? 1}
                          aria-label="Custom recurrence interval in months"
                          onChange={e => changeAdjustment(adj.id, {
                            recurrence: { ...(recurrence ?? { everyMonths: 1 }), everyMonths: Math.max(1, Math.floor(+e.target.value)) } as InvestmentAdjustmentRecurrence,
                          })}
                          style={{ width: 50 }}
                        />
                        <span style={{ fontSize: 10, color: COLORS.muted }}>mo</span>
                      </div>
                    )}
                    {recurrence && (
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                        {hasRecurrenceEnd ? (
                          <>
                            <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Until</span>
                            <Select options={monthOpts} value={String(recurrence.untilMonthIdx ?? 0)} aria-label="Recurrence end month"
                              onChange={e => changeAdjustment(adj.id, { recurrence: { everyMonths: recurrence.everyMonths, untilYear: recurrence.untilYear, untilMonthIdx: +e.target.value } })}
                              containerStyle={{ flex: 1, minWidth: 0 }} />
                            <Select options={yearOpts} value={String(recurrence.untilYear ?? planStartYear)} aria-label="Recurrence end year"
                              onChange={e => changeAdjustment(adj.id, { recurrence: { everyMonths: recurrence.everyMonths, untilYear: +e.target.value, untilMonthIdx: recurrence.untilMonthIdx } })}
                              containerStyle={{ flex: 1, minWidth: 0 }} />
                            <button type="button" onClick={toggleRecurrenceEnd} aria-label="Remove end date" style={iconBtn}>×</button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={toggleRecurrenceEnd}>+ end date</Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 10, lineHeight: 1.45 }}>
        The starting balance is transferred from liquid savings once, in the account's start month. Monthly contributions and lump sums come from the envelope after debts and loans.
      </p>
    </div>
  );
}
