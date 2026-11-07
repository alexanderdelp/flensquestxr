import { HEROES, MONSTERS, type HeroId, type MonsterId } from '../../content';
import { activeHero, chapterOf, hkey, isActive, mkey, type Fx, type Game, type Pos } from '../../core';
import {
  RES, THEMES, floorTile, heroDown, heroSprite, monsterSprite, moodOf, objects, piet, shade, wallFace,
} from '../sprites';
import { ZOOM_MAX, ZOOM_MIN, applyZoom, makeView, panLimit, project, unproject, type View } from '../projection';
import { ease, hull, type Pt } from './geometry';
import { pietPosition } from './piet';

export interface Mark extends Pos { kind: 'walk' | 'use' | 'foe'; act: string; steps?: number; tides?: number }

/** Farbe der Punkte: gleiche Farbe, gleiche Tide. */
const TIDE_DOT = ['#fff2c0', '#fff2c0', '#7fe3cf', '#9db6ff', '#e0a8ff'];

const MARK_COLOR = { walk: 'rgba(90,200,170,', use: 'rgba(240,190,70,', foe: 'rgba(235,70,55,' };

interface Vis {
  key: string; x: number; y: number; flip: boolean; walking: boolean;
  dx: number; dy: number; alpha: number; shake: number;
  hero?: HeroId; monster?: MonsterId; hp: number; maxHp: number; down: boolean; stuck: boolean; blind: boolean; gear: string[];
  /** Piet ist gerade unterwegs zum Gegner. */
  away?: boolean;
  /** Juni wippt im Stand zwei Rasterpunkte nach unten; Piet auf der Schulter wippt mit. */
  bob?: number;
  /** Piets Schulter: -1 links, 1 rechts, dazwischen wechselt er gerade. */
  side?: number;
}
interface Floater { x: number; y: number; text: string; color: string; start: number; dur: number }
interface Shot {
  x: number; y: number; color: string; size: number; gull?: boolean; flip?: boolean;
  /** Piet fliegt in Bildschirmkoordinaten, damit Start und Landung genau an seinem Platz liegen. */
  at?: { x: number; y: number; size: number };
}


const SHOT_COLOR: Record<string, string> = {
  frauke: '#dfe9ee', maren: '#fbfbf5', netz: '#f5ebcd', obermeister: '#b5302a', oberarchivar: '#b5302a', schmuggler: '#3f7a3a', kalle: '#7a3a14', fiete: '#2b3a5a', punktepruefer: '#b5302a', proehl: '#9fd8e8', juni: '#ffb545', licht: '#ffe27a',
};

const WALL = 0.62;
/** Sortierschlüssel für Aufrechtes: nach Wänden und Türen der eigenen Reihe, vor der nächsten Reihe. */
const UPRIGHT = 1.05;
const DOOR = 0.78;

interface Box {
  x0: number; y0: number; x1: number; y1: number; h: number;
  top: string; side: string; front: HTMLCanvasElement | null; culled?: { e: boolean; w: boolean; s: boolean };
}

const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** Zeichnet das Spielbrett auf ein Canvas und übersetzt Klicks in Felder. */
export class Board {
  game: Game | null = null;
  marks: Mark[] = [];
  hover: Pos | null = null;
  private ctx: CanvasRenderingContext2D;
  private view: View = makeView(24, 14, 55, 100, 100, WALL);
  private floor = document.createElement('canvas');
  private floorKey = '';
  /** Blickwinkel in Grad: 90 = von oben. */
  angle = 55;
  /** Vergrößerung und Verschiebung in Canvas-Pixeln. */
  zoom = 1;
  private panX = 0;
  private panY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragDist = 0;
  private swallowClick = false;
  /** Meldet das Feld unter der Maus, etwa für Tooltips; null, wenn die Maus das Brett verlässt. */
  onHover: (p: Pos | null, clientX: number, clientY: number) => void = () => undefined;
  /** Meldet Änderungen am Zoom, etwa für die Anzeige der Knöpfe. */
  onZoom: () => void = () => undefined;
  private raf = 0;
  private time = 0;
  private vis = new Map<string, Vis>();
  private floats: Floater[] = [];
  private shots: Shot[] = [];
  /** Tempo der Animationen; Tippen während des Spielleiter-Zugs erhöht es. */
  speed = 1;
  /** Wird je Schritt aufgerufen, damit die Oberfläche Geräusche spielen kann. */
  onStep: () => void = () => undefined;

