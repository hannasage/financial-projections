import { useMemo } from 'react';
import { useColors } from '../../stores/themeStore';
import { money, getReturnRate } from '../../lib/finance';
import { simulate } from '../../lib/simulate';
import { useLibraryStore } from '../../stores/libraryStore';
import { mergeIntoScenario } from '../../lib/resolveItems';
import type { Plan } from '../../lib/types';

interface Props {
  plans:         Plan[];
  activePlanIds: Set<string>;
  clipYears?:    number | null;
}

export function ComparisonTable({ plans, activePlanIds, clipYears }: Props) {
  const COLORS      = useColors();
  const library     = useLibraryStore();
  const activePlans = plans.filter(p => activePlanIds.has(p.id));

  const thStyle = {
    padding: '6px 10px 8px', textAlign: 'right' as const,
    fontWeight: 500, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
  };

  const simulations = useMemo(() => {
    const map: Record<string, ReturnType<typeof simulate>> = {};
    for (const plan of activePlans) {
      const resolved   = mergeIntoScenario(plan.scenario, library);
      const returnRate = getReturnRate(resolved);
      map[plan.id] = simulate(resolved, returnRate);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlans.map(p => p.id + p.updated).join(','), library]);

  const rows = useMemo(() => {
    if (activePlans.length === 0) return [];
    const refPlan = activePlans.reduce((a, b) =>
      (simulations[a.id]?.length ?? 0) >= (simulations[b.id]?.length ?? 0) ? a : b,
    );
    const maxM    = clipYears != null ? clipYears * 12 : Infinity;
    const refSim  = simulations[refPlan.id] ?? [];
    return refSim
      .filter(r => r.m % 12 === 0 && r.m <= maxM)
      .map(row => ({
        ageFloor: row.ageFloor,
        yr:       row.yr,
        balances: activePlans.map(plan => {
          const match = (simulations[plan.id] ?? []).find(r => r.m === row.m);
          return {
            id:      plan.id,
            color:   plan.color,
            title:   plan.title || plan.id,
            savings: match?.savings      ?? null,
            monthly: match?.savingsInflow ?? null,
          };
        }),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlans.map(p => p.id + p.updated).join(','), simulations, clipYears]);

  if (activePlans.length === 0) {
    return (
      <div style={{ color: COLORS.muted, fontSize: 13, padding: '20px 0' }}>
        No plans selected.
      </div>
    );
  }

  return (
    <div className="tbl">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <th scope="col" style={{ ...thStyle, textAlign: 'left', color: COLORS.muted }}>Age</th>
            <th scope="col" style={{ ...thStyle, textAlign: 'left', color: COLORS.muted }}>Year</th>
            {activePlans.map(plan => (
              <>
                <th key={`${plan.id}-bal`} scope="col" style={{ ...thStyle, color: plan.color }}>
                  {plan.title || 'Untitled'}
                </th>
                <th key={`${plan.id}-mo`} scope="col" style={{ ...thStyle, color: `${plan.color}99` }}>
                  /mo
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.yr}-${row.ageFloor}`} style={{
              borderBottom: `1px solid ${COLORS.border}18`,
              background: i % 2 === 0 ? `${COLORS.surface}80` : 'transparent',
            }}>
              <td style={{ padding: '8px 10px', color: COLORS.accent, fontWeight: 500 }}>{row.ageFloor}</td>
              <td style={{ padding: '8px 10px', color: COLORS.muted }}>{row.yr}</td>
              {row.balances.map(b => (
                <>
                  <td key={`${b.id}-bal`} style={{ padding: '8px 10px', textAlign: 'right', color: b.savings !== null ? COLORS.text : COLORS.border, fontWeight: 500 }}>
                    {b.savings !== null ? money(b.savings) : '—'}
                  </td>
                  <td key={`${b.id}-mo`} style={{ padding: '8px 10px', textAlign: 'right', color: b.monthly !== null ? COLORS.dim : COLORS.border, fontSize: 11 }}>
                    {b.monthly !== null ? money(b.monthly) : '—'}
                  </td>
                </>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
