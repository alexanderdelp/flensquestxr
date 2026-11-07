import type { HeroId, MonsterId } from '../content';
import { ellipseSpans, linePixels, outline, polygonSpans } from './pixel';

/**
 * Eigene Pixel-Art, zur Laufzeit gezeichnet und zwischengespeichert. Raster 64 × 64:
 * SPRITE ist das Raster, in dem gezeichnet wird, RES die Pixelgröße der fertigen Bilder.
 */
export const SPRITE = 64;
export const RES = SPRITE;

/** Malwerkzeug im Raster: Rechteck, Ellipse, Vieleck und Linie, alles in ganzen Rasterpunkten. */
export interface Brush {
  r(x: number, y: number, w: number, h: number, c: string): void;
  e(cx: number, cy: number, rx: number, ry: number, c: string): void;
  g(pts: [number, number][], c: string): void;
  l(x0: number, y0: number, x1: number, y1: number, c: string, t?: number): void;
}

const cache = new Map<string, HTMLCanvasElement>();

/** ol: selektive Kontur um alles Feste (Figuren, Gegner, Dinge); Boden, Wände und Türen bleiben ohne. */
function sprite(key: string, draw: (b: Brush) => void, flip = false, ol = true): HTMLCanvasElement {
  const k = `${key}${flip ? ':f' : ''}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  const ctx = c.getContext('2d', { willReadFrequently: ol })!;
  if (flip) { ctx.translate(RES, 0); ctx.scale(-1, 1); }
  const spans = (s: [number, number, number][], col: string) => { ctx.fillStyle = col; for (const [y, x0, x1] of s) ctx.fillRect(x0, y, x1 - x0, 1); };
  draw({
    r: (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    e: (cx, cy, rx, ry, col) => spans(ellipseSpans(cx, cy, rx, ry), col),
    g: (pts, col) => spans(polygonSpans(pts), col),
    l: (x0, y0, x1, y1, col, t = 1) => { ctx.fillStyle = col; for (const [x, y] of linePixels(x0, y0, x1, y1)) ctx.fillRect(x, y, t, t); },
  });
  if (ol) {
    const img = ctx.getImageData(0, 0, RES, RES);
    outline(img.data, RES, RES);
    ctx.putImageData(img, 0, 0);
  }
  cache.set(k, c);
  return c;
}

export const toDataUrl = (c: HTMLCanvasElement) => c.toDataURL('image/png');

const SHADOW = 'rgba(0,0,0,.28)';
const SKIN = '#f0c39a';
const SKIN_D = '#d39a72';
const BLUSH = '#eaa085';
const INK = '#23232d';
const WHITE = '#fbfbf5';
const GOLD = '#e0ac3c';
const GOLD_L = '#f1cf6a';
const WOOD = '#8a5a2b';

const hi = (c: string, k = 0.22) => shade(c, k);
const lo = (c: string, k = 0.25) => shade(c, -k);

interface Look { shirt: string; shirtD: string; pants: string; boots: string }

/** Grundkörper aller Figuren. Liefert das Wippen d in Rasterpunkten. */
function person(b: Brush, l: Look, frame: number, gear: string[], mood: number) {
  const { r, e } = b;
  const d = frame === 1 ? 2 : 0;
  const stepL = frame === 2 ? 4 : 0, stepR = frame === 3 ? 4 : 0;
  const stiefel = gear.includes('gummistiefel');
  const nerz = gear.includes('friesennerz');
  e(32, 60, 17, 3, SHADOW);
  // Beine
  r(22, 46, 8, 12 - stepL, l.pants); r(34, 46, 8, 12 - stepR, l.pants);
  r(22, 46, 2, 12 - stepL, hi(l.pants, 0.12)); r(34, 46, 2, 12 - stepR, hi(l.pants, 0.12));
  // Schuhe, mit Gummistiefeln hoch und grün
  const boot = stiefel ? '#2e8b57' : l.boots, bootH = stiefel ? 13 : 6;
  for (const [x, s] of [[21, stepL], [33, stepR]]) {
    r(x, 61 - bootH - s, 10, bootH, boot);
    r(x, 59 - s, 11, 2, lo(boot));
    r(x + 1, 62 - bootH - s, 2, bootH - 3, hi(boot, 0.18));
    if (stiefel) { r(x - 1, 61 - bootH - s, 12, 2, '#57b47f'); r(x + 4, 52 - s, 3, 3, '#f3c623'); }
  }
  // Rumpf und Arme; der Friesennerz ist länger, gelb und hat eine Knopfleiste
  const coat = nerz ? '#f3c623' : l.shirt, coatD = nerz ? '#c99a12' : l.shirtD, long = nerz ? 5 : 0;
  r(18, 30 + d, 28, 18 + long - d, coat);
  r(19, 30 + d, 26, 2, hi(coat, 0.18));
  r(41, 32 + d, 5, 16 + long - d, coatD);
  r(18, 44 + long, 28, 4, coatD);
  r(12, 32 + d, 6, 15, coatD); r(46, 32 + d, 6, 15, coatD);
  r(12, 32 + d, 2, 14, coat); r(46, 32 + d, 2, 14, hi(coatD, 0.1));
  e(15, 49 + d, 3.5, 3, SKIN); e(49, 49 + d, 3.5, 3, SKIN);
  if (nerz) {
    r(31, 30 + d, 2, 23 - d, '#c99a12');
    for (const y of [35, 41, 47]) r(28, y + d, 2, 2, INK);
    r(19, 28 + d, 26, 4, '#ffd94a'); r(19, 31 + d, 26, 1, '#c99a12');
    r(13, 40 + d, 4, 1, '#ffd94a'); r(47, 40 + d, 4, 1, '#ffd94a');
  }
  // Kopf
  e(32, 21 + d, 12, 10.5, SKIN);
  e(20.5, 22 + d, 2, 3, SKIN_D); e(43.5, 22 + d, 2, 3, SKIN_D);
  r(25, 30 + d, 14, 1, SKIN_D);
  r(41, 18 + d, 2, 9, hi(SKIN_D, 0.25));
  // Augen mit Glanzpunkt, Wangen, Mund nach Laune
  r(25, 19 + d, 4, 5, INK); r(35, 19 + d, 4, 5, INK);
  r(25, 19 + d, 2, 2, '#ffffff'); r(35, 19 + d, 2, 2, '#ffffff');
  r(22, 25 + d, 4, 2, BLUSH); r(38, 25 + d, 4, 2, BLUSH);
  r(31, 23 + d, 2, 2, SKIN_D);
  const mouth = '#9a4a3a';
  if (mood) {
    r(29, 27 + d, 6, 1, mouth); r(28, 28 + d, 1, 1, mouth); r(35, 28 + d, 1, 1, mouth);
    // finstere Brauen
    b.l(24, 15 + d, 29, 17 + d, INK, 2); b.l(39, 15 + d, 34, 17 + d, INK, 2);
  } else {
    r(29, 28 + d, 6, 1, mouth); r(28, 27 + d, 1, 1, mouth); r(35, 27 + d, 1, 1, mouth);
  }
  return d;
}

/** Waffe der Figur; mit Bootshaken ersetzt der Haken sie. */
function weapon(b: Brush, d: number, gear: string[], own: (d: number) => void) {
  if (!gear.includes('bootshaken')) { own(d); return; }
  const { r } = b;
  r(54, 6 + d, 3, 55, WOOD); r(54, 6 + d, 1, 55, hi(WOOD));
  r(53, 4 + d, 9, 4, '#d9a441'); r(59, 4 + d, 4, 11, '#d9a441'); r(56, 12 + d, 5, 3, '#d9a441');
  r(54, 4 + d, 6, 1, GOLD_L); r(60, 5 + d, 1, 8, GOLD_L);
  r(53, 22 + d, 5, 2, '#7a3a14'); r(53, 26 + d, 5, 2, '#7a3a14');
}

/** Langes Haar hinter dem Körper. */
function longHair(b: Brush, a: number, c: string) {
  b.e(32, 22 + a, 18, 13, c);
  b.r(14, 22 + a, 36, 28, c);
  b.r(14, 48 + a, 6, 3, c); b.r(44, 48 + a, 6, 3, c);
}

/** Strähnen und Pony vor dem Gesicht. */
function hairFront(b: Brush, d: number, c: string, light: string, dark: string) {
  const { r } = b;
  r(16, 15 + d, 6, 36, c); r(42, 15 + d, 6, 36, c);
  r(17, 18 + d, 2, 30, light); r(20, 16 + d, 1, 30, dark);
  r(45, 18 + d, 2, 30, light); r(43, 16 + d, 1, 30, dark);
  r(20, 11 + d, 24, 5, c);
  r(23, 12 + d, 2, 3, light); r(31, 12 + d, 1, 4, dark); r(37, 12 + d, 2, 3, light);
}

const HERO: Record<HeroId, (b: Brush, f: number, gear: string[], mood: number) => void> = {
  nordhexe(b, f, gear, mood) {
    const { r, e, g } = b;
    const a = f === 1 ? 2 : 0, hair = '#e9c356';
    longHair(b, a, hair);
    const d = person(b, { shirt: '#2a5fc4', shirtD: '#1b3f8c', pants: '#1b2f66', boots: '#141e3d' }, f, gear, mood);
    if (!gear.includes('friesennerz')) {
      r(18, 44, 28, 4, '#1b3f8c'); r(30, 30 + d, 4, 13, '#9fc3ff');
      r(31, 33 + d, 2, 2, GOLD); r(31, 38 + d, 2, 2, GOLD);
      r(22, 37 + d, 1, 1, '#cfe0ff'); r(38, 41 + d, 1, 1, '#cfe0ff'); r(25, 43, 1, 1, '#cfe0ff');
    }
    hairFront(b, d, hair, '#fff3b8', '#c9942e');
    // Spitzer Hut in Nordseeblau, Spitze zur Seite geknickt, mit weißem Band und Mond
    e(32, 12 + d, 22, 3.5, '#1b2f66');
    g([[20, 11 + d], [44, 11 + d], [38, 2 + d], [33, 0 + d], [27, 3 + d]], '#24479a');
    g([[36, 3 + d], [40, 0 + d], [47, 1 + d], [49, 4 + d], [41, 4 + d]], '#24479a');
    r(26, 3 + d, 4, 6, '#3a62bf');
    r(21, 8 + d, 23, 2, '#f4f6fb');
    r(46, 4 + d, 3, 3, GOLD); r(47, 3 + d, 2, 1, GOLD_L);
    r(12, 12 + d, 40, 1, '#2b3f80');
    weapon(b, d, gear, (o) => {
      // Reisigbesen
      r(55, 8 + o, 2, 40, '#7a5230'); r(55, 8 + o, 1, 40, '#9a7248');
      g([[50, 47 + o], [61, 47 + o], [63, 60 + o], [48, 60 + o]], '#c9a35a');
      for (const x of [51, 54, 57, 60]) b.l(x, 50 + o, x + (x - 55) * 0.3, 59 + o, '#8a6a30');
      r(50, 46 + o, 12, 3, '#7a3a14');
    });
  },
  juni(b, f, gear, mood) {
    // Frühere Leuchtturm-Juni, nur noch für alte Spielstände.
    const { r, e } = b;
    const a = f === 1 ? 2 : 0, hair = '#e9c356';
    longHair(b, a, hair);
    const d = person(b, { shirt: '#2f6fd6', shirtD: '#1f4fa8', pants: '#27408b', boots: '#1c2f66' }, f, gear, mood);
    if (!gear.includes('friesennerz')) { r(28, 30 + d, 8, 17, '#7fb0f0'); r(18, 42, 28, 2, '#f4f6fb'); }
    hairFront(b, d, hair, '#fff3b8', '#c9942e');
    e(32, 10 + d, 13, 5, hair); r(18, 10 + d, 28, 2, '#2f6fd6');
    // Sturmlaterne
    r(5, 36 + d, 10, 2, '#1c2f66'); r(5, 38 + d, 2, 14, '#1c2f66'); r(13, 38 + d, 2, 14, '#1c2f66');
    r(7, 39 + d, 6, 12, f % 2 ? '#ffd76a' : '#ffb545'); r(9, 42 + d, 2, 6, '#fff2c0'); r(5, 52 + d, 10, 2, '#1c2f66');
    weapon(b, d, gear, (o) => {
      r(50, 32 + o, 9, 4, '#d8dde6'); r(56, 32 + o, 4, 6, '#1c2f66'); r(50, 30 + o, 4, 2, '#ff7a3c');
    });
  },
  frauke(b, f, gear, mood) {
    const { r, e, g } = b;
    const d = person(b, { shirt: '#2c6e8f', shirtD: '#1f5068', pants: '#3b3f55', boots: '#2b2b35' }, f, gear, mood);
    if (!gear.includes('friesennerz')) {
      for (const y of [34, 40]) { r(18, y + d, 28, 2, '#e8eef0'); r(12, y + d, 6, 2, '#c9d3d8'); r(46, y + d, 6, 2, '#c9d3d8'); }
    }
    // Rote Haare mit Zopf, Pudelmütze
    r(16, 15 + d, 5, 12, '#d9783a'); r(43, 15 + d, 5, 10, '#d9783a');
    r(14, 26 + d, 5, 16, '#d9783a'); r(15, 28 + d, 1, 12, '#f0a060'); r(14, 41 + d, 5, 2, '#2c6e8f');
    e(32, 13 + d, 13.5, 9, '#b5473c');
    r(18, 13 + d, 28, 4, '#7f2f28'); r(18, 13 + d, 28, 1, '#9b3a32');
    for (const x of [23, 29, 35, 41]) r(x, 6 + d, 1, 7, '#9b3a32');
    e(32, 3 + d, 3.5, 3, '#e8eef0');
    weapon(b, d, gear, (o) => {
      // Harpune mit Leine
      r(54, 6 + o, 2, 55, WOOD); r(54, 6 + o, 1, 55, hi(WOOD));
      g([[51, 7 + o], [59, 7 + o], [55, 0 + o]], '#c8d3d8'); r(55, 1 + o, 1, 5, '#eef4f6');
      r(50, 8 + o, 2, 3, '#c8d3d8'); r(58, 8 + o, 2, 3, '#c8d3d8');
      b.l(56, 20 + o, 60, 30 + o, '#e8dcc0'); b.l(60, 30 + o, 57, 40 + o, '#e8dcc0');
    });
  },
  joern(b, f, gear, mood) {
    const { r, e } = b;
    const d = person(b, { shirt: '#d9662b', shirtD: '#a84a1c', pants: '#c7551f', boots: '#3a2a1e' }, f, gear, mood);
    if (!gear.includes('friesennerz')) {
      r(22, 30 + d, 3, 17, '#7a3412'); r(39, 30 + d, 3, 17, '#7a3412');
      r(22, 36 + d, 3, 2, GOLD); r(39, 36 + d, 3, 2, GOLD);
    }
    // Vollbart und Schnauzer
    e(32, 28 + d, 11, 6, '#d8b25a'); r(22, 22 + d, 3, 6, '#d8b25a'); r(39, 22 + d, 3, 6, '#d8b25a');
    r(26, 25 + d, 12, 3, '#c49a40'); r(30, 28 + d, 4, 2, '#9b5a3c');
    r(26, 30 + d, 2, 3, '#ecd08a'); r(33, 31 + d, 2, 2, '#ecd08a');
    // Schiffermütze mit Kordel
    e(32, 10 + d, 14, 6, '#f2f2ea'); r(18, 10 + d, 28, 4, '#f2f2ea');
    r(16, 14 + d, 32, 2, '#c9c9bd'); r(18, 12 + d, 28, 2, '#2a3f6b');
    r(22, 6 + d, 6, 2, '#ffffff');
    weapon(b, d, gear, (o) => {
      // Fäustel
      r(52, 22 + o, 4, 28, WOOD); r(52, 22 + o, 1, 28, hi(WOOD));
      r(46, 15 + o, 16, 8, '#aeb9bf'); r(46, 15 + o, 16, 2, '#d5dde1'); r(46, 21 + o, 16, 2, '#7c8a92');
    });
  },
  maren(b, f, gear, mood) {
    const { r, e } = b;
    const d = person(b, { shirt: '#6f4aa0', shirtD: '#4f3377', pants: '#433255', boots: '#2d2438' }, f, gear, mood);
    if (!gear.includes('friesennerz')) { r(18, 36 + d, 28, 2, '#9a78c8'); r(29, 30 + d, 6, 5, '#d7d9e3'); }
    // Silbernes Haar, Feder im Haar
    r(18, 8 + d, 28, 8, '#d7d9e3'); e(32, 10 + d, 14, 5, '#d7d9e3');
    r(16, 14 + d, 4, 26, '#d7d9e3'); r(44, 14 + d, 4, 26, '#d7d9e3');
    r(17, 16 + d, 1, 22, '#ffffff'); r(46, 16 + d, 1, 22, '#b9bccb');
    r(24, 9 + d, 3, 2, '#ffffff'); r(35, 10 + d, 4, 1, '#b9bccb');
    r(40, 2 + d, 4, 10, WHITE); r(41, 0 + d, 2, 3, '#9fb6c6'); r(42, 3 + d, 1, 8, '#c9d3da');
    // Kleine Möwe auf der Hand, flattert
    const w = f % 2;
    e(9, 25 + d, 6, 4, WHITE); e(16, 21 + d, 3.5, 3.5, WHITE);
    r(18, 21 + d, 3, 2, '#f1a93b'); r(16, 20 + d, 1, 1, INK);
    r(3, 21 + d - w * 4, 9, 4, '#9fb6c6'); r(2, 21 + d - w * 4, 3, 3, '#3c4650');
    weapon(b, d, gear, () => undefined);
  },
  hinnerk(b, f, gear, mood) {
    const { r, e } = b;
    const d = person(b, { shirt: '#f0ece0', shirtD: '#cfc8b5', pants: '#3a3026', boots: '#241b14' }, f, gear, mood);
    if (!gear.includes('friesennerz')) {
      r(21, 30 + d, 22, 18 - d, '#7b4f27'); r(29, 30 + d, 6, 18 - d, '#f0ece0');
      r(21, 30 + d, 2, 18 - d, '#93633a');
      r(37, 34 + d, 6, 2, '#a83232'); r(39, 32 + d, 2, 6, '#a83232');
      r(31, 30 + d, 2, 3, '#a83232');
    }
    // Schnauzer und Zylinder mit rotem Band
    r(23, 24 + d, 18, 3, '#5a3b1e'); r(21, 25 + d, 3, 3, '#5a3b1e'); r(40, 25 + d, 3, 3, '#5a3b1e');
    r(24, 24 + d, 6, 1, '#7a5530');
    r(15, 10 + d, 34, 3, '#1f1b18');
    r(20, 0 + d, 24, 11, '#2b2622'); r(20, 0 + d, 3, 11, '#3d3631');
    r(20, 6 + d, 24, 3, '#a83232');
    // Arzneiflasche
    r(6, 40 + d, 8, 12, '#7a3a14'); r(8, 36 + d, 4, 4, '#7a3a14'); r(8, 34 + d, 4, 2, '#d9cfb4');
    r(6, 44 + d, 8, 4, '#e8dcc0'); r(7, 41 + d, 1, 3, '#a85a2c');
    e(15, 49 + d, 3.5, 3, SKIN);
    weapon(b, d, gear, (o) => {
      r(52, 22 + o, 2, 39, '#5a3b1e'); e(53, 20 + o, 3.5, 2.5, '#d9a441'); r(52, 19 + o, 1, 1, GOLD_L);
    });
  },
};

/** Laune nach Lebenspunkten: 0 unversehrt, 1 angeschlagen, 2 schwer angeschlagen. */
export const moodOf = (hp: number, maxHp: number) => (hp >= maxHp ? 0 : hp * 2 <= maxHp ? 2 : 1);

/** Blaues Auge, Pflaster und Kopfverband für schwer angeschlagene Figuren. */
function battered(b: Brush, d: number) {
  const { r } = b;
  r(33, 17 + d, 8, 8, '#6a4a86'); r(34, 18 + d, 6, 6, '#7d5a9c'); r(35, 21 + d, 4, 2, INK);
  r(22, 22 + d, 6, 4, '#f2e6cf'); r(24, 21 + d, 2, 6, '#f2e6cf'); r(24, 23 + d, 2, 2, '#c9a98a');
  r(19, 13 + d, 26, 3, '#f4f1e6'); r(19, 15 + d, 26, 1, '#d8d3c4');
  r(44, 12 + d, 4, 2, '#f4f1e6'); r(46, 14 + d, 3, 2, '#d8d3c4');
  r(27, 13 + d, 3, 2, '#c9584a');
}

function catEars(b: Brush, d: number) {
  const fur = '#3a3440', pink = '#f29ab8';
  for (const x of [16, 37]) {
    b.g([[x, 13 + d], [x + 11, 13 + d], [x + 5.5, 1 + d]], fur);
    b.g([[x + 3, 12 + d], [x + 8, 12 + d], [x + 5.5, 5 + d]], pink);
  }
  b.r(20, 12 + d, 24, 2, fur);
}

/** Möwe Piet, der Begleiter der Nordhexe: klein, frech, mittig im Raster. */
export const piet = (frame: number, flip = false) => sprite(`o:piet:${frame % 2}`, ({ r, e, g }) => {
  e(30, 34, 11, 6, '#d9dfe3'); e(29, 32, 10, 5, WHITE);
  e(41, 24, 6, 6, WHITE); r(43, 22, 2, 2, INK);
  g([[46, 25], [56, 27], [55, 30], [46, 29]], '#f1a93b'); r(52, 29, 2, 2, '#d9483a');
  g([[20, 30], [10, 31], [10, 35], [20, 36]], '#9fb6c6'); r(9, 31, 3, 4, '#3c4650');
  if (frame % 2) { g([[22, 30], [36, 30], [34, 12], [24, 10]], '#9fb6c6'); r(23, 10, 6, 4, '#3c4650'); }
  else { g([[22, 34], [36, 34], [34, 48], [24, 48]], '#9fb6c6'); r(23, 45, 6, 3, '#3c4650'); }
  r(26, 39, 2, 6, '#f1a93b'); r(32, 39, 2, 6, '#f1a93b');
}, flip);

export function heroSprite(id: HeroId, gear: string[], frame: number, flip = false, mood = 0, familiar = true) {
  return sprite(`h:${id}:${[...gear].sort().join()}:${frame}:${mood}:${familiar}`, (b) => {
    const d = frame === 1 ? 2 : 0;
    HERO[id](b, frame, gear, mood);
    // Für Porträts sitzt Piet auf der Schulter; auf dem Brett fliegt er selbst.
    if (id === 'nordhexe' && familiar) {
      const { r, e } = b;
      e(51, 27 + d, 7, 4, '#d9dfe3'); e(50, 26 + d, 6, 3.5, WHITE);
      e(56, 20 + d, 4, 4, WHITE); r(57, 18 + d, 2, 2, INK);
      r(60, 20 + d, 4, 2, '#f1a93b'); r(62, 22 + d, 2, 1, '#d9483a');
      r(45, 25 + d, 8, 3, '#9fb6c6'); r(42, 26 + d, 4, 2, '#3c4650');
    }
    if (mood === 2) battered(b, d);
    if (gear.includes('katzenohren')) catEars(b, d);
  }, flip);
}

/** Gestürzte Figur: liegend, mit Verband. */
export function heroDown(id: HeroId, gear: string[]) {
  const key = `hd:${id}:${[...gear].sort().join()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  const ctx = c.getContext('2d')!;
  const k = RES / 32;
  ctx.translate(16 * k, 24 * k); ctx.rotate(Math.PI / 2); ctx.translate(-24 * k, -16 * k);
  ctx.drawImage(heroSprite(id, gear, 0, false, 2, false), 0, 0);
  cache.set(key, c);
  return c;
}

function gull(b: Brush, f: number) {
  const { r, e, g } = b;
  e(32, 60, 14, 3, SHADOW);
  r(28, 46, 2, 12, '#f1a93b'); r(36, 46, 2, 12, '#f1a93b');
  r(25, 57, 7, 2, '#d98a2b'); r(33, 57, 7, 2, '#d98a2b');
  e(33, 40, 13, 8, '#d9dfe3'); e(32, 37, 12, 7, WHITE);
  e(46, 26, 7, 7, WHITE); r(51, 27, 2, 4, '#e8ecef');
  r(47, 23, 3, 3, INK); r(47, 23, 1, 1, '#ffffff');
  g([[52, 26], [62, 27], [62, 30], [52, 31]], '#f1a93b'); r(58, 30, 3, 2, '#d9483a');
  g([[21, 34], [7, 35], [7, 40], [22, 42]], '#9fb6c6'); r(6, 35, 4, 5, '#3c4650');
  // Flügel: oben nach hinten geschwungen, unten angelegt; Federn mit dunklen Spitzen
  if (f === 0) {
    g([[24, 35], [40, 34], [30, 18], [14, 10], [18, 22]], '#9fb6c6');
    g([[14, 10], [22, 14], [19, 18], [12, 12]], '#3c4650');
    b.l(24, 31, 34, 31, '#b8cad6'); b.l(22, 26, 30, 25, '#b8cad6');
  } else {
    g([[22, 34], [40, 34], [36, 46], [20, 50], [14, 44]], '#9fb6c6');
    g([[14, 44], [20, 50], [16, 52], [10, 46]], '#3c4650');
    b.l(22, 40, 34, 40, '#b8cad6');
  }
}

/** Gemeinsamer Körperbau für menschliche Gegner. Liefert das Wippen. */
function clerk(b: Brush, f: number, suit: string, dark: string, skin = SKIN) {
  const { r, e } = b;
  const d = f * 2;
  e(32, 60, 18, 3, SHADOW);
  r(22, 46, 8, 12, dark); r(34, 46, 8, 12, dark);
  r(20, 57, 11, 4, INK); r(33, 57, 11, 4, INK); r(21, 57, 4, 1, '#4a4a58'); r(34, 57, 4, 1, '#4a4a58');
  r(16, 28 + d, 32, 20 - d, suit); r(17, 28 + d, 30, 2, hi(suit, 0.15)); r(42, 30 + d, 6, 18 - d, lo(suit, 0.15));
  r(11, 30 + d, 6, 16, dark); r(47, 30 + d, 6, 16, dark);
  e(14, 47 + d, 3.5, 3, skin); e(50, 47 + d, 3.5, 3, skin);
  e(32, 19 + d, 12, 10, skin); r(41, 15 + d, 2, 8, hi(skin, 0.15));
  e(20.5, 20 + d, 2, 3, lo(skin, 0.15)); e(43.5, 20 + d, 2, 3, lo(skin, 0.15));
  r(25, 16 + d, 4, 4, INK); r(35, 16 + d, 4, 4, INK); r(25, 16 + d, 1, 1, '#ffffff'); r(35, 16 + d, 1, 1, '#ffffff');
  r(27, 25 + d, 10, 2, '#7a3a2a');
  return d;
}

/** Brille über den Augen der menschlichen Gegner. */
function glasses(b: Brush, d: number, frame = INK) {
  b.r(22, 14 + d, 9, 7, frame); b.r(33, 14 + d, 9, 7, frame); b.r(31, 16 + d, 2, 1, frame);
  b.r(23, 15 + d, 7, 5, '#eef6f8'); b.r(34, 15 + d, 7, 5, '#eef6f8');
  b.r(25, 16 + d, 3, 3, INK); b.r(36, 16 + d, 3, 3, INK);
}

const MONSTER: Record<MonsterId, (b: Brush, f: number) => void> = {
  moewenraeuber(b, f) {
    gull(b, f);
    b.r(38, 21, 18, 5, '#23232d'); b.r(46, 22, 4, 3, '#ff5a48');
    b.l(42, 18, 50, 20, '#b5302a', 2);
  },
  krischan(b, f) {
    const { r } = b;
    gull(b, f);
    r(10, 41, 12, 4, '#b5302a'); r(8, 44, 5, 6, '#b5302a');
    r(36, 16, 22, 6, '#1f3355'); r(40, 10, 14, 7, '#1f3355'); r(41, 11, 12, 1, '#2f4870');
    r(44, 12, 6, 3, GOLD); r(55, 20, 7, 2, '#111d33');
    r(24, 34, 6, 4, GOLD); r(32, 34, 6, 4, GOLD); r(24, 34, 6, 1, GOLD_L); r(32, 34, 6, 1, GOLD_L);
  },
  kellerkassierer(b, f) {
    const { r, e } = b;
    const d = clerk(b, f, '#4c6152', '#2f3f34', '#b9c98f');
    r(20, 6 + d, 24, 7, '#2b2622'); r(18, 11 + d, 28, 2, '#1f1b18');
    r(24, 32 + d, 16, 12, '#7a4a22'); r(24, 32 + d, 16, 2, '#94602f'); r(30, 36 + d, 4, 4, GOLD);
    e(54, 40 + d, 5, 5, GOLD); e(54, 40 + d, 3, 3, '#b58a2a'); r(53, 37 + d, 2, 1, GOLD_L);
    r(28, 22 + d, 8, 2, '#8aa060');
  },
  punktepruefer(b, f) {
    const { r } = b;
    const d = clerk(b, f, '#6a6f7c', '#454954');
    r(20, 7 + d, 24, 4, '#3a3a42');
    glasses(b, d);
    r(28, 28 + d, 8, 14, '#f4f4ee'); r(30, 30 + d, 4, 12, '#2a4a7c');
    r(48, 28 + d, 12, 18, '#7a5a34'); r(50, 30 + d, 8, 14, '#f4f0e0');
    r(51, 33 + d, 6, 1, '#8a8a8a'); r(51, 36 + d, 5, 1, '#8a8a8a'); r(52, 40 + d, 4, 2, '#b5302a');
  },
  schlurfer(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 58, 22, 5, 'rgba(70,120,140,.5)');
    r(22, 46, 8, 12, '#2d5a5a'); r(34, 46, 8, 12, '#2d5a5a');
    r(16, 26 + d, 32, 22 - d, '#3e7a78'); r(17, 26 + d, 30, 2, '#4f918e');
    r(10, 30 + d, 8, 22, '#336765'); r(46, 30 + d, 8, 22, '#336765');
    for (const x of [11, 14, 47, 50]) r(x, 50 + d, 2, 4, '#336765');
    e(32, 19 + d, 12, 10, '#7fb2a2');
    r(24, 15 + d, 6, 5, '#e8f2c0'); r(35, 15 + d, 6, 5, '#e8f2c0'); r(26, 17 + d, 2, 2, INK); r(37, 17 + d, 2, 2, INK);
    r(26, 25 + d, 12, 2, '#234a48'); r(28, 27 + d, 2, 2, '#e8f2c0');
    r(20, 6 + d, 24, 6, '#2f5f46'); r(16, 12 + d, 4, 14, '#2f5f46'); r(44, 12 + d, 4, 10, '#2f5f46');
    r(22, 7 + d, 4, 2, '#4f8a66'); r(34, 9 + d, 6, 1, '#4f8a66');
    r(14, 52 + d, 3, 3, '#9fd8e8'); r(48, 54 - d, 3, 3, '#9fd8e8'); r(30, 56, 2, 2, '#9fd8e8');
  },
  kalle(b, f) {
    const { r, e } = b;
    const d = clerk(b, f, '#2a3f6b', '#1b2a4a');
    e(32, 25 + d, 11, 6, '#3a2a1e'); r(26, 24 + d, 12, 2, '#3a2a1e'); r(29, 26 + d, 6, 2, '#7a3a2a');
    r(18, 4 + d, 28, 8, '#1b2a4a'); r(16, 10 + d, 32, 2, '#111a30'); r(28, 6 + d, 8, 4, GOLD); r(18, 4 + d, 28, 1, '#2b3f68');
    for (const y of [34, 40]) r(16, y + d, 32, 2, '#e8eef0');
    r(50, 12 + d, 8, 18, '#7a3a14'); r(52, 6 + d, 4, 6, '#7a3a14'); r(50, 18 + d, 8, 4, '#e8dcc0'); r(51, 13 + d, 1, 4, '#a85a2c');
  },
  fiete(b, f) {
    const { r } = b;
    const d = clerk(b, f, '#efe6d0', '#c9bda0');
    r(20, 6 + d, 24, 6, '#5a4a3a'); r(22, 6 + d, 6, 2, '#7a6a5a');
    glasses(b, d, '#5a4a3a');
    r(20, 30 + d, 24, 18 - d, '#2b3a5a'); r(20, 30 + d, 24, 2, '#3b4c70');
    r(12, 42 + d, 6, 6, '#1b2a4a'); r(46, 42 + d, 6, 6, '#1b2a4a'); r(24, 36 + d, 6, 6, '#1b2a4a');
    r(50, 20 + d, 12, 16, '#f4f0e0'); r(52, 24 + d, 8, 2, '#b5302a'); r(52, 28 + d, 6, 1, '#8a8a8a'); r(52, 31 + d, 7, 1, '#8a8a8a');
  },
  waechter(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 22, 3, SHADOW);
    r(14, 8 + d, 36, 50 - d, '#6e7480'); r(14, 8 + d, 36, 4, '#8d939e'); r(46, 12 + d, 4, 46 - d, '#5a606c');
    for (const y of [16, 30, 44]) {
      r(18, y + d, 28, 12, '#585e6a'); r(18, y + d, 28, 1, '#4a505a'); r(18, y + 11 + d, 28, 1, '#7a808c');
      r(28, y + 4 + d, 8, 4, GOLD); r(28, y + 4 + d, 8, 1, GOLD_L); r(20, y + 2 + d, 6, 2, '#f4f0e0');
    }
    r(22, 10 + d, 6, 4, '#ff5a3c'); r(36, 10 + d, 6, 4, '#ff5a3c'); r(23, 10 + d, 2, 1, '#ffb09a'); r(37, 10 + d, 2, 1, '#ffb09a');
    r(4, 24 + d, 10, 24, '#585e6a'); r(50, 24 - d, 10, 24, '#585e6a');
    r(4, 46 + d, 10, 4, '#454a54'); r(50, 46 - d, 10, 4, '#454a54');
  },
  proehl(b, f) {
    const { r } = b;
    const d = clerk(b, f, '#8a5a2b', '#5f3d1c');
    // Taucherhelm aus Messing mit Sichtfenster
    r(16, 6 + d, 32, 26, '#b58a3a'); r(16, 6 + d, 32, 3, '#d0a754'); r(44, 8 + d, 4, 24, '#946d2a');
    r(20, 12 + d, 24, 14, '#a9d8e8'); r(20, 12 + d, 24, 2, '#7a5a2a'); r(21, 14 + d, 6, 2, '#e4f6fb');
    r(24, 16 + d, 4, 4, INK); r(36, 16 + d, 4, 4, INK);
    for (const [x, y] of [[18, 8], [44, 8], [18, 28], [44, 28]]) r(x, y + d, 2, 2, '#7a5a2a');
    r(28, 2 + d, 8, 4, '#7a5a2a');
    r(52, 24 + d, 4, 24, '#7c8a92'); r(48, 18 + d, 12, 6, '#aeb9bf'); r(48, 18 + d, 12, 1, '#d5dde1');
    r(8, 50, 4, 4, '#9fd8e8'); r(12, 46, 2, 2, '#9fd8e8');
  },
  oberarchivar(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 22, 3, SHADOW);
    r(16, 28 + d, 32, 30 - d, '#3a2a5a'); r(16, 28 + d, 32, 2, '#4d3a72'); r(42, 30 + d, 6, 28 - d, '#2b1f45');
    r(10, 30 + d, 8, 20, '#2b1f45'); r(46, 30 + d, 8, 20, '#2b1f45');
    r(10, 42 + d, 8, 6, '#f4f0e0'); r(46, 42 + d, 8, 6, '#f4f0e0');
    r(28, 28 + d, 8, 24, GOLD); r(28, 28 + d, 2, 24, GOLD_L);
    for (const y of [32, 38, 44]) r(30, y + d, 4, 2, '#b5302a');
    e(32, 18 + d, 12, 10, SKIN);
    r(20, 6 + d, 24, 4, '#d7d7cf'); r(18, 10 + d, 4, 8, '#d7d7cf'); r(42, 10 + d, 4, 8, '#d7d7cf');
    glasses(b, d, GOLD);
    r(25, 16 + d, 3, 3, '#b5302a'); r(36, 16 + d, 3, 3, '#b5302a');
    b.l(23, 11 + d, 29, 13 + d, INK, 2); b.l(41, 11 + d, 35, 13 + d, INK, 2);
    r(26, 25 + d, 12, 2, '#7a3a2a');
    // Stempel schwingt
    r(52, 8 + d * 2, 6, 14, '#6b3a16'); r(48, 22 + d * 2, 14, 8, '#2b2b35'); r(48, 30 + d * 2, 14, 2, '#b5302a');
  },
  ratte(b, f) {
    const { r, e } = b;
    const c = '#6d6258', l = '#857a6e';
    e(33, 58, 20, 3, SHADOW);
    e(30, 46, 15, 9, c); e(28, 42, 11, 5, l);
    e(48, 42, 8, 7, l); r(54, 42, 6, 4, '#f0a8b0'); r(46, 38, 4, 4, '#ff5a48'); r(47, 38, 1, 1, '#ffd0c8');
    e(44, 32, 4, 4, '#f0a8b0'); e(44, 32, 2, 2, c);
    for (const x of [56, 58]) b.l(x, 44, x + 4, 46 + (x - 56), '#c8bdb0');
    r(20, 54, 6, 3, '#f0a8b0'); r(38, 54, 6, 3, '#f0a8b0');
    b.l(16, 46, 6, 42 + f * 4, '#f0a8b0', 2); b.l(6, 42 + f * 4, 1, 46 - f * 2, '#f0a8b0', 2);
    r(26, 40, 6, 1, '#9a8e80'); r(32, 44, 5, 1, '#5a5048');
  },
  schmuggler(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 17, 3, SHADOW);
    r(22, 46, 8, 12, '#2d2a33'); r(34, 46, 8, 12, '#2d2a33');
    r(20, 56, 11, 4, '#17151b'); r(34, 56, 11, 4, '#17151b');
    r(18, 30 + d, 28, 18 - d, '#1f4a52'); r(18, 30 + d, 28, 2, '#2d6470'); r(18, 44, 28, 4, '#7a3a14'); r(30, 44, 4, 4, GOLD);
    e(32, 21 + d, 12, 10, SKIN);
    e(32, 26 + d, 12, 6, '#2b2622'); r(20, 20 + d, 24, 4, '#2b2622');
    r(25, 17 + d, 4, 3, INK); r(35, 17 + d, 4, 3, INK);
    r(19, 15 + d, 26, 2, '#2b2622');
    r(18, 6 + d, 28, 9, '#7c1f2a'); r(18, 6 + d, 28, 2, '#9b2f3a'); r(44, 8 + d, 8, 4, '#7c1f2a'); r(50, 10 + d, 3, 6, '#7c1f2a');
    r(10, 32 + d, 8, 14, '#1f4a52'); r(46, 24 + d, 6, 22, '#1f4a52');
    r(48, 10 + d, 8, 16, '#3f7a3a'); r(50, 6 + d, 4, 4, '#3f7a3a'); r(48, 16 + d, 8, 4, '#e8dcc0'); r(49, 11 + d, 1, 4, '#6aa860');
  },
  krabbe(b, f) {
    const { r, e } = b;
    const d = f * 2, red = '#c8452e', light = '#df6a4a', dark = '#a93421';
    e(32, 58, 24, 3, SHADOW);
    for (const x of [8, 14]) { b.l(x + 6, 44, x - 2, 50 + d, dark, 2); b.l(56 - x, 44, 64 - x, 50 + d, dark, 2); }
    e(32, 40, 17, 12, red); e(30, 34, 12, 6, light); r(22, 32, 6, 3, '#f08a6a');
    r(36, 42, 6, 3, dark); r(26, 44, 12, 2, INK);
    r(22, 16, 3, 12, dark); r(39, 16, 3, 12, dark);
    e(23, 14, 4, 4, WHITE); e(40, 14, 4, 4, WHITE); r(24, 14, 2, 2, INK); r(41, 14, 2, 2, INK);
    e(8, 26 - d, 7, 6, red); r(1, 18 - d, 6, 8, light); r(10, 18 - d, 6, 8, light);
    e(56, 26 + d, 7, 6, red); r(48, 18 + d, 6, 8, light); r(57, 18 + d, 6, 8, light);
    b.l(14, 32, 18, 36, red, 3); b.l(50, 32, 46, 36, red, 3);
  },
  moewe(b, f) {
    gull(b, f);
    b.r(54, 30, 2, 10, '#f6d65a'); b.r(58, 30, 2, 8, '#f6d65a'); b.r(56, 31, 2, 6, '#e8b830');
  },
  knoellchen(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 16, 3, SHADOW);
    r(24, 48, 6, 10, '#2a3a52'); r(36, 48, 6, 10, '#2a3a52'); r(22, 57, 9, 3, INK); r(35, 57, 9, 3, INK);
    r(20, 30 + d, 26, 20 - d, '#2f4a73'); r(20, 30 + d, 26, 2, '#3f5f8f'); r(30, 30 + d, 6, 8, '#f4f0e0'); r(32, 31 + d, 2, 6, '#b5473c');
    e(33, 22 + d, 13, 9, '#7fae57'); r(16, 18 + d, 4, 8, '#7fae57'); r(46, 18 + d, 4, 8, '#7fae57');
    r(24, 19 + d, 6, 5, '#ffe16a'); r(36, 19 + d, 6, 5, '#ffe16a'); r(26, 21 + d, 2, 2, INK); r(38, 21 + d, 2, 2, INK);
    r(26, 28 + d, 14, 2, '#3d5a2b'); r(30, 30 + d, 2, 2, '#ffffff');
    r(18, 8 + d, 30, 8, '#1f3355'); r(16, 14 + d, 34, 2, '#111d33'); r(28, 10 + d, 8, 4, GOLD); r(18, 8 + d, 30, 1, '#2f4870');
    r(48, 30 + d, 12, 18, '#fbf7e6'); r(50, 34 + d, 8, 2, '#b5473c');
    r(50, 38 + d, 8, 1, '#8a8a8a'); r(50, 41 + d, 6, 1, '#8a8a8a'); r(50, 44 + d, 7, 1, '#8a8a8a');
  },
  rumgeist(b, f) {
    const { r, e } = b;
    const d = f === 0 ? 0 : 4;
    e(32, 60, 12, 3, 'rgba(0,0,0,.18)');
    const a = 'rgba(232,190,110,.82)', c = 'rgba(190,125,50,.82)', glow = 'rgba(255,230,170,.7)';
    e(32, 24 + d, 14, 15, a); r(16, 24 + d, 32, 18, a);
    e(22, 44 + d, 5, 6, a); e(32, 42 + d, 5, 4, a); e(42, 44 + d, 5, 6, a);
    e(27, 16 + d, 5, 4, glow);
    r(24, 20 + d, 6, 8, INK); r(36, 20 + d, 6, 8, INK); r(25, 21 + d, 2, 2, '#ffd76a'); r(37, 21 + d, 2, 2, '#ffd76a');
    e(32, 33 + d, 5, 3, INK);
    e(10, 30 + d, 5, 3, c); e(54, 30 + d, 5, 3, c);
    r(26, 48, 14, 10, '#6b3a16'); r(30, 44, 6, 4, '#6b3a16'); r(28, 52, 10, 4, '#e8dcc0'); r(27, 49, 2, 7, '#8a5025');
  },
  qualle(b, f) {
    const { r, e } = b;
    e(32, 60, 18, 3, 'rgba(0,0,0,.18)');
    const a = 'rgba(232,120,176,.85)', c = 'rgba(255,190,220,.9)';
    e(32, 22, 22, 13, a); r(10, 22, 44, 12, a);
    e(26, 16, 9, 5, c);
    r(22, 24, 4, 5, INK); r(38, 24, 4, 5, INK); r(22, 24, 1, 1, '#ffffff'); r(38, 24, 1, 1, '#ffffff');
    r(29, 30, 6, 1, '#a04a78');
    for (let i = 0; i < 5; i++) {
      const o = (i + f) % 2 ? 2 : -2, x = 13 + i * 9 + o;
      r(x, 34, 3, 12, a); r(x + o, 46, 3, 10, c); r(x, 56, 3, 2, a);
    }
  },
  klabauter(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 17, 3, SHADOW);
    r(22, 48, 8, 10, '#2b2f4a'); r(34, 48, 8, 10, '#2b2f4a'); r(20, 57, 11, 3, INK); r(34, 57, 11, 3, INK);
    r(18, 30 + d, 28, 18 - d, '#39456b'); for (const y of [34, 40]) r(18, y + d, 28, 2, '#d8d8e6');
    e(32, 22 + d, 12, 10, '#9fb86b'); e(16, 22 + d, 3, 5, '#9fb86b'); e(48, 22 + d, 3, 5, '#9fb86b');
    r(24, 18 + d, 6, 4, '#ff5a3c'); r(36, 18 + d, 6, 4, '#ff5a3c'); r(26, 19 + d, 2, 2, INK); r(38, 19 + d, 2, 2, INK);
    r(22, 26 + d, 20, 6, '#e8e8dc'); for (const x of [25, 30, 35, 39]) r(x, 26 + d, 1, 5, INK);
    r(18, 4 + d, 28, 10, '#b5302a'); r(40, 0 + d, 12, 8, '#b5302a'); r(50, 6 + d, 4, 4, '#f4f0e0'); r(18, 4 + d, 28, 2, '#d0483a');
    r(50, 20 + d, 4, 30, '#7a4a22'); r(44, 14 + d, 16, 8, '#54606a'); r(44, 14 + d, 16, 1, '#7a8690');
  },
  obermeister(b, f) {
    const { r, e } = b;
    const d = f * 2;
    e(32, 60, 22, 3, SHADOW);
    r(22, 46, 8, 12, '#3c4049'); r(34, 46, 8, 12, '#3c4049'); r(20, 57, 11, 4, INK); r(33, 57, 11, 4, INK);
    r(14, 26 + d, 36, 22 - d, '#5a606c'); r(14, 26 + d, 36, 2, '#6e7480');
    r(28, 26 + d, 8, 16, '#f4f4ee'); r(30, 28 + d, 4, 14, '#a82d2d');
    for (const [x, y] of [[24, 32], [38, 32], [24, 38], [38, 38]]) r(x, y + d, 2, 2, GOLD);
    e(32, 15 + d, 14, 11, SKIN); r(18, 22 + d, 28, 4, SKIN_D);
    r(19, 5 + d, 26, 2, '#b8b8b0'); r(17, 8 + d, 3, 8, '#b8b8b0'); r(44, 8 + d, 3, 8, '#b8b8b0');
    r(20, 12 + d, 10, 6, '#eef6f8'); r(34, 12 + d, 10, 6, '#eef6f8'); r(30, 14 + d, 4, 1, INK);
    r(24, 14 + d, 4, 4, INK); r(38, 14 + d, 4, 4, INK);
    b.l(20, 9 + d, 28, 11 + d, INK, 2); b.l(44, 9 + d, 36, 11 + d, INK, 2);
    r(26, 22 + d, 12, 2, '#7a3a2a');
    r(52, 16 + d * 2, 6, 12, '#6b3a16'); r(48, 28 + d * 2, 14, 6, '#2b2b35'); r(48, 34 + d * 2, 14, 2, '#b5302a');
    r(50, 36, 6, 12, '#5a606c'); r(8, 28 + d, 6, 20, '#5a606c');
  },
};

