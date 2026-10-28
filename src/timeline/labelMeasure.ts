import { useEffect, useState } from 'react';

/** The font timeline titles are drawn in; keep in step with `.tl-label` in timeline.css. */
const LABEL_FONT = '12px Lato, system-ui, sans-serif';

export type MeasureText = (text: string) => number;

let canvas: HTMLCanvasElement | null = null;

/**
 * Returns a function that gives the width of a title in the label font, with
 * its own cache. A small margin covers sub-pixel differences between canvas
 * and DOM text.
 */
export function createLabelMeasurer(): MeasureText {
  const widths = new Map<string, number>();
  return (text) => {
    const cached = widths.get(text);
    if (cached !== undefined) return cached;
    canvas ??= document.createElement('canvas');
    const context = canvas.getContext('2d');
    let width = text.length * 7;
    if (context) {
      context.font = LABEL_FONT;
      width = Math.ceil(context.measureText(text).width * 1.03) + 2;
    }
    widths.set(text, width);
    return width;
  };
}

const fontsLoaded = () => typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded';

/**
 * A label measurer that is replaced once web fonts finish loading, so titles
 * are measured in the real font. Anything memoised on it re-runs then.
 */
export function useLabelMeasurer(): MeasureText {
  const [measure, setMeasure] = useState(createLabelMeasurer);
  useEffect(() => {
    if (fontsLoaded()) return;
    let live = true;
    document.fonts.ready.then(() => {
      if (live) setMeasure(() => createLabelMeasurer());
    });
    return () => {
      live = false;
    };
  }, []);
  return measure;
}
