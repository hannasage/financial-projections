import { useEffect, useRef } from 'react';
import { useColors } from '../../stores/themeStore';

export interface ModalAction {
  label:     string;
  /** Either onClick (button) or href (anchor). One is required. */
  onClick?:  () => void;
  /** When set, the action renders as an anchor (opens link). Useful for "view in new tab". */
  href?:     string;
  /** Anchor target — typically '_blank' when href is set. */
  target?:   '_blank' | '_self';
  /** Visual treatment. 'primary' = filled accent (default for the right-most button). */
  variant?:  'primary' | 'secondary';
  /** Aria description; falls back to label. */
  ariaLabel?: string;
}

interface Props {
  open:      boolean;
  title:     string;
  /** Body content — text, markup, or other React nodes. */
  children:  React.ReactNode;
  /** Buttons rendered in the footer, left to right (primary should usually be last). */
  actions:   ModalAction[];
  /** Called when the user presses Escape or clicks the backdrop. */
  onDismiss: () => void;
  /** ARIA label / heading id (auto-generated if omitted). */
  labelId?:  string;
}

/**
 * Accessible, theme-aware modal dialog.
 *
 * - Locks body scroll while open.
 * - Closes on Escape and backdrop click via `onDismiss`.
 * - Auto-focuses the primary action when opened so keyboard users get a sane default.
 */
export function Modal({ open, title, children, actions, onDismiss, labelId }: Props) {
  const COLORS = useColors();
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const headingId = labelId ?? 'modal-title';

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onDismiss]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        primaryRef.current?.focus();
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={e => e.stopPropagation()}
        style={{
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          boxShadow: `0 24px 80px rgba(0,0,0,0.45)`,
          maxWidth: 440,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
          color: COLORS.text,
        }}
      >
        <div style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2
            id={headingId}
            className="syne"
            style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.25 }}
          >
            {title}
          </h2>
          <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.55 }}>
            {children}
          </div>
        </div>

        <div style={{
          padding: '16px 20px 18px',
          marginTop: 14,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap',
        }}>
          {actions.map((a, idx) => {
            const isPrimary = a.variant === 'primary' || (a.variant === undefined && idx === actions.length - 1);
            const sharedStyle: React.CSSProperties = {
              padding: '9px 18px',
              fontSize: 12,
              borderRadius: 4,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: 'pointer',
              fontWeight: isPrimary ? 600 : 500,
              border: isPrimary
                ? `1px solid ${COLORS.accent}`
                : `1px solid ${COLORS.border}`,
              background: isPrimary ? COLORS.accent : 'transparent',
              color: isPrimary ? COLORS.textOnAccent : COLORS.muted,
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            };
            if (a.href) {
              return (
                <a
                  key={a.label}
                  href={a.href}
                  target={a.target ?? '_self'}
                  rel={a.target === '_blank' ? 'noopener noreferrer' : undefined}
                  aria-label={a.ariaLabel ?? a.label}
                  onClick={a.onClick}
                  style={sharedStyle}
                >
                  {a.label}
                </a>
              );
            }
            return (
              <button
                key={a.label}
                ref={isPrimary ? primaryRef : undefined}
                onClick={a.onClick}
                aria-label={a.ariaLabel ?? a.label}
                style={sharedStyle}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