export function monsterSprite(id: MonsterId, frame: number, flip = false) {
  return sprite(`m:${id}:${frame % 2}`, (b) => MONSTER[id](b, frame % 2), flip);
}

export const objects = {
  chest: () => sprite('o:chest', ({ r, e }) => {
    e(32, 56, 22, 4, SHADOW);
    r(12, 24, 40, 14, '#9a5f2a'); e(32, 25, 20, 5, '#9a5f2a'); r(14, 21, 36, 2, '#b97a3a');
    r(12, 36, 40, 20, '#7a4620'); r(12, 36, 40, 2, '#2b1a0e');
    for (const y of [42, 48]) r(14, y, 36, 1, '#653a1a');
    r(12, 22, 4, 34, '#d9a441'); r(48, 22, 4, 34, '#d9a441'); r(12, 22, 1, 34, GOLD_L); r(48, 22, 1, 34, GOLD_L);
    r(28, 32, 8, 12, GOLD_L); r(28, 32, 8, 2, '#fff0a8'); r(31, 37, 2, 4, INK);
    r(18, 26, 2, 2, '#c08848'); r(40, 28, 3, 1, '#c08848');
  }),
  door: () => sprite('o:door', ({ r }) => {
    // Randlos: Die Zarge füllt das ganze Feld, sonst sieht man zwischen Tür und Wand durch.
    r(0, 0, 64, 64, '#3a2211');
    r(4, 4, 56, 56, '#4a2d16');
    for (let x = 6; x < 58; x += 11) {
      r(x, 5, 10, 54, '#7c4d26'); r(x, 5, 2, 54, '#93613a'); r(x + 9, 5, 1, 54, '#5e3a1c');
      r(x + 4, 12 + (x % 3) * 9, 1, 6, '#5e3a1c');
    }
    for (const y of [16, 42]) { r(4, y, 56, 5, '#2a2a30'); r(4, y, 56, 1, '#4a4a55'); for (const x of [8, 22, 36, 50]) r(x, y + 2, 2, 2, '#6a6a75'); }
    r(46, 27, 6, 9, GOLD); r(47, 28, 4, 2, GOLD_L); r(48, 32, 2, 2, INK);
  }, false, false),
  exit: () => sprite('o:exit', ({ r }) => {
    r(6, 8, 52, 50, '#2a1c12');
    ['#b09a78', '#937d5e', '#755f45', '#574533', '#3c2e22'].forEach((c, i) => {
      r(10 + i * 4, 12 + i * 9, 44 - i * 8, 9, c); r(10 + i * 4, 12 + i * 9, 44 - i * 8, 1, hi(c, 0.2));
    });
    r(6, 8, 52, 4, GOLD); r(6, 8, 52, 1, GOLD_L);
  }, false, false),
  logbuch: () => sprite('o:logbuch', ({ r, e }) => {
    e(32, 55, 20, 4, SHADOW);
    r(14, 16, 36, 38, '#7a2f2a'); r(14, 16, 36, 2, '#94403a'); r(18, 16, 4, 38, '#541f1b');
    r(46, 18, 4, 34, '#f0e4c6'); for (let y = 20; y < 52; y += 3) r(46, y, 4, 1, '#d8ccae');
    r(24, 22, 22, 14, '#f0e4c6'); r(26, 25, 18, 1, '#7a6a4a'); r(26, 29, 14, 1, '#7a6a4a'); r(26, 32, 16, 1, '#7a6a4a');
    r(28, 42, 12, 6, GOLD); r(30, 43, 8, 1, GOLD_L);
  }),
  schluessel: () => sprite('o:schluessel', ({ r, e, l }) => {
    e(32, 56, 18, 4, SHADOW);
    e(25, 21, 11, 11, GOLD); e(25, 21, 5, 5, '#3a2b1e'); r(18, 13, 4, 2, GOLD_L);
    l(32, 28, 48, 46, GOLD, 5); l(33, 29, 47, 43, GOLD_L, 1);
    r(42, 44, 6, 8, GOLD); r(48, 38, 8, 5, GOLD); r(38, 48, 5, 6, GOLD);
  }),
  karte: () => sprite('o:karte', ({ r, l }) => {
    r(10, 50, 44, 6, SHADOW);
    r(10, 16, 44, 36, '#ecdcae'); r(10, 16, 44, 4, '#c9b47d'); r(10, 48, 44, 4, '#c9b47d');
    r(24, 20, 1, 28, '#d8c896'); r(38, 20, 1, 28, '#d8c896');
    r(16, 24, 14, 6, '#7fb0a8'); r(26, 30, 14, 6, '#7fb0a8'); r(16, 24, 14, 1, '#a8d0c8');
    l(16, 42, 40, 36, '#7a6a4a');
    r(42, 34, 6, 2, '#b5302a'); r(44, 32, 2, 6, '#b5302a');
  }),
  netz: () => sprite('o:netz', ({ r }) => {
    const c = 'rgba(245,235,205,.9)';
    for (let i = 14; i < 54; i += 9) { r(i, 14, 2, 42, c); r(10, i, 46, 2, c); }
    for (let i = 14; i < 54; i += 9) for (let j = 14; j < 54; j += 9) r(i - 1, j - 1, 4, 4, '#d8c890');
  }, false, false),
  fischbroetchen: () => sprite('o:fisch', ({ r, e }) => {
    e(32, 52, 22, 4, SHADOW);
    e(32, 24, 22, 8, '#e8b873'); r(10, 24, 44, 8, '#d99f58'); e(26, 20, 8, 3, '#f4d4a0');
    r(18, 19, 2, 1, '#fff0d0'); r(30, 18, 2, 1, '#fff0d0'); r(40, 20, 2, 1, '#fff0d0');
    r(8, 32, 48, 6, '#79a65a'); for (let x = 8; x < 56; x += 6) r(x, 37, 4, 2, '#5f8c44');
    r(10, 36, 44, 4, '#c9d3da'); r(52, 34, 8, 6, '#a9b6bf'); r(54, 33, 4, 2, '#c9d3da'); r(14, 36, 30, 1, '#e8eef2');
    r(12, 34, 4, 2, '#e8e2f0');
    e(32, 44, 22, 5, '#c98b47'); r(10, 40, 44, 4, '#c98b47');
  }),
  friesennerz: () => sprite('o:nerz', ({ r }) => {
    r(18, 16, 28, 36, '#f3c623'); r(18, 16, 28, 2, '#ffd94a'); r(42, 18, 4, 34, '#c99a12');
    r(10, 18, 8, 26, '#c99a12'); r(46, 18, 8, 26, '#c99a12'); r(10, 18, 2, 26, '#e0b020');
    r(22, 10, 20, 8, '#ffd94a'); r(26, 12, 12, 4, '#c99a12');
    r(31, 18, 2, 34, '#c99a12'); for (const y of [24, 32, 40]) r(28, y, 2, 2, INK);
  }),
  bootshaken: () => sprite('o:haken', ({ r }) => {
    r(30, 14, 4, 46, WOOD); r(30, 14, 1, 46, hi(WOOD));
    r(30, 8, 16, 5, '#d9a441'); r(42, 8, 5, 14, '#d9a441'); r(36, 18, 8, 4, '#d9a441'); r(31, 8, 12, 1, GOLD_L);
    r(29, 30, 6, 2, '#7a3a14'); r(29, 34, 6, 2, '#7a3a14');
  }),
  katzenohren: () => sprite('o:katze', (b) => {
    const fur = '#3a3440';
    b.l(10, 56, 18, 46, fur, 3); b.l(18, 46, 46, 46, fur, 3); b.l(46, 46, 54, 56, fur, 3);
    catEars({ ...b, g: (pts, c) => b.g(pts.map(([x, y]) => [x, y + 32]), c), r: (x, y, w, h, c) => b.r(x, y + 32, w, h, c) }, 0);
  }),
  gummistiefel: () => sprite('o:stiefel', ({ r }) => {
    r(22, 12, 16, 36, '#2e8b57'); r(22, 44, 30, 10, '#2e8b57'); r(22, 54, 32, 4, '#1d5c39');
    r(20, 12, 20, 4, '#57b47f'); r(24, 18, 3, 28, '#4aa874'); r(28, 30, 6, 6, '#f3c623');
  }),
  akte: () => sprite('o:akte', ({ r, e }) => {
    e(32, 55, 20, 4, SHADOW);
    r(14, 16, 36, 38, '#d9c06a'); r(14, 16, 16, 4, '#c4a84f'); r(14, 20, 36, 1, '#e8d488');
    r(18, 24, 28, 24, '#f4f0e0');
    r(22, 28, 20, 1, '#7a6a4a'); r(22, 32, 16, 1, '#7a6a4a'); r(22, 36, 18, 1, '#7a6a4a');
    r(32, 40, 10, 6, '#b5302a'); r(33, 41, 8, 4, '#d04a3a');
  }),
  feder: () => sprite('o:feder', ({ r, e, l }) => {
    e(32, 55, 18, 4, SHADOW);
    r(14, 20, 36, 30, '#ecdcae'); r(18, 26, 24, 1, '#7a6a4a'); r(18, 32, 20, 1, '#7a6a4a'); r(18, 38, 22, 1, '#7a6a4a');
    l(44, 8, 34, 42, '#3c4650', 1);
    e(41, 18, 4, 11, WHITE); r(40, 10, 2, 18, '#c9d3da'); r(36, 14, 3, 10, '#9fb6c6');
  }),
  stempel: () => sprite('o:stempel', ({ r, e }) => {
    e(32, 56, 20, 4, SHADOW);
    e(32, 12, 8, 5, '#7a4a22'); r(28, 16, 8, 16, '#9a6732'); r(28, 16, 2, 16, '#b07a42');
    r(16, 32, 32, 14, GOLD); r(16, 32, 32, 3, GOLD_L);
    r(14, 46, 36, 6, '#b5302a'); r(14, 46, 36, 1, '#d04a3a');
  }),
  pumpe: () => sprite('o:pumpe', ({ r, e }) => {
    e(32, 56, 22, 4, SHADOW);
    r(16, 24, 32, 32, '#5f7078'); r(16, 24, 32, 4, '#83949c'); r(42, 28, 6, 28, '#4e5d64');
    r(28, 10, 8, 16, '#7c5a3a'); r(18, 8, 28, 4, '#b5532f'); r(18, 8, 28, 1, '#d0704a');
    r(48, 36, 12, 8, '#5f7078'); r(56, 44, 4, 4, '#4e5d64'); r(57, 50, 2, 3, '#9fd8e8');
    r(20, 36, 24, 4, '#3e4c52');
    for (const [x, y] of [[20, 30], [42, 30], [20, 50], [42, 50]]) r(x, y, 2, 2, '#a8b4ba');
  }),
  regal: () => sprite('o:regal', ({ r, e }) => {
    e(32, 58, 24, 3, SHADOW);
    r(10, 6, 44, 52, '#6b4a2a'); r(10, 6, 44, 2, '#86603a');
    const books = ['#c9b47d', '#a8452c', '#7fa8c0', '#e8dcc0', '#5f7a4a'];
    for (const y of [10, 26, 42]) {
      r(14, y, 36, 13, '#3f2c18');
      for (let x = 15, i = y; x < 47; i++) {
        const w = Math.min(3 + (i % 3), 50 - x), h = 10 + (i % 3);
        r(x, y + 13 - h, w, h, books[i % 5]); r(x, y + 13 - h, 1, h, hi(books[i % 5], 0.2));
        x += w + 1;
      }
    }
  }),
  fass: () => sprite('o:fass', ({ r, e }) => {
    e(32, 56, 20, 4, SHADOW);
    r(16, 14, 32, 42, '#8a5a2b'); r(12, 22, 40, 26, '#9a6732'); e(32, 14, 14, 3, '#6b4420'); e(32, 14, 11, 2, '#4f3218');
    for (const x of [20, 26, 32, 38, 44]) r(x, 15, 1, 41, '#6b4420');
    for (const y of [22, 44]) { r(12, y, 40, 4, '#3a3a42'); r(12, y, 40, 1, '#5a5a65'); }
    r(15, 26, 2, 18, '#b07a42');
  }),
  kiste: () => sprite('o:kiste', ({ r, e }) => {
    e(32, 56, 24, 4, SHADOW);
    r(10, 20, 44, 36, '#b58a4f'); r(10, 20, 44, 4, '#d0a766'); r(10, 52, 44, 4, '#8a6538');
    r(10, 20, 4, 36, '#8a6538'); r(50, 20, 4, 36, '#8a6538');
    r(16, 28, 32, 4, '#8a6538'); r(16, 40, 32, 4, '#8a6538'); r(28, 24, 8, 28, '#8a6538');
    for (const [x, y] of [[12, 22], [50, 22], [12, 52], [50, 52]]) r(x, y, 2, 2, '#4a3a2a');
    r(18, 33, 6, 1, '#c8a06a');
  }),
  sterne: (f: number) => sprite(`o:sterne:${f % 2}`, ({ r }) => {
    const c = '#ffe27a', o = f % 2 ? 4 : 0;
    for (const [x, y, s] of [[14 + o, 12, 2], [42 - o, 8, 2], [28, 4 + o, 2], [50 - o, 18, 1], [10 + o, 22, 1]]) {
      r(x, y, s * 2, s * 2, c); r(x - s, y + s / 2, s * 4, s, c); r(x + s / 2, y - s, s, s * 4, c);
    }
  }),
  wolke: (f: number) => sprite(`o:wolke:${f % 2}`, ({ r, e }) => {
    e(32, 30, 18, 8, '#4b5563'); e(24, 30, 12, 8, '#5d6775'); e(34, 24, 10, 8, '#6d7786'); e(42, 30, 12, 7, '#5d6775');
    e(30, 22, 6, 3, '#8a94a2');
    r(22, 42, 2, 5, '#7fb7d9'); r(36, 42, 2, 5, '#7fb7d9');
    if (f % 2) { r(30, 40, 4, 6, '#ffd76a'); r(28, 46, 4, 6, '#ffd76a'); r(30, 46, 2, 2, '#fff2c0'); }
    else { r(29, 44, 2, 5, '#7fb7d9'); r(44, 43, 2, 5, '#7fb7d9'); }
  }),
  lanterne: (f: number) => sprite(`o:lanterne:${f % 2}`, ({ r, e }) => {
    e(32, 30, 14, 14, f % 2 ? 'rgba(255,215,106,.18)' : 'rgba(255,181,69,.14)');
    r(24, 16, 16, 4, '#2b2b35'); r(30, 12, 4, 4, '#2b2b35');
    r(26, 20, 12, 20, '#2b2b35');
    r(28, 22, 8, 16, f % 2 ? '#ffd76a' : '#ffb545'); r(30, 26, 4, 8, '#fff2c0');
    r(24, 40, 16, 4, '#2b2b35');
  }, false, false),
};

