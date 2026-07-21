# Architektur — QR-Code-Generator

Dieses Dokument beschreibt die technische Struktur der Anwendung nach der
Extraktion der fachlichen Logik in ein wiederverwendbares `core/`-Modul.
Der Umbau ist eine reine interne Restrukturierung — die Anwendung verhält
sich für Nutzer:innen exakt wie zuvor (siehe Abschnitt "Regressionstest"
im Projekt-Log / PR-Beschreibung).

## 1. Projektstruktur

```
Spendenaktions-Generator/
├── core/                        # Framework- und DOM-freie Fachlogik
│   ├── qr/
│   │   └── generateQr.js        # QR-Code-Rendering inkl. Logo-Overlay
│   ├── girocode/
│   │   └── buildGirocodePayload.js  # EPC-QR-Payload (SEPA/GiroCode)
│   ├── branding/
│   │   ├── loadImage.js         # Bild asynchron laden
│   │   └── drawLogoOnCanvas.js  # Logo mittig auf Canvas zeichnen
│   ├── mail/
│   │   ├── validateEmail.js     # E-Mail-Formatprüfung
│   │   └── sendGeneratedMaterials.js  # Client-Wrapper für /api/send-email
│   ├── config/
│   │   ├── colors.js            # QR-Farbvarianten (Schwarz / IFK-Grün)
│   │   └── girocodeDefaults.js  # Empfänger/IBAN-Vorgaben für den GiroCode
│   ├── text/
│   │   ├── extractPaypalLink.js
│   │   ├── extractCampaignTitle.js
│   │   ├── isDonateLink.js
│   │   └── slugify.js
│   ├── id/                      # IFK-ID: siehe Abschnitt 6
│   │   ├── generateIfkId.js     # implementiert
│   │   ├── generateIfkId.test.js
│   │   ├── validateIfkId.js     # implementiert
│   │   ├── validateIfkId.test.js
│   │   └── reserveIfkId.js      # Platzhalter
│   ├── zip/                     # Platzhalter, siehe Abschnitt 6
│   │   └── createZip.js
│   ├── templates/                # Platzhalter, siehe Abschnitt 6
│   │   └── mailTemplates.js
│   └── integrations/
│       └── humbee/               # Platzhalter, siehe Abschnitt 6
│           └── sendHumbeeMail.js
├── api/
│   └── send-email.js            # Serverless Function (Vercel), unverändert
├── src/
│   ├── main.js                  # DOM-Wiring, Event-Handling, Orchestrierung
│   └── style.css
├── index.html
├── Medien/                      # Logo-Quelldateien
├── public/                      # statische Assets (Header-Logo)
└── docs/
    ├── architecture.md          # dieses Dokument
    └── roadmap.md                # geplante Entwicklungsphasen
```

Diese Struktur ändert nichts an `index.html`, `src/style.css`, `Medien/`,
`public/` oder an `api/send-email.js` — alle bestehenden DOM-IDs, Klassen
und das Layout bleiben unangetastet. `core/zip`, `core/templates` und
`core/integrations/humbee` sind weiterhin reine Struktur-Platzhalter:
jede exportierte Funktion wirft aktuell `Error("... noch nicht
implementiert")`. `core/id/generateIfkId.js` und `core/id/validateIfkId.js`
sind vollständig implementiert (siehe Abschnitt 6); `core/id/reserveIfkId.js`
bleibt bewusst ein Platzhalter, da er eine noch nicht existierende
Backend-/Datenbankanbindung voraussetzt. Keines dieser Module wird von der
bestehenden App (`src/main.js`, `api/send-email.js`) aufgerufen.

## 2. Core-Module im Detail

### `core/qr/generateQr.js`
Rendert einen QR-Code auf einen übergebenen `<canvas>` (via `qrcode`-Bibliothek,
`errorCorrectionLevel: "H"`, feste Breite 280px), zeichnet anschließend das
Logo mittig darüber (`drawLogoOnCanvas`) und gibt die PNG-DataURL
(`canvas.toDataURL("image/png")`) zurück. Kennt weder DOM-IDs noch
Download-Links — reine Canvas-Operation mit Rückgabewert.

