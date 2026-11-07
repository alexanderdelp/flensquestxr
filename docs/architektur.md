# Architektur und Tests

## Schichten

Jede Schicht greift nur nach unten. `tests/unit/architecture.test.ts` prüft das bei jedem Testlauf.

```
ui ──────────────┐  Bildschirme, Spielansicht, Brett, Ton
platform         │  Speicher im Browser (localStorage)
net              │  Nachrichten zwischen Geräten
campaigns ───────┤  mitgelieferte Kladde-Dateien und eigene Kampagnen
kladde           │  Sprache: Zerlegen, Übersetzen, Prüfen, Zurückschreiben
core             │  Regelkern: deterministisch, ohne DOM, Speicher, Zeit oder Netz
content ─────────┘  Regelwerte als reine Daten
```

| Ordner | Inhalt | Darf nutzen |
|---|---|---|
| `src/content` | Figuren, Gegner, Kiosk, Kartenkosten, Regelwerte, Planzeichen | nichts |
| `src/core` | Regeln, siehe unten | content |
| `src/kladde` | Kampagnensprache (`lines` → `parse` → `check`, `write`) | core, content |
| `src/campaigns` | übersetzt `kampagnen/*.kladde`, verwaltet eigene Kampagnen | kladde, core, content |
| `src/net` | Transport-Schnittstelle, Sitze, Spielstand-Schnappschuss | core, content |
| `src/platform` | Speicher | core (Typen) |
| `src/ui` | alles Sichtbare und Hörbare | alles |
| `kampagnen/` | mitgelieferte Kampagnen als Kladde-Dateien | – |

## Regelkern `src/core`

| Modul | Aufgabe |
|---|---|
| `types.ts` | Spielstand, Kampagnen, Skripte, Ereignisse (`Fx`) als JSON-Typen |
| `catalog.ts` | Verzeichnis der Kampagnen; der Kern kennt keine Inhalte |
| `rng.ts` | Zufall nur aus dem Startwert im Spielstand |
| `state.ts` | Abfragen ohne Änderung |
| `map.ts` | Laufen, Sicht, Aufdecken, freie Felder |
| `combat.ts`, `outcome.ts` | Würfel, Schaden, Stürze, Punkte, Sieg und Niederlage |
| `heroes.ts`, `specials.ts` | Handlungen der Figur am Zug, Spezialkönnen als Tabelle |
| `scripts.ts` | Auslöser und Befehle aus der Kladde |
| `gm/cards.ts`, `gm/ai.ts`, `gm/turn.ts` | Kartenhand, Rechner als Spielleiter, Rundenablauf |
| `actions.ts` | `Action` und `dispatch`: die einzige Tür für Handlungen, lokal wie im Netz |
| `progress.ts` | Kapitelaufbau, Fortschritt, Kiosk |
| `index.ts` | öffentliche Schnittstelle für Oberfläche und Netz |

## Oberfläche `src/ui`

- `screens/`: Startseite, Kampagnenauswahl (mit eigenen Kampagnen), Figurenwahl, Erzähltexte, Kiosk.
- `game/`: `controller.ts` verbindet Brett, Leisten und Kern. Markierungen, Leisten, Tooltips und Ansagen sind reine Funktionen (`marks.ts`, `panel.ts`, `tooltip.ts`, `announce.ts`) und dadurch einzeln testbar.
- `board/`: Canvas-Brett; Geometrie (`geometry.ts`) und Piets Flugbahn (`piet.ts`) ohne Canvas.
- `sprites.ts`: alle Bilder als Pixel-Art im 64er-Raster (`SPRITE`), einmal gezeichnet und gecacht. Die Formen zerlegt `pixel.ts` in ganze Rasterpunkte (Ellipse, Vieleck, Linie) und legt die Kontur an; das ist reine Rechnung und einzeln getestet. Das Brett zeichnet vergrößerte Bilder ohne Glättung und verkleinerte mit.
- `audio.ts`, `voice.ts`, `speech-text.ts`: Geräusche, Ambiente und Sprache; vorgelesen werden nur Questtexte.
- `session.ts`: geteilter Zustand der Sitzung; `dom.ts` und `text.ts`: Helfer.

## Testebenen

| Ebene | Ort | Was | Laufzeit |
|---|---|---|---|
| Unit | `tests/unit/` | Kernmodule mit dem Prüfstand (`tests/support/pruefstand.kladde`) und erzwungenen Würfeln, Kladde-Stufen samt Fehlermeldungen, reine Oberflächenfunktionen, Modulgrenzen, Version | unter 1 s |
| Integration | `tests/integration/` | echte Kampagnen durch Übersetzer und Kern, eigene Kampagnen, Spielstände, Netz-Determinismus, Doku-Beispiel | unter 1 s |
| Balance | `tests/balance/` | Bot spielt jedes Kapitel 30-mal; zeigt nur die Tendenz | etwa 25 s |
| E2E | `tests/e2e/` | Playwright im echten Browser: Spielablauf, Spielleiter, Tooltips, Kladde laden und speichern, Sprachausgabe, Bildprüfungen der Zeichenreihenfolge | etwa 15 s |

```bash
npm test                # Unit und Integration
npm run test:coverage   # dasselbe mit Mindestabdeckung für core, kladde, campaigns
npm run test:balance    # Bot
npm run test:e2e        # Browser (lokal Edge, in der CI Chrome)
npm run test:all        # alles
```

Faustregeln:
- Eine Regel bekommt einen Unit-Test im Kern, mit dem Prüfstand und `forceDice`, nicht mit einer echten Kampagne.
- Was Kampagnendaten und Regeln zusammen betrifft, gehört in die Integration.
- Was nur im Browser sichtbar ist (Zeichnen, Eingaben, Downloads, Sprache), gehört in E2E. Zeichenfehler prüft `render.spec.ts` über Pixelvergleiche mit und ohne Figur. Wie die Grafik aussieht, zeigt `npm run shots` (Bilder nach `shots/`, nicht im Repo).
- Ein behobener Fehler bekommt zuerst einen Test, der ihn zeigt.
