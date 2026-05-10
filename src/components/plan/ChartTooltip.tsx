import { useColors } from '../../stores/themeStore';
import { money } from '../../lib/finance';
import { MONTHS } from '../../lib/constants';
import type { SimRow } from '../../lib/types';

interface Props {
  active?:  boolean;
  payload?: Array<{ payload: SimRow }>;
  variant?: 'savings' | 'debt';
}

export function ChartTooltip({ active, payload, variant = 'savings' }: Props) {
  const COLORS = useColors();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const mo = d.calendarMonthIdx ?? (((d.m % 12) + 12) % 12);
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
      ) : (
        <>
          <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 5 }}>
            {money(d.savings)}
          </div>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
            <div style={{ color: COLORS.muted }}>net budget: {money(d.effectiveEnv)}/mo</div>
            {d.monthlyAllowance > 0 && (
              <div style={{ color: COLORS.muted }}>− allowance: {money(d.monthlyAllowance)}/mo</div>
            )}
            {d.debtBurden      > 0 && <div style={{ color: COLORS.red    }}>− debt: {money(d.debtBurden)}/mo</div>}
            {d.purchaseOutflow > 0 && <div style={{ color: COLORS.orange }}>− loans: {money(d.purchaseOutflow)}/mo</div>}
            {d.raiseBonus      > 0 && <div style={{ color: COLORS.accent }}>+ raise: {money(d.raiseBonus)}/mo</div>}
            {d.rentRelief      > 0 && <div style={{ color: COLORS.blue   }}>+ rent freed: {money(d.rentRelief)}/mo</div>}
            <div style={{ color: COLORS.dim }}>→ saving {money(d.savingsInflow)}/mo</div>
          </div>
        </>
      )}
    </div>
  );
}