### `core/girocode/buildGirocodePayload.js`
Baut den EPC-QR-Payload (BCD/SEPA-Format) aus Empfänger, IBAN, BIC, Betrag
und Verwendungszweck. Reine Funktion, keine Seiteneffekte.

### `core/branding/loadImage.js` und `drawLogoOnCanvas.js`
`loadImage` lädt ein Bild asynchron über die Browser-`Image`-API und liefert
ein `Image`-Objekt. `drawLogoOnCanvas` zeichnet ein geladenes Logo zentriert
mit weißem Padding auf einen Canvas. Beide kennen nur Canvas-/Image-APIs,
keine Anwendungs-DOM-Struktur.

### `core/mail/validateEmail.js`
Stellt `isValidEmail(email)` bereit (gleiche Regex wie zuvor inline in
`main.js`). Reine Funktion.

### `core/mail/sendGeneratedMaterials.js`
Kapselt den `fetch("/api/send-email", …)`-Aufruf inkl. Body-Aufbau und
Response-Auswertung (`{ ok, error }`). Enthält keine DOM-Zugriffe — nimmt
alle benötigten Daten als Parameter entgegen.

### `core/config/colors.js` und `girocodeDefaults.js`
Zentrale Konstanten für QR-Modulfarben (`QR_COLOR_SCHWARZ`, `QR_COLOR_GRUEN`)
und die IFK-spezifischen GiroCode-Vorgaben (Empfänger, IBAN, BIC, Betrag).

### `core/text/*`
Reine Text-/Parsing-Funktionen: PayPal-Link aus Freitext extrahieren,
Kampagnentitel aus Freitext extrahieren, PayPal-Donate-Links erkennen,
Text in einen URL-Slug umwandeln (inkl. Umlaut-Behandlung).

## 3. Verantwortlichkeiten

| Schicht | Verantwortung |
|---|---|
| `core/` | Fachliche Logik: QR-/GiroCode-Erzeugung, Text-Parsing, Mail-Client-Logik, Konfiguration. Keine DOM-Abhängigkeit, keine Kenntnis von HTML-Struktur oder IDs. |
| `src/main.js` | Orchestrierung: liest DOM-Werte, ruft Core-Funktionen auf, schreibt Ergebnisse zurück in DOM (Canvas, Download-Links, Statusmeldungen), hält den Ergebniszustand (`generatedState`) für den anschließenden Mailversand. |
| `api/send-email.js` | Serverseitiger Mailversand via `nodemailer`, SMTP-Konfiguration über Umgebungsvariablen. Unverändert. |
| `index.html` / `src/style.css` | Struktur und Layout der Oberfläche. Unverändert. |

`main.js` ist bewusst weiterhin für das DOM-Wiring zuständig — das war laut
Vorgabe nicht Teil des Umbaus und bleibt eine dünne, UI-gebundene
Orchestrierungsschicht über den Core-Funktionen.

## 4. Abhängigkeiten

- `core/qr/generateQr.js` → `core/branding/drawLogoOnCanvas.js` (importiert)
- `core/qr/generateQr.js` → externe Bibliothek `qrcode`
- `src/main.js` → alle oben genannten `core/*`-Module (Imports)
- `core/mail/sendGeneratedMaterials.js` → Browser-`fetch`-API, ruft
  `POST /api/send-email` auf (Vertrag/Body-Format unverändert)
- `api/send-email.js` → `nodemailer`, Umgebungsvariablen (`SMTP_*`,
  `MAIL_FROM`, `INFO_RECIPIENT`) — unverändert, keine neue Abhängigkeit zu
  `core/`

Es gibt **keine** Abhängigkeit von `core/` in Richtung `src/` oder `api/`
(Core bleibt eigenständig und wiederverwendbar). Der Abhängigkeitspfeil zeigt
ausschließlich von der jeweiligen App (`src/main.js`) zum Core.

## 5. Erweiterungspunkte

