# unitherm-beteiligung.at

Statische Website der Unitherm Beteiligungs GmbH. Kein Build-Schritt, kein
Framework, keine externen Schriften, keine Cookies. Bearbeiten, committen,
fertig — Cloudflare Pages veröffentlicht automatisch.

## Inhalt

```
_headers              Testbetrieb: hält Suchmaschinen fern (vor Livegang löschen)
index.html            Mainpage
beteiligungen.html    Unternehmensbeteiligungen
immobilien.html       Ankauf Wohnungen und Bauprojekte (mit Formular)
impressum.html        Impressum & Offenlegung
datenschutz.html      Datenschutzerklärung
site.webmanifest      Symbole für den Startbildschirm
assets/
  style.css           gemeinsames Stylesheet für alle Seiten
  logo.svg            Logo farbig (heller Untergrund)
  logo-weiss.svg      Logo weiß (dunkler Untergrund) — wird verwendet
  favicon.svg         Browsersymbol, Vektor
  favicon.ico         Browsersymbol, 16/32/48 px
  favicon-16x16.png   
  favicon-32x32.png   
  apple-touch-icon.png  iOS-Startbildschirm, 180 px
  icon-192.png        Manifest
  icon-512.png        Manifest
  beteiligungen.jpg   index.html — Motiv Unternehmensbeteiligungen
functions/
  api/kontakt.js      Formularversand (Cloudflare Pages Function)
img/
  hero.jpg            immobilien.html — Kopfbild (1800 px)
  wohnungen.jpg       immobilien.html — Karte „Wohnungen"
  bauprojekte.jpg     immobilien.html — Karte „Bauprojekte"
```

Die drei Fotos in `img/` sind aus dem alten Immobilien-Paket übernommen und
neu komprimiert: zusammen 209 KB statt 372 KB, ohne sichtbaren Verlust. Die
Originale liegen unverändert im Ordner daneben.

Das Beteiligungsmotiv `assets/beteiligungen.jpg` wird per CSS als Fläche
eingebunden (`.motiv-beteiligungen` in `style.css`). Zum Austauschen genügt
es, die Datei zu ersetzen — HTML und CSS bleiben unberührt. Fehlt die Datei,
erscheint an ihrer Stelle eine ruhige CI-blaue Farbfläche, kein leerer Rahmen.

## Schritt 1 — Repository auf GitHub anlegen

Ohne Git-Programm, direkt im Browser:

1. **github.com** → oben rechts **+** → **New repository**
2. Repository name: `unitherm-beteiligung`
3. **Private** wählen (die Seite ist noch nicht öffentlich)
4. **Add a README file** NICHT ankreuzen — das Repository muss leer starten
5. **Create repository**
6. Auf der folgenden Seite: **uploading an existing file**
7. Den **Inhalt** dieses Ordners hineinziehen — alle Dateien und die Ordner
   `assets`, `functions`, `img`. Nicht den Ordner `unitherm-beteiligung`
   selbst, sondern das, was darin liegt.
8. Unten **Commit changes**

Kontrolle: Im Repository muss `index.html` direkt sichtbar sein, nicht in
einem Unterordner. Sonst findet Cloudflare die Seite nicht.

## Schritt 2 — Cloudflare Pages verbinden

1. **dash.cloudflare.com** → links **Compute (Workers & Pages)**
2. **Create** → Reiter **Pages** → **Connect to Git**
3. GitHub-Konto verbinden, Repository `unitherm-beteiligung` auswählen
4. Build-Einstellungen:
   - Project name: `unitherm-beteiligung`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *leer lassen*
   - Build output directory: `/`
5. **Save and Deploy**

Nach etwa einer Minute läuft die Seite unter
`https://unitherm-beteiligung.pages.dev`.

Ab jetzt gilt: jede Änderung im GitHub-Repository wird automatisch
veröffentlicht. Kein weiterer Klick nötig.

## Schritt 3 — Compatibility date setzen

Damit die Formularfunktion später funktioniert:

Pages-Projekt → **Settings** → **Runtime** → **Compatibility date** auf
`2024-09-01` oder später setzen.

