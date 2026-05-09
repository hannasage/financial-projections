import { useState, useEffect, useRef } from 'react';
import { THEMES } from '../../lib/themes';
import { useColors } from '../../stores/themeStore';
import { useThemeStore } from '../../stores/themeStore';
import { usePlansStore } from '../../stores/plansStore';
import { pb } from '../../lib/pb';

export function ThemeSelector() {
  const COLORS       = useColors();
  const [open, setOpen] = useState(false);
  const ref          = useRef<HTMLDivElement>(null);
  const currentTheme = useThemeStore(s => s.theme);
  const setTheme     = useThemeStore(s => s.setTheme);
  const plans        = usePlansStore(s => s.plans);
  const setPlans     = usePlansStore(s => s.setPlans);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (newTheme: typeof THEMES[number]) => {
    if (newTheme.id === currentTheme.id) { setOpen(false); return; }

    // Remap plan colors: find each plan's color index in current theme, map to new theme
    const remappedPlans = plans.map(plan => {
      const idx = currentTheme.planColors.findIndex(c => c.value.toLowerCase() === plan.color.toLowerCase());
      const newColor = idx >= 0
        ? (newTheme.planColors[idx]?.value ?? newTheme.planColors[0]?.value ?? plan.color)
        : (newTheme.planColors[0]?.value ?? plan.color);
      return { ...plan, color: newColor };
    });

    setPlans(remappedPlans);
    setTheme(newTheme);

    // Background-save each remapped plan's color to PocketBase
    remappedPlans.forEach(plan => {
      pb.collection('plans').update(plan.id, { color: plan.color }).catch(() => {
        // silently ignore errors — color is cosmetic
      });
    });

    setOpen(false);
  };

  const darkThemes  = THEMES.filter(t => t.isDark);
  const lightThemes = THEMES.filter(t => !t.isDark);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change theme"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', fontSize: 12, borderRadius: 4,
          border: `1px solid ${COLORS.border}`,
          background: open ? `${COLORS.accent}15` : 'transparent',
          color: COLORS.muted,
          fontFamily: "'IBM Plex Mono', monospace",
          cursor: 'pointer', transition: 'all 0.12s',
        }}
      >
        {/* Palette SVG icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="4.5" cy="5.5" r="1.2" fill={currentTheme.planColors[0]?.value ?? COLORS.accent} />
          <circle cx="7"   cy="4"   r="1.2" fill={currentTheme.planColors[1]?.value ?? COLORS.blue} />
          <circle cx="9.5" cy="5.5" r="1.2" fill={currentTheme.planColors[2]?.value ?? COLORS.orange} />
          <circle cx="9"   cy="8.5" r="1.2" fill={currentTheme.planColors[3]?.value ?? COLORS.purple} />
          <circle cx="5"   cy="8.5" r="1.2" fill={currentTheme.planColors[4]?.value ?? COLORS.red} />
        </svg>
        {/* Accent color dot indicator */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: currentTheme.colors.accent,
          flexShrink: 0,
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: (() => {
            const el = ref.current;
            if (!el) return 60;
            const rect = el.getBoundingClientRect();
            return rect.bottom + 6;
          })(),
          right: (() => {
            const el = ref.current;
            if (!el) return 20;
            return window.innerWidth - el.getBoundingClientRect().right;
          })(),
          zIndex: 200,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          minWidth: 220,
          maxHeight: 420,
          overflowY: 'auto',
          boxShadow: `0 8px 32px ${COLORS.bg}cc`,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {/* Dark themes group */}
          <div style={{
            padding: '6px 12px 4px',
            fontSize: 9, letterSpacing: 2, color: COLORS.muted,
            textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}`,
          }}>
            Dark
          </div>
          {darkThemes.map(theme => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              isCurrent={theme.id === currentTheme.id}
              onSelect={() => handleSelect(theme)}
              COLORS={COLORS}
            />
          ))}

          {/* Light themes group */}
          <div style={{
            padding: '6px 12px 4px',
            fontSize: 9, letterSpacing: 2, color: COLORS.muted,
            textTransform: 'uppercase', borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}`,
          }}>
            Light
          </div>
          {lightThemes.map(theme => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              isCurrent={theme.id === currentTheme.id}
              onSelect={() => handleSelect(theme)}
              COLORS={COLORS}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ThemeRowProps {
  theme:     typeof THEMES[number];
  isCurrent: boolean;
  onSelect:  () => void;
  COLORS:    ReturnType<typeof useColors>;
}

function ThemeRow({ theme, isCurrent, onSelect, COLORS }: ThemeRowProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '9px 12px',
        background: isCurrent ? `${theme.colors.accent}18` : 'transparent',
        border: 'none', borderBottom: `1px solid ${COLORS.border}20`,
        cursor: 'pointer', textAlign: 'left',
        fontFamily: "'IBM Plex Mono', monospace",
        transition: 'background 0.1s',
      }}
    >
      {/* Dark/Light badge */}
      <span style={{
        fontSize: 10, lineHeight: 1,
        flexShrink: 0,
      }}>
        {theme.isDark ? '🌙' : '☀️'}
      </span>

      {/* Accent color swatch */}
      <span style={{
        width: 16, height: 16, borderRadius: 4,
        background: theme.colors.accent,
        flexShrink: 0,
        border: `1px solid ${theme.colors.accent}40`,
      }} />

      {/* Theme name */}
      <span style={{
        fontSize: 12,
        color: isCurrent ? theme.colors.accent : COLORS.text,
        fontWeight: isCurrent ? 600 : 400,
        flex: 1,
      }}>
        {theme.name}
      </span>

      {/* Checkmark for current */}
      {isCurrent && (
        <span style={{ fontSize: 12, color: theme.colors.accent }}>✓</span>
      )}
    </button>
  );
}
