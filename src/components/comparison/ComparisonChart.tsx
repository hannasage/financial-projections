import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useColors } from '../../stores/themeStore';
import { shortK, money, getReturnRate } from '../../lib/finance';
import { simulate } from '../../lib/simulate';
import { useLibraryStore } from '../../stores/libraryStore';
import { mergeIntoScenario } from '../../lib/resolveItems';
import type { Plan } from '../../lib/types';

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
}

function MultiTooltip({ active, label, payload }: TooltipProps) {
  const COLORS = useColors();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: '10px 14px',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, minWidth: 160,
    }}>
      <div style={{ color: COLORS.muted, marginBottom: 6 }}>{formatDecimalYr(label ?? 0)}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: COLORS.text, fontWeight: 500 }}>{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  plans:         Plan[];
  activePlanIds: Set<string>;
  clipYears?:    number | null;
  tab:           'liquidity' | 'debt' | 'netWorth';
}

export function ComparisonChart({ plans, activePlanIds, clipYears, tab }: Props) {
  const COLORS      = useColors();
  const library     = useLibraryStore();
  const activePlans = plans.filter(p => activePlanIds.has(p.id));
  const safeStartYear = Number.isFinite(Number(library.profile.startYear))
    ? Number(library.profile.startYear)
    : new Date().getFullYear();
  const safeStartMonthIdx = Number.isFinite(Number(library.profile.startMonthIdx))
    ? Math.max(0, Math.min(11, Number(library.profile.startMonthIdx)))
    : new Date().getMonth();

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

  const maxHorizon = Math.max(0, ...activePlans.map(p => mergeIntoScenario(p.scenario, library).horizonYears));
  const clipped    = clipYears != null ? Math.min(clipYears, maxHorizon) : maxHorizon;
  const startDecimalYr = safeStartYear + safeStartMonthIdx / 12;
  const minYr      = startDecimalYr - 1 / 12;
  const maxYr      = startDecimalYr + clipped;

  const chartData = useMemo(() => {
    if (activePlans.length === 0) return [];
    const refPlan = activePlans.reduce((a, b) =>
      (simulations[a.id]?.length ?? 0) >= (simulations[b.id]?.length ?? 0) ? a : b,
    );
    const maxM   = clipped * 12;
    const refSim = simulations[refPlan.id] ?? [];
    return refSim.filter(row => row.m <= maxM).map(row => {
      const decimalYr = startDecimalYr + row.m / 12;
      const point: Record<string, number | string> = { decimalYr };
      for (const plan of activePlans) {
        const sim   = simulations[plan.id] ?? [];
        const match = sim[row.m];
        point[plan.title || plan.id] = tab === 'liquidity'
          ? (match?.savings ?? 0)
          : tab === 'debt'
            ? (match?.debtOutstanding ?? 0)
            : (match?.netWorth ?? 0);
      }
      return point;
    });
  }, [activePlans, simulations, clipped, startDecimalYr, tab]);

  if (activePlans.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 13 }}>
        No plans selected — use the toggles above.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
        <defs>
          {activePlans.map(plan => (
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
        <Tooltip content={<MultiTooltip />} />
        {activePlans.map(plan => (
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
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