export interface Theme { floor: [string, string]; line: string; top: string; face: string; mortar: string; fog: string }

export const THEMES: Theme[] = [
  { floor: ['#b48a58', '#a97f4e'], line: '#7c5a34', top: '#6e7c86', face: '#8b3f2a', mortar: '#5e2a1c', fog: '#0d2c3a' },
  { floor: ['#a9a297', '#9c9589'], line: '#6f695f', top: '#8a4a38', face: '#a8452c', mortar: '#6d2c1b', fog: '#1a1420' },
  { floor: ['#8f8d82', '#83817a'], line: '#5e5c56', top: '#59585c', face: '#6e675f', mortar: '#47423d', fog: '#101114' },
  { floor: ['#b98a54', '#a87a47'], line: '#7a5430', top: '#e4dcc8', face: '#6f8a7a', mortar: '#4f675a', fog: '#141a24' },
  { floor: ['#a5a9a4', '#989d99'], line: '#73787a', top: '#c8c9c0', face: '#8f938a', mortar: '#6b6f68', fog: '#14171a' },
  { floor: ['#6f8a90', '#647e85'], line: '#465e66', top: '#4d6168', face: '#5a6f6a', mortar: '#3b4c49', fog: '#071a22' },
];

/** Hellt eine Farbe auf (k > 0) oder dunkelt sie ab (k < 0), k zwischen -1 und 1. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Kleiner Zufall aus einer Zahl, damit jede Variante gleich aussieht, egal wann sie gezeichnet wird. */
const rnd = (seed: number) => {
  let s = seed * 2654435761 >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};

