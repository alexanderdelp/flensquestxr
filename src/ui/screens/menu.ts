import { addOwn, isBuiltin, removeOwn, sourceOf } from '../../campaigns';
import { HEROES, PUNKTE_LIMIT, type HeroId } from '../../content';
import { campaignById, campaigns, hasCampaign, newProgress } from '../../core';
import { formatDiagnostic } from '../../kladde';
import { loadCampaignSources, saveCampaignSources } from '../../platform/storage';
import { versionLabel } from '../../version';
import { esc, html, LOGO, on, XR_SIGN } from '../dom';
import { save, session } from '../session';
import { heroSprite, toDataUrl } from '../sprites';
import { campaignIntro, chapterIntro } from './story';

/** Startseite, Kampagnenauswahl und Figurenwahl. */

export function title() {
  const p = session.progress;
  // Alte Spielstände ohne Kampagne gehören zur ersten; ist eine eigene Kampagne weg, gibt es kein „Weiter“.
  const id = p?.campaign ?? campaigns()[0].id;
  const def = p && hasCampaign(id) ? campaignById(id) : null;
  const hasSave = p && def && p.chapter < def.chapters.length;
  html(`<main class="screen title">
    <h1 class="sr">FlensQuest XR</h1>
    <div class="coverwrap"><img class="cover" src="img/titelbild.webp" alt="Titelbild: vier Abenteurer im Kellergewölbe am Flensburger Hafen">${XR_SIGN}</div>
    <p class="lead">Ein Kellerabenteuer zwischen Hafenspitze und Punktearchiv.<br>Für 1 bis 4 Figuren an einem Gerät. Den Spielleiter spielt der Rechner oder ein Mensch.</p>
    <div class="row">
      <button class="primary" data-new>Neues Abenteuer</button>
      ${hasSave ? `<button data-go>Weiter: ${esc(def.title)}, Kapitel ${p.chapter + 1}</button>` : ''}
    </div>
    <section class="rules">
      <h2>So geht's</h2>
      <ul>
        <li>Pro Zug hast du <b>3 Tiden</b>. Eine Tide bringt dich so viele Felder weit, wie dein Schritt-Wert sagt, oder sie zahlt eine Aktion.</li>
        <li><b>Angriff</b>: 2 Würfel + Angriff, nötig sind 7 + Rüstung des Ziels. Einmal je Zug. 6+6 trifft doppelt, 1+1 nie.</li>
        <li><b>Türen</b> öffnen kostet nichts. <b>Suchen</b> entschärft Fallen und findet verborgene Türen.</li>
        <li>Der Oberpunktezähler sammelt <b>Punkte in Flensburg</b>. Bei ${PUNKTE_LIMIT} ist der Lappen weg, und das Kapitel ist verloren.</li>
      </ul>
    </section>
    <p class="version">${versionLabel()}</p>
  </main>`);
  on('[data-new]', () => { session.picked = []; choose(); });
  on('[data-go]', () => chapterIntro());
}

export interface Notice { ok?: string; errors?: string[] }

