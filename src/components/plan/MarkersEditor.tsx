import { useCallback } from 'react';
import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, getTodayStartDate } from '../../lib/constants';
import { MARKER_COLOR_KEYS } from '../../lib/types';
import { resolveMarkerColor, MARKER_COLOR_LABELS } from '../../lib/markerColors';
import { Input, Select, Button, Toggle } from '@hannasage/projection-ui';
import type { Marker } from '../../lib/types';

const makeId = () => crypto.randomUUID();

interface Props {
  markers:  Marker[];
  onChange: (markers: Marker[]) => void;
  defaultStartYear?:     number;
  defaultStartMonthIdx?: number;
  libraryMarkers?:        Marker[];
  excludedMarkerIds?:     string[];
  onToggleExcluded?:      (libraryId: string) => void;
  onForkLibraryMarker?:   (libraryMarker: Marker) => void;
  onSaveCustomToLibrary?: (m: Marker) => void;
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
  const defStartYr = Number.isFinite(defaultStartYear) ? Number(defaultStartYear) : today.startYear;
  const defStartMo = Number.isFinite(defaultStartMonthIdx) ? Number(defaultStartMonthIdx) : today.startMonthIdx;
  const years  = buildYears(Math.min(defStartYr, today.startYear) - 2, 80);
  const hasLibraryMode = libraryMarkers !== undefined;
  const excluded = new Set(excludedMarkerIds ?? []);

  const monthOpts = MONTHS.map((mo, i) => ({ value: String(i), label: mo }));
  const yearOpts  = years.map(y => ({ value: String(y), label: String(y) }));

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: COLORS.muted,
    fontSize: 18, cursor: 'pointer', lineHeight: 1,
    padding: '4px 6px', minWidth: 32, minHeight: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const addMarker = useCallback(() => {
    onChange([...markers, { id: makeId(), title: '', color: 'accent', startYear: defStartYr, startMonthIdx: defStartMo }]);
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

  const fmtRange = (m: Marker): string => {
    const start = `${MONTHS[m.startMonthIdx]?.slice(0, 3)} ${m.startYear}`;
    if (m.endYear == null || m.endMonthIdx == null) return `${start} → ongoing`;
    return `${start} → ${MONTHS[m.endMonthIdx]?.slice(0, 3)} ${m.endYear}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>
          {hasLibraryMode ? 'Phases' : 'Library Phases'}
        </span>
        <Button variant="secondary" size="sm" onClick={addMarker}>
          {hasLibraryMode ? '+ Custom' : '+ Add'}
        </Button>
      </div>
      <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 10px', lineHeight: 1.55 }}>
        Annotate {hasLibraryMode ? 'this plan' : 'all plans'} with phases (e.g. <em>Asset Phase</em>, <em>Kids in College</em>). Each marker has a start date and an optional end.
        {hasLibraryMode
          ? ' Library phases are inherited from I/O; you can opt out per-plan or fork to override dates.'
          : " The marker color shows on plan editor charts; on the dashboard comparison they take the plan's own color."}
      </p>

      {/* Library phases */}
      {hasLibraryMode && (libraryMarkers!.length > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 6 }}>
            From I/O library
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {libraryMarkers!.map(m => {
              const isActive = !excluded.has(m.id);
              const swatch   = resolveMarkerColor(m.color, COLORS);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px',
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${isActive ? swatch : COLORS.border}`,
                    borderRadius: 4,
                    background: isActive ? `${COLORS.faint}80` : 'transparent',
                    opacity: isActive ? 1 : 0.55,
                  }}
                >
                  <Toggle
                    checked={isActive}
                    onChange={() => onToggleExcluded?.(m.id)}
                    size="sm"
                    aria-label={`${isActive ? 'Exclude' : 'Include'} library phase ${m.title || 'untitled'} from this plan`}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: COLORS.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title || <em style={{ color: COLORS.muted, fontStyle: 'italic' }}>Untitled phase</em>}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 1 }}>{fmtRange(m)}</div>
                  </div>
                  {onForkLibraryMarker && (
                    <Button variant="secondary" size="sm" onClick={() => onForkLibraryMarker(m)}
                      title="Copy to this plan as a custom phase (edits the copy, not the library)">
                      ⎘ fork
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editable markers */}
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
        <div style={{ display: 'grid', gap: 10 }}>
          {markers.map(m => {
            const hasEnd     = m.endYear != null && m.endMonthIdx != null;
            const swatch     = resolveMarkerColor(m.color, COLORS);
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
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <Input
                    value={m.title}
                    placeholder="e.g. Asset Phase, Kids in College…"
                    onChange={e => update(m.id, { title: e.target.value })}
                    aria-label="Marker title"
                    containerStyle={{ flex: '1 1 180px', minWidth: 140 }}
                  />
                  {onSaveCustomToLibrary && (
                    <Button
                      variant={alreadySaved ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => onSaveCustomToLibrary(m)}
                      disabled={alreadySaved}
                      title={alreadySaved ? 'Already copied to I/O library this session' : 'Copy this phase to the global I/O library'}
                      style={alreadySaved ? undefined : { borderColor: `${COLORS.accent}80`, color: COLORS.accent, background: `${COLORS.accent}14` }}
                    >
                      {alreadySaved ? '✓ in I/O' : '↗ to I/O'}
                    </Button>
                  )}
                  <button type="button" onClick={() => removeMarker(m.id)}
                    aria-label={`Remove marker ${m.title || 'untitled'}`}
                    style={{ ...iconBtn, marginBottom: 4 }}>×</button>
                </div>

                {/* Color picker — keep custom (circular swatches) */}
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
                          cursor: 'pointer', padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: COLORS.bg,
                        }}
                      >
                        {active ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Start date */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', minWidth: 36, marginBottom: 4 }}>Start</span>
                  <Select options={monthOpts} value={String(m.startMonthIdx)} aria-label="Start month"
                    onChange={e => update(m.id, { startMonthIdx: +e.target.value })}
                    containerStyle={{ flex: '1 1 80px' }} />
                  <Select options={yearOpts} value={String(m.startYear)} aria-label="Start year"
                    onChange={e => update(m.id, { startYear: +e.target.value })}
                    containerStyle={{ flex: '1 1 90px' }} />
                </div>

                {/* End date */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase', minWidth: 36, marginBottom: 4 }}>End</span>
                  {hasEnd ? (
                    <>
                      <Select options={monthOpts} value={String(m.endMonthIdx)} aria-label="End month"
                        onChange={e => update(m.id, { endMonthIdx: +e.target.value })}
                        containerStyle={{ flex: '1 1 80px' }} />
                      <Select options={yearOpts} value={String(m.endYear)} aria-label="End year"
                        onChange={e => update(m.id, { endYear: +e.target.value })}
                        containerStyle={{ flex: '1 1 90px' }} />
                      <Button variant="secondary" size="sm" onClick={() => toggleEnd(m.id)}>clear end</Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => toggleEnd(m.id)}
                      style={{ border: `1px dashed ${COLORS.border}` }}>
                      + end date
                    </Button>
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
