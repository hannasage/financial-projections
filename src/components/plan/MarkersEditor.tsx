import { useCallback } from 'react';
import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, getTodayStartDate } from '../../lib/constants';
import { MARKER_COLOR_KEYS } from '../../lib/types';
import { resolveMarkerColor, MARKER_COLOR_LABELS } from '../../lib/markerColors';
import type { Marker } from '../../lib/types';

const makeId = () => crypto.randomUUID();

interface Props {
  /** Editable list of markers — when used in a plan, these are the plan's custom (forked or scenario-only) markers. */
  markers:  Marker[];
  onChange: (markers: Marker[]) => void;
  /** Default start year for a freshly added marker (falls back to today). */
  defaultStartYear?:     number;
  /** Default start month index for a freshly added marker (falls back to today). */
  defaultStartMonthIdx?: number;

  // ── Library-aware mode ────────────────────────────────────────────────────
  // When `libraryMarkers` is provided, the editor renders a "Library phases"
  // section above the custom list with toggle-include + fork affordances.
  // Omit `libraryMarkers` (e.g. in the I/O page itself) for the simple list view.

  /** Library-level phases that this plan inherits unless excluded. */
  libraryMarkers?:        Marker[];
  /** IDs of library markers excluded from this plan. */
  excludedMarkerIds?:     string[];
  /** Toggle whether a library marker is included in this plan. */
  onToggleExcluded?:      (libraryId: string) => void;
  /** Copy a library marker into `markers` as a new custom one + exclude the original from this plan. */
  onForkLibraryMarker?:   (libraryMarker: Marker) => void;
  /** Optional "save to global" affordance for plan-custom markers (mirrors the save-to-I/O flow elsewhere). */
  onSaveCustomToLibrary?: (m: Marker) => void;
  /** Map of custom marker id → whether it has already been saved to the library this session. */
  savedToLibrary?:        Record<string, boolean>;
}

