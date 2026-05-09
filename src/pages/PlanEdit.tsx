import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { usePlansStore } from '../stores/plansStore';
import { usePlans } from '../hooks/usePlans';
import { PlanEditor } from '../components/plan/PlanEditor';
import { ColorPicker } from '../components/shared/ColorPicker';
import type { Scenario } from '../lib/types';

export default function PlanEdit() {
  const COLORS   = useColors();
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plans    = usePlansStore(s => s.plans);
  const plan     = plans.find(p => p.id === id);
  const { updatePlan } = usePlans();

  const [title,       setTitle]       = useState(plan?.title       ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [color,       setColor]       = useState(plan?.color       ?? '#C9F53A');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

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
      await updatePlan(id!, { title: title.trim(), description, color, scenario });
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
        onSave={handleSave}
        onCancel={() => navigate('/scenarios')}
        isSaving={saving}
      />
    </div>
  );
}
