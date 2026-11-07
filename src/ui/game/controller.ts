import * as E from '../../core';
import type { Action, Game } from '../../core';
import { LocalTransport } from '../../net/transport';
import { hush, play, type Sound } from '../audio';
import { Board } from '../board';
import { app, html, on, setBox } from '../dom';
import { result } from '../screens/story';
import { title } from '../screens/menu';
import { session } from '../session';
import { heroSprite, moodOf, toDataUrl } from '../sprites';
import { bannerFor, describe, fxSound, recapHtml } from './announce';
import { actionForArrow, actionForMark, isArrow, marksFor } from './marks';
import { sidePanel, topBar } from './panel';
import { showTip, tipFor } from './tooltip';

/*
 Spielansicht: verbindet Brett, Seitenleiste und Regelkern. Handlungen gehen über die Verbindung
 (heute lokal, später zwischen Geräten), danach spielt die Ansicht die Ereignisse des Kerns ab.
*/

const ui = {
  view: null as Board | null,
  busy: false,
  aiming: false,
  gmSel: null as number | null,
  logOpen: false,
  recap: [] as string[],
  gmOpen: false,
  lastTurn: '',
};

const DEVICE = 'dieses-geraet';
const ACTION_SOUND: Partial<Record<Action['type'], Sound>> = { door: 'door', chest: 'chest', search: 'search', eat: 'eat' };
const net = new LocalTransport();
net.onMessage((msg) => {
  const g = session.game;
  if (msg.kind !== 'request' || !g || ui.busy || !E.dispatch(g, msg.action)) return;
  const sound = ACTION_SOUND[msg.action.type];
  if (sound) play(sound);
  hush();
  void after();
});

export function act(action: Action) { net.send({ kind: 'request', device: DEVICE, action }); }

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait = (o: E.Hero) => toDataUrl(heroSprite(o.id, o.gear, 0, false, moodOf(o.hp, o.maxHp)));
const mode = () => ({ busy: ui.busy, aiming: ui.aiming, gmSel: ui.gmSel });

function tapTile(p: E.Pos) {
  const g = session.game;
  if (!g) return;
  if (ui.busy) { if (ui.view) ui.view.speed = 5; hush(); return; }
  const mark = marksFor(g, mode()).find((m) => m.x === p.x && m.y === p.y);
  if (!mark) return;
  const a = actionForMark(g, mark, ui.gmSel);
  if (a === 'select') { ui.gmSel = E.monsterAt(g, p.x, p.y)!.uid; render(); return; }
  if (a?.type === 'special') ui.aiming = false;
  if (a) act(a);
}

function panel() {
  const g = session.game!;
  app.querySelector('.top')!.innerHTML = topBar(g);
  app.querySelector('.side')!.innerHTML = sidePanel(g, { ...mode(), logOpen: ui.logOpen }, portrait);
  app.querySelector<HTMLDetailsElement>('.verlauf')!.addEventListener('toggle', (e) => {
    ui.logOpen = (e.target as HTMLDetailsElement).open;
  });
  on('[data-quit]', quit);
  on('[data-search]', () => act({ type: 'search' }));
  on('[data-eat]', () => act({ type: 'eat' }));
  on('[data-end]', () => { ui.aiming = false; act({ type: 'end' }); });
  on('[data-special]', () => {
    if (E.specialNeedsTarget(g)) { ui.aiming = !ui.aiming; render(); return; }
    act({ type: 'special' });
  });
  on('[data-card]', (el) => act({ type: 'gmCard', index: Number(el.dataset.card) }));
  on('[data-gmend]', () => { ui.gmSel = null; act({ type: 'gmEnd' }); });
}

function quit() {
  if (!confirm('Das laufende Spiel wirklich verlassen und zurück zum Titel?')) return;
  hush();
  ui.view?.stop();
  ui.view = null;
  session.game = null;
  title();
}

function setupZoom(b: Board) {
  const bar = app.querySelector<HTMLElement>('.zoom')!;
  const draw = () => {
    bar.querySelector<HTMLButtonElement>('[data-zoom=in]')!.disabled = b.zoom >= 2.99;
    bar.querySelector<HTMLButtonElement>('[data-zoom=out]')!.disabled = b.zoom <= 1.01;
    bar.querySelector<HTMLButtonElement>('[data-zoom=reset]')!.disabled = b.zoom <= 1.01;
  };
  b.onZoom = draw;
  draw();
  bar.addEventListener('click', (e) => {
    const k = (e.target as HTMLElement).closest('button')?.dataset.zoom;
    if (k === 'in') {
      b.zoomAt(1.4);
      const g = b.game;
      if (g && g.status === 'play') b.focusTile(E.activeHero(g).x, E.activeHero(g).y);
    }
    if (k === 'out') b.zoomAt(1 / 1.4);
    if (k === 'reset') b.resetZoom();
  });
}

