import { useCallback } from 'react';
import { useColors } from '../../stores/themeStore';
import { MONTHS, buildYears, getTodayStartDate } from '../../lib/constants';
import { MARKER_COLOR_KEYS } from '../../lib/types';
import { resolveMarkerColor, MARKER_COLOR_LABELS } from '../../lib/markerColors';
import type { Marker } from '../../lib/types';

const makeId = () => crypto.randomUUID();

interface Props {
  markers:  Marker[];
  onChange: (markers: Marker[]) => void;
  /** Default start year for a freshly added marker (falls back to today). */
  defaultStartYear?:     number;
  /** Default start month index for a freshly added marker (falls back to today). */
  defaultStartMonthIdx?: number;
}

export function MarkersEditor({ markers, onChange, defaultStartYear, defaultStartMonthIdx }: Props) {
  const COLORS = useColors();
  const today  = getTodayStartDate();
  const defStartYr  = Number.isFinite(defaultStartYear)     ? Number(defaultStartYear)     : today.startYear;
  const defStartMo  = Number.isFinite(defaultStartMonthIdx) ? Number(defaultStartMonthIdx) : today.startMonthIdx;
  const years  = buildYears(Math.min(defStartYr, today.startYear) - 2, 80);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={S.label}>Markers</span>
        <button type="button" onClick={addMarker} style={addBtnStyle}>+ Add</button>
      </div>
      <p style={{ fontSize: 10, color: COLORS.muted, margin: '0 0 10px', lineHeight: 1.55 }}>
        Annotate this plan with phases (e.g. <em>Asset Phase</em>, <em>Kids in College</em>). Each marker has a start date and an optional end. The marker color shows on this plan's editor charts; on the dashboard comparison they take the plan's own color to keep the palette clean.
      </p>

      {markers.length === 0 ? (
        <p style={{ fontSize: 11, color: COLORS.muted, fontStyle: 'italic', margin: 0 }}>
          No markers yet — click <strong style={{ color: COLORS.text }}>+ Add</strong> to mark a milestone or life phase.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {markers.map(m => {
            const hasEnd = m.endYear != null && m.endMonthIdx != null;
            const swatch = resolveMarkerColor(m.color, COLORS);
            return (
              <div
                key={m.id}
                style={{
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: `4px solid ${swatch}`,
                  background: COLORS.faint,
                  padding: '10px 12px',
                  display: 'flex', flexDirection: 'column', gap: 8,
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
