# Übergabe: Grafiken in höherer Auflösung und Bildqualität

> **Umgesetzt in 0.7.0** (Repo `flensquestxr`): Entscheidung des Menschen per Telegram: Pixel-Art im 64er-Raster, weiter im Code, alles auf einmal. Der aktuelle Stand steht in `CLAUDE.md` (Optik) und `docs/architektur.md`; dieses Dokument bleibt als Auftrag zum Nachlesen.

Stand: Version 0.6.2, 7. November 2026. Dieses Dokument ist der Einstieg für den Agenten, der die Grafik überarbeitet. Erst `CLAUDE.md`, dann `docs/architektur.md`, dann hier weiterlesen.

## Auftrag

Die Spielgrafik soll in höherer Auflösung und besserer Bildqualität entstehen. Heute ist alles Pixel-Art im 32 × 32-Raster, im Code gezeichnet und beim Zeichnen ohne Glättung hochskaliert. Auf großen Bildschirmen und beim Zoom wirkt das grob: Ein Feld ist auf dem iPad mit Zoom 3 leicht 200 Bildpunkte groß und zeigt dann 32 Rasterpunkte. Spielregeln, Abläufe und Bedienung bleiben unverändert.

## Vor dem Start klären (per Telegram-`ask`, mit Screenshot des heutigen Stands)

Diese Entscheidungen gehören dem Menschen. Sie ändern Designregeln aus `CLAUDE.md`, also nicht selbst festlegen:

1. **Stil.** a) Pixel-Art bleibt, aber feineres Raster (etwa 64 oder 96); b) glatte, gezeichnete Grafik (Formen, Verläufe, Kanten mit Glättung), weiterhin im Code erzeugt; c) gemalte Bitmaps als Dateien in `public/img`. Empfehlung: a oder b, weil Ausrüstung an der Figur, Laune und Animation dann weiter aus Bausteinen entstehen.
2. **Im Code oder als Dateien.** Heute: alles im Code, keine Bilddateien fürs Brett. Dateien wären erlaubt (statische Seite, gleicher Ursprung), kosten aber Ladezeit und machen „Ausrüstung sichtbar“ und Laune aufwendiger.
3. **Umfang.** Alles auf einmal oder in Etappen: Figuren und Piet, dann Gegner, dann Gegenstände, dann Boden und Wände, dann Menüs und Kiosk.

Die Regel in `CLAUDE.md` unter „Optik“ („Alle Grafiken sind eigene Pixel-Art im 32er-Raster, im Code gezeichnet“) danach passend umschreiben.

## Wo die Grafik heute steckt

**`src/ui/sprites.ts`** (rund 650 Zeilen) erzeugt alle Bilder zur Laufzeit:

- `sprite(key, draw, flip)` legt ein 32 × 32-Canvas an, zeichnet mit dem `Painter` `p(x, y, w, h, farbe)` (nur gefüllte Rechtecke) und speichert es unter `key` im Cache. `flip` spiegelt waagerecht.
- `heroSprite(id, gear, frame, flip, mood, familiar)`:
  - `frame`: 0/1 Stand mit Wippen (1 = einen Rasterpunkt tiefer), 2/3 Laufen.
  - `gear`: `friesennerz`, `bootshaken`, `gummistiefel`, `katzenohren` müssen sichtbar sein.
  - `mood`: 0 gut, 1 finstere Miene, 2 Verband und blaues Auge; dazu zeichnet das Brett `objects.wolke`.
  - `familiar`: Piet sitzt im Porträt auf Junis Schulter; auf dem Brett fliegt er selbst.
- `heroDown(id, gear)`: die liegende Figur, gedreht aus `heroSprite`.
- `monsterSprite(id, frame, flip)` für alle 19 Gegner aus `src/content/monsters.ts`, `frame` für Stand und Laufen.
- `piet(frame, flip)`: Möwe Piet, 2 Flügelbilder.
- `objects`:
  - Spielobjekte: `chest`, `door`, `exit`, Möbel `fass`, `kiste`, `pumpe`, `regal`.
  - Ziel-Gegenstände: `logbuch`, `schluessel`, `karte`, `akte`, `feder`, `stempel`; deren Namen nutzt auch die Kladde-Sprache (`GOAL_SPRITES` in `src/content/map.ts`).
  - Kiosk: `fischbroetchen`, `friesennerz`, `bootshaken`, `katzenohren`, `gummistiefel`.
  - Zustände: `netz` (gefesselt), `sterne` (geblendet), `wolke` (Laune).
  - Wandschmuck: `lanterne`.
- `THEMES` (6 Raumthemen, Anzahl muss `THEME_COUNT` in `src/content/map.ts` entsprechen), `floorTile(theme, variante)` mit 24 Bodenvarianten, `wallFace(theme, variante)` mit 12 Wandvarianten, `shade(farbe, k)`.
- `toDataUrl(canvas)` für Porträts in HTML.

**`src/ui/board/board.ts`** setzt die Bilder in die Perspektive:

- `place(bild, feld)` zeichnet aufrechte Bilder quadratisch mit `1,2 × Feldgröße`, Füße bei `y + 0,7`.
- Boden (`floorStrips`, 6 Streifen) und Wand- und Türfronten (`box`, 5 Streifen) werden in Streifen perspektivisch verzerrt. Dabei wird mit `SPRITE` als Quellgröße gerechnet.
- `imageSmoothingEnabled = false` an zwei Stellen. Das Canvas hat die volle Gerätepixeldichte (`devicePixelRatio`).
- Wanddeckel und -seiten sind Flächen in den Farben aus `THEMES`, keine Bilder.

