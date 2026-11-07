import { describe, expect, it } from 'vitest';
import { THEME_COUNT } from '../../../src/content';
import { activeHero } from '../../../src/core/state';
import { endTurn } from '../../../src/core/heroes';
import { hull } from '../../../src/ui/board/geometry';
import { PIET_CYCLE, PIET_GLIDE, PIET_SIT, pietPosition } from '../../../src/ui/board/piet';
import { SPRITE } from '../../../src/ui/sprites';
import { bannerFor, describe as describeFx, recapHtml } from '../../../src/ui/game/announce';
import { actionForArrow, actionForMark, marksFor } from '../../../src/ui/game/marks';
import { sidePanel, topBar } from '../../../src/ui/game/panel';
import { tipFor } from '../../../src/ui/game/tooltip';
import { esc } from '../../../src/ui/text';
import { foe, play, seeAll } from '../../support/fixture';

const idle = { busy: false, aiming: false, gmSel: null };

describe('Markierungen und Eingaben', () => {
  it('grün zum Gehen mit Schritten und Tiden, nichts während Animationen', () => {
    const g = play();
    const marks = marksFor(g, idle);
    expect(marks.find((m) => m.x === 3 && m.y === 2)).toMatchObject({ kind: 'walk', act: 'move', steps: 3, tides: 1 });
    expect(marksFor(g, { ...idle, busy: true })).toEqual([]);
  });

  it('gold für Türen und Truhen, rot für angreifbare Gegner, beim Zielen nur Ziele', () => {
    const g = play({ heroes: ['frauke', 'joern'] });
    const h = activeHero(g);
    h.x = 7; h.y = 2;
    const m = foe(g, 'ratte', 7, 3);
    expect(marksFor(g, idle).filter((k) => k.kind !== 'walk').map((k) => k.act).sort()).toEqual(['attack', 'door']);
    expect(marksFor(g, { ...idle, aiming: true })).toEqual([{ x: m.x, y: m.y, kind: 'foe', act: 'special' }]);
  });

  it('Pfeiltasten: laufen, Tür öffnen, angreifen; sonst nichts', () => {
    const g = play();
    const h = activeHero(g);
    expect(actionForArrow(g, 'ArrowDown')).toEqual({ type: 'move', x: h.x, y: h.y + 1 });
    expect(actionForArrow(g, 'ArrowUp')).toBeNull();
    expect(actionForArrow(g, 'ArrowRight')).toBeNull();
    expect(actionForArrow(g, 'Enter')).toBeNull();
    h.x = 7; h.y = 2;
    expect(actionForArrow(g, 'ArrowRight')).toEqual({ type: 'door', x: 8, y: 2 });
    const m = foe(g, 'ratte', 6, 2);
    expect(actionForArrow(g, 'ArrowLeft')).toEqual({ type: 'attack', uid: m.uid });
  });

  it('ein Tipp auf eine Markierung wird zur Handlung', () => {
    const g = play({ gm: true });
    const m = foe(g, 'ratte', 4, 2);
    expect(actionForMark(g, { x: 3, y: 2, kind: 'walk', act: 'move' }, null)).toEqual({ type: 'move', x: 3, y: 2 });
    expect(actionForMark(g, { x: 4, y: 2, kind: 'foe', act: 'attack' }, null)).toEqual({ type: 'attack', uid: m.uid });
    expect(actionForMark(g, { x: 4, y: 2, kind: 'use', act: 'gmSelect' }, null)).toBe('select');
    expect(actionForMark(g, { x: 3, y: 3, kind: 'walk', act: 'gmMove' }, m.uid)).toEqual({ type: 'gmMove', uid: m.uid, x: 3, y: 3 });
    expect(actionForMark(g, { x: 3, y: 3, kind: 'walk', act: 'gmMove' }, null)).toBeNull();
  });

  it('menschlicher Spielleiter: Gegner wählen, dann ziehen und angreifen', () => {
    const g = play({ gm: true });
    const m = foe(g, 'ratte', 2, 2);
    while (g.status === 'play') endTurn(g);
    expect(marksFor(g, idle).some((k) => k.act === 'gmSelect' && k.x === 2)).toBe(true);
    const sel = marksFor(g, { ...idle, gmSel: m.uid });
    expect(sel.some((k) => k.act === 'gmMove')).toBe(true);
    expect(sel.filter((k) => k.act === 'gmAttack').map((k) => [k.x, k.y])).toEqual([[2, 1]]);
  });
});