  constructor(readonly canvas: HTMLCanvasElement, private onTile: (p: Pos) => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('click', (e) => {
      if (this.swallowClick) { this.swallowClick = false; return; }
      const p = this.tileAt(e.clientX, e.clientY);
      if (p) this.onTile(p);
    });
    canvas.addEventListener('mousemove', (e) => {
      this.hover = this.tileAt(e.clientX, e.clientY);
      this.onHover(this.hover, e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseleave', () => { this.hover = null; this.onHover(null, 0, 0); });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const c = this.toCanvas(e.clientX, e.clientY);
      this.zoomAt(Math.exp(-e.deltaY * 0.0015), c.x, c.y);
    }, { passive: false });
    canvas.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.dragDist = 0;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const old = this.pointers.get(e.pointerId);
      if (!old) return;
      const scale = this.canvas.width / this.canvas.getBoundingClientRect().width;
      if (this.pointers.size === 1) {
        const dx = e.clientX - old.x, dy = e.clientY - old.y;
        this.dragDist += Math.abs(dx) + Math.abs(dy);
        if (this.dragDist > 8 && this.zoom > 1) this.panBy(dx * scale, dy * scale);
      } else if (this.pointers.size === 2) {
        const [a, c] = [...this.pointers.values()];
        const other = a === old ? c : a;
        const before = Math.hypot(old.x - other.x, old.y - other.y);
        const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        const mid = this.toCanvas((e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
        if (before > 0) this.zoomAt(after / before, mid.x, mid.y);
        this.dragDist = 99;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    const release = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId)) return;
      if (this.dragDist > 8) this.swallowClick = true;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.resize();
    const loop = (t: number) => {
      this.time = t;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { cancelAnimationFrame(this.raf); }

  private resize() {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
  }

  private layout(g: Game) {
    const cw = this.canvas.width, ch = this.canvas.height;
    this.view = applyZoom(makeView(g.w, g.h, this.angle, cw, ch, DOOR), this.zoom, this.panX, this.panY, cw, ch);
  }

  private toCanvas(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * this.canvas.width, y: ((cy - r.top) / r.height) * this.canvas.height };
  }

  private clampPan() {
    const mx = panLimit(this.zoom, this.canvas.width), my = panLimit(this.zoom, this.canvas.height);
    this.panX = Math.max(-mx, Math.min(mx, this.panX));
    this.panY = Math.max(-my, Math.min(my, this.panY));
  }

  /** Zoomt so, dass der Punkt unter dem Finger oder der Maus stehen bleibt. */
  zoomAt(factor: number, sx = this.canvas.width / 2, sy = this.canvas.height / 2) {
    const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * factor));
    const k = next / this.zoom;
    const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    this.panX = (sx - cx) - k * (sx - cx - this.panX);
    this.panY = (sy - cy) - k * (sy - cy - this.panY);
    this.zoom = next;
    this.clampPan();
    this.onZoom();
  }

  panBy(dx: number, dy: number) {
    this.panX += dx; this.panY += dy;
    this.clampPan();
  }

  resetZoom() {
    this.zoom = 1; this.panX = 0; this.panY = 0;
    this.onZoom();
  }

  /** Holt ein Feld in die Bildmitte, wenn vergrößert ist. */
  focusTile(x: number, y: number) {
    const g = this.game;
    if (!g || this.zoom <= 1) return;
    this.layout(g);
    const f = this.p(x + 0.5, y + 0.5);
    this.panBy(this.canvas.width / 2 - f.x, this.canvas.height / 2 - f.y);
  }

  private p(x: number, y: number, z = 0) { return project(this.view, x, y, z); }

  private solid(g: Game, x: number, y: number) {
    const t = g.tiles[y]?.[x] ?? '#';
    return t === '#' || t === 'H';
  }

  tileAt(cx: number, cy: number): Pos | null {
    const g = this.game;
    if (!g) return null;
    this.layout(g);
    const r = this.canvas.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * this.canvas.width;
    const sy = ((cy - r.top) / r.height) * this.canvas.height;
    // Aufrechte Ziele (Gegner, Türen, Truhen) lassen sich auch oben antippen.
    const upright = this.marks.filter((m) => m.kind !== 'walk').sort((a, b2) => b2.y - a.y);
    for (const m of upright) {
      const f = this.p(m.x + 0.5, m.y + 0.7);
      if (Math.abs(sx - f.x) < f.s * 0.55 && sy < f.y + f.s * 0.3 && sy > f.y - f.s * 1.15) return { x: m.x, y: m.y };
    }
    const q = unproject(this.view, sx, sy);
    const x = Math.floor(q.x), y = Math.floor(q.y);
    return x >= 0 && y >= 0 && x < g.w && y < g.h ? { x, y } : null;
  }

  /** Punkt in Canvas-Pixeln, für Tests und Bildprüfungen. */
  canvasPoint(x: number, y: number, z = 0) {
    if (this.game) this.layout(this.game);
    return this.p(x, y, z);
  }

  /** Bildschirmmitte eines Felds in CSS-Pixeln, für Tests. */
  screenOf(x: number, y: number) {
    if (this.game) this.layout(this.game);
    const f = this.p(x + 0.5, y + 0.5);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (f.x / this.canvas.width) * r.width, y: r.top + (f.y / this.canvas.height) * r.height };
  }

