import { useColors } from '../../stores/themeStore';
import { MONTHS } from '../../lib/constants';
import { resolveMarkerColor } from '../../lib/markerColors';
import type { Marker } from '../../lib/types';

function formatMonth(year: number, monthIdx: number): string {
  const safe = ((monthIdx % 12) + 12) % 12;
  return `${MONTHS[safe]} ${year}`;
}

function formatRange(m: Marker): string {
  const start = formatMonth(m.startYear, m.startMonthIdx);
  if (m.endYear != null && m.endMonthIdx != null) {
    return `${start} → ${formatMonth(m.endYear, m.endMonthIdx)}`;
  }
  return start;
}

interface Props {
  markers:        Marker[];
  /** Override every marker's color (e.g. plan color when multiple plans share the chart). */
  overrideColor?: string;
  /** Optional prefix shown before the chip row (e.g. plan name when comparing). */
  groupLabel?:    string;
  /** Compact mode shrinks chips for tighter rows. */
  compact?:       boolean;
}

/**
 * Renders a strip of marker chips above a chart so titles stay readable instead
 * of being clipped at the SVG top edge.
 */
export function MarkerLegend({ markers, overrideColor, groupLabel, compact }: Props) {
  const COLORS = useColors();
  if (!markers?.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      {groupLabel && (
        <span style={{
          fontSize: 9, letterSpacing: 1.5, color: COLORS.muted,
          textTransform: 'uppercase', marginRight: 4,
        }}>
          {groupLabel}
        </span>
      )}
      {markers.map(m => {
        const c = overrideColor ?? resolveMarkerColor(m.color, COLORS);
        return (
          <span
            key={m.id}
            title={`${m.title || 'Marker'} · ${formatRange(m)}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: compact ? '3px 8px' : '4px 10px',
              borderRadius: 999,
              border: `1px solid ${c}55`,
              background: `${c}14`,
              fontSize: compact ? 10 : 11,
              fontFamily: "'IBM Plex Mono', monospace",
              color: COLORS.text,
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: c, flexShrink: 0,
            }} aria-hidden="true" />
            <span style={{
              fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {m.title || 'Untitled'}
            </span>
            <span style={{ color: COLORS.muted, fontSize: compact ? 9 : 10 }}>
              {formatRange(m)}
            </span>
          </span>
        );
      })}
    </div>
  );
}
