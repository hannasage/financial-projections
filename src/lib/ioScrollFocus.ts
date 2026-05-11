/**
 * Scroll an I/O list row into view (smooth) and focus the first editable control.
 * Waits for the next frame(s) so the row exists after React + Zustand update.
 */
export function scrollIoItemIntoViewAndFocus(id: string): void {
  const run = (): boolean => {
    const root = document.querySelector<HTMLElement>(`[data-io-item="${CSS.escape(id)}"]`);
    if (!root) return false;

    const smooth = typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });

    const nodes = root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="range"]), select, textarea',
    );
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.disabled) continue;
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      el.focus({ preventScroll: true });
      break;
    }
    return true;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (run()) return;
      requestAnimationFrame(() => { run(); });
    });
  });
}