**Weitere Stellen:**
- **`src/ui/board/piet.ts`:** eigene Konstante `SPRITE = 32` für Piets Wippen um einen Rasterpunkt. Beim Rasterwechsel mit `sprites.ts` zusammenführen.
- **`src/ui/style.css`:** `image-rendering: pixelated` für `.board`, `.face` (Figurenwahl, 96 px) und `.dot` (Seitenleiste und Kiosk, 36 px).
- **Porträts:** `src/ui/screens/menu.ts`, `src/ui/screens/shop.ts`, `src/ui/game/controller.ts` (`portrait`).
- **`public/img`:** Titelbild, Schriftzug und die zwei Kampagnenbilder sind bereits hochauflösende WebP-Dateien und nicht Teil des Auftrags, außer der Mensch will es.

## Was erhalten bleiben muss

- Eigenständige Grafik, nichts aus fremden Spielen, keine Marken; Flensburger Ton (siehe `CLAUDE.md`).
- **Ausrüstung sichtbar an der Figur, Laune im Sprite, Piet auf der Schulter**, Wippen im Stand und Laufbilder.
- **Lesbarkeit beim Spielen:** Figuren und Gegner unterscheidbar, Zustände (gefesselt, geblendet) erkennbar, Markierungen (grün, gold, rot) bleiben darüber gut sichtbar.
- **Zeichenreihenfolge und Verdeckung** (Figuren im Durchgang, Ring, Seitenwände, Piet hinter Wänden), siehe `scene()` und `clipSides()` in `board.ts`. Die Quadratgröße `1,2 × Feld` und der Fußpunkt stecken in der Beschnitt-Rechnung; wer sie ändert, muss den Beschnitt nachziehen.
- **Leistung:** Bilder werden einmal erzeugt und gecacht. Das Brett zeichnet jedes Bild jedes Mal neu, also bei größeren Bildern auf Bildrate und Speicher achten, besonders auf dem iPad. Der Boden liegt vorgezeichnet in einem eigenen Canvas.
- **Betrieb:** statische Seite, keine externen Anfragen zur Laufzeit; PC und iPad zuerst, iPhone spielbar.

## Absicherung

- **Unit:** `tests/unit/ui/ui.test.ts`, darin Piets Bahn und Wippen (rechnet mit `SPRITE` 32) und `THEMES` passend zu `THEME_COUNT`.
- **E2E:** `tests/e2e/render.spec.ts` vergleicht Pixel an Wandpunkten mit und ohne Figur im Durchgang. Unabhängig vom Grafikstil muss das grün bleiben. Die Gegenprobe (Beschnitt abschalten, dann muss es rot werden) lohnt sich nach dem Umbau erneut.
- **Weitere Prüfungen:**
  - Kann ein Test das Ergebnis nicht beurteilen, Ausschnitte im Browser als Bild holen und ansehen. Die Browseransicht ist oft verborgen, Screenshots sind dann veraltet. Bewährt: `board.draw()` aufrufen, Ausschnitt aus dem Canvas per `toDataURL` holen und per `fetch` an einen kurzen lokalen Node-Empfänger schicken, der die Datei speichert; oder Playwright-Skript mit `channel: 'msedge'`.
  - Neue reine Funktionen bekommen Unit-Tests.
  - Behobene Zeichenfehler bekommen eine Bildprüfung nach dem Muster in `render.spec.ts`.
- **Vor jedem Push:** `npm run test:coverage`, `npm run test:e2e`, `npm run build`.

## Arbeitsweise in diesem Projekt

- **Änderungen veröffentlichen:** Direkt committen und auf `main` pushen ist ausdrücklich erlaubt. Der Mensch testet unterwegs über GitHub Pages.
  - Muster: Feature-Branch, Commit, `git merge --no-ff` mit „Merge: …“, Push, CI-Lauf mit `gh run watch` abwarten.
  - Commit-Nachrichten enden mit der Co-Authored-By-Zeile.
- **Version:** Jede veröffentlichte Änderung erhöht die Version in `package.json` mit Eintrag oben in `CHANGELOG.md`. Die neue Grafik ist eine neue Funktion, also mindestens Minor-Version (0.7.0); Nachbesserungen erhöhen den Build-Zähler.
- **Telegram:** Fertige Etappen per `node tools/telegram.mjs photo <bild> "<text>"` melden, Entscheidungsfragen per `ask` mit Knöpfen (siehe `CLAUDE.md`).
- **Dev-Server:** `npm run dev` auf Port 5195; E2E startet immer einen eigenen auf 5196 (im Original-Repo flensquest: 5190/5191). Im Entwicklungsmodus gibt `window.__flens` Zugriff auf `board`, `game` und `campaign`.

## Fertig ist der Auftrag, wenn

- alle Bilder aus `sprites.ts` (Figuren mit allen Ausrüstungs- und Launekombinationen, liegende Figuren, Piet, 19 Gegner, alle `objects`, Boden und Wände aller 6 Themen) in der neuen Qualität vorliegen;
- Brett, Figurenwahl, Seitenleiste und Kiosk scharf aussehen, auch bei Zoom 3 und auf dem iPad;
- alle Tests grün sind und die Bildprüfungen weiter anschlagen, wenn man den Beschnitt abschaltet;
- `CLAUDE.md` (Optik), `docs/architektur.md` und `CHANGELOG.md` den neuen Stand beschreiben und die Version erhöht ist;
- der Mensch per Telegram Screenshots von Brett, Figurenwahl und Kiosk bekommen hat.