Diese Struktur ist so angelegt, dass eine zweite, ähnliche Anwendung
(z. B. ein zukünftiger Repräsentanten-Generator) dieselben Core-Module
verwenden kann, ohne bestehenden Code zu duplizieren:

- **Neue Farbvarianten**: zusätzliche Konstanten in `core/config/colors.js`
  ergänzen, `generateQr` bleibt unverändert nutzbar.
- **Andere Empfänger-/IBAN-Daten**: eigene Werte an
  `buildGirocodePayload` übergeben, statt `core/config/girocodeDefaults.js`
  zu verändern — die Konfiguration ist bewusst von der Kernfunktion getrennt.
- **Andere Logos**: `loadImage`/`drawLogoOnCanvas` nehmen eine beliebige
  Bildquelle bzw. ein beliebiges `Image`-Objekt entgegen; die konkrete
  Logo-Datei bleibt Entscheidung der jeweiligen App (`src/main.js`).
- **Zusätzliche Mail-Vorlagen**: `sendGeneratedMaterials` kapselt nur den
  Transport zum bestehenden Endpunkt; abweichende Betreffzeilen/Texte
  müssten künftig serverseitig in `api/send-email.js` parametrisierbar
  gemacht werden (nicht Teil dieses Umbaus).
- **Weitere Text-Parser**: neue Parsing-Anforderungen (z. B. andere
  Eingabeformate) lassen sich als zusätzliche Module unter `core/text/`
  ergänzen, ohne bestehende Funktionen zu verändern.

Nicht für Wiederverwendung vorgesehen und bewusst außerhalb von `core/`
belassen: HTML-Struktur, CSS, DOM-Wiring/Event-Handling in `main.js`.

## 6. Geplante Module (Platzhalter, Stand: gemeinsame Infrastruktur)

Die folgenden Module sind ausschließlich als **Struktur und öffentliche
API** angelegt. Sie enthalten noch keine fachliche Implementierung —
jede exportierte Funktion wirft aktuell einen Fehler
(`Error("... noch nicht implementiert")`) und wird von keiner bestehenden
App aufgerufen. Ziel ist es, die künftige Schnittstelle früh festzulegen,
ohne den bestehenden QR-Code-Generator zu beeinflussen.

### `core/id/` — IFK-ID-Verwaltung

**Zweck**: Zentrale Erzeugung, Validierung und (künftig) Reservierung
einer eindeutigen "IFK-ID" pro Spendenaktion/Repräsentant. Wird künftig
sowohl vom QR-Code-Generator (optional, für Nachverfolgbarkeit) als auch
vom geplanten Materialgenerator benötigt. `generateIfkId.js` und
`validateIfkId.js` sind vollständig implementiert und decken das
Format vollständig ab, ohne von einer Datenbank abhängig zu sein.

- `generateIfkId.js` — **implementiert.** Erzeugt eine neue ID nach dem
  unten beschriebenen Format. Reine Funktion, keine Seiteneffekte, keine
  Persistenz, keine Eindeutigkeitsprüfung gegen bereits vergebene IDs.
- `validateIfkId.js` — **implementiert.** Prüft rein syntaktisch, ob eine
  ID dem Format entspricht, und liefert eine normalisierte
  (großgeschriebene) Fassung zurück. Zustandslos, kein Abgleich gegen
  bereits vergebene IDs.
- `reserveIfkId.js` — **weiterhin Platzhalter.** Soll künftig eine
  generierte ID serverseitig reservieren, um Kollisionen zwischen
  gleichzeitigen Nutzer:innen zu vermeiden. **Spätere
  Verantwortlichkeit**: Kommunikation mit einem künftigen API-Endpunkt;
  keine eigene Datenhaltung im Core. Bewusst noch nicht implementiert,
  da dafür ein Backend/eine Datenbank vorausgesetzt wird, die aktuell
  nicht existiert.

#### IFK-ID-Format

- **Aufbau**: Präfix `IFK` gefolgt von genau drei Zeichen, Gesamtlänge
  6 Zeichen. Beispiel: `IFK7QX`.
