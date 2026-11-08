# ⚓ FlensQuest

Ein augenzwinkerndes Keller-Abenteuer aus Flensburg für den Browser: 1 bis 4 von fünf Figuren an einem Gerät, den Spielleiter übernimmt der Rechner oder ein Mensch.
FlensQuest ist ein eigenständiges Spiel mit eigenen Regeln, Figuren und Kapiteln und steht in keiner Verbindung zu anderen Spielen oder Marken.

## Starten

```bash
npm install
npm run dev
```

Danach `http://localhost:5195` öffnen.

```bash
npm test
npm run build
```

## Kampagnen

- **Der Fall Hafenlogbuch:** fünf Kapitel, der ursprüngliche Einstieg.
- **Die Akte Förde:** sechs Missionen rund um den gestohlenen Punkte-Stempel.

Beide sind in der Sprache **Kladde** geschrieben und liegen in [`kampagnen/`](kampagnen). Eigene Kampagnen schreibt man genauso und lädt sie im Spiel unter „Neues Abenteuer → 📂 Eigene Kampagne laden“; jede Kampagne lässt sich dort auch als Datei speichern und weitergeben. Die Sprache ist in [`docs/kladde.md`](docs/kladde.md) beschrieben.

## Figuren

- **Frauke**, Fördefischerin: FlensNetz fesselt einen Gegner aus bis zu 3 Feldern.
- **Jörn**, Werftschlosser: hält viel aus, der Dicke Schlüssel trifft sicher für 4.
- **Maren**, Möwenflüsterin: schnell, ihr Schwarm trifft alle Gegner in der Nähe.
- **Hinnerk**, Rumkontorist: Lütt un Lütt heilt und holt Gestürzte zurück.
- **Juni**, die echte Nordhexe: Möwe Piet stürzt sich auf einen Gegner bis 4 Felder weit, 2 Schaden, danach setzt er aus.

## Regeln in Kürze

- **3 Tiden je Zug:** Eine Tide bringt dich so viele Felder weit wie dein Schritt-Wert oder bezahlt eine Aktion (Angriff, Suchen, Truhe, Essen, Spezialkönnen).
- **Angriff:** 2 Würfel + Angriff gegen 7 + Rüstung. Einmal je Zug. 6+6 trifft doppelt, 1+1 nie.
- **Türen** öffnen ist kostenlos. **Suchen** entschärft Fallen und findet verborgene Türen in der Nähe.
- **Punkte in Flensburg:** Fallen, Knöllchen, gestürzte Figuren und der Stempel jede vierte Runde bringen Punkte. Bei 8 ist der Lappen weg und das Kapitel verloren.
- **Spielleiter:** Er hat eine Hand aus Karten und bezahlt sie mit Stempeltinte: 2 zum Start, 2 mehr je Runde, höchstens 8. Jede Runde kommt eine Karte dazu, höchstens 5 auf der Hand. Karten kosten 2 bis 6 Tinte: Eile, härtere Schläge, Gegner flicken, Schietwetter, Verstärkung, verdeckte Fallen, Fischbrötchen klauen, Schlick oder ein Punkt in Flensburg. Rechner und Mensch spielen nach denselben Regeln.
- **Hafenkiosk:** Zwischen den Kapiteln gibt es Friesennerz, Bootshaken, Gummistiefel, Katzenohren und Fischbrötchen für Öre.
- **Bedienung:** Tippen oder Klicken aufs Brett; am PC laufen auch die Pfeiltasten, und mit der Maus zeigen Tooltips Werte zu Gegnern, Figuren und Gegenständen. Zoom per Knöpfen, Mausrad oder zwei Fingern.

## Ton

Geräusche und das Ambiente erzeugt der Browser selbst, es gibt keine Audiodateien. Die Sprachausgabe nutzt die deutsche Stimme des Geräts und liest nur die Questtexte: zu Kampagnenbeginn, vor jedem Kapitel und an seinem Ende. Rechts unten lassen sich Geräusche, Ambiente und Sprache einzeln schalten, 📖 liest die aktuelle Ansicht vor. Der Klang startet nach dem ersten Tippen.

## Aufbau

Schichten mit festen Grenzen, ausführlich in [`docs/architektur.md`](docs/architektur.md):

- `src/content`: Figuren, Gegner, Kiosk, Kartenkosten und Regelwerte als Daten
- `src/core`: Regelkern in Modulen, ohne DOM, Speicher oder Zeit
- `src/kladde`: die Kampagnensprache (Übersetzen, Prüfen, Zurückschreiben)
- `src/campaigns` und `kampagnen/`: mitgelieferte und eigene Kampagnen
- `src/ui`: Bildschirme, Spielansicht, Brett, Pixel-Art, Ton
- `src/net`, `src/platform`: Verbindung zwischen Geräten und Speicher
- `tests/`: Unit, Integration, Balance-Bot und E2E mit Playwright

```bash
npm test               # Unit und Integration
npm run test:e2e       # Browser-Tests
npm run test:balance   # Bot
```

## Telegram

`tools/telegram.mjs` schickt Updates, Screenshots und Fragen über einen eigenen Bot. Die Zugangsdaten liegen außerhalb des Repositorys in `~/.config/flensquest/telegram.env` und werden nie committet.

```bash
node tools/telegram.mjs send "Text"
node tools/telegram.mjs photo bild.png "Text"
node tools/telegram.mjs ask "Frage?" Ja Nein --wait 300
node tools/telegram.mjs inbox
```
