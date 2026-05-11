import { useColors } from '../../stores/themeStore';
import { money } from '../../lib/finance';
import { MONTHS } from '../../lib/constants';
import { getActiveMarkersAt, resolveMarkerColor, markerDecimalYr } from '../../lib/markerColors';
import type { Marker, SimRow } from '../../lib/types';

interface Props {
  active?:  boolean;
  payload?: Array<{ payload: SimRow }>;
  variant?: 'savings' | 'debt' | 'netWorth';
  /** Plan markers to surface as "active phase" context. */
  markers?: Marker[];
}

function formatMarkerWhen(m: Marker): string {
  const start = `${MONTHS[m.startMonthIdx]} ${m.startYear}`;
  if (m.endYear != null && m.endMonthIdx != null) {
    return `${start} → ${MONTHS[m.endMonthIdx]} ${m.endYear}`;
  }
  return `${start} →`;
}

interface ActivePhasesSectionProps {
  markers: Marker[];
  borderColor: string;
  resolveColor: (m: Marker) => string;
  mutedColor: string;
}

function ActivePhasesSection({ markers, borderColor, resolveColor, mutedColor }: ActivePhasesSectionProps) {
  if (markers.length === 0) return null;
  return (
    <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 6, marginTop: 6 }}>
      <div style={{ color: mutedColor, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>
        ACTIVE PHASE{markers.length === 1 ? '' : 'S'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {markers.map(m => {
          const c = resolveColor(m);
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.3 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ color: c, fontWeight: 600 }}>{m.title || 'Untitled'}</span>
              <span style={{ color: mutedColor, fontSize: 9 }}>{formatMarkerWhen(m)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, variant = 'savings', markers }: Props) {
  const COLORS = useColors();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const mo = d.calendarMonthIdx ?? (((d.m % 12) + 12) % 12);
  const hoverDecimalYr = markerDecimalYr(d.yr, mo);
  const activeMarkers = getActiveMarkersAt(markers, hoverDecimalYr);
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: '10px 14px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, minWidth: 175,
    }}>
      <div style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 5 }}>
        Age {d.ageFloor} · {MONTHS[mo]} {d.yr}
      </div>
      {variant === 'debt' ? (
        <>
          <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 4 }}>
            {money(d.debtOutstanding)}
          </div>
          <div style={{ color: COLORS.muted, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>
            EST. DEBTS + LOAN BALANCES
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
            {d.debtBurden > 0 && (
              <div style={{ color: COLORS.red }}>payments: {money(d.debtBurden)}/mo</div>
            )}
          </div>
        </>
      ) : variant === 'netWorth' ? (
        <>
          <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 4 }}>
            {money(d.netWorth)}
          </div>
          <div style={{ color: COLORS.muted, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>
            NET WORTH · SAVINGS + ASSET VALUES − LIABILITIES
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
            <div style={{ color: d.netWorthChange >= 0 ? COLORS.accent : COLORS.red }}>
              Δ this month: {d.netWorthChange >= 0 ? '+' : ''}{money(d.netWorthChange)}
            </div>
            <div style={{ color: COLORS.muted }}>cash: {money(d.savings)} · invested: {money(d.investments)}</div>
            <div style={{ color: COLORS.muted }}>owed: {money(d.debtOutstanding)}</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 5 }}>
            {money(d.liquidTotal)}
          </div>
          <div style={{ color: COLORS.muted, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>
            LIQUID CASH (SAVINGS)
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
            {d.investments > 0 && <div style={{ color: COLORS.accent }}>invested (not liquid): {money(d.investments)}</div>}
            <div style={{ color: COLORS.muted }}>net budget: {money(d.effectiveEnv)}/mo</div>
            {d.monthlyAllowance > 0 && (
              <div style={{ color: COLORS.muted }}>− allowance: {money(d.monthlyAllowance)}/mo</div>
            )}
            {d.recurringTotal > 0 && (
              <div style={{ color: COLORS.muted }}>− recurring: {money(d.recurringTotal)}/mo</div>
            )}
            {d.debtBurden      > 0 && <div style={{ color: COLORS.red    }}>− debt: {money(d.debtBurden)}/mo</div>}
            {d.purchaseOutflow > 0 && <div style={{ color: COLORS.orange }}>− loans: {money(d.purchaseOutflow)}/mo</div>}
            {d.investmentContributions > 0 && (
              <div style={{ color: COLORS.accent }}>− to invest: {money(d.investmentContributions)}/mo</div>
            )}
            {d.raiseBonus      > 0 && <div style={{ color: COLORS.accent }}>+ raise: {money(d.raiseBonus)}/mo</div>}
            {d.rentRelief      > 0 && <div style={{ color: COLORS.blue   }}>+ rent freed: {money(d.rentRelief)}/mo</div>}
            <div style={{ color: COLORS.dim }}>Δ cash this month: {money(d.liquidInflow)}/mo</div>
          </div>
        </>
      )}
      <ActivePhasesSection
        markers={activeMarkers}
        borderColor={COLORS.border}
        resolveColor={m => resolveMarkerColor(m.color, COLORS)}
        mutedColor={COLORS.muted}
      />
    </div>
  );
}