  private floorStrips(c: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = this.p(x, y + i / n), e = this.p(x + 1, y + i / n), d = this.p(x, y + (i + 1) / n);
      c.drawImage(img, 0, (i * RES) / n, RES, RES / n, a.x, a.y, e.x - a.x + 0.6, d.y - a.y + 0.6);
    }
  }

  private buildFloor(g: Game, key: string) {
    const f = this.floor;
    f.width = this.canvas.width; f.height = this.canvas.height;
    const c = f.getContext('2d')!;
    this.smoothing(c, g, 1);
    c.fillStyle = THEMES[g.theme].fog;
    c.fillRect(0, 0, f.width, f.height);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.seen[y][x] || this.solid(g, x, y)) continue;
      this.floorStrips(c, floorTile(g.theme, hash(x, y)), x, y);
    }
    if (g.exit && g.seen[g.exit.y][g.exit.x]) this.floorStrips(c, objects.exit(), g.exit.x, g.exit.y);
    this.floorKey = key;
  }

  private poly(pts: { x: number; y: number }[], fill: string) {
    const { ctx } = this;
    ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  /** Quader mit sichtbaren Seiten, Vorderseite und Deckel. */
  private box(b: Box) {
    const { x0, y0, x1, y1, h } = b, cx = this.view.cx, cull = b.culled;
    if (x1 < cx && !cull?.e) this.poly([this.p(x1, y0, h), this.p(x1, y1, h), this.p(x1, y1), this.p(x1, y0)], b.side);
    if (x0 > cx && !cull?.w) this.poly([this.p(x0, y0, h), this.p(x0, y1, h), this.p(x0, y1), this.p(x0, y0)], b.side);
    if (!cull?.s && this.p(x0, y1).y > this.p(x0, y1, h).y + 0.5) {
      if (b.front) {
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = this.p(x0, y1, h * (1 - i / n)), e = this.p(x1, y1, h * (1 - i / n)), d = this.p(x0, y1, h * (1 - (i + 1) / n));
          this.ctx.drawImage(b.front, 0, (i * RES) / n, RES, RES / n, a.x, a.y, e.x - a.x + 0.6, d.y - a.y + 0.6);
        }
      } else {
        this.poly([this.p(x0, y1, h), this.p(x1, y1, h), this.p(x1, y1), this.p(x0, y1)], b.side);
      }
    }
    this.poly([this.p(x0, y0, h), this.p(x1, y0, h), this.p(x1, y1, h), this.p(x0, y1, h)], b.top);
  }

  /** Wandblock; mit from > 0 nur der vordere Streifen ab dieser Tiefe, etwa vor einem Türblatt. */
  private drawWall(g: Game, x: number, y: number, from = 0) {
    const th = THEMES[g.theme], v = hash(x, y);
    const culled = { e: this.solid(g, x + 1, y), w: this.solid(g, x - 1, y), s: this.solid(g, x, y + 1) };
    this.box({ x0: x, y0: y + from, x1: x + 1, y1: y + 1, h: WALL, top: shade(th.top, ((v >> 4) % 5 - 2) * 0.025), side: th.mortar, front: wallFace(g.theme, v), culled });
    if (!culled.s && v % 7 === 0) {
      const f = this.p(x + 0.5, y + 1, WALL * 0.62), s = f.s * 0.5;
      if (this.angle < 85) this.ctx.drawImage(objects.lanterne(Math.floor(this.time / 260) + x), f.x - s / 2, f.y - s / 2, s, s);
    }
  }

  /** Türen stehen im Durchgang: quer zur Laufrichtung, offen klappt das Blatt zur Seite. */
  private drawDoor(g: Game, x: number, y: number) {
    const northSouth = this.solid(g, x - 1, y) && this.solid(g, x + 1, y);
    const open = g.tiles[y][x] === 'O';
    // Das Blatt ist so hoch wie die Wand und reicht von Wand zu Wand, ohne Spalt und ohne Seiten in der Mauer.
    const leaf = { h: WALL, top: '#5c3a1c', side: '#7c4d26' };
    if (!open) {
      if (northSouth) this.box({ ...leaf, x0: x, y0: y + 0.42, x1: x + 1, y1: y + 0.58, front: objects.door(), culled: { e: true, w: true, s: false } });
      else this.box({ ...leaf, x0: x + 0.42, y0: y + 0.02, x1: x + 0.58, y1: y + 0.98, front: null });
    } else if (northSouth) {
      this.box({ ...leaf, x0: x + 0.03, y0: y + 0.08, x1: x + 0.13, y1: y + 0.92, front: null });
    } else {
      this.box({ ...leaf, x0: x + 0.08, y0: y + 0.03, x1: x + 0.92, y1: y + 0.13, front: null });
    }
    // Die Tür steht im Durchgang: Was von den Nachbarwänden vor dem Blatt liegt, verdeckt es, der Rest liegt dahinter.
    if (northSouth) {
      const front = open ? 0.92 : 0.58;
      for (const nx of [x - 1, x + 1]) if (g.seen[y][nx]) this.drawWall(g, nx, y, front);
    }
  }

  private floorQuad(x: number, y: number, inset: number, fill: string, stroke?: string) {
    const pts = [this.p(x + inset, y + inset), this.p(x + 1 - inset, y + inset), this.p(x + 1 - inset, y + 1 - inset), this.p(x + inset, y + 1 - inset)];
    const { ctx } = this;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); }
  }

  private drawMarks() {
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 300);
    for (const m of this.marks) {
      if (m.kind === 'walk') continue;
      const col = MARK_COLOR[m.kind];
      const on = this.hover?.x === m.x && this.hover?.y === m.y;
      this.floorQuad(m.x, m.y, 0.05, `${col}${on ? 0.55 : 0.14})`, `${col}${0.6 + pulse * 0.4})`);
    }
    this.drawReach(pulse);
  }

  /** Die laufende Tide zählt als 1; sonst ist die erste neue Tide die 1. */
  private dotTier(m: Mark) {
    const g = this.game!;
    return (m.tides ?? 0) + (g.steps ? 1 : 0);
  }

  /** Wegkosten am Feld unter der Maus. */
  private drawHoverInfo() {
    const m = this.marks.find((o) => o.kind === 'walk' && o.x === this.hover?.x && o.y === this.hover?.y);
    if (!m?.steps) return;
    const { ctx } = this;
    const t = m.tides ?? 0;
    const text = `${m.steps} ${m.steps === 1 ? 'Schritt' : 'Schritte'} · ${t ? `${t} ${t === 1 ? 'Tide' : 'Tiden'}` : 'keine neue Tide'}`;
    const f = this.p(m.x + 0.5, m.y + 0.5, 0.75);
    ctx.font = `bold ${Math.max(14, f.s * 0.4)}px 'Trebuchet MS', system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,28,.92)';
    ctx.strokeText(text, f.x, f.y);
    ctx.fillStyle = '#fff2c0';
    ctx.fillText(text, f.x, f.y);
  }

  /** Reichweite: leuchtender Rand um das Gebiet und ein Punkt auf jedem Feld. */
  private drawReach(pulse: number) {
    const g = this.game, { ctx } = this;
    const walk = this.marks.filter((m) => m.kind === 'walk');
    if (!g || !walk.length) return;
    const inside = new Set(walk.map((m) => `${m.x},${m.y}`));
    const a = activeHero(g);
    if (g.status === 'play') inside.add(`${a.x},${a.y}`);
    const has = (x: number, y: number) => inside.has(`${x},${y}`);
    for (const m of walk) {
      if (this.hover?.x === m.x && this.hover?.y === m.y) this.floorQuad(m.x, m.y, 0.04, 'rgba(255,240,170,.6)', '#fff2c0');
      const f = this.p(m.x + 0.5, m.y + 0.5);
      ctx.globalAlpha = 0.75 + pulse * 0.25;
      ctx.fillStyle = TIDE_DOT[Math.min(this.dotTier(m), 4)];
      ctx.strokeStyle = 'rgba(30,40,45,.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.s * 0.13, f.s * 0.13 * Math.max(0.45, this.view.sin), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const edges: [number, number, number, number][] = [];
    for (const m of inside) {
      const [x, y] = m.split(',').map(Number);
      if (!has(x, y - 1)) edges.push([x, y, x + 1, y]);
      if (!has(x, y + 1)) edges.push([x, y + 1, x + 1, y + 1]);
      if (!has(x - 1, y)) edges.push([x, y, x, y + 1]);
      if (!has(x + 1, y)) edges.push([x + 1, y, x + 1, y + 1]);
    }
    for (const [width, color] of [[7, 'rgba(20,30,35,.7)'], [3.5, '#fff2c0']] as const) {
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of edges) {
        const s = this.p(x0, y0), e = this.p(x1, y1);
        ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
      }
      ctx.stroke();
    }
  }

  /** Hüpfender Pfeil über Zielen, damit sie auch hinter Wänden auffallen. */
  private drawArrows() {
    const { ctx } = this;
    const bob = Math.sin(this.time / 220) * 0.08;
    for (const m of this.marks) {
      if (m.kind === 'walk') continue;
      const f = this.p(m.x + 0.5, m.y + 0.7, 1.15 + bob), s = f.s * 0.16;
      ctx.fillStyle = m.kind === 'foe' ? '#ff5a48' : '#ffd76a';
      ctx.strokeStyle = 'rgba(10,20,28,.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x - s, f.y - s); ctx.lineTo(f.x + s, f.y - s); ctx.lineTo(f.x, f.y + s); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  private goalSprite(g: Game) {
    const goal = chapterOf(g).goal;
    if (goal.sprite) return objects[goal.sprite]();
    if (goal.type !== 'bergen') return null;
    if (goal.item.includes('Schlüssel')) return objects.schluessel();
    if (goal.item.includes('Karte')) return objects.karte();
    return objects.logbuch();
  }

  /** Figurenliste an den Spielzustand angleichen. */
  sync(g: Game) {
    const next = new Map<string, Vis>();
    const put = (key: string, p: Pos, o: Partial<Vis>) => {
      const old = this.vis.get(key);
      next.set(key, {
        key, flip: old?.flip ?? false, side: old?.side, walking: false, dx: 0, dy: 0, alpha: 1, shake: 0,
        hp: 1, maxHp: 1, down: false, stuck: false, blind: false, gear: [], ...o, x: p.x, y: p.y,
      });
    };
    g.heroes.forEach((h) => put(hkey(h), h, { hero: h.id, down: h.down, gear: h.gear, hp: h.hp, maxHp: h.maxHp }));
    g.monsters.forEach((m) => { if (isActive(g, m)) put(mkey(m), m, { monster: m.kind, hp: m.hp, maxHp: m.maxHp, stuck: m.stuck, blind: !!m.blind }); });
    this.vis = next;
  }

  private tween(ms: number, fn: (p: number) => void): Promise<void> {
    let done = 0, last = performance.now();
    return new Promise((res) => {
      const step = () => {
        const now = performance.now();
        done += (now - last) * this.speed;
        last = now;
        const p = Math.min(1, done / ms);
        fn(p);
        if (p < 1) setTimeout(step, 16); else res();
      };
      step();
    });
  }

  private floatText(x: number, y: number, text: string, color: string, dur = 2200) {
    this.floats.push({ x, y, text, color, start: performance.now(), dur: dur / this.speed });
  }

  pause(ms: number) { return this.tween(ms, () => undefined); }

  /** Anzeigename einer Figur, auch wenn sie gerade aus dem Spiel geht. */
  label(key: string) {
    const v = this.vis.get(key);
    if (v?.hero) return HEROES[v.hero].name;
    if (v?.monster) return MONSTERS[v.monster].name;
    return '';
  }

  /** Spielt ein Ereignis ab und wartet, bis es zu sehen war. */
  async play(f: Fx): Promise<void> {
    const v = 'who' in f ? this.vis.get(f.who) : undefined;
    const target = 'target' in f ? this.vis.get(f.target) : undefined;
    switch (f.t) {
      case 'move': {
        if (!v) return;
        v.walking = true;
        for (const p of f.path) {
          const sx = v.x, sy = v.y;
          if (p.x !== sx) v.flip = p.x < sx;
          this.onStep();
          await this.tween(130, (k) => { v.x = sx + (p.x - sx) * k; v.y = sy + (p.y - sy) * k; });
        }
        v.walking = false;
        return;
      }
      case 'attack':
      case 'shot': {
        if (!v || !target) return;
        if (target.x !== v.x) v.flip = target.x < v.x;
        if (f.shot) await this.fly(v, target, f.shot);
        else await this.lunge(v, target);
        if (f.t === 'attack' && f.a) this.floatText(v.x, v.y - 0.3, `🎲 ${f.a}+${f.b}`, '#fff2c0', 2000);
        if (f.t === 'attack' && !f.hit) {
          this.floatText(target.x, target.y, 'daneben', '#d7e3e8');
          await this.tween(800, () => undefined);
        }
        return;
      }
      case 'hurt': {
        if (!v) return;
        v.hp = Math.max(0, v.hp - f.n);
        this.floatText(v.x, v.y, `-${f.n}`, '#ff6b5a');
        await this.tween(320, (k) => { v.shake = (1 - k) * 0.12 * Math.sin(k * 30); });
        v.shake = 0;
        return;
      }
      case 'heal': {
        if (!v) return;
        v.hp = Math.min(v.maxHp, v.hp + f.n);
        this.floatText(v.x, v.y, `+${f.n}`, '#7be0a8');
        await this.tween(800, () => undefined);
        return;
      }
      case 'die': {
        if (!v) return;
        await this.tween(320, (k) => { v.alpha = 1 - k; });
        this.vis.delete(f.who);
        return;
      }
      case 'float':
        this.floatText(f.at.x, f.at.y, f.text, '#ffd76a');
        await this.tween(900, () => undefined);
        return;
      default:
    }
  }

  private async lunge(v: Vis, t: Vis) {
    const nx = t.x - v.x, ny = t.y - v.y;
    await this.tween(150, (k) => { v.dx = nx * 0.45 * k; v.dy = ny * 0.45 * k; });
    await this.tween(130, (k) => { v.dx = nx * 0.45 * (1 - k); v.dy = ny * 0.45 * (1 - k); });
  }

  /** Piet fliegt von seinem Platz los, pikt dreimal und landet wieder dort, wo er hingehört. */
  private async peck(v: Vis, t: Vis) {
    const home = () => this.pietAt(v, { x: v.x + v.dx + v.shake, y: v.y + v.dy });
    const prey = (lift = 0) => {
      const q = this.p(t.x + 0.5, t.y + 0.6, 0.8 + lift);
      return { x: q.x, y: q.y, size: q.s * 0.6 };
    };
    type P = { x: number; y: number; size: number };
    const mix = (a: P, b: P, k: number): P => ({
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * b.size,
      size: a.size + (b.size - a.size) * k,
    });
    const start = home();
    const s: Shot = { x: t.x, y: t.y, color: '#fff', size: 0, gull: true, flip: prey().x < start.x, at: start };
    v.away = true;
    this.shots.push(s);
    await this.tween(340, (k) => { s.at = mix(start, prey(), ease(k)); });
    await this.tween(360, (k) => { s.at = prey(Math.abs(Math.sin(k * Math.PI * 3)) * 0.25); });
    const from = prey();
    s.flip = home().x < from.x;
    await this.tween(360, (k) => { s.at = mix(from, home(), ease(k)); });
    this.shots = this.shots.filter((o) => o !== s);
    v.away = false;
  }

  /** Wo Piet gerade ist: Er kreist um den Kopf der Nordhexe und gleitet ab und zu auf ihre Schulter. */
  private pietAt(v: Vis, pos: Pos) {
    const f = this.p(pos.x + 0.5, pos.y + 0.7);
    return pietPosition({ x: f.x, y: f.y, s: f.s }, this.time + v.x * 997, { flip: v.flip, side: v.side, bob: v.bob });
  }

  /** step: Schulterwechsel fortschreiben; beim zweiten Zeichnen im selben Bild nicht. */
  private drawPiet(v: Vis, pos: Pos, step = true) {
    if (v.away || v.down) return;
    const want = v.flip ? -1 : 1;
    if (step) v.side = v.side === undefined ? want : v.side + Math.sign(want - v.side) * Math.min(Math.abs(want - v.side), 0.08);
    const q = this.pietAt(v, pos);
    this.ctx.drawImage(piet(q.frame, q.flip), q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }

  private async fly(v: Vis, t: Vis, kind: string) {
    if (kind === 'nordhexe') { await this.peck(v, t); return; }
    const s: Shot = { x: v.x, y: v.y, color: SHOT_COLOR[kind] ?? '#fff', size: kind === 'stempel' ? 0.24 : 0.14 };
    this.shots.push(s);
    await this.tween(230, (k) => { s.x = v.x + (t.x - v.x) * k; s.y = v.y + (t.y - v.y) * k; });
    this.shots = this.shots.filter((o) => o !== s);
  }

  private overlay() {
    const { ctx } = this;
    const now = performance.now();
    for (const s of this.shots) {
      if (s.gull) {
        const p = this.p(s.x + 0.5, s.y + 0.6, 0.8);
        const q = s.at ?? { x: p.x, y: p.y, size: p.s * 0.6 };
        ctx.drawImage(piet(Math.floor(now / 90), s.flip), q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
        continue;
      }
      const f = this.p(s.x + 0.5, s.y + 0.6, 0.55), r = f.s * s.size;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(f.x - r - 1, f.y - r - 1, r * 2 + 2, r * 2 + 2);
      ctx.fillStyle = s.color;
      ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
    }
    this.floats = this.floats.filter((f) => now - f.start < f.dur);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const f of this.floats) {
      const k = (now - f.start) / f.dur;
      const q = this.p(f.x + 0.5, f.y + 0.7, 1.05 + k * 0.7);
      ctx.font = `bold ${Math.max(15, q.s * 0.5)}px 'Trebuchet MS', system-ui, sans-serif`;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.lineWidth = Math.max(3, q.s * 0.12);
      ctx.strokeStyle = 'rgba(10,20,28,.9)';
      ctx.strokeText(f.text, q.x, q.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
  }

  /** Aufrechtes Bild, das mit den Füßen auf dem Feld steht. */
  private place(i: CanvasImageSource, p: Pos, up = 0) {
    const f = this.p(p.x + 0.5, p.y + 0.7), s = f.s * 1.2;
    this.ctx.drawImage(i, f.x - s / 2, f.y - s * 0.95 - up * f.s, s, s);
  }

  private drawActor(g: Game, v: Vis, n: number, ghost: boolean) {
    const beat = Math.floor(this.time / 420);
    const pos = { x: v.x + v.dx + v.shake, y: v.y + v.dy };
    this.ctx.globalAlpha = v.alpha * (ghost ? 0.38 : 1);
    if (v.hero) {
      if (v.down) this.place(heroDown(v.hero, v.gear), pos);
      else {
        if (!ghost && v.key === hkey(activeHero(g)) && g.status === 'play') this.clipFloor(g, v, () => this.ring(pos));
        const walk = 2 + (Math.floor(this.time / 110) % 2);
        const mood = moodOf(v.hp, v.maxHp);
        const frame = v.walking ? walk : (beat + n) % 2;
        v.bob = frame === 1 ? 2 : 0;
        this.clipSides(g, v, () => {
          this.place(heroSprite(v.hero!, v.gear, frame, v.flip, mood, false), pos);
          if (mood === 2) this.place(objects.wolke(beat + n), pos, 0.85);
        });
        if (v.hero === 'nordhexe' && !ghost) this.drawPiet(v, pos);
      }
    } else if (v.monster) {
      const frame = v.walking ? Math.floor(this.time / 110) : beat + n;
      this.clipSides(g, v, () => {
        this.place(monsterSprite(v.monster!, frame, v.flip), pos);
        if (v.blind) this.place(objects.sterne(beat + n), pos, 0.45);
        else if (v.stuck) this.place(objects.netz(), pos);
      });
      if (!ghost) this.bar(pos, v.hp / v.maxHp);
    }
    this.ctx.globalAlpha = 1;
  }

  /**
   * Von hinten nach vorn zeichnen, Reihe für Reihe. Innerhalb einer Reihe y:
   * Türen ohne Nachbarwände (y + 0.6), Wände (y + 1), Durchgangstüren samt Wandstreifen (y + 1.02),
   * danach alles Aufrechte, das auf der Reihe steht (y + 1.05 Gegenstände, y + 1.06 Figuren).
   * So stehen Figuren im Durchgang vor Tür und Zarge, Wände der nächsten Reihe (y + 2) aber weiter davor.
   */
  private scene(g: Game) {
    const list: { key: number; draw: () => void }[] = [];
    const cx = this.view.cx;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!g.seen[y][x]) continue;
      const t = g.tiles[y][x];
      const toward = 0.01 * (1 - Math.abs(x + 0.5 - cx) / g.w);
      if (t === '#' || t === 'H') list.push({ key: y + 1 + toward, draw: () => this.drawWall(g, x, y) });
      // Tür zwischen Wänden links und rechts: nach diesen Wänden zeichnen, sonst übermalen sie das Blatt.
      const across = this.solid(g, x - 1, y) && this.solid(g, x + 1, y);
      if (t === 'D' || t === 'O') list.push({ key: y + (across ? 1.02 : 0.6), draw: () => this.drawDoor(g, x, y) });
    }
    for (const c of g.props) {
      if (g.seen[c.y][c.x]) list.push({ key: c.y + UPRIGHT, draw: () => this.place(objects[c.kind](), c) });
    }
    for (const c of g.chests) {
      if (g.seen[c.y][c.x]) list.push({ key: c.y + UPRIGHT, draw: () => this.place(objects.chest(), c) });
    }
    if (g.goal && !g.goalTaken && g.seen[g.goal.y][g.goal.x]) {
      const s = this.goalSprite(g), p = g.goal;
      if (s) list.push({ key: p.y + UPRIGHT, draw: () => this.place(s, p) });
    }
    const actors = [...this.vis.values()];
    actors.forEach((v, n) => list.push({ key: v.y + UPRIGHT + 0.01, draw: () => this.drawActor(g, v, n, false) }));
    list.sort((a, c) => a.key - c.key).forEach((i) => i.draw());
    // Figuren hinter Wänden bleiben schwach sichtbar.
    actors.forEach((v, n) => {
      const south = g.tiles[Math.round(v.y) + 1]?.[Math.round(v.x)];
      if (south !== '#' && south !== 'H' && south !== 'D') return;
      this.drawActor(g, v, n, true);
      // Piet sitzt oder fliegt über der Wandkante und bleibt deckend sichtbar.
      if (v.hero === 'nordhexe') {
        this.ctx.globalAlpha = v.alpha;
        this.drawPiet(v, { x: v.x + v.dx + v.shake, y: v.y + v.dy }, false);
        this.ctx.globalAlpha = 1;
      }
    });
  }

  /**
   * Breite Figuren ragen seitlich in Nachbarwände. Das Bild der Figur steht wie eine Tafel auf ihrer Standtiefe;
   * der Teil dieser Tafel, der seitlich in einer Nachbarwand liegt und unter Wandhöhe ist, wird weggeschnitten.
   * Kopf und Hut über der Mauerkante bleiben sichtbar.
   */
  private clipSides(g: Game, v: Vis, draw: () => void) {
    const row = Math.round(v.y), col = Math.round(v.x), d = v.y + v.dy + 0.7, polys: Pt[][] = [];
    for (const nx of this.sideWallsOf(g, row, col)) {
      // Figurenbilder stehen ungestaucht aufrecht. Als Wandhöhe in Bildmaß gilt die sichtbare Mauer samt Deckel,
      // rund 0,8 Feldbreiten über den Füßen: kleine Gegner verschwinden dahinter, Köpfe und Hüte nicht.
      // Die Innenkante zum Durchgang läuft in der Perspektive schräg vom Boden zur Wandoberkante.
      const inner = nx < col ? nx + 1 : nx, outer = nx < col ? nx : nx + 1;
      const i0 = this.p(inner, d), iw = this.p(inner, d, WALL), o0 = this.p(outer, d), ow = this.p(outer, d, WALL);
      const top = i0.y - WALL * 1.3 * i0.s, bottom = this.canvas.height;
      polys.push([{ x: i0.x, y: bottom }, i0, { x: iw.x, y: top }, { x: ow.x, y: top }, o0, { x: o0.x, y: bottom }]);
      // Das vordere Wandstück (von der Standtiefe bis zur Front) steht vor der Figur und verdeckt sie ganz.
      polys.push(this.blockHull(nx, nx + 1, Math.min(d, row + 1), row + 1, WALL));
    }
    this.excluding(polys, draw);
  }

  /** Liegt etwas auf dem Boden der Figur, etwa der Auswahlring, verdecken es Nachbarwände und offenes Türblatt. */
  private clipFloor(g: Game, v: Vis, draw: () => void) {
    const row = Math.round(v.y), col = Math.round(v.x);
    const polys = this.sideWallsOf(g, row, col).map((nx) => this.blockHull(nx, nx + 1, row, row + 1, WALL));
    if (g.tiles[row]?.[col] === 'O' && this.solid(g, col - 1, row) && this.solid(g, col + 1, row)) {
      polys.push(this.blockHull(col + 0.03, col + 0.13, row + 0.08, row + 0.92, WALL));
    }
    this.excluding(polys, draw);
  }

  private sideWallsOf(g: Game, row: number, col: number) {
    return [col - 1, col + 1].filter((nx) => g.seen[row]?.[nx] && this.solid(g, nx, row));
  }

  /** Bildschirmumriss eines Quaders. */
  private blockHull(x0: number, x1: number, y0: number, y1: number, h: number): Pt[] {
    const pts: Pt[] = [];
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [0, h]) pts.push(this.p(x, y, z));
    return hull(pts);
  }

  /** Zeichnet, aber nicht in den angegebenen Flächen. Jede Fläche wird einzeln ausgespart, Überlappungen stören nicht. */
  private excluding(polys: Pt[][], draw: () => void) {
    if (!polys.length) { draw(); return; }
    const { ctx } = this;
    ctx.save();
    for (const poly of polys) {
      ctx.beginPath();
      ctx.rect(0, 0, this.canvas.width, this.canvas.height);
      poly.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.clip('evenodd');
    }
    draw();
    ctx.restore();
  }

  private ring(p: Pos) {
    const { ctx } = this;
    // Ein echter Kreis auf dem Boden, Punkt für Punkt projiziert: vorn größer als hinten, wie die Fliesen.
    const cx = p.x + 0.5, cy = p.y + 0.6, r = 0.42, n = 40;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = Math.max(2, this.p(cx, cy).s * 0.07);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, q = this.p(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private bar(p: Pos, part: number) {
    const { ctx } = this;
    const f = this.p(p.x + 0.5, p.y + 0.7);
    const X = f.x - f.s * 0.35, Y = f.y + f.s * 0.08, w = f.s * 0.7, h = Math.max(3, f.s * 0.09);
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(X, Y, w, h);
    ctx.fillStyle = '#e8554a';
    ctx.fillRect(X, Y, w * Math.max(0, part), h);
  }

  /**
   * Pixel-Art bleibt scharf, solange Bilder vergrößert gezeichnet werden. Werden sie kleiner als ihr Raster
   * (weit herausgezoomt, kleine Bildschirme), glätten wir, sonst fallen einzelne Rasterpunkte weg und es flimmert.
   * scale: Bildgröße in Feldbreiten (Aufrechtes 1,2, Boden 1).
   */
  private smoothing(c: CanvasRenderingContext2D, g: Game, scale: number) {
    const s = this.p(g.w / 2, g.h / 2).s * scale;
    c.imageSmoothingEnabled = s < RES;
    c.imageSmoothingQuality = 'high';
  }

  draw() {
    const g = this.game, { ctx } = this;
    if (!g) return;
    this.layout(g);
    this.smoothing(ctx, g, 1.2);
    const key = [
      this.canvas.width, this.canvas.height, this.angle, this.zoom, this.panX, this.panY, g.theme, g.chapter,
      g.seen.map((r) => r.map(Number).join('')).join(), g.tiles.map((r) => r.join('')).join(),
    ].join('|');
    if (key !== this.floorKey) this.buildFloor(g, key);
    ctx.drawImage(this.floor, 0, 0);
    this.drawMarks();
    this.scene(g);
    this.drawArrows();
    this.drawHoverInfo();
    this.overlay();
  }
}