describe('Tooltips', () => {
  it('Gegner, Figuren, Türen, Truhen, Ziel, Ausgang und Möbel', () => {
    const g = play();
    seeAll(g);
    expect(tipFor(g, { x: 10, y: 5 })).toContain('Knöllchenkobold');
    expect(tipFor(g, { x: 10, y: 5 })).toContain('Ein Kobold.');
    expect(tipFor(g, { x: 1, y: 1 })).toContain('Jörn');
    expect(tipFor(g, { x: 8, y: 2 })).toContain('Tür');
    expect(tipFor(g, { x: 2, y: 4 })).toContain('Truhe');
    expect(tipFor(g, { x: 7, y: 5 })).toContain('Logbuch');
    expect(tipFor(g, { x: 1, y: 6 })).toContain('Erst den Auftrag erledigen');
    expect(tipFor(g, { x: 3, y: 3 })).toContain('Rumfass');
  });

  it('verrät weder Fallen noch verborgene Türen noch Unaufgedecktes', () => {
    const g = play();
    expect(tipFor(g, { x: 6, y: 3 })).toBeNull();
    expect(tipFor(g, { x: 8, y: 4 })).toBeNull();
    expect(tipFor(g, { x: 10, y: 2 })).toBeNull();
  });
});

describe('Ansagen und Leisten', () => {
  it('Angriffe und Stürze in einem Satz', () => {
    const label = (k: string) => (k === 'm:1' ? 'Ratte' : 'Jörn');
    expect(describeFx({ t: 'attack', who: 'm:1', target: 'h:joern', shot: null, a: 3, b: 4, total: 8, need: 9, hit: false, dmg: 1 }, label))
      .toBe('Ratte verfehlt Jörn (3+4, nötig 9)');
    expect(describeFx({ t: 'die', who: 'm:1' }, label)).toBe('Ratte ist erledigt');
    expect(describeFx({ t: 'hurt', who: 'm:1', n: 1 }, label)).toBeNull();
  });

  it('Banner maskieren Kampagnentexte', () => {
    const b = bannerFor({ t: 'note', title: '<i>X</i>', text: 'a & b' }, 'Ort')!;
    expect(b.html).toContain('&lt;i&gt;X&lt;/i&gt;');
    expect(b.html).toContain('a &amp; b');
    expect(bannerFor({ t: 'card', name: 'K', text: 'T', cost: 3 }, '')!.html).toContain('3 Tinte');
    expect(recapHtml([])).toBeNull();
    expect(recapHtml(['1', '2', '3', '4', '5', '6', '7'])).not.toContain('<li>1</li>');
  });

  it('Kopf- und Seitenleiste zeigen Punkte, Tinte, Gruppe und Knöpfe', () => {
    const g = play();
    expect(topBar(g)).toContain(`${g.punkte}/8 Punkte`);
    expect(topBar(g)).toContain(`🖋️ ${g.tinte}`);
    const side = sidePanel(g, { ...idle, logOpen: false }, () => 'bild.png');
    expect(side).toContain('Hol das Logbuch und raus.');
    expect(side).toContain('data-end');
    expect(side.match(/class="pc /g)).toHaveLength(2);
  });

  it('esc schützt auch Anführungszeichen', () => {
    expect(esc(`"a" & 'b' <c>`)).toBe('&quot;a&quot; &amp; &#39;b&#39; &lt;c&gt;');
  });
});

describe('Brettgeometrie', () => {
  it('konvexe Hülle eines Quadrats mit Innenpunkt', () => {
    const pts = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 1 }];
    expect(hull(pts)).toHaveLength(4);
    expect(hull(pts)).not.toContainEqual({ x: 1, y: 1 });
  });

  it('Piet bewegt sich stetig: Landen, Sitzen, Abheben ohne Sprung', () => {
    const foot = { x: 100, y: 100, s: 40 };
    let prev = pietPosition(foot, 0, { flip: false });
    let maxStep = 0;
    for (let t = 16; t < PIET_CYCLE * 2; t += 16) {
      const q = pietPosition(foot, t, { flip: false });
      maxStep = Math.max(maxStep, Math.hypot(q.x - prev.x, q.y - prev.y));
      prev = q;
    }
    expect(maxStep).toBeLessThan(foot.s * 0.05);
    expect(pietPosition(foot, PIET_SIT / 2, { flip: false }).sitting).toBe(true);
    expect(pietPosition(foot, PIET_SIT + PIET_GLIDE + 100, { flip: false }).sitting).toBe(false);
  });

  it('Piet sitzt auf der Schulter in Blickrichtung und wippt mit', () => {
    const foot = { x: 100, y: 100, s: 32 };
    const right = pietPosition(foot, 100, { flip: false }), left = pietPosition(foot, 100, { flip: true });
    expect(right.x).toBeGreaterThan(foot.x);
    expect(left.x).toBeLessThan(foot.x);
    const up = pietPosition(foot, 100, { flip: false, bob: 0 }), down = pietPosition(foot, 100, { flip: false, bob: 2 });
    expect(down.y - up.y).toBeCloseTo((foot.s * 1.2 * 2) / SPRITE);
  });

  it('jedes Raumthema hat Farben', async () => {
    const { THEMES } = await import('../../../src/ui/sprites');
    expect(THEMES).toHaveLength(THEME_COUNT);
  });
});
