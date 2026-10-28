import { describe, expect, it } from 'vitest';
import { allSwatches, PALETTES, UNTHREADED, type ColorSwatch } from './palettes';

/** WCAG contrast ratio between two hex colors. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const colorSwatches = (): [string, ColorSwatch][] => [
  ['no threads', UNTHREADED],
  ...Object.values(PALETTES).flatMap((palette) =>
    allSwatches(palette)
      .filter((swatch): swatch is ColorSwatch => swatch.kind === 'color')
      .map((swatch, i): [string, ColorSwatch] => [`${palette.name} #${i + 1}`, swatch]),
  ),
];

describe('palettes', () => {
  // WCAG 1.4.11: shapes people need to see must reach 3:1 against what's around them.
  // The pill's edge is what separates it from the white timeline, so the edge carries it.
  it.each(colorSwatches())('%s: edge contrasts at least 3:1 with the white timeline', (_name, swatch) => {
    expect(contrast(swatch.edge, '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('keeps the no-threads pill distinct from white', () => {
    expect(UNTHREADED.fill).not.toBe('#ffffff');
  });
});
