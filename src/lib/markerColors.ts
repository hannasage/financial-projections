import type { Marker, MarkerColorKey } from './types';
import type { ThemeColors } from './themes';

/** Resolve a marker's theme color key against the active theme palette. */
export function resolveMarkerColor(key: MarkerColorKey, colors: ThemeColors): string {
  return colors[key] ?? colors.accent;
}

export const MARKER_COLOR_LABELS: Record<MarkerColorKey, string> = {
  accent: 'Accent',
  blue:   'Blue',
  orange: 'Orange',
  red:    'Red',
  purple: 'Purple',
  dim:    'Dim',
};

/** Convert a (year, monthIdx) date into a decimal year for chart coordinates. */
export function markerDecimalYr(year: number, monthIdx: number): number {
  return year + monthIdx / 12;
}

/** True when the given decimal-year falls within the marker (inclusive). Open-ended markers extend forever. */
export function isMarkerActiveAt(m: Marker, decimalYr: number): boolean {
  const start = markerDecimalYr(m.startYear, m.startMonthIdx);
  if (decimalYr < start - 1e-9) return false;
  if (m.endYear == null || m.endMonthIdx == null) return true;
  const end = markerDecimalYr(m.endYear, m.endMonthIdx);
  return decimalYr <= end + 1e-9;
}

/** Filter markers to those active at a given decimal-year, preserving input order. */
export function getActiveMarkersAt(markers: Marker[] | undefined, decimalYr: number): Marker[] {
  if (!markers?.length) return [];
  return markers.filter(m => isMarkerActiveAt(m, decimalYr));
}
