import { useEffect, useRef } from 'react';

export interface GrowingTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter, Escape or leaving the field. */
  onDone?: () => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * A single-line field that wraps onto more lines as the text grows. Line
 * breaks aren't allowed: Enter finishes instead.
 */
export function GrowingTextarea({ value, onChange, onDone, autoFocus, className = 'grow' }: GrowingTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!autoFocus || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || (e.key === 'Escape' && onDone)) {
          e.preventDefault();
          onDone?.();
        }
      }}
    />
  );
}