/** Körnung: einzelne hellere und dunklere Pixel in einer Fläche. */
function grain(b: Brush, rand: () => number, x: number, y: number, w: number, h: number, base: string, n: number) {
  for (let i = 0; i < n; i++) {
    const k = rand() < 0.5 ? -0.08 : 0.07;
    b.r(x + Math.floor(rand() * w), y + Math.floor(rand() * h), rand() < 0.3 ? 2 : 1, 1, shade(base, k));
  }
}

/** Bodenfliesen: 24 Varianten, die meisten schlicht, einzelne mit Riss, Pfütze, Gräte, Fleck, Kies oder Muschel. */
export function floorTile(t: number, variant: number) {
  const th = THEMES[t], v = variant % 24;
  return sprite(`t:f:${t}:${v}`, (b) => {
    const { r, e, l } = b;
    const rand = rnd(v * 31 + t);
    const base = shade(th.floor[v % 2], (rand() - 0.5) * 0.08);
    r(0, 0, 64, 64, base);
    if (t === 0 || t === 3) {
      // Holzdielen: drei Bahnen, versetzte Stöße, Maserung und Nagelköpfe
      ([[0, 21], [21, 21], [42, 22]] as const).forEach(([y, h], i) => {
        const tone = shade(base, (rand() - 0.5) * 0.12);
        r(0, y, 64, h, tone);
        r(0, y, 64, 1, hi(tone, 0.12));
        for (let k = 0; k < 3; k++) {
          const gy = y + 3 + Math.floor(rand() * (h - 6)), gx = Math.floor(rand() * 40);
          r(gx, gy, 10 + Math.floor(rand() * 18), 1, shade(tone, -0.1));
        }
        const joint = [16 + (v % 4) * 10, 40 - (v % 4) * 6, 8 + (v % 4) * 12][i];
        r(joint, y, 2, h, th.line); r(joint + 2, y, 1, h, hi(tone, 0.1));
        r(joint - 3, y + 3, 2, 2, '#4a3a2a'); r(joint + 4, y + h - 5, 2, 2, '#4a3a2a');
        r(0, y + h - 1, 64, 1, th.line);
      });
      if (v % 3 === 0) e(10 + (v % 5) * 8, 10 + (v % 2) * 24, 2, 1.5, th.line);
      if (v % 4 === 1) r(24 + (v % 3) * 10, 30, 10, 2, shade(th.floor[0], -0.12));
    } else {
      // Steinplatten in fünf Teilen, jede leicht anders getönt, mit Fase und Körnung
      for (const [x, y, w, h] of [[0, 0, 31, 31], [32, 0, 32, 31], [0, 32, 15, 32], [16, 32, 31, 32], [48, 32, 16, 32]]) {
        const tone = shade(th.floor[v % 2], (rand() - 0.5) * 0.12);
        r(x, y, w, h, tone);
        r(x, y, w, 1, hi(tone, 0.14)); r(x, y, 1, h, hi(tone, 0.1));
        r(x, y + h - 1, w, 1, lo(tone, 0.12)); r(x + w - 1, y, 1, h, lo(tone, 0.1));
        grain(b, rand, x + 2, y + 2, w - 4, h - 4, tone, 10);
      }
      r(31, 0, 1, 32, th.line); r(0, 31, 64, 1, th.line); r(15, 32, 1, 32, th.line); r(47, 32, 1, 32, th.line);
    }
    r(0, 63, 64, 1, th.line); r(63, 0, 1, 64, th.line);
    if (t === 5 && v % 2 === 0) {
      e(26, 22 + (v % 4) * 6, 14, 5, 'rgba(120,190,215,.55)'); r(18, 19 + (v % 4) * 6, 12, 1, 'rgba(225,245,250,.7)');
    }
    switch (v) {
      case 5: // Riss
        for (const [x0, y0, x1, y1] of [[12, 10, 14, 18], [14, 18, 18, 24], [18, 24, 22, 28], [22, 28, 24, 34], [18, 24, 14, 27]]) l(x0, y0, x1, y1, th.line);
        break;
      case 9: // Pfütze
        e(42, 42, 10, 5, 'rgba(110,170,200,.45)'); e(40, 40, 6, 2, 'rgba(110,170,200,.35)'); r(36, 40, 6, 1, 'rgba(230,245,250,.6)');
        break;
      case 11: { // Fischgräte
        const c = '#e9e2cf';
        r(18, 42, 18, 2, c);
        for (let i = 0; i < 4; i++) { l(21 + i * 4, 37, 23 + i * 4, 41, c); l(21 + i * 4, 48, 23 + i * 4, 44, c); }
        b.g([[36, 43], [42, 38], [42, 48]], c); e(15, 43, 3, 3, c); r(14, 42, 1, 1, '#7a6a4a');
        break;
      }
      case 13: // Rumfleck
        e(46, 16, 7, 5, 'rgba(70,30,15,.25)'); e(43, 19, 4, 3, 'rgba(70,30,15,.2)');
        break;
      case 14: // Kies und Sand
        for (const [x, y] of [[8, 50], [18, 54], [52, 8], [46, 16], [12, 44], [56, 22]]) { e(x, y, 2, 1.5, shade(th.line, 0.2)); r(x - 1, y - 1, 1, 1, shade(th.line, 0.4)); }
        break;
      case 15: // Muschel
        e(52, 50, 5, 4, '#efe3d0'); r(49, 48, 1, 5, '#c9b79c'); r(52, 47, 1, 6, '#c9b79c'); r(55, 48, 1, 5, '#c9b79c'); r(50, 53, 5, 2, '#d8c8ac');
        break;
      default:
    }
  }, false, false);
}

