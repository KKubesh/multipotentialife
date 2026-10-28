import { useEffect, useRef, type ReactNode } from 'react';
import './detail.css';

export interface DetailPanelProps {
  /** Changes when the panel shows something else, so focus moves to the new heading. */
  contentKey: string;
  /** Id of the heading that names the panel. */
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The detail panel: a bottom sheet on phones, a right-side drawer on wider
 * screens (the CSS decides). It closes with ✕, Escape, or a tap anywhere
 * outside it, except on another role, which switches to that role instead.
 */
export function DetailPanel({ contentKey, labelledBy, onClose, children }: DetailPanelProps) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Return focus to whatever opened the panel (usually the pill) when it closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // Move focus to the heading each time the panel shows something new, so screen readers announce it.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>(`#${CSS.escape(labelledBy)}`)?.focus({ preventScroll: true });
  }, [contentKey, labelledBy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    // On click (not pointer-down), so whatever was tapped gets its click before the timeline widens back.
    const onClickAway = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || panel.current?.contains(target) || target.closest('[data-select]')) return;
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClickAway);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClickAway);
    };
  }, []);

  return (
    <aside ref={panel} className="detail" role="dialog" aria-modal="false" aria-labelledby={labelledBy}>
      <span className="detail-grabber" aria-hidden="true" />
      <button type="button" className="detail-close" aria-label="Close" onClick={onClose}>
        ✕
      </button>
      <div className="detail-body">{children}</div>
    </aside>
  );
}
