import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColors } from '../stores/themeStore';
import { useThemeStore } from '../stores/themeStore';
import { usePlans } from '../hooks/usePlans';
import { useLibraryStore } from '../stores/libraryStore';
import { PlanEditor } from '../components/plan/PlanEditor';
import { ColorPicker } from '../components/shared/ColorPicker';
import type { Scenario } from '../lib/types';

export default function PlanNew() {
  const COLORS         = useColors();
  const navigate       = useNavigate();
  const { createPlan } = usePlans();
  const profile        = useLibraryStore(s => s.profile);

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState<string>(
    useThemeStore.getState().theme.planColors[0]?.value ?? '#C9F53A',
  );
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

  const handleSave = async (scenario: Scenario) => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await createPlan({ title: title.trim(), description, color, scenario });
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
                id="plan-title" value={title} placeholder="e.g. Conservative plan, Aggressive growth…"
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

      {/* Editor — seeds core settings from I/O profile */}
      <PlanEditor
        initialScenario={{
          ...profile,
          debts: [], purchases: [], raises: [],
          investments: [], recurringCharges: [],
          excludedDebtIds: [], excludedPurchaseIds: [], excludedRaiseIds: [],
          excludedInvestmentIds: [], excludedRecurringChargeIds: [],
        }}
        color={color}
        onSave={handleSave}
        onCancel={() => navigate('/scenarios')}
        isSaving={saving}
      />
    </div>
  );
}
