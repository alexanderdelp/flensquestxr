/*
 Pixelwerkzeuge für die Sprites: Formen werden in ganze Rasterpunkte zerlegt, damit auch Kreise,
 Schrägen und Vielecke scharfe Pixel-Art bleiben. Alles hier ist reine Rechnung ohne Canvas und
 dadurch einzeln testbar; sprites.ts malt die Spannen dann als Rechtecke.
*/

/** Waagerechte Spanne: Zeile y, von x0 bis ausschließlich x1. */
export type Span = [y: number, x0: number, x1: number];

/** Gefüllte Ellipse um (cx, cy) mit den Halbachsen rx, ry, gemessen an Pixelmitten. */
export function ellipseSpans(cx: number, cy: number, rx: number, ry: number): Span[] {
  const out: Span[] = [];
  if (rx <= 0 || ry <= 0) return out;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const w = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - w), x1 = Math.round(cx + w);
    if (x1 > x0) out.push([y, x0, x1]);
  }
  return out;
}

/** Gefülltes Vieleck (gerade-ungerade-Regel), abgetastet an Pixelmitten. */
export function polygonSpans(pts: [number, number][]): Span[] {
  const out: Span[] = [];
  if (pts.length < 3) return out;
  const ys = pts.map((q) => q[1]);
  for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++) {
    const sy = y + 0.5, xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
      if (x1 > x0) out.push([y, x0, x1]);
    }
  }
  return out;
}

/** Linie von Pixel zu Pixel (Bresenham), ohne Lücken. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const out: [number, number][] = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Ab dieser Deckkraft gilt ein Pixel als fest; Schatten und Geister bleiben ohne Kontur. */
const SOLID = 200;

/**
 * Selektive Kontur: Jeder durchsichtige oder halbdurchsichtige Pixel neben einem festen Pixel
 * bekommt die abgedunkelte Farbe dieses Nachbarn. So bekommt jede Figur einen sauberen Rand
 * in ihrer eigenen Farbe statt eines harten Schwarz. Arbeitet direkt auf RGBA-Daten.
 */
export function outline(data: Uint8ClampedArray, w: number, h: number, dark = 0.55) {
  const src = data.slice();
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] >= SOLID;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (src[i + 3] >= SOLID) continue;
    // Oben zuerst: Ränder unter einer Fläche übernehmen deren Farbe.
    const n = [[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]].find(([a, b]) => solid(a, b));
    if (!n) continue;
    const j = (n[1] * w + n[0]) * 4;
    data[i] = src[j] * (1 - dark); data[i + 1] = src[j + 1] * (1 - dark); data[i + 2] = src[j + 2] * (1 - dark);
    data[i + 3] = 255;
  }
}
