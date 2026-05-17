import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears } from '../../lib/constants';
import type { Investment, InvestmentContributionAdjustment, InvestmentAdjustmentRecurrence } from '../../lib/types';

/** Preset recurrence periods (in months) surfaced in the picker. */
const RECURRENCE_PRESETS: ReadonlyArray<{ value: 'once' | number; label: string }> = [
  { value: 'once', label: 'One time' },
  { value: 1,      label: 'Every month' },
  { value: 3,      label: 'Every 3 months' },
  { value: 6,      label: 'Every 6 months' },
  { value: 12,     label: 'Every year' },
];

interface Props {
  i:          Investment;
  /** Calendar anchor for default start / year dropdowns (plan or profile start year). */
  planStartYear: number;
  planStartMonthIdx: number;
  horizonYears: number;
  onChange:   (patch: Partial<Investment>) => void;
  onRemove:   () => void;
}

export function InvestmentItem({
  i,
  onChange,
  onRemove,
  planStartYear,
  planStartMonthIdx,
  horizonYears,
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

  const startY = i.startYear ?? planStartYear;
  const startM = i.startMonthIdx ?? planStartMonthIdx;
  const yearOpts = buildPurchaseYears(planStartYear, horizonYears);
  const hasSale = i.sellYear != null && i.sellMonthIdx != null;
  const adjustments = i.adjustments ?? [];

  const upsertAdjustments = (next: InvestmentContributionAdjustment[]) => {
    onChange({ adjustments: next.length > 0 ? next : undefined });
  };
  const addAdjustment = () => {
    upsertAdjustments([
      ...adjustments,
      {
        id: crypto.randomUUID(),
        year: planStartYear + 1,
        monthIdx: planStartMonthIdx,
        monthlyContributionDelta: 0,
        lumpSum: 0,
      },
    ]);
  };
  const changeAdjustment = (id: string, patch: Partial<InvestmentContributionAdjustment>) => {
    upsertAdjustments(adjustments.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };
  const removeAdjustment = (id: string) => {
    upsertAdjustments(adjustments.filter(a => a.id !== id));
  };

  /** Replace the entire adjustment (used when migrating legacy fields or clearing recurrence). */
  const replaceAdjustment = (id: string, next: InvestmentContributionAdjustment) => {
    upsertAdjustments(adjustments.map(a => (a.id === id ? next : a)));
  };

  const cardStyle: React.CSSProperties = {
    background: COLORS.faint,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  };

  const cardInputStyle: React.CSSProperties = {
    ...S.field,
    background: 'transparent',
    border: 'none',
    padding: '2px 0',
    fontSize: 13,
    fontWeight: 600,
  };

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 8,
      border: `1px solid ${COLORS.accent}35`, padding: '14px', marginTop: 10,
    }}>
      {/* Name row */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <input
          value={i.label}
          placeholder="e.g. Brokerage, 401k…"
          aria-label="Investment name"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${i.label || 'investment'}`} style={iconBtn}>×</button>
      </div>

      {/* Stat cards: balance · return · monthly add */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 10 }}>
        <div style={cardStyle}>
          <label htmlFor={`ia-${i.id}`} style={S.label}>Balance</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ia-${i.id}`} type="number" value={i.initialAmount} min={0} step={500}
              onChange={e => onChange({ initialAmount: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }}
            />
          </div>
        </div>
        <div style={cardStyle}>
          <label htmlFor={`ir-${i.id}`} style={S.label}>Annual Return Rate</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <input
              id={`ir-${i.id}`} type="number" value={i.annualReturnPct} min={0} step={0.5}
              onChange={e => onChange({ annualReturnPct: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }}
            />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>% / yr</span>
          </div>
        </div>
        <div style={cardStyle}>
          <label htmlFor={`ic-${i.id}`} style={S.label}>Monthly add</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ic-${i.id}`} type="number" value={i.monthlyContribution} min={0} step={25}
              onChange={e => onChange({ monthlyContribution: Math.max(0, +e.target.value) })}
              style={{ ...cardInputStyle, flex: 1 }}
            />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>/mo</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Start date</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <select
            aria-label="Investment start month"
            value={startM}
            onChange={e => onChange({ startMonthIdx: +e.target.value })}
            style={{ ...S.field, minWidth: 88 }}
          >
            {MONTHS.map((mo, idx) => (
              <option key={mo} value={idx}>{mo}</option>
            ))}
          </select>
          <select
            aria-label="Investment start year"
            value={startY}
            onChange={e => onChange({ startYear: +e.target.value })}
            style={{ ...S.field, minWidth: 88 }}
          >
            {yearOpts.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ ...S.label, marginBottom: 6 }}>Sale (optional)</div>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
          Model cashing out this account on a future date. Leave as “hold” to keep it invested through the projection. The sale uses the full modeled balance unless you enter a specific price. Tax is applied only to the gain (sale proceeds minus cost basis — what you put in).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <select
            aria-label="Sale timing"
            value={hasSale ? 'sell' : 'hold'}
            onChange={e => {
              if (e.target.value === 'hold') {
                onChange({ sellYear: undefined, sellMonthIdx: undefined, salePrice: undefined, capitalGainsTaxPct: undefined });
              } else {
                onChange({
                  sellYear: planStartYear + 2,
                  sellMonthIdx: planStartMonthIdx,
                });
              }
            }}
            style={{ ...S.field, minWidth: 120 }}
          >
            <option value="hold">Hold (no sale)</option>
            <option value="sell">Sell on date…</option>
          </select>
          {hasSale && (
            <>
              <select
                aria-label="Sale month"
                value={i.sellMonthIdx ?? 0}
                onChange={e => onChange({ sellMonthIdx: +e.target.value })}
                style={{ ...S.field, minWidth: 88 }}
              >
                {MONTHS.map((mo, idx) => (
                  <option key={`s-${mo}`} value={idx}>{mo}</option>
                ))}
              </select>
              <select
                aria-label="Sale year"
                value={i.sellYear ?? planStartYear}
                onChange={e => onChange({ sellYear: +e.target.value })}
                style={{ ...S.field, minWidth: 88 }}
              >
                {yearOpts.map(y => (
                  <option key={`sy-${y}`} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
        {hasSale && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor={`isp-${i.id}`} style={S.label}>Sale price ($)</label>
              <input
                id={`isp-${i.id}`}
                type="number"
                min={0}
                step={500}
                placeholder="Modeled balance"
                value={i.salePrice ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') onChange({ salePrice: undefined });
                  else onChange({ salePrice: Math.max(0, +v) });
                }}
                style={{ ...S.field, width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label htmlFor={`icg-${i.id}`} style={S.label}>Cap. gains tax %</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  id={`icg-${i.id}`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={i.capitalGainsTaxPct ?? ''}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') onChange({ capitalGainsTaxPct: undefined });
                    else onChange({ capitalGainsTaxPct: Math.max(0, Math.min(100, +v)) });
                  }}
                  style={{ ...S.field, width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}55` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={S.label}>Contribution adjustments</div>
          <button
            type="button"
            onClick={addAdjustment}
            style={{
              padding: '5px 12px', fontSize: 10, letterSpacing: 1,
              borderRadius: 4, border: `1px solid ${COLORS.purple}`,
              background: `${COLORS.purple}18`, color: COLORS.purple,
              fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer', flexShrink: 0,
            }}
          >
            + Add Adjustment
          </button>
        </div>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
          Each adjustment can increase (+) or decrease (−) monthly contributions, drop a one-time lump sum, or both. Enable Repeats to apply it on a schedule — e.g. <em>+$50/mo every January</em> to model annual increases, or a yearly lump sum for a tax refund deposit.
        </p>
        {adjustments.length === 0 && (
          <div style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic' }}>No adjustments scheduled.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
        {adjustments.map(adj => {
          const isLegacy = adj.monthlyContribution != null && adj.monthlyContributionDelta == null;
          const delta = adj.monthlyContributionDelta ?? 0;
          const sign: '+' | '−' = delta < 0 || Object.is(delta, -0) ? '−' : '+';
          const magnitude = Math.abs(delta);
          const recurrence = adj.recurrence;
          const presetValue: 'once' | number = recurrence ? recurrence.everyMonths : 'once';
          const isPreset = recurrence == null || RECURRENCE_PRESETS.some(p => p.value === presetValue);
          const recurrenceSelectValue = recurrence == null
            ? 'once'
            : (isPreset ? String(recurrence.everyMonths) : 'custom');
          const hasRecurrenceEnd = recurrence?.untilYear != null && recurrence?.untilMonthIdx != null;

          /** Update only the sign of the delta, keeping the magnitude the user typed. */
          const setSign = (nextSign: '+' | '−') => {
            const signed = nextSign === '−' ? -magnitude : magnitude;
            changeAdjustment(adj.id, { monthlyContributionDelta: signed });
          };
          /** Update only the magnitude of the delta, keeping the current sign. */
          const setMagnitude = (nextMag: number) => {
            const clamped = Math.max(0, nextMag);
            const signed = sign === '−' ? -clamped : clamped;
            changeAdjustment(adj.id, { monthlyContributionDelta: signed });
          };
          /** Apply a preset / custom recurrence; "once" clears recurrence; "custom" preserves prior step. */
          const setRecurrenceValue = (value: string) => {
            if (value === 'once') {
              const next: InvestmentContributionAdjustment = { ...adj };
              delete next.recurrence;
              replaceAdjustment(adj.id, next);
              return;
            }
            if (value === 'custom') {
              const everyMonths = recurrence?.everyMonths ?? 2;
              changeAdjustment(adj.id, {
                recurrence: { ...(recurrence ?? {}), everyMonths },
              });
              return;
            }
            const everyMonths = Math.max(1, Math.floor(Number(value)));
            changeAdjustment(adj.id, {
              recurrence: { ...(recurrence ?? {}), everyMonths },
            });
          };
          const setRecurrenceCustomEvery = (n: number) => {
            const everyMonths = Math.max(1, Math.floor(n));
            const next: InvestmentAdjustmentRecurrence = {
              ...(recurrence ?? { everyMonths }),
              everyMonths,
            };
            changeAdjustment(adj.id, { recurrence: next });
          };
          const toggleRecurrenceEnd = () => {
            if (!recurrence) return;
            if (hasRecurrenceEnd) {
              const next: InvestmentContributionAdjustment = {
                ...adj,
                recurrence: { everyMonths: recurrence.everyMonths },
              };
              replaceAdjustment(adj.id, next);
            } else {
              changeAdjustment(adj.id, {
                recurrence: {
                  everyMonths: recurrence.everyMonths,
                  untilYear: planStartYear + Math.max(1, horizonYears),
                  untilMonthIdx: planStartMonthIdx,
                },
              });
            }
          };
          /** One-click migration of legacy "set to $X" adjustment into the new +/- delta editor. */
          const convertLegacyToDelta = () => {
            const next: InvestmentContributionAdjustment = { ...adj };
            delete next.monthlyContribution;
            next.monthlyContributionDelta = 0;
            replaceAdjustment(adj.id, next);
          };

          /** Shared cell wrapper: label on top, controls below. */
          const cellStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 };

          return (
            <div
              key={adj.id}
              style={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: 6,
                padding: '10px 12px',
                background: COLORS.faint,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ ...S.label, fontSize: 9 }}>Contribution adjustment {adjustments.indexOf(adj) + 1}</span>
                <button type="button" onClick={() => removeAdjustment(adj.id)}
                  style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>
                  ×
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}>
                {/* Cell 1 — Date (month + year inline) */}
                <div style={cellStyle}>
                  <span style={S.label}>Date</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      id={`adjm-${adj.id}`}
                      aria-label="Adjustment month"
                      value={adj.monthIdx}
                      onChange={e => changeAdjustment(adj.id, { monthIdx: +e.target.value })}
                      style={{ ...S.field, flex: 1, minWidth: 0 }}
                    >
                      {MONTHS.map((mo, idx) => (
                        <option key={`${adj.id}-m-${mo}`} value={idx}>{mo}</option>
                      ))}
                    </select>
                    <select
                      id={`adjy-${adj.id}`}
                      aria-label="Adjustment year"
                      value={adj.year}
                      onChange={e => changeAdjustment(adj.id, { year: +e.target.value })}
                      style={{ ...S.field, flex: 1, minWidth: 0 }}
                    >
                      {yearOpts.map(y => (
                        <option key={`${adj.id}-y-${y}`} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cell 2 — Monthly contribution change (delta) or legacy migration prompt */}
                <div style={cellStyle}>
                  <span style={S.label}>Monthly Δ</span>
                  {isLegacy ? (
                    <div style={{
                      display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                      padding: '5px 8px',
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: 4,
                      background: COLORS.surface,
                      minHeight: 28,
                    }}>
                      <span style={{ fontSize: 11, color: COLORS.muted, flex: 1, minWidth: 0 }}>
                        Set to <strong style={{ color: COLORS.text }}>${adj.monthlyContribution}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={convertLegacyToDelta}
                        style={{
                          background: 'none', border: `1px solid ${COLORS.border}`,
                          color: COLORS.accent, fontSize: 10, padding: '3px 7px',
                          borderRadius: 4, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >to ±</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div role="radiogroup" aria-label="Direction" style={{ display: 'inline-flex', border: `1px solid ${COLORS.border}`, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                        {(['+', '−'] as const).map(s => {
                          const active = s === sign;
                          return (
                            <button
                              key={s}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              aria-label={s === '+' ? 'Increase contribution' : 'Decrease contribution'}
                              onClick={() => setSign(s)}
                              style={{
                                padding: '5px 10px', fontSize: 12, fontWeight: 600,
                                background: active ? `${COLORS.accent}22` : 'transparent',
                                color: active ? COLORS.accent : COLORS.muted,
                                border: 'none', cursor: 'pointer',
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}
                            >{s}</button>
                          );
                        })}
                      </div>
                      <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                      <input
                        type="number"
                        min={0}
                        step={25}
                        value={magnitude || ''}
                        placeholder="0"
                        aria-label={`Amount to ${sign === '+' ? 'add to' : 'subtract from'} monthly contribution`}
                        onChange={e => setMagnitude(+e.target.value)}
                        style={{ ...S.field, flex: 1, minWidth: 0 }}
                      />
                      <span aria-hidden="true" style={{ fontSize: 10, color: COLORS.muted }}>/mo</span>
                    </div>
                  )}
                </div>

                {/* Cell 3 — One-time lump sum */}
                <div style={cellStyle}>
                  <label style={S.label} htmlFor={`adjl-${adj.id}`}>Lump sum</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                    <input
                      id={`adjl-${adj.id}`}
                      type="number"
                      min={0}
                      step={100}
                      value={adj.lumpSum ?? ''}
                      placeholder="0"
                      onChange={e => {
                        const v = e.target.value;
                        changeAdjustment(adj.id, { lumpSum: v === '' ? undefined : Math.max(0, +v) });
                      }}
                      style={{ ...S.field, flex: 1, minWidth: 0 }}
                    />
                  </div>
                </div>

                {/* Cell 4 — Repeats: ↻ icon toggles recurrence; dropdown visible when active */}
                <div style={cellStyle}>
                  <span style={S.label}>Repeats</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => recurrence ? setRecurrenceValue('once') : setRecurrenceValue('12')}
                      aria-pressed={!!recurrence}
                      title={recurrence ? 'Disable recurrence' : 'Enable recurrence'}
                      style={{
                        padding: '5px 8px', borderRadius: 4, fontSize: 14, lineHeight: 1,
                        border: `1px solid ${recurrence ? COLORS.accent : COLORS.border}`,
                        background: recurrence ? `${COLORS.accent}20` : 'transparent',
                        color: recurrence ? COLORS.accent : COLORS.muted,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >↻</button>
                    {recurrence && (
                      <select
                        aria-label="Recurrence period"
                        value={recurrenceSelectValue}
                        onChange={e => setRecurrenceValue(e.target.value)}
                        style={{ ...S.field, flex: 1, minWidth: 0 }}
                      >
                        {RECURRENCE_PRESETS.filter(p => p.value !== 'once').map(p => (
                          <option key={`rec-${p.value}`} value={String(p.value)}>{p.label}</option>
                        ))}
                        {!isPreset && recurrence != null && (
                          <option value="custom">Every {recurrence.everyMonths} months</option>
                        )}
                        <option value="custom">Custom…</option>
                      </select>
                    )}
                  </div>
                  {recurrenceSelectValue === 'custom' && recurrence && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="number"
                        min={1}
                        max={240}
                        step={1}
                        value={recurrence?.everyMonths ?? 1}
                        aria-label="Custom recurrence interval in months"
                        onChange={e => setRecurrenceCustomEvery(+e.target.value)}
                        style={{ ...S.field, width: 50 }}
                      />
                      <span style={{ fontSize: 10, color: COLORS.muted }}>mo</span>
                    </div>
                  )}
                  {recurrence && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                      {hasRecurrenceEnd ? (
                        <>
                          <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 1, textTransform: 'uppercase' }}>Until</span>
                          <select
                            aria-label="Recurrence end month"
                            value={recurrence.untilMonthIdx ?? 0}
                            onChange={e => changeAdjustment(adj.id, {
                              recurrence: {
                                everyMonths: recurrence.everyMonths,
                                untilYear: recurrence.untilYear,
                                untilMonthIdx: +e.target.value,
                              },
                            })}
                            style={{ ...S.field, flex: 1, minWidth: 0 }}
                          >
                            {MONTHS.map((mo, idx) => (
                              <option key={`recm-${adj.id}-${mo}`} value={idx}>{mo}</option>
                            ))}
                          </select>
                          <select
                            aria-label="Recurrence end year"
                            value={recurrence.untilYear ?? planStartYear}
                            onChange={e => changeAdjustment(adj.id, {
                              recurrence: {
                                everyMonths: recurrence.everyMonths,
                                untilYear: +e.target.value,
                                untilMonthIdx: recurrence.untilMonthIdx,
                              },
                            })}
                            style={{ ...S.field, flex: 1, minWidth: 0 }}
                          >
                            {yearOpts.map(y => (
                              <option key={`recy-${adj.id}-${y}`} value={y}>{y}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={toggleRecurrenceEnd}
                            aria-label="Remove end date"
                            style={{
                              background: 'none', border: 'none', color: COLORS.muted,
                              cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1,
                            }}
                          >×</button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={toggleRecurrenceEnd}
                          style={{
                            background: 'none', border: 'none',
                            color: COLORS.accent, fontSize: 10, padding: 0,
                            cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase',
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >+ end date</button>
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
        The starting balance is transferred from liquid savings once, in the account's start month. Monthly contributions and lump sums come from the envelope after debts and loans. This balance counts toward net worth but is not liquid — it won't appear as spendable cash until the account is sold.
      </p>
    </div>
  );
}