export function MarkersEditor({
  markers, onChange,
  defaultStartYear, defaultStartMonthIdx,
  libraryMarkers, excludedMarkerIds,
  onToggleExcluded, onForkLibraryMarker,
  onSaveCustomToLibrary, savedToLibrary,
}: Props) {
  const COLORS = useColors();
  const today  = getTodayStartDate();
  const defStartYr  = Number.isFinite(defaultStartYear)     ? Number(defaultStartYear)     : today.startYear;
  const defStartMo  = Number.isFinite(defaultStartMonthIdx) ? Number(defaultStartMonthIdx) : today.startMonthIdx;
  const years  = buildYears(Math.min(defStartYr, today.startYear) - 2, 80);
  const hasLibraryMode = libraryMarkers !== undefined;
  const excluded = new Set(excludedMarkerIds ?? []);

  const S = {
    label: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' as const },
    field: {
      background: COLORS.faint, color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4, padding: '7px 9px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, outline: 'none',
      WebkitAppearance: 'none' as const, appearance: 'none' as const,
    },
  };

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  };

  const addBtnStyle: React.CSSProperties = {
    padding: '6px 13px', fontSize: 11, borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
    background: 'transparent', color: COLORS.muted,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer', flexShrink: 0,
  };

  const addMarker = useCallback(() => {
    onChange([
      ...markers,
      {
        id: makeId(),
        title: '',
        color: 'accent',
        startYear: defStartYr,
        startMonthIdx: defStartMo,
      },
    ]);
  }, [markers, onChange, defStartYr, defStartMo]);

  const update = useCallback((id: string, patch: Partial<Marker>) => {
    onChange(markers.map(m => m.id === id ? { ...m, ...patch } : m));
  }, [markers, onChange]);

  const removeMarker = useCallback((id: string) => {
    onChange(markers.filter(m => m.id !== id));
  }, [markers, onChange]);

  const toggleEnd = useCallback((id: string) => {
    onChange(markers.map(m => {
      if (m.id !== id) return m;
      if (m.endYear != null && m.endMonthIdx != null) {
        const next: Marker = { ...m };
        delete next.endYear;
        delete next.endMonthIdx;
        return next;
      }
      return { ...m, endYear: m.startYear + 1, endMonthIdx: m.startMonthIdx };
    }));
  }, [markers, onChange]);

  /** Formats a marker's date range as a compact range, e.g. "Jan 2027 → Dec 2030" or "Apr 2028 → ongoing". */
  const fmtRange = (m: Marker): string => {
    const start = `${MONTHS[m.startMonthIdx]?.slice(0, 3)} ${m.startYear}`;
    if (m.endYear == null || m.endMonthIdx == null) return `${start} → ongoing`;
    return `${start} → ${MONTHS[m.endMonthIdx]?.slice(0, 3)} ${m.endYear}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={S.label}>{hasLibraryMode ? 'Phases' : 'Library Phases'}</span>
        <button type="button" onClick={addMarker} style={addBtnStyle}>
          {hasLibraryMode ? '+ Custom' : '+ Add'}
        </button>
      </div>
      <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 10px', lineHeight: 1.55 }}>
        Annotate {hasLibraryMode ? 'this plan' : 'all plans'} with phases (e.g. <em>Asset Phase</em>, <em>Kids in College</em>). Each marker has a start date and an optional end.
        {hasLibraryMode
          ? ' Library phases are inherited from I/O; you can opt out per-plan or fork to override dates.'
          : ' The marker color shows on plan editor charts; on the dashboard comparison they take the plan’s own color.'}
      </p>

      {/* ── LIBRARY PHASES (plan editor mode only) ──────────────────────── */}
      {hasLibraryMode && (libraryMarkers!.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 6 }}>
            From I/O library
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {libraryMarkers!.map(m => {
              const isActive = !excluded.has(m.id);
              const swatch = resolveMarkerColor(m.color, COLORS);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px',
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${isActive ? swatch : `${COLORS.border}`}`,
                    borderRadius: 4,
                    background: isActive ? `${COLORS.faint}80` : 'transparent',
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    aria-label={`${isActive ? 'Exclude' : 'Include'} library phase ${m.title || 'untitled'} from this plan`}
                    onClick={() => onToggleExcluded?.(m.id)}
                    title={isActive ? 'Click to exclude from this plan' : 'Click to include in this plan'}
                    style={{
                      width: 28, height: 16, borderRadius: 999,
                      border: `1px solid ${isActive ? swatch : COLORS.border}`,
                      background: isActive ? swatch : 'transparent',
                      cursor: 'pointer', padding: 0,
                      position: 'relative', flexShrink: 0,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        top: 1, left: isActive ? 13 : 1,
                        width: 12, height: 12, borderRadius: '50%',
                        background: isActive ? COLORS.bg : COLORS.muted,
                        transition: 'left 0.12s',
                      }}
                    />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, color: COLORS.text, fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.title || <em style={{ color: COLORS.muted, fontStyle: 'italic' }}>Untitled phase</em>}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>
                      {fmtRange(m)}
                    </div>
                  </div>
                  {onForkLibraryMarker && (
                    <button
                      type="button"
                      onClick={() => onForkLibraryMarker(m)}
                      title="Copy to this plan as a custom phase (edits the copy, not the library)"
                      style={{
                        padding: '4px 9px', fontSize: 10, letterSpacing: 1,
                        textTransform: 'uppercase',
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >⎘ fork</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EDITABLE MARKERS (custom in plan, OR the library list itself) ─── */}
      {hasLibraryMode && markers.length > 0 && (
        <div style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 6 }}>
          Custom in this plan
        </div>
      )}

      {markers.length === 0 ? (
        !hasLibraryMode || (hasLibraryMode && (libraryMarkers?.length ?? 0) === 0) ? (
          <p style={{ fontSize: 11, color: COLORS.muted, fontStyle: 'italic', margin: 0 }}>
            No phases yet — click <strong style={{ color: COLORS.text }}>{hasLibraryMode ? '+ Custom' : '+ Add'}</strong> to mark a milestone or life phase.
          </p>
        ) : null
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {markers.map(m => {
            const hasEnd = m.endYear != null && m.endMonthIdx != null;
            const swatch = resolveMarkerColor(m.color, COLORS);
            const alreadySaved = Boolean(savedToLibrary?.[m.id]);
            return (
              <div
                key={m.id}
                data-io-item={m.id}
                style={{
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${swatch}`,
                  background: COLORS.faint,
                  padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  scrollMarginTop: 24, scrollMarginBottom: 100,
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={m.title}
                    placeholder="e.g. Asset Phase, Kids in College…"
                    onChange={e => update(m.id, { title: e.target.value })}
                    aria-label="Marker title"
                    style={{ ...S.field, flex: '1 1 180px', minWidth: 140 }}
                  />
                  {onSaveCustomToLibrary && (
                    <button
                      type="button"
                      onClick={() => onSaveCustomToLibrary(m)}
                      disabled={alreadySaved}
                      title={alreadySaved
                        ? 'Already copied to I/O library this session'
                        : 'Copy this phase to the global I/O library as a new entry'}
                      style={{
                        padding: '4px 9px', fontSize: 10, letterSpacing: 1,
                        textTransform: 'uppercase',
                        borderRadius: 4,
                        border: `1px solid ${alreadySaved ? COLORS.border : `${COLORS.accent}80`}`,
                        background: alreadySaved ? 'transparent' : `${COLORS.accent}14`,
                        color: alreadySaved ? COLORS.muted : COLORS.accent,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: alreadySaved ? 'default' : 'pointer',
                        flexShrink: 0, fontWeight: 600,
                      }}
                    >{alreadySaved ? '✓ in I/O' : '↗ to I/O'}</button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMarker(m.id)}
                    aria-label={`Remove marker ${m.title || 'untitled'}`}
                    style={iconBtn}
                  >×</button>
                </div>

                <div role="radiogroup" aria-label="Marker color" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MARKER_COLOR_KEYS.map(key => {
                    const c = resolveMarkerColor(key, COLORS);
                    const active = m.color === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={MARKER_COLOR_LABELS[key]}
                        title={MARKER_COLOR_LABELS[key]}
                        onClick={() => update(m.id, { color: key })}
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: c,
                          border: active ? `2px solid ${COLORS.text}` : `2px solid transparent`,
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: COLORS.bg,
                          transition: 'border-color 0.12s',
                        }}
                      >
                        {active ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...S.label, minWidth: 36 }}>Start</span>
                  <select
                    value={m.startMonthIdx}
                    aria-label="Start month"
                    onChange={e => update(m.id, { startMonthIdx: +e.target.value })}
                    style={{ ...S.field, flex: '1 1 80px' }}
                  >
                    {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
                  </select>
                  <select
                    value={m.startYear}
                    aria-label="Start year"
                    onChange={e => update(m.id, { startYear: +e.target.value })}
                    style={{ ...S.field, flex: '1 1 90px' }}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...S.label, minWidth: 36 }}>End</span>
                  {hasEnd ? (
                    <>
                      <select
                        value={m.endMonthIdx}
                        aria-label="End month"
                        onChange={e => update(m.id, { endMonthIdx: +e.target.value })}
                        style={{ ...S.field, flex: '1 1 80px' }}
                      >
                        {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
                      </select>
                      <select
                        value={m.endYear}
                        aria-label="End year"
                        onChange={e => update(m.id, { endYear: +e.target.value })}
                        style={{ ...S.field, flex: '1 1 90px' }}
                      >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => toggleEnd(m.id)}
                        style={{
                          padding: '5px 10px', fontSize: 10, borderRadius: 4,
                          border: `1px solid ${COLORS.border}`,
                          background: 'transparent', color: COLORS.muted,
                          fontFamily: "'IBM Plex Mono', monospace",
                          cursor: 'pointer',
                        }}
                      >clear end</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleEnd(m.id)}
                      style={{
                        padding: '5px 10px', fontSize: 10, borderRadius: 4,
                        border: `1px dashed ${COLORS.border}`,
                        background: 'transparent', color: COLORS.muted,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: 'pointer',
                      }}
                    >+ end date</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