- **Erlaubtes Alphabet** für die drei Suffix-Zeichen:
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (24 Buchstaben + 8 Ziffern = 32
  Zeichen).
- **Ausgeschlossene Zeichen** und Begründung:
  - `I` (Buchstabe) — optisch kaum von `1` und `l` zu unterscheiden.
  - `O` (Buchstabe) — optisch kaum von `0` zu unterscheiden.
  - `0` (Ziffer) — optisch kaum von `O` zu unterscheiden.
  - `1` (Ziffer) — optisch kaum von `I` und `l` zu unterscheiden.

  Diese vier Zeichen werden ausgeschlossen, damit IFK-IDs auf
  Ausdrucken, am Telefon oder beim manuellen Abtippen fehlerfrei
  übertragen werden können — unabhängig von einer späteren
  Datenbank oder Reservierungslogik.
- **Groß-/Kleinschreibung**: `generateIfkId` liefert immer
  Großbuchstaben. `validateIfkId` akzeptiert auch Kleinbuchstaben und
  normalisiert sie zu Großbuchstaben (`ifk7qx` → `IFK7QX`).
- **Keine Trenn- oder Leerzeichen**: weder in erzeugten noch in gültigen
  IDs (z. B. `IFK-7QX` ist wegen der abweichenden Länge ungültig,
  `IFK 7QX` wegen des enthaltenen Leerzeichens).

#### Validierungsregeln (`validateIfkId`)

Rückgabewert: `{ valid: boolean, normalized: string, reason: string }`.
Geprüft wird der Reihe nach:

1. Datentyp muss `string` sein (sonst `reason: "invalid-type"`).
2. Leerer String ist ungültig (`"empty"`).
3. Leerzeichen an beliebiger Stelle machen die ID ungültig
   (`"contains-whitespace"`) — auch nach potenzieller Normalisierung.
4. Nach Normalisierung (Großschreibung) muss die Länge exakt 6 Zeichen
   betragen (`"invalid-length"`).
5. Die ID muss mit `IFK` beginnen (`"invalid-prefix"`).
6. Die verbleibenden drei Zeichen müssen ausschließlich aus dem oben
   genannten Alphabet stammen (`"invalid-characters"`).
7. Sind alle Prüfungen erfüllt: `valid: true`, `reason: "valid"`,
   `normalized` enthält die großgeschriebene ID.

**Geplanter Datenfluss**: App ruft `generateIfkId()` → App ruft
`validateIfkId()` zur Eigenkontrolle bzw. zur Prüfung von
Nutzereingaben → App ruft (künftig) `reserveIfkId(id)`, das serverseitig
gegen eine noch zu definierende Datenquelle prüft/reserviert →
Rückmeldung an die App.

**Abhängigkeiten**: `generateIfkId.js` und `validateIfkId.js` sind reine,
abhängigkeitsfreie Funktionen (`validateIfkId.js` importiert lediglich
die Format-Konstanten aus `generateIfkId.js`, um Duplikate zu
vermeiden). `reserveIfkId` wird künftig einen neuen, noch nicht
existierenden API-Endpunkt benötigen (kein Zugriff auf eine Datenbank
aus dem Core heraus).

**Erweiterungsmöglichkeiten**: ID-Präfixe pro Aktionstyp (Spendenaktion
vs. Repräsentant), Prüfziffernverfahren, Migration bestehender manuell
vergebener IDs.

**Tests**: `core/id/generateIfkId.test.js` und
`core/id/validateIfkId.test.js` (Node.js eingebauter Test-Runner,
ausführbar via `npm test`).

### `core/zip/` — ZIP-Erzeugung

**Zweck**: Mehrere generierte Dateien (aktuell z. B. die vier PNGs des
QR-Code-Generators, künftig auch Materialgenerator-Ausgaben) zu einem
einzigen Archiv bündeln, damit Nutzer:innen nicht jede Datei einzeln
herunterladen müssen.