## Testbetrieb

Solange die Datei `_headers` im Repository liegt, weist die Seite alle
Suchmaschinen ab. Die Testadresse landet also nicht bei Google und macht
der späteren echten Domain keine Konkurrenz.

Das Formular auf der Immobilienseite antwortet im Testbetrieb mit einem
Fehler und öffnet stattdessen eine vorbereitete E-Mail. Das ist so gewollt,
solange das E-Mail-Binding nicht eingerichtet ist.

## Livegang — die vollständige Liste

1. Domain `unitherm-beteiligung.at` beim Registrar buchen
2. Cloudflare → **Add a site** → Domain eintragen → die beiden angezeigten
   Nameserver beim Registrar hinterlegen (dauert bis zu 24 Stunden)
3. Pages-Projekt → **Custom domains** → beide Varianten hinzufügen:
   `unitherm-beteiligung.at` und `www.unitherm-beteiligung.at`
4. Datei `_headers` löschen und committen
5. Stand-Datum in `datenschutz.html` auf den Livegang-Tag setzen
6. E-Mail-Versand einrichten (nächster Abschnitt)
7. Prüfen, ob die `canonical`-Angaben in den fünf HTML-Dateien zur
   gewählten Hauptadresse passen — mit oder ohne `www`, aber einheitlich

## Formularversand einrichten

Das Formular auf `immobilien.html` schickt an `/api/kontakt`. Damit die
E-Mail zugestellt wird, sind drei Schritte nötig:

1. **Zieladresse bestätigen** — Cloudflare → **Email** → *Email Routing* →
   Destination addresses → `goldschwendt@unitherm.at` hinzufügen. Cloudflare
   schickt eine Bestätigungsmail, die einmal angeklickt werden muss.
2. **Binding setzen** — Pages-Projekt → *Settings* → *Functions* →
   **Send email bindings** → Add:
   - Variable name: `SENDER`
   - Destination address: `goldschwendt@unitherm.at`
3. **Compatibility date** auf `2024-09-01` oder später setzen
   (Settings → Functions → Compatibility date).

Optionale Umgebungsvariablen, falls sich etwas ändert:

| Variable    | Vorgabe                                  |
|-------------|------------------------------------------|
| `MAIL_TO`   | `goldschwendt@unitherm.at`               |
| `MAIL_FROM` | `formular@unitherm-beteiligung.at`       |

`MAIL_FROM` muss auf einer Domain liegen, die im selben Cloudflare-Konto
mit Email Routing aktiv ist. Solange das nicht eingerichtet ist, antwortet
die Funktion mit Fehler 502 — das Formular öffnet dann automatisch eine
vorausgefüllte E-Mail. Es geht also nie eine Anfrage verloren.

**Gespeichert wird nichts.** Die Funktion nimmt die Daten entgegen, baut
daraus eine E-Mail und verwirft sie. Keine Datenbank, kein Log, kein
weiterer Dienstleister.

## Besucherzahlen (optional, ohne Cookie-Banner)

Cloudflare → *Analytics & Logs* → **Web Analytics** → Site hinzufügen. Das
erzeugt einen kurzen Script-Tag, der vor `</body>` eingefügt wird. Cookiefrei
und ohne Zustimmungspflicht. Wird der Tag eingebaut, gehört ein Satz dazu in
Abschnitt 8 der Datenschutzerklärung.

## Offene Punkte

- [ ] Rechtliche Endabnahme der Datenschutzerklärung
- [ ] Entscheidung: Hauptadresse mit oder ohne `www`
- [ ] Entscheidung, ob `unitherm-beteiligungen.at` als Weiterleitung dazukommt
- [ ] Bildmaterial für Portfolio und Kontakt, falls gewünscht

## Texte ändern

Alle Texte stehen direkt im HTML. Für kleine Korrekturen genügt der
Editor auf github.com: Datei öffnen, Stift-Symbol, ändern, „Commit changes".
Cloudflare baut die Seite danach innerhalb einer Minute neu. Der Verlauf
bleibt vollständig nachvollziehbar — besonders relevant für Impressum und
Datenschutzerklärung.