/** Kampagnenauswahl; eigene Kladde-Dateien lassen sich hier laden, speichern und entfernen. */
export function choose(notice: Notice = {}) {
  html(`<main class="screen">
    ${LOGO}
    <h2>Welches Abenteuer soll es sein?</h2>
    <div class="cards campaigns">${campaigns().map((c) => `<div class="cwrap">
      <button class="card" data-campaign="${esc(c.id)}" data-say="${esc(`${c.title}. ${c.chapters.length} Kapitel. ${c.blurb}`)}">
        ${c.image ? `<img class="cimg" src="${esc(c.image)}" alt="${esc(c.title)}">` : `<b class="ctitle">${esc(c.title)}</b>`}
        <small><b>${c.chapters.length} Kapitel</b>${isBuiltin(c.id) ? '' : ' · <span class="badge">eigene</span>'} · ${esc(c.blurb)}</small>
      </button>
      <div class="cacts">
        <button class="mini" data-export="${esc(c.id)}" title="Als Kladde-Datei speichern, etwa als Vorlage">⬇ Kladde</button>
        ${isBuiltin(c.id) ? '' : `<button class="mini" data-remove="${esc(c.id)}" title="Eigene Kampagne entfernen">✕ Entfernen</button>`}
      </div>
    </div>`).join('')}</div>
    ${notice.ok ? `<p class="notice ok" role="status">${esc(notice.ok)}</p>` : ''}
    ${notice.errors ? `<div class="notice bad" role="alert"><b>Die Kampagne ließ sich nicht laden.</b>
      <ul>${notice.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
    <div class="row">
      <button data-back>Zurück</button>
      <button data-load>📂 Eigene Kampagne laden</button>
      <input type="file" accept=".kladde,.txt,text/plain" data-file hidden>
    </div>
    <p class="hint">Eigene Kampagnen schreibt man in der Sprache Kladde. Am einfachsten: eine Kampagne als Vorlage speichern, ändern und hier laden.</p>
    <p class="version">${versionLabel()}</p>
  </main>`);
  on('[data-back]', title);
  on('[data-campaign]', (el) => { session.chosen = el.dataset.campaign!; pick(); });
  on('[data-export]', (el) => download(el.dataset.export!));
  on('[data-remove]', (el) => removeCampaign(el.dataset.remove!));
  const file = document.querySelector<HTMLInputElement>('[data-file]')!;
  on('[data-load]', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (f) loadCampaign(await f.text());
  });
}

/** Lädt eine Kladde-Datei; Fehler erscheinen mit Zeilennummer. */
export function loadCampaign(source: string) {
  const { result, sources } = addOwn(source, loadCampaignSources());
  if (!result.campaign) { choose({ errors: result.errors.map(formatDiagnostic) }); return; }
  saveCampaignSources(sources);
  const hints = result.warnings.length ? ` ${result.warnings.map(formatDiagnostic).join(' ')}` : '';
  choose({ ok: `„${result.campaign.title}“ ist geladen: ${result.campaign.chapters.length} Kapitel.${hints}` });
}

function removeCampaign(id: string) {
  const def = campaignById(id);
  if (!confirm(`„${def.title}“ entfernen? Die Datei bleibt bei dir, nur hier im Spiel ist sie dann weg.`)) return;
  saveCampaignSources(removeOwn(id, loadCampaignSources()));
  if (session.progress?.campaign === id) { session.progress = null; save(); }
  choose({ ok: `„${def.title}“ ist entfernt.` });
}

function download(id: string) {
  const src = sourceOf(id, loadCampaignSources());
  if (!src) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([src], { type: 'text/plain;charset=utf-8' }));
  a.download = `${id}.kladde`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function pick() {
  const { picked, gmHuman } = session;
  const ids = (Object.keys(HEROES) as HeroId[]).filter((id) => !HEROES[id].hidden);
  html(`<main class="screen">
    ${LOGO}
    <h2>Wer geht mit in den Keller?</h2>
    <p class="lead">Wähle 1 bis 4 von ${ids.length} Figuren. Allein bekommst du eine Tide und 4 Lebenspunkte extra.</p>
    <div class="cards">${ids.map((id) => {
      const d = HEROES[id];
      const full = picked.length >= 4 && !picked.includes(id);
      return `<button class="card ${picked.includes(id) ? 'on' : ''}" data-hero="${id}" aria-pressed="${picked.includes(id)}" ${full ? 'disabled' : ''}
        data-say="${d.name}, ${d.title}. ${d.hp} Lebenspunkte, Angriff ${d.att}, Rüstung ${d.arm}, ${d.spd} Schritte je Tide. ${d.weapon}: ${d.dmg} Schaden, Reichweite ${d.range}. ${d.special}: ${d.specialText}">
        <img class="face" alt="" src="${toDataUrl(heroSprite(id, [], 0))}">
        <b>${d.name}</b><small>${d.title}</small>
        <span class="stats">❤️ ${d.hp} · ⚔️ ${d.att} · 🛡️ ${d.arm} · 👣 ${d.spd}</span>
        <small>${d.weapon}: ${d.dmg} Schaden, Reichweite ${d.range}</small>
        <small><b>${d.special}:</b> ${d.specialText}</small>
      </button>`;
    }).join('')}</div>
    <div class="row seat" role="group" aria-label="Spielleiter">
      <b>Spielleiter:</b>
      <button class="${gmHuman ? '' : 'on'}" data-gm="0" aria-pressed="${!gmHuman}">🖥️ Rechner</button>
      <button class="${gmHuman ? 'on' : ''}" data-gm="1" aria-pressed="${gmHuman}">🧑 Mensch</button>
    </div>
    <div class="row">
      <button data-back>Zurück</button>
      <button class="primary" data-start ${picked.length ? '' : 'disabled'}>Leinen los (${picked.length})</button>
    </div>
  </main>`);
  on('[data-hero]', (el) => {
    const id = el.dataset.hero as HeroId;
    session.picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    pick();
  });
  on('[data-back]', () => choose());
  on('[data-gm]', (el) => { session.gmHuman = el.dataset.gm === '1'; pick(); });
  on('[data-start]', () => {
    session.progress = newProgress(session.picked, session.gmHuman, session.chosen);
    save();
    campaignIntro();
  });
}