/** Baut die Spielansicht einmal auf und zeichnet danach nur Brett-Markierungen und Leisten neu. */
function render() {
  const g = session.game!;
  if (!app.querySelector('.game')) {
    ui.view?.stop();
    html(`<main class="game">
      <header class="top"></header>
      <div class="table">
        <div class="boardwrap">
          <canvas class="board" aria-label="Spielbrett"></canvas>
          <div class="banner" hidden></div>
          <div class="caption" hidden></div>
          <div class="recap" hidden></div>
          <div class="tip" hidden></div>
          <div class="zoom" role="group" aria-label="Zoom">
            <button data-zoom="in" aria-label="Hineinzoomen" title="Hineinzoomen">＋</button>
            <button data-zoom="out" aria-label="Herauszoomen" title="Herauszoomen">－</button>
            <button data-zoom="reset" aria-label="Ganze Karte" title="Ganze Karte">⤢</button>
          </div>
        </div>
        <aside class="side"></aside>
      </div>
    </main>`);
    const view = new Board(app.querySelector<HTMLCanvasElement>('.board')!, tapTile);
    ui.view = view;
    setupZoom(view);
    view.onStep = () => play('step');
    view.onHover = (p, cx, cy) => {
      const cur = session.game;
      showTip(p && cur && !ui.busy ? tipFor(cur, p) : null, cx, cy);
    };
  }
  const view = ui.view!;
  const fresh = view.game !== g;
  const turn = `${g.round}:${g.turn}:${g.status}`;
  if (turn !== ui.lastTurn && g.status === 'play') view.focusTile(E.activeHero(g).x, E.activeHero(g).y);
  ui.lastTurn = turn;
  view.game = g;
  if (fresh) view.sync(g);
  view.marks = marksFor(g, mode());
  panel();
}

/** Öffnet die Spielansicht für session.game. */
export function openGame() {
  ui.aiming = false;
  ui.gmSel = null;
  render();
}

async function announce(f: E.Fx, g: Game, v: Board) {
  const banner = bannerFor(f, E.chapterOf(g).place);
  if (banner) {
    ui.recap.push(banner.recap);
    setBox('.banner', banner.html);
    if (f.t === 'punkte') panel();
    await v.pause(banner.ms);
    setBox('.banner', null);
    return;
  }
  const text = describe(f, (k) => v.label(k));
  if (text && g.status === 'gm') {
    ui.recap.push(text);
    setBox('.caption', text);
  }
}

/** Spielt alle offenen Ereignisse nacheinander ab. */
async function drain(g: Game) {
  const v = ui.view;
  if (!v) return;
  while (g.fx.length) {
    const f = g.fx.shift()!;
    fxSound(f, (k) => v.label(k));
    await announce(f, g, v);
    await v.play(f);
    if (f.t === 'attack' && g.status === 'gm') await v.pause(1800);
  }
  v.sync(g);
}

function busyStart() {
  ui.busy = true;
  if (ui.view) ui.view.speed = calm() ? 5 : 1;
  setBox('.tip', null);
}

async function after() {
  const g = session.game!;
  busyStart();
  setBox('.recap', null);
  render();
  await drain(g);
  ui.busy = false;
  if (session.game !== g) return;
  if (g.status === 'won' || g.status === 'lost') { finish(); return; }
  if (g.status === 'gm' && !g.gmHuman) { await runGm(g); return; }
  if (g.status === 'gm' && !ui.gmOpen) { ui.gmOpen = true; ui.recap = []; }
  if (g.status === 'play' && ui.gmOpen) { ui.gmOpen = false; setBox('.caption', null); setBox('.recap', recapHtml(ui.recap)); }
  render();
}

async function runGm(g: Game) {
  busyStart();
  ui.recap = [];
  setBox('.caption', 'Der Oberpunktezähler ist dran … <small>Tippen macht es schneller</small>');
  render();
  for (const _ of E.gmTurn(g)) {
    void _;
    await drain(g);
    if (session.game !== g) return;
    render();
  }
  await drain(g);
  ui.busy = false;
  setBox('.caption', null);
  if (session.game !== g) return;
  if (g.status === 'won' || g.status === 'lost') { finish(); return; }
  if (!ui.recap.length) ui.recap.push('Alles ruhig in dieser Runde.');
  setBox('.recap', recapHtml(ui.recap));
  render();
}

function finish() {
  ui.view?.stop();
  ui.view = null;
  result();
}

/** Pfeiltasten laufen, öffnen und greifen an, solange die Spielansicht offen ist. */
export function installKeys() {
  document.addEventListener('keydown', (e) => {
    const g = session.game;
    if (!isArrow(e.key) || !g || !ui.view || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    if (ui.busy) return;
    const a = actionForArrow(g, e.key);
    ui.aiming = false;
    if (a) act(a);
  });
}

/** Für E2E-Tests und Fehlersuche im Entwicklungsmodus. */
export const currentView = () => ui.view;
