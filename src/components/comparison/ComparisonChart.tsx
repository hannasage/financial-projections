import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useColors, usePlanColors } from '../../stores/themeStore';
import { shortK, money, getReturnRate } from '../../lib/finance';
import { simulate } from '../../lib/simulate';
import { useLibraryStore } from '../../stores/libraryStore';
import { mergeIntoScenario, resolveMarkers } from '../../lib/resolveItems';
import { renderMarkerOverlay } from '../plan/MarkerOverlay';
import { getActiveMarkersAt } from '../../lib/markerColors';
import type { Marker, Plan } from '../../lib/types';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDecimalYr(decimalYr: number): string {
  const yr  = Math.floor(decimalYr);
  const mo  = Math.round((decimalYr - yr) * 12);
  return mo === 0 ? String(yr) : `${MONTH_NAMES[mo % 12]} ${yr}`;
}

interface TooltipProps {
  active?:  boolean;
  label?:   number;
  payload?: Array<{ name: string; value: number; color: string }>;
  /** Plans keyed by series name (dataKey === plan.title || plan.id). */
  plansByName?: Record<string, Plan>;
  /** Resolved markers (library + plan custom − excluded) keyed by plan id. */
  markersByPlanId?: Record<string, Marker[]>;
}

function MultiTooltip({ active, label, payload, plansByName, markersByPlanId }: TooltipProps) {
  const COLORS = useColors();
  if (!active || !payload?.length) return null;
  const hoverYr = label ?? 0;
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: '10px 14px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, minWidth: 180,
    }}>
      <div style={{ color: COLORS.muted, marginBottom: 6 }}>{formatDecimalYr(hoverYr)}</div>
      {payload.map(p => {
        const plan = plansByName?.[p.name];
        const planMarkers = plan ? (markersByPlanId?.[plan.id] ?? []) : [];
        const activeMarkers = getActiveMarkersAt(planMarkers, hoverYr);
        return (
          <div key={p.name} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
              <span style={{ color: p.color }}>{p.name}</span>
              <span style={{ color: COLORS.text, fontWeight: 500 }}>{money(p.value)}</span>
            </div>
            {activeMarkers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {activeMarkers.map(m => (
                  <span
                    key={m.id}
                    title={m.title || 'Untitled'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '1px 7px', borderRadius: 999, fontSize: 9,
                      border: `1px solid ${p.color}55`,
                      background: `${p.color}14`,
                      color: COLORS.text,
                      maxWidth: 160,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} aria-hidden="true" />
                    {m.title || 'Untitled'}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  plans:         Plan[];
  activePlanIds: Set<string>;
  clipYears?:    number | null;
  tab:           'liquidity' | 'debt' | 'netWorth' | 'investments';
}

export function ComparisonChart({ plans, activePlanIds, clipYears, tab }: Props) {
  const COLORS      = useColors();
  const planPalette = usePlanColors();
  const library     = useLibraryStore();
  const activePlans = plans.filter(p => activePlanIds.has(p.id));
  const safeStartYear = Number.isFinite(Number(library.profile.startYear))
    ? Number(library.profile.startYear)
    : new Date().getFullYear();
  const safeStartMonthIdx = Number.isFinite(Number(library.profile.startMonthIdx))
    ? Math.max(0, Math.min(11, Number(library.profile.startMonthIdx)))
    : new Date().getMonth();

  // Stable fingerprints for useMemo deps. Hoisted out so each dep array stays a list of
  // simple expressions, which keeps the `react-hooks/use-memo` rule happy and the cache
  // logic readable.
  const activePlansUpdatedSig = activePlans.map(p => p.id + p.updated).join(',');
  const activePlansTitleSig   = activePlans.map(p => p.id + p.title).join(',');

  const simulations = useMemo(() => {
    const map: Record<string, ReturnType<typeof simulate>> = {};
    for (const plan of activePlans) {
      const resolved   = mergeIntoScenario(plan.scenario, library);
      const returnRate = getReturnRate(resolved);
      map[plan.id] = simulate(resolved, returnRate);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlansUpdatedSig, library]);

  const maxHorizon = Math.max(0, ...activePlans.map(p => mergeIntoScenario(p.scenario, library).horizonYears));
  const clipped    = clipYears != null ? Math.min(clipYears, maxHorizon) : maxHorizon;
  const startDecimalYr  = safeStartYear + safeStartMonthIdx / 12;
  const now             = new Date();
  const todayDecimalYr  = now.getFullYear() + now.getMonth() / 12;
  const viewStartDecimalYr = Math.max(startDecimalYr, todayDecimalYr);
  const minYr = viewStartDecimalYr - 1 / 12;
  const maxYr = clipYears != null
    ? viewStartDecimalYr + clipped
    : startDecimalYr + maxHorizon;

  const lonePlanInvestments = useMemo(() => {
    if (tab !== 'investments' || activePlans.length !== 1) return [];
    const r = mergeIntoScenario(activePlans[0].scenario, library);
    return r.investments ?? [];
  }, [tab, activePlans, library]);

  const investmentStackMode = tab === 'investments' && activePlans.length === 1 && lonePlanInvestments.length > 0;

  /** Map each Recharts series name back to its plan so the tooltip can look up markers. */
  const plansByName: Record<string, Plan> = useMemo(() => {
    const map: Record<string, Plan> = {};
    for (const plan of activePlans) map[plan.title || plan.id] = plan;
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlansTitleSig]);

  /** Resolved markers (library + plan-custom − excluded) per plan, computed once per render. */
  const markersByPlanId: Record<string, Marker[]> = useMemo(() => {
    const map: Record<string, Marker[]> = {};
    for (const plan of activePlans) {
      map[plan.id] = resolveMarkers(plan, library.markers);
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlansUpdatedSig, library.markers]);

  const chartData = useMemo(() => {
    if (activePlans.length === 0) return [];
    const refPlan = activePlans.reduce((a, b) =>
      (simulations[a.id]?.length ?? 0) >= (simulations[b.id]?.length ?? 0) ? a : b,
    );
    const maxM   = clipped * 12;
    const refSim = simulations[refPlan.id] ?? [];

    if (investmentStackMode) {
      const plan = activePlans[0];
      const sim  = simulations[plan.id] ?? [];
      return refSim.filter(row => row.m <= maxM).map(row => {
        const decimalYr = startDecimalYr + row.m / 12;
        const point: Record<string, number | string> = { decimalYr };
        const match = sim[row.m];
        for (const inv of lonePlanInvestments) {
          point[`inv_${inv.id}`] = match?.investmentBalancesById[inv.id] ?? 0;
        }
        return point;
      });
    }

    return refSim.filter(row => row.m <= maxM).map(row => {
      const decimalYr = startDecimalYr + row.m / 12;
      const point: Record<string, number | string> = { decimalYr };
      for (const plan of activePlans) {
        const sim   = simulations[plan.id] ?? [];
        const match = sim[row.m];
        point[plan.title || plan.id] = tab === 'liquidity'
          ? (match?.liquidTotal ?? 0)
          : tab === 'debt'
            ? (match?.debtOutstanding ?? 0)
            : tab === 'investments'
              ? (match?.investments ?? 0)
              : (match?.netWorth ?? 0);
      }
      return point;
    });
  }, [activePlans, simulations, clipped, startDecimalYr, tab, investmentStackMode, lonePlanInvestments]);

  if (activePlans.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 13 }}>
        No plans selected — use the toggles above.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
        <defs>
          {investmentStackMode
            ? lonePlanInvestments.map((inv, idx) => {
              const c = planPalette[idx % planPalette.length].value;
              return (
                <linearGradient key={inv.id} id={`cmp-inv-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.26} />
                  <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              );
            })
            : activePlans.map(plan => (
              <linearGradient key={plan.id} id={`grad-${plan.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={plan.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={plan.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
        </defs>
        <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
        <XAxis
          dataKey="decimalYr" type="number"
          domain={[minYr, maxYr]}
          tickCount={Math.min(maxHorizon + 1, 12)}
          tickFormatter={v => Number.isInteger(Math.round(v * 10) / 10) || v % 1 < 0.05 ? String(Math.round(v)) : ''}
          tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={shortK}
          tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
          axisLine={false} tickLine={false} width={44}
        />
        <Tooltip content={<MultiTooltip plansByName={plansByName} markersByPlanId={markersByPlanId} />} />
        {!investmentStackMode && activePlans.flatMap(plan =>
          renderMarkerOverlay({
            markers: markersByPlanId[plan.id] ?? [],
            minDecimalYr: minYr,
            maxDecimalYr: maxYr,
            colors: COLORS,
            overrideColor: plan.color,
            keyPrefix: `cmp-mk-${plan.id}`,
            style: 'lines',
          }),
        )}
        {investmentStackMode ? (
          <>
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconType="circle" />
            {lonePlanInvestments.map((inv, idx) => {
              const c = planPalette[idx % planPalette.length].value;
              return (
                <Area
                  key={inv.id}
                  type="monotone"
                  stackId="inv"
                  dataKey={`inv_${inv.id}`}
                  name={inv.label || `Account ${idx + 1}`}
                  stroke={c}
                  strokeWidth={1.5}
                  fill={`url(#cmp-inv-${inv.id})`}
                  dot={false}
                  activeDot={{ r: 4, fill: c, strokeWidth: 0 }}
                />
              );
            })}
          </>
        ) : (
          activePlans.map(plan => (
            <Area
              key={plan.id}
              type="monotone"
              dataKey={plan.title || plan.id}
              stroke={plan.color}
              strokeWidth={2}
              fill={`url(#grad-${plan.id})`}
              dot={false}
              activeDot={{ r: 4, fill: plan.color, strokeWidth: 0 }}
            />
          ))
        )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
