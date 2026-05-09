import { COLORS } from '../../lib/constants';
import { money } from '../../lib/finance';
import type { SimRow } from '../../lib/types';

interface Props {
  active?:  boolean;
  payload?: Array<{ payload: SimRow }>;
}

export function ChartTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: '10px 14px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, minWidth: 175,
    }}>
      <div style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 5 }}>
        Age {d.ageFloor} · {d.yr}
      </div>
      <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 5 }}>
        {money(d.savings)}
      </div>
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
        <div style={{ color: COLORS.muted }}>envelope: {money(d.effectiveEnv)}/mo</div>
        {d.debtBurden      > 0 && <div style={{ color: COLORS.red    }}>− debt: {money(d.debtBurden)}/mo</div>}
        {d.purchaseOutflow > 0 && <div style={{ color: COLORS.orange }}>− loans: {money(d.purchaseOutflow)}/mo</div>}
        {d.raiseBonus      > 0 && <div style={{ color: COLORS.accent }}>+ raise: {money(d.raiseBonus)}/mo</div>}
        {d.rentRelief      > 0 && <div style={{ color: COLORS.blue   }}>+ rent freed: {money(d.rentRelief)}/mo</div>}
        <div style={{ color: COLORS.dim }}>→ saving {money(d.savingsInflow)}/mo</div>
      </div>
    </div>
  );
}
