/**
 * Scroll an I/O list row into view (smooth) and focus the first editable control.
 * Waits for the next frame(s) so the row exists after React + Zustand update.
 *
 * WebKit (Safari): `scrollIntoView({ behavior: 'smooth' })` is unreliable; use
 * `document.scrollingElement.scrollTo` for the vertical document scroll. Callers
 * should wrap library mutations in `flushSync` so the new row is committed while
 * still inside the user gesture (needed for iOS to allow programmatic focus).
 */

function queryIoRoot(id: string): HTMLElement | null {
  const sel = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? `[data-io-item="${CSS.escape(id)}"]`
    : `[data-io-item="${id.replace(/"/g, '')}"]`;
  return document.querySelector<HTMLElement>(sel);
}

function scrollRowIntoView(root: HTMLElement, smooth: boolean): void {
  const r = root.getBoundingClientRect();
  const se = document.scrollingElement ?? document.documentElement;
  const viewH = window.innerHeight || se.clientHeight;
  const currentY = se.scrollTop;
  const targetY = currentY + r.top - (viewH - r.height) / 2;
  const maxY = Math.max(0, se.scrollHeight - se.clientHeight);
  const top = Math.max(0, Math.min(targetY, maxY));
  try {
    se.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  } catch {
    se.scrollTop = top;
  }
}

function focusFirstField(root: HTMLElement): void {
  const nodes = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input:not([type="hidden"]):not([type="range"]), select, textarea',
  );
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el.disabled) continue;
    const st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
    break;
  }
}

export function scrollIoItemIntoViewAndFocus(id: string): void {
  const smooth = typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const run = (): boolean => {
    const root = queryIoRoot(id);
    if (!root) return false;

    scrollRowIntoView(root, smooth);
    // Defer focus until after scroll + layout so WebKit does not cancel smooth scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => focusFirstField(root));
    });
    return true;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (run()) return;
      requestAnimationFrame(() => {
        if (run()) return;
        setTimeout(() => { run(); }, 0);
        setTimeout(() => { run(); }, 80);
      });
    });
  });
}
