# Rezeptbar

Eine einfache Single-Page-Rezeptsammlung als statische Website, hostbar über GitHub Pages.
Kein Build-Tool nötig – reines HTML/CSS/JavaScript.

Es gibt drei Bereiche, zwischen denen über die Tab-Leiste im Header gewechselt wird:
**Kochen** (`fruehstueck`, `mittag`, `sonstiges`), **Backen** (`backen`) und
**Getränke** (`getraenke`). Die Zuordnung Kategorie → Bereich steht in
`js/app.js` in `SECTIONS`. Innerhalb von "Kochen" gibt es zusätzlich einen
Art-Filter, da dieser Bereich mehrere Kategorien zusammenfasst.

## Aufbau

```
index.html            Einstiegspunkt der SPA
css/style.css          Styles
js/app.js               Hash-Router, Übersicht + Filter, Detailansicht
recipes/*.json          Ein Rezept pro Datei
recipes/index.json       Generierte Übersichtsliste (nicht von Hand pflegen!)
scripts/generate-index.mjs  Erzeugt recipes/index.json aus allen recipes/*.json
.github/workflows/deploy.yml GitHub Actions: baut den Index und deployed nach GitHub Pages
```

## Neues Rezept hinzufügen

1. Neue Datei `recipes/<id>.json` anlegen, z. B. `recipes/tomatensuppe.json`:

   ```json
   {
     "id": "tomatensuppe",
     "title": "Tomatensuppe",
     "category": "mittag",
     "cuisine": "deutsch",
     "time": 40,
     "servings": 4,
     "ingredients": [
       { "amount": "1", "unit": "kg", "name": "Tomaten" },
       { "amount": "1", "unit": "", "name": "Zwiebel" }
     ],
     "steps": [
       "Zwiebel anschwitzen.",
       "Tomaten zugeben und köcheln lassen.",
       "Pürieren und abschmecken."
     ],
     "notes": "Optional mit Sahne verfeinern.",
     "image": "images/tomatensuppe.jpg"
   }
   ```

   Felder:
   - `category`: einer von `fruehstueck`, `mittag`, `backen`, `getraenke`, `sonstiges`
     (Anzeige-Label wird in `js/app.js` in `CATEGORY_LABELS` festgelegt)
   - `cuisine`: freier Text, z. B. `italienisch`, `asiatisch`, `spanisch`
   - `time`: Zubereitungszeit in Minuten (Zahl)
   - `servings`: Anzahl Portionen (Zahl)
   - `ingredients`: Liste aus `{ amount, unit, name, component }`. `component` ist optional
     und gruppiert Zutaten unter einer Überschrift (z. B. `"Boden"`, `"Füllung"`, `"Ganache"`)
     – nützlich bei Rezepten mit mehreren Teilkomponenten wie Torten. Aufeinanderfolgende
     Zutaten mit demselben `component`-Wert werden zusammen unter dieser Überschrift
     angezeigt; ohne `component` erscheinen sie als normale, unbeschriftete Liste.
   - `steps`: Liste von Zubereitungsschritten (Strings)
   - `utensils`: optionale Liste benötigter Küchenutensilien (Strings), wird als eigener
     Abschnitt "Utensilien" oberhalb von Zutaten/Zubereitung angezeigt. Ohne dieses Feld
     wird kein Utensilien-Abschnitt angezeigt.
   - `notes`: optionaler Freitext (kann weggelassen werden)
   - `image`: optionaler relativer Pfad zu einem Vorschaubild (z. B. `images/tomatensuppe.jpg`),
     wird als Thumbnail in der Übersicht und als großes Bild in der Detailansicht angezeigt.
     Bilddateien einfach in `images/` ablegen. Ohne `image`-Feld wird kein Bild angezeigt.

2. Beim Push nach `main` erzeugt die GitHub Action automatisch `recipes/index.json`
   und deployed die Seite. Lokal kannst du den Index manuell erzeugen mit:

   ```bash
   node scripts/generate-index.mjs
   ```

## Lokal testen

Da die App per `fetch()` JSON-Dateien lädt, muss sie über einen HTTP-Server
laufen (nicht per `file://` öffnen):

```bash
node scripts/generate-index.mjs
python3 -m http.server 8080
```

Dann [http://localhost:8080](http://localhost:8080) öffnen.

## GitHub Pages einrichten

1. Repo auf GitHub anlegen und dieses Verzeichnis pushen (Branch `main`).
2. In den Repo-Einstellungen unter **Pages** als Quelle **GitHub Actions** auswählen.
3. Nach dem nächsten Push auf `main` läuft der Workflow automatisch und
   veröffentlicht die Seite unter `https://<user>.github.io/<repo>/`.
