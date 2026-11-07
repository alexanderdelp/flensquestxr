import { describe, expect, it } from 'vitest';
import { ellipseSpans, linePixels, outline, polygonSpans } from '../../../src/ui/pixel';

const area = (s: [number, number, number][]) => s.reduce((n, [, a, b]) => n + b - a, 0);

describe('Pixelwerkzeuge der Sprites', () => {
  it('Ellipse ist symmetrisch und hat etwa die Kreisfläche', () => {
    const s = ellipseSpans(32, 32, 10, 10);
    expect(Math.abs(area(s) - Math.PI * 100)).toBeLessThan(20);
    for (const [, x0, x1] of s) expect(x0 + x1).toBe(64);
    expect(s[0][0]).toBe(22);
    expect(s.at(-1)![0]).toBe(41);
    expect(ellipseSpans(5, 5, 0, 3)).toEqual([]);
  });

  it('Vieleck füllt ein Rechteck genau', () => {
    const s = polygonSpans([[2, 3], [10, 3], [10, 7], [2, 7]]);
    expect(s).toEqual([3, 4, 5, 6].map((y) => [y, 2, 10]));
    expect(polygonSpans([[0, 0], [1, 1]])).toEqual([]);
  });

  it('Linie ohne Lücken in beide Richtungen', () => {
    const p = linePixels(0, 0, 5, 2);
    expect(p[0]).toEqual([0, 0]);
    expect(p.at(-1)).toEqual([5, 2]);
    for (let i = 1; i < p.length; i++) expect(Math.max(Math.abs(p[i][0] - p[i - 1][0]), Math.abs(p[i][1] - p[i - 1][1]))).toBe(1);
    expect(linePixels(3, 3, 3, 0)).toHaveLength(4);
  });

  it('Kontur legt einen dunklen Rand in Eigenfarbe um feste Pixel, nicht um Schatten', () => {
    const w = 5, h = 5, d = new Uint8ClampedArray(w * h * 4);
    const set = (x: number, y: number, c: number[]) => d.set(c, (y * w + x) * 4);
    const get = (x: number, y: number) => Array.from(d.slice((y * w + x) * 4, (y * w + x) * 4 + 4));
    set(2, 2, [200, 100, 50, 255]);
    set(0, 0, [0, 0, 0, 70]);
    outline(d, w, h, 0.5);
    expect(get(2, 1)).toEqual([100, 50, 25, 255]);
    expect(get(1, 2)).toEqual([100, 50, 25, 255]);
    expect(get(1, 1)[3]).toBe(0);
    expect(get(2, 2)).toEqual([200, 100, 50, 255]);
    expect(get(0, 0)).toEqual([0, 0, 0, 70]);
    expect(get(1, 0)[3]).toBe(0);
  });
});
