import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { useThemeStore } from '../stores/themeStore';
import { usePlansStore } from '../stores/plansStore';
import { useLibraryStore } from '../stores/libraryStore';
import { usePlans } from '../hooks/usePlans';
import { PlanEditor } from '../components/plan/PlanEditor';
import { ColorPicker } from '../components/shared/ColorPicker';
import { MarkersEditor } from '../components/plan/MarkersEditor';
import { Modal } from '../components/shared/Modal';
import { resolveMarkers } from '../lib/resolveItems';
import type { Marker, Scenario } from '../lib/types';

export default function PlanEdit() {
  const COLORS   = useColors();
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plans    = usePlansStore(s => s.plans);
  const plan     = plans.find(p => p.id === id);
  const library  = useLibraryStore();
  const addLibraryMarker = useLibraryStore(s => s.addMarker);
  const { updatePlan } = usePlans();

  const [title,       setTitle]       = useState(plan?.title       ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [color,       setColor]       = useState(
    plan?.color ?? useThemeStore.getState().theme.planColors[0]?.value ?? '#C9F53A',
  );
  const [markers,     setMarkers]     = useState<Marker[]>(plan?.markers ?? []);
  const [excludedMarkerIds, setExcludedMarkerIds] = useState<string[]>(plan?.excludedMarkerIds ?? []);
  const [savedMarkerToLibrary, setSavedMarkerToLibrary] = useState<Record<string, string>>({});
  const [copiedMarkerInfo, setCopiedMarkerInfo] = useState<{ libraryId: string; title: string } | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const resolvedMarkers = resolveMarkers({ markers, excludedMarkerIds }, library.markers);
  const savedMap: Record<string, boolean> = Object.fromEntries(
    Object.keys(savedMarkerToLibrary).map(k => [k, true]),
  );

  const handleToggleExcludedMarker = (libraryId: string) => {
    setExcludedMarkerIds(prev =>
      prev.includes(libraryId) ? prev.filter(x => x !== libraryId) : [...prev, libraryId],
    );
  };

  const handleForkLibraryMarker = (m: Marker) => {
    setMarkers(prev => [...prev, { ...m, id: crypto.randomUUID() }]);
    setExcludedMarkerIds(prev => prev.includes(m.id) ? prev : [...prev, m.id]);
  };

  const handleSaveCustomToLibrary = (m: Marker) => {
    const clone: Partial<Marker> = { ...m };
    delete clone.id;
    const libraryId = addLibraryMarker(clone as Omit<Marker, 'id'>);
    setSavedMarkerToLibrary(prev => ({ ...prev, [m.id]: libraryId }));
    setCopiedMarkerInfo({ libraryId, title: m.title || 'New phase' });
  };

  const S = {
    field: {
      background: COLORS.faint, color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4, padding: '8px 10px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 12, outline: 'none', width: '100%',
    },
    label: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 },
  };

  if (!plan) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ textAlign: 'center' }}>
          <div className="syne" style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Plan not found</div>
          <button onClick={() => navigate('/scenarios')} style={{ fontSize: 12, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Back to scenarios
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (scenario: Scenario) => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await updatePlan(id!, { title: title.trim(), description, color, scenario, markers, excludedMarkerIds });
      navigate('/scenarios');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
      setSaving(false);
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Plan meta header */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 18px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 40, background: color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <label htmlFor="plan-title" style={S.label}>Plan Title</label>
              <input
                id="plan-title" value={title} placeholder="e.g. Conservative plan…"
                onChange={e => setTitle(e.target.value)}
                style={S.field}
              />
            </div>
          </div>
          <div>
            <label htmlFor="plan-desc" style={S.label}>Description (optional)</label>
            <textarea
              id="plan-desc" value={description} rows={2}
              placeholder="Notes about this scenario…"
              onChange={e => setDescription(e.target.value)}
              style={{ ...S.field, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          <div>
            <span style={S.label}>Color</span>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div>
            <MarkersEditor
              markers={markers}
              onChange={setMarkers}
              defaultStartYear={plan.scenario.startYear}
              defaultStartMonthIdx={plan.scenario.startMonthIdx}
              libraryMarkers={library.markers}
              excludedMarkerIds={excludedMarkerIds}
              onToggleExcluded={handleToggleExcludedMarker}
              onForkLibraryMarker={handleForkLibraryMarker}
              onSaveCustomToLibrary={handleSaveCustomToLibrary}
              savedToLibrary={savedMap}
            />
          </div>
          {error && (
            <div style={{ fontSize: 11, color: COLORS.red, padding: '7px 10px', background: `${COLORS.red}15`, borderRadius: 4, border: `1px solid ${COLORS.red}30` }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <PlanEditor
        initialScenario={plan.scenario}
        color={color}
        markers={resolvedMarkers}
        onSave={handleSave}
        onCancel={() => navigate('/scenarios')}
        isSaving={saving}
      />

      <Modal
        open={copiedMarkerInfo != null}
        title="Phase copied to I/O library"
        onDismiss={() => setCopiedMarkerInfo(null)}
        actions={copiedMarkerInfo == null ? [] : [
          {
            label: 'View it',
            variant: 'secondary',
            href: `/io?focus=${encodeURIComponent(copiedMarkerInfo.libraryId)}`,
            target: '_blank',
            ariaLabel: 'Open the I/O library in a new tab',
            onClick: () => setCopiedMarkerInfo(null),
          },
          {
            label: 'Thanks!',
            variant: 'primary',
            onClick: () => setCopiedMarkerInfo(null),
          },
        ]}
      >
        {copiedMarkerInfo && (
          <>
            <strong style={{ color: COLORS.text }}>{copiedMarkerInfo.title}</strong> was added to your global I/O library as a new phase.
            Other plans will inherit it automatically; the original custom marker on this plan is untouched.
          </>
        )}
      </Modal>
    </div>
  );
}
