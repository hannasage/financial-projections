import { useColors } from '../../stores/themeStore';

interface Props {
  /** Short label rendered as the eyebrow, e.g. "Custom debt". */
  kindLabel:        string;
  /** When provided, renders the "↗ save to I/O" button; omit if already in the library. */
  onSaveToLibrary?: () => void;
  /** Whether the save action has already been used for this item (button disabled + label changed). */
  savedToLibrary?:  boolean;
  children:         React.ReactNode;
}

/**
 * Visual chrome for a scenario-only item rendered inside the plan editor.
 *
 * Adds a thin eyebrow row identifying the item as scenario-specific, and an optional
 * "↗ save to I/O" button that copies the item back to the global library as a NEW
 * record (does not edit the original library item it may have been forked from).
 */
export function CustomItemWrapper({ kindLabel, onSaveToLibrary, savedToLibrary, children }: Props) {
  const COLORS = useColors();

  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 6,
        background: `${COLORS.faint}80`,
        padding: '0 12px',
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '8px 0',
          borderBottom: `1px solid ${COLORS.border}40`,
        }}
      >
        <span style={{
          fontSize: 9, letterSpacing: 1.5,
          color: COLORS.muted, textTransform: 'uppercase',
        }}>
          {kindLabel}
        </span>
        {onSaveToLibrary && (
          <button
            type="button"
            onClick={onSaveToLibrary}
            disabled={savedToLibrary}
            title={savedToLibrary
              ? 'Already copied to I/O library this session'
              : 'Copy this item to the global I/O library as a new entry'}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              letterSpacing: 1,
              borderRadius: 4,
              border: `1px solid ${savedToLibrary ? COLORS.border : `${COLORS.accent}80`}`,
              background: savedToLibrary ? 'transparent' : `${COLORS.accent}14`,
              color: savedToLibrary ? COLORS.muted : COLORS.accent,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: savedToLibrary ? 'default' : 'pointer',
              fontWeight: 600,
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {savedToLibrary ? '✓ in I/O' : '↗ save to I/O'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
