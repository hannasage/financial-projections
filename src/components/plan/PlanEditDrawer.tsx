import { useState, useEffect } from 'react';
import { useColors } from '../../stores/themeStore';
import { useThemeStore } from '../../stores/themeStore';
import { usePlansStore } from '../../stores/plansStore';
import { usePlans } from '../../hooks/usePlans';
import { PlanEditor } from './PlanEditor';
import { ColorPicker } from '../shared/ColorPicker';
import type { Scenario } from '../../lib/types';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

interface Props {
  planId:  string | null;
  onClose: () => void;
}

export function PlanEditDrawer({ planId, onClose }: Props) {
  const COLORS   = useColors();
  const plans    = usePlansStore(s => s.plans);
  const { updatePlan } = usePlans();
  const isMobile = useIsMobile();
  const plan     = plans.find(p => p.id === planId) ?? null;

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [color,       setColor]       = useState('#C9F53A');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [open,        setOpen]        = useState(false);

  // Trigger slide-in animation after mount
  useEffect(() => {
    if (planId) requestAnimationFrame(() => setOpen(true));
    else setOpen(false);
  }, [planId]);

  // Sync form fields when the target plan changes
  useEffect(() => {
    if (!plan) return;
    setTitle(plan.title ?? '');
    setDescription(plan.description ?? '');
    setColor(plan.color ?? useThemeStore.getState().theme.planColors[0]?.value ?? '#C9F53A');
    setSaving(false);
    setError('');
  }, [plan?.id]);

  // Lock body scroll while open
  useEffect(() => {
    if (!planId) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [planId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  });

  if (!planId) return null;

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSave = async (scenario: Scenario) => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await updatePlan(planId, { title: title.trim(), description, color, scenario });
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
      setSaving(false);
    }
  };

  const S = {
    field: {
      background: COLORS.faint, color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 4, padding: '8px 10px',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 12, outline: 'none', width: '100%',
    },
    label: {
      fontSize: 10, letterSpacing: 2, color: COLORS.muted,
      textTransform: 'uppercase' as const, display: 'block', marginBottom: 6,
    },
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', inset: 0,
        background: COLORS.bg, overflowY: 'auto',
        zIndex: 200,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.22s ease-out',
        display: 'flex', flexDirection: 'column',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '40%', minWidth: 400,
        background: COLORS.bg,
        borderLeft: `1px solid ${COLORS.border}`,
        overflowY: 'auto',
        zIndex: 200,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.22s ease-out',
        display: 'flex', flexDirection: 'column',
      };

  return (
    <>
      {/* Backdrop — desktop only, click to close */}
      <div
        onClick={handleClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 199,
          opacity: open && !isMobile ? 1 : 0,
          transition: 'opacity 0.22s',
          pointerEvents: open && !isMobile ? 'auto' : 'none',
        }}
      />

      <div style={panelStyle} role="dialog" aria-modal="true" aria-label="Edit plan">
        {/* Top bar */}
        <div style={{
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, letterSpacing: 2, color: COLORS.muted, textTransform: 'uppercase' }}>
            Edit Plan
          </span>
          <button
            onClick={handleClose}
            aria-label="Close editor"
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: COLORS.muted, cursor: 'pointer', fontSize: 20, borderRadius: 4,
              lineHeight: 1,
            }}
          >×</button>
        </div>

        {/* Plan meta */}
        <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 4, height: 40, background: color, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <label htmlFor="drawer-title" style={S.label}>Plan Title</label>
                <input
                  id="drawer-title" value={title}
                  placeholder="e.g. Conservative plan…"
                  onChange={e => setTitle(e.target.value)}
                  style={S.field}
                />
              </div>
            </div>
            <div>
              <label htmlFor="drawer-desc" style={S.label}>Description (optional)</label>
              <textarea
                id="drawer-desc" value={description} rows={2}
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
        {plan && (
          <PlanEditor
            initialScenario={plan.scenario}
            color={color}
            onSave={handleSave}
            onCancel={handleClose}
            isSaving={saving}
            footerPosition="sticky"
          />
        )}
      </div>
    </>
  );
}
