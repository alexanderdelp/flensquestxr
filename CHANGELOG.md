# Änderungen

Version major.minor.build: major bei großen Umbrüchen, minor bei neuen Funktionen, build bei jeder sonstigen Änderung.
Der oberste Eintrag muss zur Version in `package.json` passen; ein Test prüft das.

## 0.7.0
- Neue Grafik: alle Figuren, Piet, Gegner, Gegenstände, Boden und Wände als Pixel-Art im feineren 64er-Raster, weiterhin im Code gezeichnet. Mehr Details, Schattierung und eine Kontur in der Eigenfarbe jeder Figur.
- Neue Malwerkzeuge für Sprites (`src/ui/pixel.ts`): Ellipsen, Vielecke und Linien in ganzen Rasterpunkten, dazu die automatische Kontur.
- Brett: Pixel bleiben beim Heranzoomen scharf; weit herausgezoomt werden die Bilder sauber verkleinert statt zu flimmern.
- Figurenwahl mit größeren Porträts (128 px), Seitenleiste und Kiosk mit 32 px, am Retina-Bildschirm Punkt für Punkt scharf.
- Gestürzte Figuren liegen mit Verband da.
- `npm run shots` macht Bilder von Figurenwahl, Brett, Kiosk und allen Sprites nach `shots/`.
- Eigenes Repo `flensquestxr` mit Veröffentlichung auf https://alexanderdelp.github.io/flensquestxr/.

## 0.6.2
- Test für das Doku-Beispiel läuft auch mit Windows-Zeilenenden.

## 0.6.1
- Übergabedokument für die Überarbeitung der Grafik: `docs/uebergabe-grafik.md`.

## 0.6.0
- Neue Kampagnensprache **Kladde**: Kampagnen und Kapitel als Textdateien mit Plan und Skripten (`wenn tür … aufgeht:`, `zeige`, `rufe` …). Beide Kampagnen liegen jetzt als `kampagnen/*.kladde` vor.
- Eigene Kampagnen in der Kampagnenauswahl laden, als Datei speichern und entfernen; Fehler erscheinen mit Zeilennummer.
- Neue Auslöser und Befehle für Kapitel: Start, Ziel gefunden, Runde n; Öre, Punkte, Heilen.
- Werkzeug `npm run kladde -- pruefe datei.kladde` und Sprachreferenz in `docs/kladde.md`.
- Tests neu aufgebaut: Unit (Prüfstand, erzwungene Würfel), Integration, Balance und E2E; Mindestabdeckung für Kern, Sprache und Kampagnen.

## 0.5.2
- Architektur in Schichten zerlegt: `content` (Regelwerte), `core` (Regelkern in Modulen: Gelände, Kampf, Helden, Spezialkönnen, Skripte, Spielleiter mit Karten, Rechner und Zugablauf), `campaigns`, `net`, `platform` (Speicher), `ui` (Bildschirme, Spielansicht, Brett).
- Raumtexte, Gegnertexte und Endkampf-Wenden laufen als Skripte mit Auslöser und Befehlen.
- Texte aus Kampagnen werden in der Oberfläche maskiert.
- Architekturtest wacht über die Modulgrenzen.

## 0.5.1
- Versionsnummer auf Startseite und Kampagnenauswahl.
- Stand bis hierhin: zwei Kampagnen, Spielleiter mit Kartenhand und Tinte, Pfeiltasten, Tooltips, Juni die echte Nordhexe mit Möwe Piet.
