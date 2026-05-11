import { ReferenceArea, ReferenceLine } from 'recharts';
import type { ReactElement } from 'react';
import type { Marker } from '../../lib/types';
import type { ThemeColors } from '../../lib/themes';
import { resolveMarkerColor, markerDecimalYr } from '../../lib/markerColors';

export interface MarkerOverlayInput {
  markers:      Marker[];
  /** Inclusive lower bound of chart x-axis (decimal year). */
  minDecimalYr: number;
  /** Inclusive upper bound of chart x-axis (decimal year). */
  maxDecimalYr: number;
  /** Theme colors (for resolving marker color keys). */
  colors:       ThemeColors;
  /**
   * Override marker colors with a single color (e.g. plan color for the dashboard comparison chart).
   * When omitted, each marker uses its own theme-color key.
   */
  overrideColor?: string;
  /** Unique key prefix so multiple charts on the same page don't collide. */
  keyPrefix?:   string;
}

/**
 * Build recharts overlay elements:
 *   - Range markers (with end date): a shaded {@link ReferenceArea} between start and end.
 *   - Open-ended markers (no end date): a shaded {@link ReferenceArea} from start out to the
 *     chart's right edge, plus a solid {@link ReferenceLine} at the start so the boundary
 *     is clearly visible (the right edge has no stroke to signal "continues indefinitely").
 *
 * Returned as a flat array; Recharts is happy with array children that mix ReferenceLine and ReferenceArea.
 * Out-of-range markers are filtered so they don't push axis ticks around.
 *
 * Labels intentionally aren't rendered here — text inside the SVG plot gets clipped at the top
 * and is hard to align across many markers. Callers should render a {@link MarkerLegend} chip
 * strip above the chart instead.
 */
export function renderMarkerOverlay(input: MarkerOverlayInput): ReactElement[] {
  const { markers, minDecimalYr, maxDecimalYr, colors, overrideColor, keyPrefix = 'mk' } = input;
  if (!markers?.length) return [];

  const out: ReactElement[] = [];
  for (const m of markers) {
    const startYr = markerDecimalYr(m.startYear, m.startMonthIdx);
    const endYrRaw = m.endYear != null && m.endMonthIdx != null
      ? markerDecimalYr(m.endYear, m.endMonthIdx)
      : null;
    const c = overrideColor ?? resolveMarkerColor(m.color, colors);

    if (endYrRaw != null) {
      // Closed range: shaded area between start and end with dashed outline on all sides.
      const lo = Math.min(startYr, endYrRaw);
      const hi = Math.max(startYr, endYrRaw);
      if (hi < minDecimalYr || lo > maxDecimalYr) continue;
      const x1 = Math.max(lo, minDecimalYr);
      const x2 = Math.min(hi, maxDecimalYr);
      out.push(
        <ReferenceArea
          key={`${keyPrefix}-${m.id}`}
          x1={x1}
          x2={x2}
          fill={c}
          fillOpacity={0.12}
          stroke={c}
          strokeOpacity={0.45}
          strokeWidth={1}
          strokeDasharray="2 4"
          ifOverflow="visible"
        />,
      );
    } else {
      // Open-ended: shade from start out to chart edge; no outline (so the right side feels unbounded).
      // A solid ReferenceLine at the start anchors the boundary so it reads "starts here, continues right."
      if (startYr > maxDecimalYr) continue;
      const x1 = Math.max(startYr, minDecimalYr);
      out.push(
        <ReferenceArea
          key={`${keyPrefix}-${m.id}-area`}
          x1={x1}
          x2={maxDecimalYr}
          fill={c}
          fillOpacity={0.10}
          stroke="none"
          ifOverflow="visible"
        />,
      );
      if (startYr >= minDecimalYr) {
        out.push(
          <ReferenceLine
            key={`${keyPrefix}-${m.id}-start`}
            x={startYr}
            stroke={c}
            strokeWidth={1.5}
            strokeOpacity={0.7}
            ifOverflow="visible"
          />,
        );
      }
    }
  }
  return out;
}
