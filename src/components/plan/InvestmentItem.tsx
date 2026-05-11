import { useColors } from '../../stores/themeStore';
import { MONTHS, buildPurchaseYears } from '../../lib/constants';
import type { Investment, InvestmentContributionAdjustment } from '../../lib/types';

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
        monthlyContribution: i.monthlyContribution,
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

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${COLORS.accent}35`, padding: '14px', marginTop: 10,
    }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ia-${i.id}`} style={S.label}>Starting balance</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ia-${i.id}`} type="number" value={i.initialAmount} min={0} step={500}
              onChange={e => onChange({ initialAmount: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ir-${i.id}`} style={S.label}>Avg. return</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id={`ir-${i.id}`} type="number" value={i.annualReturnPct} min={0} step={0.5}
              onChange={e => onChange({ annualReturnPct: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>% APY</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label htmlFor={`ic-${i.id}`} style={S.label}>Monthly add</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`ic-${i.id}`} type="number" value={i.monthlyContribution} min={0} step={25}
              onChange={e => onChange({ monthlyContribution: Math.max(0, +e.target.value) })}
              style={{ ...S.field, width: '100%' }}
            />
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
          Model selling for liquidity. Leave as “hold” to keep invested. Sale uses full balance that month (growth + buys) unless you set a price. Tax applies only to capital gain (proceeds minus cost basis: initial + contributions).
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
              ...S.field,
              padding: '4px 8px',
              fontSize: 10,
              color: COLORS.muted,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
        <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
          Use adjustments to increase/decrease monthly buys from a date onward, and/or drop one-time lump sums.
        </p>
        {adjustments.length === 0 && (
          <div style={{ fontSize: 10, color: COLORS.muted, fontStyle: 'italic' }}>No adjustments scheduled.</div>
        )}
        {adjustments.map(adj => (
          <div
            key={adj.id}
            style={{
              marginTop: 8,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              padding: 10,
              background: COLORS.faint,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={S.label} htmlFor={`adjm-${adj.id}`}>Month</label>
                <select
                  id={`adjm-${adj.id}`}
                  value={adj.monthIdx}
                  onChange={e => changeAdjustment(adj.id, { monthIdx: +e.target.value })}
                  style={{ ...S.field, width: '100%' }}
                >
                  {MONTHS.map((mo, idx) => (
                    <option key={`${adj.id}-m-${mo}`} value={idx}>{mo}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={S.label} htmlFor={`adjy-${adj.id}`}>Year</label>
                <select
                  id={`adjy-${adj.id}`}
                  value={adj.year}
                  onChange={e => changeAdjustment(adj.id, { year: +e.target.value })}
                  style={{ ...S.field, width: '100%' }}
                >
                  {yearOpts.map(y => (
                    <option key={`${adj.id}-y-${y}`} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={S.label} htmlFor={`adjc-${adj.id}`}>Monthly add ($)</label>
                <input
                  id={`adjc-${adj.id}`}
                  type="number"
                  min={0}
                  step={25}
                  value={adj.monthlyContribution ?? ''}
                  placeholder="keep prior"
                  onChange={e => {
                    const v = e.target.value;
                    changeAdjustment(adj.id, { monthlyContribution: v === '' ? undefined : Math.max(0, +v) });
                  }}
                  style={{ ...S.field, width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={S.label} htmlFor={`adjl-${adj.id}`}>Lump sum ($)</label>
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
                  style={{ ...S.field, width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => removeAdjustment(adj.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.muted,
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                }}
              >
                Remove adjustment
              </button>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 10, lineHeight: 1.45 }}>
        Starting balance is funded from liquid savings once, in the start month (same as moving cash into the account). Monthly adds and scheduled lump sums come from the envelope path after debts and purchase loans. Invested balances count toward net worth, not liquidity until sold (sale proceeds go to cash).
      </p>
    </div>
  );
}
