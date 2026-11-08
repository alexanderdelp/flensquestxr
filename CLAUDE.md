# CLAUDE.md – FlensQuest

Eigenständiges Browser-Dungeonspiel mit Flensburg-Humor (Vite, TypeScript, kein Framework). Details stehen in `README.md`.

## Spielkontext
Kooperatives Keller-Abenteuer für 1 bis 4 Figuren an einem Gerät, reihum, gewählt aus fünf Figuren. Den Spielleiter spielt wahlweise der Rechner oder ein Mensch; er tritt als Oberpunktezähler gegen die Gruppe an. Es gibt zwei mitgelieferte Kampagnen: den ursprünglichen Fall Hafenlogbuch und die Story-Kampagne „Die Akte Förde“. Beide sind in der eigenen Sprache Kladde geschrieben (`kampagnen/*.kladde`, Referenz in `docs/kladde.md`); eigene Kampagnen lassen sich genauso schreiben, im Spiel laden und weitergeben.

Ausgangspunkt war der Wunsch nach einem Spiel im Stil klassischer Dungeon-Brettspiele. **FlensQuest ist aber keine Nachbildung eines bestehenden Spiels:** Regeln, Figuren, Gegner, Karten, Texte und Grafik bleiben eigenständig. Nichts aus einem konkreten Spiel übernehmen.

## Designkriterien
- **Ton:** augenzwinkernd, freundlich, norddeutsch-trocken, Deutsch und kurz. Lokalkolorit aus Flensburg ist der Kern des Spiels (Förde, Rum, Möwen, Schietwetter, Fischbrötchen, Punkte in Flensburg).
- **Namen:** Einige zentrale Begriffe dürfen mit „Flens“ beginnen (FlensQuest, FlensNetz, FlensLogbuch), aber nicht alle. Keine Logos oder Markenauftritte Dritter.
- **Kernidee Punkte:** Die Punkte in Flensburg sind die Uhr des Spiels. Fallen, Knöllchen, gestürzte Figuren, Spielleiterkarten und der Stempel jede vierte Runde bringen Punkte. Bei 8 ist der Lappen weg und das Kapitel verloren.
- **Zugsystem:** 3 Tiden je Zug, solo 4. Eine Tide bringt Schritte oder bezahlt eine Aktion. Pro Zug ein Angriff und ein Spezialkönnen. Türen öffnen ist kostenlos.
- **Spielleiter:** Er hält eine Kartenhand (Start 3, höchstens 5, eine neue je Runde) und bezahlt Karten mit Stempeltinte: Start 2, +2 je Runde, höchstens 8. Karten kosten 2 bis 6 Tinte und wirken sofort oder bis Rundenende (schneller laufen, härter zuschlagen, Gegner flicken, Schietwetter, Verstärkung, verdeckte Falle, Fischbrötchen klauen, Schlick, Punkt). Karten ohne Wirkung lassen sich nicht spielen. Rechner und Mensch folgen denselben Regeln.
- **Würfel:** 2W6 + Angriff gegen 7 + Rüstung, 6+6 trifft doppelt, 1+1 trifft nie.
- **Erkundung:** Räume werden erst sichtbar, wenn eine Tür aufgeht. Gegner werden erst aktiv, wenn ihr Feld aufgedeckt ist. Verborgene Türen und Fallen findet man mit Suchen.
- **Figuren:** Jede Figur hat eine klare Rolle und ein eigenes Spezialkönnen, zweimal je Kapitel. Frauke fesselt aus der Distanz, Jörn hält viel aus und schlägt hart zu, Maren ist schnell und trifft mehrere Gegner, Hinnerk heilt und holt Gestürzte zurück, Juni, die echte Nordhexe, schickt ihre Möwe Piet auf einen Gegner, der danach aussetzt. Die frühere Leuchtturm-Juni (`juni`) ist ausgeblendet und bleibt nur für alte Spielstände.
- **Fortschritt:** Klein und überschaubar. Öre gibt es für Gegner, Truhen und Kapitel, ausgegeben werden sie im Hafenkiosk. Jedes Ausrüstungsteil bringt einen kleinen, klar umrissenen Vorteil: +1 auf einen Wert oder eine einzelne Regel wie bei den Katzenohren (einmal je Kapitel nicht stürzen). Nichts davon stapelt sich zu großen Sprüngen.
- **Balance:** Gegner-Lebenspunkte skalieren mit der Figurenzahl. Solo gibt es eine Tide und 4 Lebenspunkte extra. Kapitel sollen fordernd, aber schaffbar sein. Der Bot in `tests/balance/bot.test.ts` zeigt nur die Tendenz, entscheidend ist echtes Anspielen.
- **Verlieren:** Eine Niederlage ist nie endgültig. Das Kapitel beginnt von vorn, nur die Öre aus dem Versuch sind weg.

