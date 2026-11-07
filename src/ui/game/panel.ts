import { HEROES, MONSTERS, PUNKTE_LIMIT } from '../../content';
import * as E from '../../core';
import type { Game, Hero } from '../../core';
import { esc } from '../text';

/** HTML der Kopfleiste und der Seitenleiste. Reine Funktionen: gleicher Spielstand, gleiches HTML. */

export interface PanelState { busy: boolean; aiming: boolean; gmSel: number | null; logOpen: boolean }

export function topBar(g: Game) {
  const ch = E.chapterOf(g);
  return `
    <span class="brand"><button class="home" data-quit title="Zurück zum Titel" aria-label="Zurück zum Titel"><img class="logo mini" src="img/schriftzug.webp" alt="FlensQuest"></button><b>${esc(ch.title)}</b></span>
    <span class="punkte" title="Punkte in Flensburg">${Array.from({ length: PUNKTE_LIMIT }, (_, i) => `<i class="${i < g.punkte ? 'on' : ''}"></i>`).join('')} <small>${g.punkte}/${PUNKTE_LIMIT} Punkte</small></span>
    <span>Runde ${g.round} · ${g.oere} Öre</span>
    <span class="tinte" title="Spielleiter: Tinte und Handkarten" data-say="Spielleiter: ${g.tinte} Tinte, ${g.gmHand.length} Karten">🖋️ ${g.tinte} · 🂠 ${g.gmHand.length}</span>`;
}

function heroTurn(g: Game) {
  const h = E.activeHero(g);
  const open = g.steps ? ` · ${g.steps} aus der laufenden Tide` : '';
  const legend = Array.from({ length: Math.min(g.tiden + (g.steps ? 1 : 0), 4) }, (_, i) => (
    `<i class="tide t${i + 1}"></i>${i + 1}`
  )).join(' ');
  return `<p class="turn"><b>${HEROES[h.id].name}</b> · ${'🌊'.repeat(g.tiden)}</p>
    <p class="reach">👣 <b>${E.stepsLeft(g)}</b> Schritte übrig · ${E.spdOf(g, h)} je Tide${open}${g.slow ? ' · Schlick: 1 weniger' : ''}</p>
    ${g.tiden || g.steps ? `<p class="reach legend">Punkte zeigen die Tide: ${legend}</p>` : ''}`;
}

function heroButtons(g: Game, playing: boolean, aiming: boolean) {
  const h = E.activeHero(g), d = HEROES[h.id];
  return `<div class="actions">
    <button data-search ${playing && g.tiden > 0 ? '' : 'disabled'}>🔎 Suchen</button>
    <button data-eat ${playing && g.tiden > 0 && h.food > 0 && h.hp < h.maxHp ? '' : 'disabled'}>🥪 Essen</button>
    <button class="${aiming ? 'on' : ''}" data-special ${playing && E.canSpecial(g) ? '' : 'disabled'} title="${d.specialText}">✨ ${d.special}</button>
    <button class="primary" data-end ${playing ? '' : 'disabled'}>Zug beenden</button>
  </div>`;
}

function gmHint(g: Game, gmSel: number | null) {
  const sel = g.monsters.find((o) => o.uid === gmSel);
  const open = g.monsters.filter((o) => E.gmCanAct(g, o)).length;
  const buffs = [g.gmEile ? 'Eile' : '', g.gmZorn ? '+1 Angriff' : ''].filter(Boolean).join(', ');
  return `<p class="turn"><b>Spielleiter</b> · ${sel && E.gmCanAct(g, sel) ? MONSTERS[sel.kind].name : `${open} Gegner bereit`}</p>
    <p class="reach">🖋️ <b>${g.tinte}</b> Tinte${buffs ? ` · gilt diese Runde: ${buffs}` : ''}</p>`;
}

function gmButtons(g: Game, busy: boolean) {
  const off = busy ? 'disabled' : '';
  return `<div class="cards-gm">${g.gmHand.map((c, i) => {
    const card = E.cardOf(g, c), cost = E.costOf(g, c);
    return `<button data-card="${i}" ${E.canPlayCard(g, i) ? off : 'disabled'} data-say="${esc(`${card.name}, ${cost} Tinte. ${card.text}`)}">
      <span class="cost" aria-hidden="true">🖋️ ${cost}</span>📜 ${esc(card.name)}<small>${esc(card.text)}</small></button>`;
  }).join('') || '<p class="reach">Keine Karten auf der Hand.</p>'}</div>
    <button class="primary" data-gmend ${busy ? 'disabled' : ''}>Runde beenden</button>`;
}

/** Seitenleiste: Ziel, Gruppe, wer dran ist, Knöpfe und Verlauf. portrait liefert das Bild einer Figur. */
export function sidePanel(g: Game, s: PanelState, portrait: (h: Hero) => string) {
  const ch = E.chapterOf(g);
  const playing = g.status === 'play' && !s.busy;
  const gm = g.status === 'gm';
  return `
    <p class="goal small">${esc(ch.goalText)}${g.goalTaken ? ' ✔ gefunden' : ''}${g.bossDead ? ' ✔ besiegt' : ''}</p>
    <div class="party">${g.heroes.map((o, i) => `<div class="pc ${i === g.turn && playing ? 'on' : ''} ${o.down ? 'down' : ''}"
      data-say="${HEROES[o.id].name}: ${o.hp} von ${o.maxHp} Lebenspunkten, ${o.food} Fischbrötchen, ${o.charges} mal Spezialkönnen${o.down ? ', gestürzt' : ''}">
      <img class="dot" alt="" src="${portrait(o)}">
      <span><b>${HEROES[o.id].name}</b><br><small>❤️ ${o.hp}/${o.maxHp} · 🥪 ${o.food} · ✨ ${o.charges}${o.pfoten ? ' · 🐾' : ''}</small></span>
    </div>`).join('')}</div>
    ${gm && !g.gmHuman ? '<p class="turn">Der Oberpunktezähler stempelt …</p>' : gm ? gmHint(g, s.gmSel) : heroTurn(g)}
    ${gm && g.gmHuman ? gmButtons(g, s.busy) : heroButtons(g, playing, s.aiming)}
    <details class="verlauf" ${s.logOpen ? 'open' : ''}><summary>Verlauf</summary>
      <ol class="log">${g.log.slice(-40).reverse().map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
    </details>`;
}