/** Wandfront: Ziegel einzeln getönt, dazu ab und zu Moos, ein Riss, eine nasse Spur oder ein Aushang. */
export function wallFace(t: number, variant: number) {
  const th = THEMES[t], v = variant % 12;
  return sprite(`t:wf:${t}:${v}`, (b) => {
    const { r, e, l } = b;
    const rand = rnd(v * 17 + t * 5);
    r(0, 0, 64, 64, th.mortar);
    for (let row = 0; row < 4; row++) {
      const off = (row + v) % 2 ? 0 : 16;
      for (let x = off - 32; x < 64; x += 32) {
        const x0 = Math.max(0, x + 2), x1 = Math.min(64, x + 32);
        if (x1 <= x0) continue;
        const y = row * 16, tone = shade(th.face, (rand() - 0.5) * 0.18);
        r(x0, y, x1 - x0, 14, tone);
        r(x0, y, x1 - x0, 1, hi(tone, 0.16)); r(x0, y + 13, x1 - x0, 1, lo(tone, 0.18));
        grain(b, rand, x0 + 1, y + 2, Math.max(1, x1 - x0 - 2), 10, tone, 5);
      }
    }
    r(0, 0, 64, 4, 'rgba(0,0,0,.2)');
    switch (v) {
      case 3: // Moos am Fuß
        e(6, 60, 10, 6, 'rgba(70,110,50,.75)'); e(7, 53, 4, 3, 'rgba(70,110,50,.6)'); e(48, 62, 12, 4, 'rgba(70,110,50,.7)');
        r(4, 56, 2, 1, 'rgba(140,190,90,.8)'); r(46, 59, 3, 1, 'rgba(140,190,90,.8)');
        break;
      case 5: // Riss
        for (const [x0, y0, x1, y1] of [[36, 6, 34, 14], [34, 14, 37, 22], [37, 22, 36, 30], [36, 30, 39, 36], [37, 22, 42, 25]]) l(x0, y0, x1, y1, 'rgba(0,0,0,.5)', 2);
        break;
      case 7: // Nasse Spur
        r(20, 4, 4, 48, 'rgba(40,60,80,.4)'); r(21, 4, 1, 46, 'rgba(160,200,220,.35)'); e(22, 54, 4, 2, 'rgba(120,180,210,.5)');
        break;
      case 9: // Aushang vom Amt
        r(22, 18, 20, 24, '#efe8d6'); r(22, 18, 20, 2, '#fbf6e8'); r(40, 20, 2, 22, '#d8d0bc');
        r(25, 23, 14, 1, '#7a6a4a'); r(25, 27, 10, 1, '#7a6a4a'); r(25, 31, 12, 1, '#7a6a4a');
        e(35, 37, 4, 2.5, '#b5302a'); r(31, 18, 2, 2, '#9a9a9a');
        break;
      case 11: // Fehlender Ziegel
        r(34, 32, 28, 14, 'rgba(20,10,8,.55)'); r(34, 32, 28, 2, 'rgba(0,0,0,.35)');
        break;
      default:
    }
  }, false, false);
}