## Technik und Oberfläche
- **Architektur:** Schichten mit festen Grenzen, beschrieben in `docs/architektur.md` und geprüft von `tests/unit/architecture.test.ts`: `content` (Regelwerte als Daten) ← `core` (Regelkern in Modulen, ohne DOM, Speicher, Zeit oder Netz) ← `kladde` (Sprache) ← `campaigns` ← `ui`; daneben `net` und `platform` (Speicher). Neue Regeln kommen in das passende Kernmodul, neue Inhaltswerte nach `content`, nichts davon in die Oberfläche. Zufall läuft über den Seed im Spielzustand, damit Tests reproduzierbar bleiben.
- **Kampagnen:** Nur als Kladde-Dateien. Eine Kampagne ist reine Beschreibung: Rahmentexte, Spielleiterkarten (Wirkung über die `id`, Kosten in `GM_COST`), Kapitel mit Plan und Skripten nach dem Muster `wenn <auslöser>: <befehle>` (Auslöser `start`, `tür`, `<gegner> auftaucht`, `halb`, `ziel gefunden`, `runde`; Befehle `zeige`, `rufe`, `öre`, `punkte`, `heile`). Neue Auslöser oder Befehle brauchen Kern (`src/core/scripts.ts`), Übersetzer (`src/kladde/parse.ts`), Schreiber, Prüfung und Doku zugleich. Texte aus Kampagnen werden in der Oberfläche immer mit `esc` ausgegeben; spitze Klammern lehnt der Übersetzer ab.
- **Spielleiter:** `gmTurn` ist ein Generator, damit die Oberfläche jeden Gegnerzug einzeln zeigt. Der Rechner spielt Karten nach einfachem Nutzen je Tinte, Eile, Zorn und Flicken vor den Gegnerzügen, den Rest danach. Ein menschlicher Spielleiter zieht Gegner einzeln und spielt beliebig viele Handkarten, solange die Tinte reicht.
- **Handlungen:** Alles läuft als serialisierbare `Action` über `dispatch` und `src/net/transport.ts`. Neue Handlungen nur dort ergänzen, damit das Spiel zwischen Geräten lauffähig bleibt. Die Engine meldet Sichtbares über `g.fx`; das steuert Animationen und Meldungen, nie die Regeln.
- **Bedienung:** Alles läuft per Klick oder Tippen auf dem Brett. Am PC laufen die Pfeiltasten zusätzlich ein Feld weit; steht dort ein Gegner, eine Tür oder Truhe, greifen sie an oder öffnen. Nichts darf nur per Tastatur gehen. Mit der Maus zeigt ein Tooltip Werte und Texte zu Gegnern, Figuren, Türen, Truhen, Ziel, Ausgang und Möbeln; Verborgenes (Fallen, verborgene Türen) verrät er nie. Mögliche Ziele sind markiert: grün zum Gehen, gold für Türen und Truhen, rot für Gegner. Aktionsknöpfe mindestens 44 px hoch.
- **Layout:** Die Spielansicht passt ab 821 px Breite ohne Seiten-Scrollen auf den Bildschirm. Darunter stehen Brett und Seitenleiste untereinander.
- **Optik:** Farben der Förde, Backstein und Sand als CSS-Variablen in `src/ui/style.css`. Alle Grafiken sind eigene Pixel-Art im 64er-Raster, im Code gezeichnet (`src/ui/sprites.ts` mit den Malwerkzeugen aus `src/ui/pixel.ts`: Rechteck, Ellipse, Vieleck, Linie, dazu eine Kontur in der Eigenfarbe). Keine Bilddateien fürs Brett. Licht kommt von links oben. Vergrößert bleiben Pixel scharf, verkleinert wird geglättet. `npm run shots` zeigt alle Sprites auf einen Blick. Boden und Wände wechseln je Feld zwischen Varianten (getönte Ziegel und Platten, selten Riss, Moos, Pfütze, Gräte, Aushang); die Auswahl hängt fest an der Feldposition. Ausrüstung muss an der Figur sichtbar sein.
- **Name:** Dieser Ableger heißt FlensQuest XR. Das XR ist ein eigenes Schild in Schablonenschrift (`src/ui/xr.ts`), das am Schriftzug hängt: auf dem Titelbild, über jedem Logo und in der Kopfleiste. Der Schriftzug selbst bleibt unverändert.
- **Ansicht:** Canvas-Brett mit echter Perspektive (`src/ui/projection.ts`), fester Blickwinkel von 55 Grad, kein Regler. Wände sind Quader mit Höhe und dürfen Felder dahinter verdecken; Figuren schimmern dann durch. Türen stehen im Durchgang, bündig von Wand zu Wand und so hoch wie die Wand. Zoom per Knöpfen, Mausrad oder zwei Fingern.
- **Reichweite:** Heller Rand um das Gebiet und ein Punkt je Feld, nie nur eine Tönung des Bodens.
- **Laune:** Figuren zeigen ihren Zustand im Sprite: finstere Miene nach Schaden, ab halben Lebenspunkten Verband, blaues Auge und Gewitterwolke.
- **Meldungen:** Was der Spielleiter tut, steht auf dem Brett (Zeile, Banner, Rundenrückblick). Niemand soll dafür den Verlauf lesen müssen.
- **Ton:** `src/ui/audio.ts` erzeugt Geräusche und Ambiente per Web Audio, ohne Audiodateien. Sprache über `speechSynthesis`, aber nur für Questtexte: Kampagnenstart, Kapitelbeginn und Kapitelende (gewonnen, verloren, Epilog). Spielgeschehen, Karten und Menüs werden nicht automatisch vorgelesen; 📖 liest auf Wunsch die aktuelle Ansicht. Neue Questtexte müssen vorlesbar sein (`src/ui/speech-text.ts`). Alles einzeln schaltbar.
- **Zielgeräte:** PC und iPad haben Vorrang. Das iPhone soll spielbar sein, darf aber keine Designentscheidung zulasten der anderen bestimmen.
- **Betrieb:** Statische Seite ohne Server und ohne externe Anfragen zur Laufzeit. Für mehrere Geräte siehe `docs/mehrgeraete.md`. Der Spielstand liegt nur in `localStorage`, Schlüssel `flensquest:v1`.
- **Veröffentlichung:** Jeder Push auf `main` testet, baut und veröffentlicht auf https://alexanderdelp.github.io/flensquestxr/ (`.github/workflows/deploy.yml`). Dieses Repo ist die Grafik-Überarbeitung von `flensquest` (Remote `upstream`). `base` bleibt relativ.