- `createZip.js` — nimmt eine Liste von `{ filename, content }` entgegen
  und liefert ein ZIP-Archiv zurück. **Spätere Verantwortlichkeit**:
  reine Datenverarbeitung, kein Download-Mechanismus, kein DOM-Zugriff
  (analog zu `core/qr/generateQr.js`, das ebenfalls nur Daten
  zurückgibt statt Downloads auszulösen).

**Geplanter Datenfluss**: App generiert Dateien (z. B. via
`core/qr/generateQr.js`) → App übergibt sie an `createZip()` → Core
liefert Archiv-Binärdaten zurück → App setzt daraus einen Download-Link
oder hängt das Archiv an eine Mail (`core/mail/`) an.

**Abhängigkeiten**: benötigt künftig eine ZIP-Bibliothek als neue
Projektabhängigkeit (noch nicht ausgewählt/installiert).

**Erweiterungsmöglichkeiten**: Unterordner-Struktur im Archiv (z. B.
getrennt nach PayPal/GiroCode), Komprimierungsgrad konfigurierbar.

### `core/templates/` — Mail-Vorlagen

**Zweck**: Betreff-, Text- und HTML-Bausteine für unterschiedliche
Mail-Typen zentral bereitstellen, statt sie wie aktuell direkt in
`api/send-email.js` hart zu codieren. Ermöglicht künftig, dass mehrere
Generatoren (QR-Code-Generator, Materialgenerator) dieselben
Textbausteine wiederverwenden.

- `mailTemplates.js` — stellt Template-Funktionen bereit, die aus
  fachlichen Daten (z. B. Kampagnentitel) `{ subject, text, html }`
  erzeugen. **Spätere Verantwortlichkeit**: reine, serverseitig nutzbare
  String-Zusammensetzung ohne Versandlogik.

**Wichtig**: Der bestehende Mailversand in `api/send-email.js` bleibt
unverändert; die Migration seiner Texte in dieses Modul ist ein
separater, künftiger Schritt und nicht Teil dieses Umbaus.

**Geplanter Datenfluss**: Serverseitiger Handler importiert eine
Template-Funktion aus `mailTemplates.js`, übergibt fachliche Daten und
reicht das Ergebnis an `nodemailer` (oder künftig `core/integrations/
humbee/`) zum Versand weiter.

**Abhängigkeiten**: keine externen Bibliotheken vorgesehen.

**Erweiterungsmöglichkeiten**: mehrsprachige Vorlagen, Templates pro
Generator-Typ, Vorschau-Rendering im Backoffice.

### `core/integrations/humbee/` — humbee-Anbindung

**Zweck**: Kapselung der Kommunikation mit der externen Plattform
"humbee" für den Mailversand, als Alternative bzw. Ergänzung zum
bestehenden `nodemailer`-Versand.

- `sendHumbeeMail.js` — nimmt Empfänger, Betreff, Inhalt und optionale
  Anhänge entgegen und liefert `{ ok, error }` zurück (gleiches
  Rückgabeformat wie `core/mail/sendGeneratedMaterials.js`).
  **Spätere Verantwortlichkeit**: ausschließlich Transport/API-Aufruf,
  keine Template-Logik (die liegt in `core/templates/`).

**Geplanter Datenfluss**: App/Server baut Inhalt über
`core/templates/mailTemplates.js` → übergibt das Ergebnis an
`sendHumbeeMail()` → Modul führt den API-Aufruf gegen humbee aus →
Rückmeldung an den Aufrufer.

**Abhängigkeiten**: künftige humbee-API-Zugangsdaten (voraussichtlich
über Umgebungsvariablen, analog zu den bestehenden `SMTP_*`-Variablen),
ein noch zu definierender HTTP-Client.

**Erweiterungsmöglichkeiten**: weitere Integrationen unter
`core/integrations/<anbieter>/` nach demselben Muster ergänzen, ohne
bestehende Integrationen zu berühren.

### Verhältnis zur bestehenden App

Keines der in Abschnitt 6 beschriebenen Module wird aktuell von
`src/main.js` oder `api/send-email.js` importiert oder aufgerufen. Der
bestehende QR-Code-Generator ist von diesem Ausbau vollständig
unberührt.
