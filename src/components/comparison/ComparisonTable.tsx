import { Fragment, useMemo } from 'react';
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
  tab:           'liquidity' | 'debt' | 'netWorth';
}

export function ComparisonTable({ plans, activePlanIds, clipYears, tab }: Props) {
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
        cells: activePlans.map(plan => {
          const match = (simulations[plan.id] ?? []).find(r => r.m === row.m);
          if (tab === 'liquidity') {
            return {
              planId:    plan.id,
              primary:   match?.liquidTotal ?? null,
              secondary: match?.liquidInflow ?? null,
            };
          }
          if (tab === 'debt') {
            const svc = match != null ? match.debtBurden + match.purchaseOutflow : null;
            return {
              planId:    plan.id,
              primary:   match?.debtOutstanding ?? null,
              secondary: svc,
            };
          }
          return {
            planId:    plan.id,
            primary:   match?.netWorth ?? null,
            secondary: match?.netWorthChange ?? null,
          };
        }),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlans.map(p => p.id + p.updated).join(','), simulations, clipYears, tab]);

  if (activePlans.length === 0) {
    return (
      <div style={{ color: COLORS.muted, fontSize: 13, padding: '20px 0' }}>
        No plans selected.
      </div>
    );
  }

  return (
    <div>
      <div className="tbl">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <th scope="col" style={{ ...thStyle, textAlign: 'left', color: COLORS.muted }}>Age</th>
              <th scope="col" style={{ ...thStyle, textAlign: 'left', color: COLORS.muted }}>Year</th>
              {activePlans.map(plan => (
                <Fragment key={plan.id}>
                  <th
                    scope="col"
                    title={
                      tab === 'liquidity' ? 'Cash savings (excludes invested balances)'
                        : tab === 'debt' ? 'Debts + loans owed'
                          : 'Net worth (savings + market value of purchases − liabilities)'
                    }
                    style={{ ...thStyle, color: plan.color }}
                  >
                    {plan.title || 'Untitled'}
                  </th>
                  <th
                    scope="col"
                    title={
                      tab === 'liquidity' ? 'Net monthly change to cash savings (after debts, loans, and buys to investments)'
                        : tab === 'debt' ? 'Debt + loan payments'
                          : 'Month-over-month change in net worth'
                    }
                    style={{ ...thStyle, color: `${plan.color}99` }}
                  >
                    {tab === 'liquidity' ? '/mo' : tab === 'debt' ? '/mo svc' : '/mo Δ'}
                  </th>
                </Fragment>
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
                {row.cells.map(c => (
                  <Fragment key={c.planId}>
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      color: c.primary !== null
                        ? (tab === 'debt' && c.primary > 0 ? COLORS.red
                          : tab === 'netWorth' && c.primary < 0 ? COLORS.red
                            : COLORS.text)
                        : COLORS.border,
                      fontWeight: 500,
                    }}>
                      {c.primary !== null ? money(c.primary) : '—'}
                    </td>
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      color: c.secondary !== null
                        ? (tab === 'netWorth'
                          ? (c.secondary > 0 ? COLORS.accent : c.secondary < 0 ? COLORS.red : COLORS.dim)
                          : COLORS.dim)
                        : COLORS.border,
                      fontSize: 11,
                    }}>
                      {c.secondary !== null
                        ? (tab === 'netWorth' && c.secondary > 0 ? `+${money(c.secondary)}` : money(c.secondary))
                        : '—'}
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