## Befehle
```bash
npm run dev            # Dev-Server auf Port 5195 (E2E nutzt 5196; das Original flensquest 5190/5191)
npm test               # Unit- und Integrationstests (unter 1 s)
npm run test:coverage  # dasselbe mit Mindestabdeckung für core, kladde, campaigns
npm run test:balance   # Bot spielt alle Kapitel
npm run test:e2e       # Playwright im Browser (lokal Edge, CI Chrome)
npm run build          # Typprüfung und Build nach dist/
npm run shots          # Bilder von Figurenwahl, Brett, Kiosk und Sprites nach shots/
npm run kladde -- pruefe datei.kladde   # Kampagne prüfen
```

## Tests
Jede Änderung wird auf der passenden Ebene abgesichert (siehe `docs/architektur.md`): Regeln als Unit-Test im Kern mit dem Prüfstand `tests/support/pruefstand.kladde` und `forceDice`, Zusammenspiel von Kampagnen und Regeln als Integration, alles Sichtbare (Zeichnen, Eingaben, Sprache, Downloads) als E2E. Ein behobener Fehler bekommt zuerst einen Test, der ihn zeigt. Vor jedem Push laufen `npm run test:coverage`, `npm run test:e2e` und `npm run build`; die CI wiederholt das und zusätzlich den Bot.

## Version
`package.json` führt die Version major.minor.build; Startseite und Kampagnenauswahl zeigen sie. Jede veröffentlichte Änderung erhöht sie: major bei großen Umbrüchen, minor bei neuen Funktionen, build bei allem anderen. Dazu ein Eintrag oben in `CHANGELOG.md`; ein Test prüft, dass beide zusammenpassen.

## Telegram
Der Mensch bekommt über einen eigenen Bot Updates und beantwortet Fragen (`npm run telegram -- …`, siehe `tools/telegram.mjs`). Zugangsdaten liegen in `~/.config/flensquest/telegram.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`): nie ausgeben, nie committen.
- **Pflicht:** Wenn eine Aufgabe fertig ist oder dringend Input gebraucht wird, unaufgefordert über den Bot melden, auch wenn die Antwort zusätzlich im Chat steht.
- **Fertig:** Update mit Screenshot per `photo`. Zeigt die Aufgabe nichts Sichtbares, reicht `send`.
- **Dringender Input:** `ask` mit Knöpfen, dazu ein Screenshot, wenn er die Frage erklärt. Kleinigkeiten nicht melden.
- Aufruf direkt mit `node tools/telegram.mjs …`; über `npm run` geht `--wait` verloren.
- `send`: kurzes Update ohne Bild.
- `photo <datei> [text]`: Screenshot aus dem Spiel, nur mit Testdaten.
- `ask`: Entscheidungsfrage mit Knöpfen; Antwort mit `--wait` oder später mit `inbox`.
- Inhalte kurz, auf Deutsch, ohne Geheimnisse. Antworten zählen nur aus der eingetragenen Chat-ID.
- `setup` liest die Nachrichten an den Bot und trägt die Chat-ID ein: nur nach Rückfrage ausführen.
