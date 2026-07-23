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
│   ├── zip/                     # ZIP-Erzeugung: siehe Abschnitt 6
│   │   ├── createZip.js         # implementiert
│   │   └── createZip.test.js
│   ├── templates/                # Platzhalter, siehe Abschnitt 6
│   │   └── mailTemplates.js
│   ├── integrations/
│   │   └── humbee/               # Platzhalter, siehe Abschnitt 6
│   │       └── sendHumbeeMail.js
│   └── materials/                # Materialgenerator-Core: siehe Abschnitt 6
│       ├── materialTypes.js          # implementiert
│       ├── materialTypes.test.js
│       ├── buildMaterialList.js      # implementiert
│       ├── buildMaterialList.test.js
│       ├── buildMaterialFilenames.js # implementiert
│       ├── buildMaterialFilenames.test.js
│       ├── buildMaterialManifest.js  # implementiert
│       ├── buildMaterialManifest.test.js
│       ├── generateMaterial.js       # implementiert (Einzeldatei-Erzeugung)
│       ├── generateMaterial.test.js
│       ├── generateQrMaterials.js    # implementiert (Orchestrierung PayPal/GiroCode)
│       └── generateQrMaterials.test.js
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
und das Layout bleiben unangetastet. `core/templates` und
`core/integrations/humbee` sind weiterhin reine Struktur-Platzhalter:
jede exportierte Funktion wirft aktuell `Error("... noch nicht
implementiert")`. `core/id/generateIfkId.js`, `core/id/validateIfkId.js`,
`core/zip/createZip.js` sowie alle sechs Module in `core/materials/`
(inkl. `generateMaterial.js`/`generateQrMaterials.js` für die
QR-Materialerzeugung) sind vollständig implementiert (siehe Abschnitt
6); `core/id/reserveIfkId.js` bleibt bewusst ein Platzhalter, da er eine
noch nicht existierende Backend-/Datenbankanbindung voraussetzt. Keines
dieser Module wird von der bestehenden App (`src/main.js`,
`api/send-email.js`) aufgerufen oder in sie integriert — der bestehende
öffentliche QR-Code-Generator bleibt vollständig unverändert.

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

**Zweck**: Mehrere generierte Dateien (z. B. künftig die vier PNGs des
QR-Code-Generators, oder Materialgenerator-Ausgaben) zu einem einzigen
Archiv bündeln, damit Nutzer:innen nicht jede Datei einzeln
herunterladen müssen. `createZip.js` ist **vollständig implementiert**
und funktioniert unabhängig von einer konkreten App — sowohl im Browser
als auch unter Node.js.

**Verwendete Bibliothek**: [JSZip](https://stuk.github.io/jszip/) (neue
Abhängigkeit, siehe `package.json`). JSZip läuft sowohl im Browser als
auch unter Node.js, benötigt keine DOM-APIs und lässt sich unverändert
über Vite bündeln.

#### Öffentliche API

```js
const { filename, blob, size } = await createZip({
  filename: "IFK_Starterpaket",
  files: [
    { filename: "Flyer.pdf", content: /* Blob | ArrayBuffer | Uint8Array | Data-URL-String | String */ },
    { filename: "Logos/logo.svg", content: "<svg>...</svg>" },
  ],
});
```

- `filename` (Parameter) — Name des Archivs; wird unverändert im
  Rückgabewert gespiegelt. Es wird **keine** Dateiendung angehängt und
  **kein** Download ausgelöst — beides bleibt Aufgabe der aufrufenden
  App.
- `files` — Liste von `{ filename, content }`. Dateinamen werden
  unverändert als Pfad im Archiv verwendet; enthält ein Dateiname einen
  `/` (z. B. `"Logos/logo.svg"`), legt JSZip die entsprechende
  Ordnerstruktur automatisch im Archiv an.

**Unterstützte `content`-Datentypen**:
  - `Blob` — wird über `blob.arrayBuffer()` gelesen.
  - `ArrayBuffer` / `Uint8Array` — werden direkt übernommen.
  - `string`, beginnend mit `"data:"` (Data-URL, z. B. wie von
    `core/qr/generateQr.js` erzeugt, `data:<mime>;base64,<daten>`) —
    der Base64-Anteil wird dekodiert und als Binärinhalt gespeichert.
  - jeder andere `string` — wird unverändert als UTF-8-Textinhalt
    gespeichert.

  Reines Base64 **ohne** `data:`-Prefix wird bewusst nicht automatisch
  erkannt, da ein solcher String nicht zuverlässig von normalem
  Klartext unterschieden werden kann (z. B. wäre der Text `"Test"`
  formal ebenfalls gültiges Base64) — eine Heuristik hier würde das
  Risiko stiller Inhaltsbeschädigung bergen. Binärinhalte als Base64
  müssen daher als Data-URL übergeben werden.

**Rückgabeformat**: `{ filename: string, blob: Blob, size: number }`.
`size` entspricht `blob.size` in Byte.

**Fehlerfälle** (jeweils `Error` mit sprechender Meldung):
  - `filename` fehlt oder ist ein leerer/nur-Leerzeichen-String.
  - `files` fehlt, ist kein Array, oder ist ein leeres Array.
  - ein Eintrag in `files` ist kein Objekt.
  - ein Eintrag hat keinen gültigen (nicht-leeren String-)Dateinamen.
  - ein Eintrag hat keinen Inhalt (`null`/`undefined`).
  - der Inhalt eines Eintrags hat einen nicht unterstützten Datentyp
    (z. B. Zahl, Boolean).

**Geplanter Datenfluss**: App generiert Dateien (z. B. via
`core/qr/generateQr.js`) → App übergibt sie an `createZip()` → Core
liefert `{ filename, blob, size }` zurück → App setzt daraus bei Bedarf
einen Download-Link (`URL.createObjectURL(blob)`) oder hängt das Archiv
an eine Mail (`core/mail/`) an. Diese Integration ist bewusst noch nicht
umgesetzt — `createZip.js` wird aktuell von keiner App aufgerufen.

**Abhängigkeiten**: `jszip` (npm-Paket). Keine DOM-Abhängigkeit, keine
Abhängigkeit zu anderen `core/`-Modulen.

**Tests**: `core/zip/createZip.test.js` (Node.js eingebauter
Test-Runner, ausführbar via `npm test`) — deckt Einzeldatei- und
Mehrdatei-Archive, verschachtelte Pfade, Data-URL- und
Binärdaten-Inhalte sowie alle oben genannten Fehlerfälle ab.

**Erweiterungsmöglichkeiten**: Komprimierungsgrad konfigurierbar machen,
Passwortschutz für Archive (falls von JSZip/einer Erweiterung
unterstützt), Streaming für sehr große Archive.

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

### `core/materials/` — Materialgenerator-Core

**Zweck**: Fachliche Beschreibung, **welche individuellen Materialien**
für eine Person (Vorname, Nachname, IFK-ID) erzeugt werden sollen, mit
welchen Dateinamen, und in welcher Reihenfolge — als reine, DOM-freie
Datenstruktur (`materialTypes.js`, `buildMaterialList.js`,
`buildMaterialFilenames.js`, `buildMaterialManifest.js`) — sowie,
darauf aufbauend, die tatsächliche Erzeugung der vier individuellen
QR-Materialien als PNG-Dateien (`generateMaterial.js`,
`generateQrMaterials.js`). Die beiden Flyer-Typen (`FLYER_DRUCKEREI`,
`FLYER_HOME`) werden weiterhin **nicht** erzeugt — dafür ist eine
künftige PDF-/Grafikintegration vorgesehen (siehe
[roadmap.md](roadmap.md), Phase 4). Alle sechs Module sind
**vollständig implementiert**.

**Klare Abgrenzung**: `core/materials` kennt ausschließlich die sechs
unten aufgeführten individuellen Materialtypen. Logos, das Corporate
Manual, Spendennachweise oder sonstige allgemeine Downloads sind
bewusst **nicht** Teil dieser Definition — sie sind keine individuellen,
personalisierten Materialien und werden von diesem Modul weder erzeugt
noch in Dateinamen, Manifest oder eine spätere Paketierung
(`core/zip`) aufgenommen.

#### Die sechs Materialtypen (`materialTypes.js`)

| Schlüssel | Bezeichnung | Kategorie | Format |
|---|---|---|---|
| `FLYER_DRUCKEREI` | Flyer Druckerei | `flyer` | `pdf` |
| `FLYER_HOME` | Flyer Home | `flyer` | `pdf` |
| `QR_PAYPAL_GREEN` | PayPal QR grün | `qr` | `png` |
| `QR_PAYPAL_BLACK` | PayPal QR schwarz | `qr` | `png` |
| `QR_GIRO_GREEN` | GiroCode grün | `qr` | `png` |
| `QR_GIRO_BLACK` | GiroCode schwarz | `qr` | `png` |

Die Reihenfolge in dieser Tabelle ist die feste, reproduzierbare
Reihenfolge, die `buildMaterialList()` und `buildMaterialManifest()`
verwenden. Jeder Materialtyp wird als `{ key, label, category, format,
extension }` beschrieben. Die gesamte Definition (Array und einzelne
Typ-Objekte) ist mit `Object.freeze` eingefroren, damit sie von außen
nicht versehentlich verändert werden kann.

#### `buildMaterialList(options)`

Legt fest, welche der sechs Materialtypen ausgewählt werden. Ohne
Optionen werden alle sechs in fester Reihenfolge zurückgegeben.
Optional: `{ include }` (nur diese Typen) und/oder `{ exclude }` (diese
Typen entfernen). Unbekannte Schlüssel in `include`/`exclude` führen zu
einem Fehler. Reine Funktion ohne Seiteneffekte.

#### `buildMaterialFilenames({ firstName, lastName, ifkId, materials })`

Erzeugt für die ausgewählten Materialien (Standard: alle sechs, wie von
`buildMaterialList()` geliefert) die Dateinamen nach dem Schema
`IFK_<Vorname>_<Nachname>_<Materialsuffix>.<extension>` — z. B.
`IFK_Max_Mustermann_Flyer_Druckerei.pdf`. Vor- und Nachname sind
Pflicht und werden für den Dateinamen bereinigt (Leerzeichen →
Unterstrich, führende/abschließende Leerzeichen entfernt, doppelte
Unterstriche vermieden, problematische Dateisystemzeichen wie `/ \ : *
? " < > |` entfernt; Umlaute bleiben erhalten). Die IFK-ID ist Pflicht
und wird über `core/id/validateIfkId.js` geprüft — sie erscheint
bewusst **nicht** im sichtbaren Dateinamen, wird aber (normalisiert) im
Rückgabeobjekt mitgeführt. Unbekannte Materialtypen führen zu einem
Fehler.

#### `buildMaterialManifest({ firstName, lastName, ifkId, gender, email, phone, photoUrl, federalState, region, materials })`

Baut aus Materialauswahl und Dateinamen ein vollständiges, rein
fachliches Manifest: `{ version: 1, person: { firstName, lastName,
ifkId, gender?, email?, phone?, photoUrl?, federalState?, region? },
materials: [{ key, label, category, format, extension, filename }, ...]
}`. Enthält ausschließlich die Beschreibung der zu erzeugenden
Materialien und der erfassten Personen-Stammdaten — **keine**
Dateiinhalte, Blob-Daten, Ergebnis-/Download-URLs, Mail- oder
ZIP-Daten. Nutzt intern `buildMaterialFilenames()`.

`gender`, `email`, `phone`, `photoUrl`, `federalState` und `region`
sind optionale Parameter: Werden sie angegeben, werden sie getrimmt,
geprüft und unverändert in `person` übernommen; ohne Angabe fehlt das
jeweilige Feld in `person` (kein Default) — dasselbe Muster wie bei
`gender`. Die Erzwingung der Pflichtfeld-Eigenschaft (siehe Abschnitt
7) erfolgt bewusst in der aufrufenden UI (`src/intern/generator.js`),
nicht im Core, damit bestehende Aufrufe mit ausschließlich
`firstName`/`lastName`/`ifkId` unverändert funktionieren.

- `email` — muss ein gültiges E-Mail-Format haben (geprüft über
  `core/mail/validateEmail.js`, keine zweite Regex).
- `phone` — muss nach dem Trimmen nicht-leer sein; keine strenge
  internationale Formatprüfung.
- `photoUrl` — muss eine gültige HTTP-/HTTPS-URL sein (geprüft über
  `core/text/isHttpUrl.js`). Es wird in diesem Schritt **keine** Datei
  abgerufen oder verarbeitet — ausschließlich die URL selbst wird
  erfasst.
- `federalState`, `region` — Freitext, muss nach dem Trimmen
  nicht-leer sein.

Ungültige Werte werfen jeweils einen sprechenden Fehler (siehe
`buildMaterialManifest.test.js`).

**Datenfluss**: Materialauswahl (`buildMaterialList`) → Dateinamen
(`buildMaterialFilenames`) → Manifest (`buildMaterialManifest`) →
**Erzeugung der QR-Materialien** (`generateQrMaterials`, für
`FLYER_DRUCKEREI`/`FLYER_HOME` weiterhin nicht implementiert).

#### `generateMaterial({ entry, content, moduleColor, logoImage, deps })`

Erzeugt aus einem einzelnen, bereits aufgelösten Material-Eintrag
(Dateiname stammt unverändert aus dem Manifest), einem QR-Inhalt
(PayPal-Link oder GiroCode-Payload) und einer Modulfarbe genau eine
Datei. Ruft dafür ausschließlich das bestehende
`core/qr/generateQr.js` auf (keine eigene QR-Implementierung) und
wandelt dessen PNG-DataURL-Rückgabewert in `{ content, size }` um
(`Blob`, falls verfügbar, sonst `Uint8Array`). Wirft einen Fehler bei
fehlendem Dateinamen oder leerem/unerwartetem Grafikinhalt.

#### `generateQrMaterials({ manifest, paypalUrl, girocode, logo, deps })`

Erzeugt aus einem Manifest die vier individuellen QR-Materialien
(`QR_PAYPAL_GREEN`, `QR_PAYPAL_BLACK`, `QR_GIRO_GREEN`,
`QR_GIRO_BLACK`) als PNG-Dateien und gibt sie als Array zurück, in der
Reihenfolge des Manifests: `{ key, label, category, format, extension,
filename, mimeType: "image/png", content, size }`. Flyer-Einträge im
Manifest werden ignoriert (kein Fehler); enthält das Manifest
ausschließlich Flyer, ist das Ergebnis ein leeres Array.

Wiederverwendung bestehender Module, keine Duplikate:
- **QR-Erzeugung inkl. Logo-Overlay**: `core/qr/generateQr.js` (über
  `generateMaterial.js`) — dieselben QR-Abmessungen, dieselbe
  Fehlerkorrektur und dasselbe Logo-Overlay wie im bestehenden
  öffentlichen QR-Code-Generator, da exakt dieselbe Funktion
  aufgerufen wird.
- **GiroCode-Payload**: `core/girocode/buildGirocodePayload.js`, mit
  Defaults aus `core/config/girocodeDefaults.js` für Empfänger/IBAN/BIC.
  `betrag` wird unabhängig von der Eingabe immer auf `""` gesetzt,
  `verwendungszweck` immer auf `"<IFK-ID> Spende"` (z. B.
  `"IFK7QX Spende"`) — abweichende Werte im `girocode`-Parameter werden
  ignoriert.
- **PayPal-Link-Prüfung**: `core/text/extractPaypalLink.js` — keine
  zweite, parallele Validierung.
- **IFK-ID-Prüfung**: `core/id/validateIfkId.js`.
- **Farben**: `core/config/colors.js` (`QR_COLOR_GRUEN` für
  `QR_PAYPAL_GREEN`/`QR_GIRO_GREEN`, `QR_COLOR_SCHWARZ` für
  `QR_PAYPAL_BLACK`/`QR_GIRO_BLACK`).
- **Logo laden**: `core/branding/loadImage.js`, `logo` entspricht
  dessen `src`-Parameter — kein zweites Logo-System.

`paypalUrl` ist nur Pflicht, wenn mindestens ein PayPal-Material
ausgewählt ist; `girocode` nur, wenn mindestens ein GiroCode-Material
ausgewählt ist. Fehlerfälle: fehlendes/ungültiges Manifest, ungültige
IFK-ID im Manifest, fehlender/ungültiger PayPal-Link (falls benötigt),
fehlende GiroCode-Daten (falls benötigt), fehlendes/nicht ladbares
Logo, unbekannter QR-Materialtyp, fehlender Dateiname im Manifest,
leerer erzeugter Dateiinhalt.

**Test- und Browserfähigkeit**: Die Produktionsfunktionen nutzen per
Default reale Browser-APIs (`document.createElement("canvas")`,
`core/branding/loadImage.js`, `core/qr/generateQr.js`) und sind damit im
Browser unverändert lauffähig. Für Unit-Tests unter Node.js (ohne
Canvas-/DOM-Umgebung) sind `generateQr`, `loadImage` und `createCanvas`
über den optionalen `deps`-Parameter injizierbar — die Tests verwenden
dafür kleine, kontrollierte Test-Doubles, ohne dass dafür eine neue
Canvas-Bibliothek installiert oder die Produktionsfunktion verändert
werden musste.

**Keine UI-, Mail- oder ZIP-Abhängigkeit**: `generateQrMaterials` kennt
weder DOM-Elemente/IDs noch `core/mail/*` noch `core/zip/*` — das
Ergebnis-Array ist reine Rückgabedaten. Eine Bündelung zu einem Archiv
oder ein Mailversand der erzeugten Dateien sind bewusst nicht Teil
dieses Moduls.

**Abhängigkeiten**: `buildMaterialFilenames.js` und
`buildMaterialManifest.js` → `core/id/validateIfkId.js`.
`buildMaterialFilenames.js` und `buildMaterialManifest.js` →
`materialTypes.js`. `buildMaterialFilenames.js` →
`buildMaterialList.js` (nur als Default, wenn `materials` nicht
angegeben wird). `generateMaterial.js` → `core/qr/generateQr.js`.
`generateQrMaterials.js` → `generateMaterial.js`,
`core/id/validateIfkId.js`, `core/text/extractPaypalLink.js`,
`core/girocode/buildGirocodePayload.js`, `core/branding/loadImage.js`,
`core/config/colors.js`, `core/config/girocodeDefaults.js`,
`materialTypes.js`. Keine Datenbank-, Mail- oder ZIP-Anbindung.

**Tests**: `materialTypes.test.js`, `buildMaterialList.test.js`,
`buildMaterialFilenames.test.js`, `buildMaterialManifest.test.js`,
`generateMaterial.test.js`, `generateQrMaterials.test.js` (Node.js
eingebauter Test-Runner, ausführbar via `npm test`).

**Erweiterungsmöglichkeiten**: weitere Materialtypen (z. B. für WhatsApp-
oder Social-Media-Formate) durch Ergänzung in `materialTypes.js`, ohne
bestehende Typen zu verändern; konfigurierbare Dateinamensschemata;
mehrsprachige Bezeichnungen (`label`); künftige Erzeugung der beiden
Flyer-Typen (PDF, siehe Phase 4 in [roadmap.md](roadmap.md)).

### Verhältnis zur bestehenden App

Keines der in Abschnitt 6 beschriebenen Module wird aktuell von
`src/main.js` oder `api/send-email.js` importiert oder aufgerufen. Der
bestehende QR-Code-Generator ist von diesem Ausbau vollständig
unberührt.

## 7. Interne Materialgenerator-Oberfläche (`intern/`)

**Zweck**: Erste nutzbare Oberfläche für das interne Team, um die in
Abschnitt 6 beschriebenen Core-Module (`core/id`, `core/materials`)
tatsächlich zu bedienen — als eigenständige zweite Seite neben dem
bestehenden öffentlichen QR-Code-Generator, nicht als Ersatz oder
Umbau desselben.

**Struktur**:

```
intern/
└── index.html         # eigener HTML-Einstiegspunkt, analog zu index.html
src/intern/
├── main.js             # dünner Einstiegspunkt, verdrahtet auth.js und generator.js
├── auth.js              # Login-/Logout-Wiring (siehe Abschnitt 8)
├── generator.js          # DOM-Wiring für den Materialgenerator
└── style.css           # ergänzt src/style.css um interne Layout-Klassen
```

`vite.config.js` registriert `index.html` und `intern/index.html` als
getrennte Build-Einstiegspunkte (`build.rollupOptions.input`), sodass
`npm run build` beide Seiten unverändert nebeneinander nach
`dist/index.html` bzw. `dist/intern/index.html` erzeugt.

**Funktionsumfang (Grundgerüst)**:
- Eingabefelder für Vorname, Nachname, Geschlecht und IFK-ID. Die
  IFK-ID wird beim Laden der Seite und über einen
  "Neu generieren"-Button mit `core/id/generateIfkId.js` vorbelegt,
  bleibt aber manuell editierbar und wird vor der Erzeugung über
  `core/id/validateIfkId.js` geprüft.
- Zusätzliche Stammdaten-Pflichtfelder E-Mail-Adresse, Telefonnummer,
  Foto-Link, Bundesland und Region, direkt im Personenbereich
  integriert. Validierung vor der Manifest-Erzeugung in
  `src/intern/generator.js`: E-Mail über `core/mail/validateEmail.js`,
  Foto-Link über `core/text/isHttpUrl.js` (muss http/https sein),
  Telefonnummer/Bundesland/Region müssen nach dem Trimmen nicht-leer
  sein (keine strenge Formatprüfung für die Telefonnummer). Es wird in
  diesem Schritt **weder** ein Mailversand **noch** ein Abruf der
  Foto-Datei **noch** eine Flyer-Erzeugung ausgelöst — die Felder
  werden ausschließlich erfasst, validiert und im Manifest
  mitgeführt (siehe `buildMaterialManifest` in Abschnitt 6).
- PayPal-Link/Share-Text-Eingabe, ausgewertet über die bestehende
  `core/text/extractPaypalLink.js` — keine zweite Parsing-Logik.
- Materialauswahl als Checkboxen für alle sechs Materialtypen aus
  `core/materials/materialTypes.js`. Die beiden Flyer-Typen sind
  bewusst deaktiviert (`disabled`) und mit dem Hinweis "wartet auf
  Grafikentwurf" versehen, da ihre Erzeugung noch nicht implementiert
  ist (siehe Abschnitt 6, Phase 4 in [roadmap.md](roadmap.md)).
- Erzeugung: `src/intern/generator.js` baut aus den Eingaben ein
  Manifest über `buildMaterialManifest()` und ruft anschließend
  `generateQrMaterials()` auf; GiroCode-Empfänger/IBAN/BIC nutzen dabei
  unverändert die Defaults aus `core/config/girocodeDefaults.js`. Die
  erzeugten PNGs werden je Material als Vorschaubild (`URL
  .createObjectURL`) sowie als Einzeldownload mit dem Dateinamen aus
  dem Manifest angezeigt.
- Versand: Im Anschluss an eine erfolgreiche Erzeugung erscheint ein
  Versandbereich, über den die erzeugten Materialien per Mail an den
  Repräsentanten (oder eine abweichende Adresse) sowie zur
  Dokumentation an humbee versendet werden können — siehe Abschnitt 9.

**Bewusst nicht Teil dieses Schritts**: ein lokaler Download des
gesamten ZIP-Archivs (das Archiv wird ausschließlich als Mailanhang
erzeugt, nicht als Download-Link angeboten). Die Seite ist zusätzlich
mit `<meta name="robots" content="noindex, nofollow">` versehen — das
ersetzt keinen Zugriffsschutz, sondern vermeidet lediglich
versehentliche Auffindbarkeit über Suchmaschinen; der eigentliche
Zugriffsschutz ist der in Abschnitt 8 beschriebene Login.

**Abhängigkeiten**: `src/intern/generator.js` (Materialgenerator-Logik,
DOM-Wiring) → `core/id/generateIfkId.js`, `core/id/validateIfkId.js`,
`core/mail/validateEmail.js`, `core/mail/sendRepresentativeMaterials.js`,
`core/materials/buildMaterialManifest.js`, `core/materials/buildMaterialZip.js`,
`core/materials/buildRepresentativeDeliveryRequest.js`,
`core/materials/generateQrMaterials.js`,
`core/materials/materialTypes.js`, `core/text/extractPaypalLink.js`,
`core/text/isHttpUrl.js` (siehe auch Abschnitt 9).
`src/intern/auth.js` (Login/Logout-Wiring) → `core/auth/authSession.js`,
`core/auth/requestLogin.js` (siehe Abschnitt 8). `src/intern/main.js`
verdrahtet beide Module miteinander, ohne dass sie sich gegenseitig
kennen. Keine Abhängigkeit zu `src/main.js` oder umgekehrt — beide
Seiten teilen sich ausschließlich `core/`.

## 8. Interner Login (`core/auth/`, `api/login.js`)

**Zweck**: Der interne Materialgenerator (`/intern/`) soll nicht mehr
ohne Anmeldung nutzbar sein. Unterstützt wird **genau ein**
Administrator-Konto — bewusst **keine** Benutzerverwaltung, keine
Rollen, keine Datenbank, keine Registrierung. Dieser Login ist von der
Materialgenerator-Logik strikt getrennt (`src/intern/auth.js` vs.
`src/intern/generator.js`).

**Zugangsdaten**: ausschließlich über Umgebungsvariablen
(`MATERIAL_ADMIN_USERNAME`, `MATERIAL_ADMIN_PASSWORD`), analog zu den
bestehenden `SMTP_*`-Variablen in `api/send-email.js`. Keine
Zugangsdaten im Quellcode oder im Frontend-Bundle.

**Ablauf**:
1. `src/intern/auth.js` prüft beim Laden von `/intern/` über
   `core/auth/authSession.js`, ob `sessionStorage` bereits einen
   gültigen Anmeldezustand enthält. Falls ja: Login-Bereich bleibt
   verborgen, App-Bereich (`#app-content`) wird angezeigt, der
   Materialgenerator wird initialisiert (`initGenerator()`).
2. Falls nicht: Login-Formular (`#login-section`) wird angezeigt.
   Eingegebene Zugangsdaten werden über
   `core/auth/requestLogin.js` per `POST /api/login` an die
   serverseitige Funktion `api/login.js` geschickt.
3. `api/login.js` vergleicht die übergebenen Zugangsdaten mit
   `process.env.MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD` und
   antwortet ausschließlich mit `{ ok: true }` oder `{ ok: false, error
   }` — die Zugangsdaten selbst verlassen den Server nie.
4. Bei Erfolg setzt der Client über `core/auth/authSession.js` einen
   einfachen Anmeldezustand in `sessionStorage`
   (`ifk_intern_authenticated = "true"`) und zeigt den App-Bereich an.
   Bei einem Reload bleibt die Anmeldung dadurch erhalten (`sessionStorage`
   übersteht Reloads, nicht aber das Schließen des Tabs/Browsers).
5. Der Logout-Button (`#logout-btn`, im Header, nur sichtbar wenn
   angemeldet) entfernt den `sessionStorage`-Eintrag und zeigt wieder
   das Login-Formular.

**Bewusst keine** JWTs, Cookies, externe Auth-Provider oder serverseitige
Sessions — der Anmeldezustand ist rein clientseitig
(`sessionStorage`) und wird bei jedem Seitenaufruf neu gegen keine
weitere Quelle geprüft; einzig `api/login.js` prüft einmalig beim
Login-Versuch gegen die Umgebungsvariablen.

**Core-Module**:
- `core/auth/authSession.js` — reine, DOM-freie Verwaltung des
  Anmeldezustands. Nimmt ein Storage-Objekt (`{ getItem, setItem,
  removeItem }`) als Parameter entgegen, statt selbst auf `window`
  zuzugreifen, damit das Modul unter Node.js testbar bleibt
  (`isAuthenticated`, `setAuthenticated`, `clearAuthenticated`).
- `core/auth/requestLogin.js` — Client-Wrapper für
  `POST /api/login`, analog zu `core/mail/sendGeneratedMaterials.js`.
  Kein eigener Vergleich von Zugangsdaten, ausschließlich
  Transport/Response-Auswertung.

**`api/login.js`**: Serverless Function (wie `api/send-email.js`),
liest `MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD` aus
`process.env`, vergleicht sie mit dem Request-Body und antwortet mit
`200 { ok: true }` bzw. `401 { ok: false, error }`. Ohne konfigurierte
Umgebungsvariablen antwortet der Endpunkt mit `500` statt Zugangsdaten
zu erraten oder Defaults zu verwenden.

**Frontend-Struktur** (`intern/index.html`, `src/intern/`):
- `#login-section` — Login-Formular (Benutzername, Passwort, Fehlermeldung,
  Anmelden-Button), initial sichtbar.
- `#app-content` — bestehender Materialgenerator-Inhalt (Hero + Card),
  initial mit `hidden` ausgeblendet, unverändert in Struktur und IDs.
- `#logout-btn` — Button im Header, initial mit `hidden` ausgeblendet.
- `src/intern/auth.js` — Login-/Logout-Wiring, kennt keine
  Materialgenerator-DOM-Elemente außer den oben genannten Containern.
- `src/intern/generator.js` — unveränderte Materialgenerator-Logik
  (vormals der Inhalt von `src/intern/main.js`), als `initGenerator()`
  exportiert.
- `src/intern/main.js` — dünner Einstiegspunkt, verdrahtet `auth.js`
  und `generator.js` miteinander (`initGenerator()` wird genau einmal
  pro Seitenaufruf aufgerufen, auch bei mehrfachem Login/Logout
  innerhalb derselben Seite).

**Bekannte Einschränkung**: `POST /api/login` ist wie
`POST /api/send-email` eine Vercel-Serverless-Function und im lokalen
`npm run dev` (reiner Vite-Devserver) nicht erreichbar — Login lässt
sich lokal nur gegen einen Vercel-Dev-Server oder nach einem Deploy
testen. Dies ist keine neue Einschränkung, sondern entspricht dem
bestehenden Verhalten von `api/send-email.js`.

**Abhängigkeiten**: `src/intern/auth.js` → `core/auth/authSession.js`,
`core/auth/requestLogin.js`. `core/auth/requestLogin.js` → Browser-
`fetch`-API, ruft `POST /api/login` auf. `api/login.js` → keine
externen Bibliotheken, ausschließlich `process.env`. Keine Abhängigkeit
zu `core/materials/*`, `core/id/*` oder `core/mail/*`.

**Tests**: `core/auth/authSession.test.js` (Node.js eingebauter
Test-Runner, ausführbar via `npm test`) — deckt Setzen, Lesen und
Löschen des Anmeldezustands sowie das Ignorieren fremder Werte im
Speicher ab. `core/auth/requestLogin.js` ist analog zu
`core/mail/sendGeneratedMaterials.js` bewusst ungetestet (reiner
`fetch`-Wrapper ohne eigene Logik).

**Erweiterungsmöglichkeiten**: mehrere Administrator-Konten, echte
Benutzerverwaltung mit Rollen, serverseitige Sessions/JWT, Ablauf der
Anmeldung nach Inaktivität — bewusst nicht Teil dieses Schritts.

## 9. Materialversand an Repräsentant und humbee (`core/materials/`, `core/templates/`, `core/mail/`, `api/send-representative-mail.js`)

**Zweck**: Nach erfolgreicher Erzeugung der ausgewählten Materialien
im internen Materialgenerator können diese direkt per Mail versendet
werden — an den Repräsentanten (Standardfall: `person.email`, oder
wahlweise an eine abweichende Adresse, z. B. damit ein Mitarbeiter die
Mail zunächst an sich selbst schickt) sowie parallel als
Dokumentations-Mail an humbee. Es gibt weiterhin **keinen** lokalen
ZIP-Download-Button — das ZIP-Archiv wird ausschließlich als
Mailanhang erzeugt.

**Ablauf** (`src/intern/generator.js`, Funktion `handleSendDelivery`):
1. Nach `generateQrMaterials()` werden Manifest und erzeugte Dateien
   im Modul gemerkt (`lastManifest`/`lastFiles`) und der
   Versandbereich (`#delivery-section`) eingeblendet und zurückgesetzt
   (Standardoption "Direkt an den Repräsentanten senden").
2. Bei Auswahl "An abweichende E-Mail-Adresse senden" erscheint ein
   Pflichtfeld; die Adresse wird vor dem Versand über die bestehende
   `core/mail/validateEmail.js` geprüft.
3. `core/materials/buildMaterialZip.js` bündelt die tatsächlich
   erzeugten Dateien (nicht mehr, nicht weniger) über den bestehenden
   `core/zip/createZip.js` zu genau einem Archiv; der Dateiname kommt
   von `core/materials/buildMaterialZipFilename.js`
   (`IFK_Materialien_<IFK-ID>_<Vorname>_<Nachname>.zip`, mit derselben
   Sanitizing-Logik wie die einzelnen Materialdateinamen — siehe
   `buildMaterialFilenames.js`, dessen `sanitizeNamePart` dafür
   exportiert wurde).
4. `core/materials/buildRepresentativeDeliveryRequest.js` baut daraus
   den vollständigen, versandfertigen Request-Payload: Betreff/Text/
   HTML für die Repräsentanten-Mail (`core/templates/
   representativeMailContent.js`, inkl. Rollenbezeichnung über
   `getRepresentativeRoleLabel.js` und dem gemeinsamen HTML-Rahmen
   `core/templates/ifkHtmlEmail.js` — der bestehenden IFK-HTML-Signatur/
   Branding, wie sie bereits in `api/send-email.js` verwendet wird),
   sowie Betreff/Text für die humbee-Mail
   (`core/templates/humbeeMailContent.js`). ZIP- und Einzeldatei-
   Inhalte werden über `core/mail/encodeAttachmentBase64.js` als
   Base64-Strings kodiert (browser- und Node-kompatibel, ohne
   Duplikat der ZIP-Inhaltsnormalisierung).
5. `core/mail/sendRepresentativeMaterials.js` (reiner `fetch`-Wrapper,
   analog zu `core/mail/sendGeneratedMaterials.js`) schickt den
   Payload an `POST /api/send-representative-mail`.
6. Die Serverless-Function versendet über
   `core/mail/deliverRepresentativeMaterials.js` zwei unabhängige
   Mails (Repräsentant, humbee) und liefert für jede einzeln
   `{ success, messageId?, error? }` unter `representative`/`humbee`
   zurück; `ok` im Gesamtergebnis ist nur `true`, wenn **beide**
   erfolgreich waren. Beide Versandversuche werden immer durchgeführt,
   unabhängig vom Ergebnis des jeweils anderen (ein Fehlschlag der
   Repräsentanten-Mail überspringt den humbee-Versand nicht und
   umgekehrt) — siehe auch die Logging-Details unten. Das UI zeigt
   "Versand läuft …" während des Requests, bei Erfolg
   "Versand erfolgreich.", bei Teil- oder Komplettfehlern eine
   eindeutige Fehlermeldung (welcher Teil fehlgeschlagen ist) statt
   eines generischen Fehlers. Der Versand-Button ist während eines
   laufenden Versands deaktiviert (`isSending`-Flag), um
   Doppel-/Mehrfachversand zu verhindern.

**Inhalt der Repräsentanten-Mail**: Betreff konstant "Deine
personalisierten Materialien von It's for Kids". Anrede/Rollenbezeichnung
abhängig von `person.gender` ("Repräsentant" bei `"male"` oder
fehlender Angabe, "Repräsentantin" bei `"female"` —
`getRepresentativeRoleLabel.js`). Genau ein Anhang: das ZIP-Archiv mit
allen tatsächlich erzeugten Materialien. Keine einzelnen
Materialdateien zusätzlich als Anhang.

**Inhalt der humbee-Mail**: Empfänger `office@its-for-kids.de`
(konstant). Betreff exakt `Repräsentant <Bundesland> / <Region> /
<Nachname>, <Vorname>` — immer das Wort "Repräsentant", unabhängig vom
Geschlecht (`buildHumbeeMailSubject`). Kurzer technischer Klartext
ohne Signatur/Grußformel. Anhänge: alle tatsächlich erzeugten
Materialdateien einzeln (aktuell PNGs; künftige Flyer-PDFs würden über
dieselbe generische Dateiliste automatisch mit angehängt, ohne
Code-Änderung) — **keine** ZIP-Datei.

**Serverseitig** (`api/send-representative-mail.js`, `api/_lib/
buildMailTransporter.js`, `core/mail/deliverRepresentativeMaterials.js`):
`api/send-representative-mail.js` bleibt bewusst dünn — Request-
Validierung (Empfänger- und humbee-Adresse über
`core/mail/validateEmail.js`, Pflichtfelder), Base64-Dekodierung der
Anhänge und Aufbau des `nodemailer`-Transporters über
`api/_lib/buildMailTransporter.js` (kapselt denselben `SMTP_*`-Aufbau
wie `api/send-email.js`; bewusst als separate Datei angelegt statt von
dort importiert, da der bestehende öffentliche QR-Code-Generator und
dessen Mailfunktion laut Vorgabe nicht verändert werden dürfen). Der
eigentliche Versand inkl. Protokollierung liegt im DOM-freien,
ohne echten Mailserver testbaren `core/mail/
deliverRepresentativeMaterials.js` (SMTP-Transport über injizierbares
`deps.sendMail`).

**Protokollierung** (`core/mail/deliverRepresentativeMaterials.js`):
Repräsentanten- und humbee-Versand werden als zwei unabhängige, klar
unterscheidbare Vorgänge protokolliert — je Vorgang eine Zeile vor dem
Versand (`representative mail delivery started` /
`humbee mail delivery started`), eine bei Erfolg
(`… delivery accepted`, inkl. SMTP-Response-Code, SMTP-Message-ID,
Anzahl und Typen der Anhänge) und eine bei Fehlschlag
(`… delivery failed`, inkl. Fehlerkategorie). Eine optionale
Lauf-/Request-ID (`x-vercel-id`-Header, sofern vorhanden) wird in
jede Zeile aufgenommen, um zusammengehörige Log-Zeilen zu
korrelieren. Bewusst **nicht** geloggt: Namen, E-Mail-Adressen,
IFK-ID, Bundesland/Region, Betreff, Dateinamen, Mailtext,
Dateiinhalte oder Zugangsdaten. Zusätzlich gilt ein von der
SMTP-Antwort abgelehnter Empfänger (`info.rejected`) auch dann als
Fehlschlag, wenn `sendMail` nicht wirft — ein bloßes "hat nicht
geworfen" reicht nicht als Erfolgsnachweis.

**Core-Module**:
- `core/materials/getRepresentativeRoleLabel.js` — Gender →
  Rollenbezeichnung.
- `core/materials/buildMaterialZipFilename.js` — ZIP-Dateiname, nutzt
  `sanitizeNamePart` aus `buildMaterialFilenames.js`.
- `core/materials/buildMaterialZip.js` — Orchestrierung über
  `createZip.js` und `buildMaterialZipFilename.js`.
- `core/templates/ifkHtmlEmail.js` — gemeinsamer HTML-Rahmen
  (Logo + Absätze), entspricht optisch dem bestehenden Markup in
  `api/send-email.js`.
- `core/templates/representativeMailContent.js` — Betreff/Text/HTML
  der Repräsentanten-Mail.
- `core/templates/humbeeMailContent.js` — Betreff/Text der
  humbee-Mail.
- `core/mail/encodeAttachmentBase64.js` — Content (Blob/ArrayBuffer/
  Uint8Array) → Base64-String.
- `core/materials/buildRepresentativeDeliveryRequest.js` — baut den
  vollständigen Request-Payload; exportiert zusätzlich
  `resolveRepresentativeRecipient` (Standard- vs. abweichende
  Adresse) einzeln testbar.
- `core/mail/guessAttachmentMimeType.js` — leitet aus der
  Dateiendung einen groben MIME-Typ ab, ausschließlich zur
  datensparsamen Log-Protokollierung von Anhangs-**Typen** (keine
  Dateinamen). Generisch über eine Endungs-Tabelle, keine
  hartcodierte Vier-QR-Dateien-Logik.
- `core/mail/deliverRepresentativeMaterials.js` — serverseitige
  Versand-Orchestrierung (zwei unabhängige `sendMail`-Aufrufe,
  Protokollierung, Ablehnungs-Erkennung); `sendMail` ist injizierbar,
  daher ohne echten Mailserver testbar.
- `core/mail/sendRepresentativeMaterials.js` — `fetch`-Wrapper zum
  neuen Endpunkt; liefert
  `{ ok, representative: { success, messageId?, error? }, humbee: { success, messageId?, error? } }`.

Alle oben genannten Core-Module sind DOM-frei und ausschließlich über
Parameter/Rückgabewerte nutzbar; `core/mail/sendRepresentativeMaterials.js`
nutzt wie `core/mail/sendGeneratedMaterials.js` bewusst die Browser-
`fetch`-API (kein DOM-Zugriff).

**Bewusst nicht Teil dieses Schritts**: Abruf/Verarbeitung der unter
`photoUrl` hinterlegten Foto-Datei, Erzeugung der beiden Flyer-Typen,
weitere Versandoptionen (z. B. mehrere Empfänger, Terminierung),
Änderungen am Login oder an der bestehenden QR-Erzeugung/-Mailfunktion
des öffentlichen Generators.

**Tests**: `getRepresentativeRoleLabel.test.js`,
`buildMaterialZipFilename.test.js`, `buildMaterialZip.test.js`,
`encodeAttachmentBase64.test.js`, `representativeMailContent.test.js`,
`humbeeMailContent.test.js`, `buildRepresentativeDeliveryRequest.test.js`,
`guessAttachmentMimeType.test.js`, `deliverRepresentativeMaterials.test.js`
(Node.js eingebauter Test-Runner, ausführbar via `npm test`) — decken
u. a. ab: Standard- vs. abweichender Empfänger, Ablehnung einer
ungültigen abweichenden Adresse, Rollenbezeichnung nach Geschlecht,
ZIP-Dateiname und -Inhalt, humbee-Betreffschema, getrennte Anhänge
(Repräsentant erhält nur das ZIP, humbee nur Einzeldateien), dass
beide Versandaufrufe unabhängig vom Ergebnis des jeweils anderen
durchgeführt werden, dass ein von der SMTP-Antwort abgelehnter
Empfänger als Fehlschlag gilt, sowie dass die Logs beide Vorgänge
eindeutig unterscheiden und keine Empfängeradressen, Betreffs,
Dateinamen oder Mailtexte enthalten. Keine echten Zugangsdaten oder
echten Repräsentantendaten in den Tests.
`core/mail/sendRepresentativeMaterials.js` ist analog zu
`core/mail/sendGeneratedMaterials.js` bewusst ungetestet (reiner
`fetch`-Wrapper ohne eigene Logik).

**Abhängigkeiten**: siehe Abschnitt 7 sowie die Core-Modul-Liste oben.
`api/send-representative-mail.js` → `api/_lib/buildMailTransporter.js`,
`core/mail/validateEmail.js`, `core/mail/deliverRepresentativeMaterials.js`.
`core/mail/deliverRepresentativeMaterials.js` → `core/mail/
guessAttachmentMimeType.js`. Keine Abhängigkeit zu `api/send-email.js`
oder umgekehrt.

**Erweiterungsmöglichkeiten**: mehrere Administrator-/Versandkonten,
automatischer Abruf und Anhang der Foto-Datei, Versandhistorie/
Protokollierung je Repräsentant, Retry-Mechanismus bei
Teilfehlschlägen — bewusst nicht Teil dieses Schritts.

## 10. Serverseitige Foto-Link-Prüfung (`core/photo/`, `api/validate-photo.js`)

**Zweck**: Testet, ob ein im Personenformular hinterlegter Foto-Link
(`photoUrl`, siehe Abschnitt 6/7) serverseitig tatsächlich als Bild
geladen werden kann — reine Erreichbarkeits-/Formatprüfung. Bewusst
**kein** PDF-Erzeugung, **keine** Bildbearbeitung, **keine**
Speicherung: Das Bild wird bei Erfolg lediglich als Base64-Inhalt
inkl. Größe/Format zurückgeliefert und clientseitig in einer
In-Memory-Variable (`lastPhoto` in `src/intern/generator.js`)
zwischengehalten, ohne weitere Verarbeitung oder Persistenz.

**Ablauf**: Nach erfolgreicher `generateQrMaterials()`-Erzeugung ruft
`src/intern/generator.js` (`checkRepresentativePhoto`) den neuen
Endpunkt `POST /api/validate-photo` mit der bereits validierten
`photoUrl` auf (Client-Wrapper: `core/photo/
fetchRepresentativePhoto.js`, analog zu `core/mail/
sendGeneratedMaterials.js`). Der Foto-Check läuft unabhängig von der
QR-Materialerzeugung und blockiert diese nicht — ein fehlgeschlagener
Foto-Abruf verhindert weder die Anzeige der erzeugten QR-Materialien
noch den späteren Mailversand (Abschnitt 9).

**Serverseitig** (`api/validate-photo.js`, `core/photo/
retrieveRepresentativePhotoAsset.js`): validiert den Foto-Link über
die bestehende `core/text/isHttpUrl.js` (keine zweite URL-Prüfung).
Der eigentliche Abruf — **genau ein** `fetch()`-Aufruf mit
8-Sekunden-Timeout (`AbortController`, `redirect: "follow"`) — sowie
die Entscheidung Erfolg/Fehlerkategorie
(`core/photo/classifyPhotoFetchResponse.js`, DOM-frei und ohne echten
Server testbar) liegen in `core/photo/
retrieveRepresentativePhotoAsset.js`. Bei Erfolg liefert diese
Funktion ein In-Memory-"Photo-Asset" `{ contentType, format, size,
content: Uint8Array }` (Format über `core/photo/
detectImageFormatFromContentType.js`, z. B. "JPEG", "PNG", "WebP").
`api/validate-photo.js` wandelt daraus lediglich die
JSON-Antwort (`content` als Base64-String für den Client).

Diese Trennung ist bewusst auf Wiederverwendung angelegt: Ein
künftiger Materialgenerator (z. B. ein Repräsentanten-Flyer, der das
Foto einbettet) kann innerhalb **desselben** Funktionsaufrufs auf
`asset.content` zugreifen, ohne das Foto ein zweites Mal per HTTP zu
laden. Das Asset ist ausschließlich eine lokale Variable im laufenden
Request — kein modulweiter Cache, keine Datei-/DB-Ablage, keine
Persistenz zwischen Requests. Aktuell hat `retrieveRepresentativePhotoAsset`
genau einen Konsumenten (`api/validate-photo.js`); die UI ist von
dieser internen Umstrukturierung unverändert (gleiche Response-Form,
gleiches Verhalten wie zuvor).

**Fehlerkategorien** (unterschieden über
`core/photo/classifyPhotoFetchResponse.js` bzw. bei geworfenen
Ausnahmen über `core/photo/classifyPhotoFetchException.js`):
- `"http_error"` — Status ist nicht 200 (z. B. 404, 403, 500) oder ein
  nicht auf Abbruch zurückzuführender Netzwerkfehler (z. B. DNS).
- `"timeout"` — der Abruf wurde nach 8 Sekunden abgebrochen
  (`AbortError`).
- `"redirect_login"` — Status 200, aber kein Bild-Content-Type, UND
  es fand mindestens eine Weiterleitung statt (typisches Muster für
  eine Umleitung auf eine Anmelde-/Login-Seite statt des Bildes).
- `"invalid_content_type"` — Status 200, kein Bild-Content-Type, ohne
  vorherige Weiterleitung (z. B. eine HTML-Seite statt eines Bildes).

Die verständliche Fehlermeldung ("Das Foto konnte nicht geladen
werden.") wird immer angezeigt; `core/photo/
getPhotoRetrievalErrorMessage.js` ergänzt je nach Kategorie einen
unterscheidenden Klammerzusatz.

**Core-Module**:
- `core/photo/classifyPhotoFetchResponse.js` — Status/Content-Type/
  Weiterleitung → Erfolg oder Fehlerkategorie.
- `core/photo/classifyPhotoFetchException.js` — geworfene Ausnahme
  (z. B. `AbortError`) → Fehlerkategorie.
- `core/photo/detectImageFormatFromContentType.js` — Content-Type →
  lesbare Formatbezeichnung.
- `core/photo/getPhotoRetrievalErrorMessage.js` — Fehlerkategorie →
  verständliche, unterscheidbare Fehlermeldung.
- `core/photo/retrieveRepresentativePhotoAsset.js` — serverseitige
  Abruf-Orchestrierung (genau ein `fetch()`, injizierbar für Tests)
  inkl. Aufbau des In-Memory-Photo-Assets; Grundlage für künftige
  Materialgeneratoren, die denselben Bildinhalt weiterverwenden
  wollen.
- `core/photo/fetchRepresentativePhoto.js` — `fetch`-Wrapper zum
  neuen Endpunkt.

Alle Core-Module sind DOM-frei; `fetchRepresentativePhoto.js` nutzt
wie andere `core/mail/*`-Wrapper bewusst die Browser-`fetch`-API.

**Bewusst nicht Teil dieses Schritts**: PDF-Erzeugung, Bildbearbeitung
(Zuschnitt, Skalierung, Konvertierung), Persistenz des Bildinhalts,
Einbindung des Fotos in ZIP/Mailversand (Abschnitt 9), Änderungen am
Login oder an der bestehenden QR-Erzeugung/-Mailfunktion des
öffentlichen Generators.

**Tests**: `classifyPhotoFetchResponse.test.js`,
`classifyPhotoFetchException.test.js`,
`detectImageFormatFromContentType.test.js`,
`getPhotoRetrievalErrorMessage.test.js`,
`retrieveRepresentativePhotoAsset.test.js` (Node.js eingebauter
Test-Runner, ausführbar via `npm test`) — decken u. a. ab: öffentlich
erreichbares Bild (Erfolg), 404, 403, HTML statt Bild (mit und ohne
Weiterleitung), Timeout (`AbortError`), sowie alle vier
Fehlermeldungs-Varianten. `retrieveRepresentativePhotoAsset.test.js`
prüft zusätzlich explizit, dass pro Aufruf genau ein
`fetch()`-Aufruf stattfindet (kein zweiter HTTP-Abruf) und dass das
zurückgegebene Asset den geladenen Inhalt, die Größe, das Format und
den Content-Type enthält — über ein injizierbares `fetchImpl`, ohne
echten Mailserver/Netzwerk. `core/photo/fetchRepresentativePhoto.js`
ist analog zu `core/mail/sendGeneratedMaterials.js` bewusst
ungetestet (reiner `fetch`-Wrapper ohne eigene Logik).

**Abhängigkeiten**: `api/validate-photo.js` → `core/text/isHttpUrl.js`,
`core/photo/retrieveRepresentativePhotoAsset.js`.
`core/photo/retrieveRepresentativePhotoAsset.js` → `core/photo/
classifyPhotoFetchResponse.js`, `core/photo/
classifyPhotoFetchException.js`, `core/photo/
detectImageFormatFromContentType.js`. `src/intern/generator.js` →
`core/photo/fetchRepresentativePhoto.js`, `core/photo/
getPhotoRetrievalErrorMessage.js`. Keine Abhängigkeit zu
`api/send-email.js`, `api/send-representative-mail.js` oder dem
öffentlichen Generator.

**Erweiterungsmöglichkeiten**: Übergabe des In-Memory-Photo-Assets an
einen künftigen Materialgenerator (z. B. Repräsentanten-Flyer) inner-
halb desselben Requests, Bildverarbeitung (Zuschnitt/Skalierung für
Flyer-PDFs), Persistenz je Repräsentant — bewusst nicht Teil dieses
Schritts.


## 11. Import von Repräsentantendaten aus humbee-Screenshots (`core/screenshot/`, `scripts/copy-tesseract-assets.mjs`)

**Zweck**: Im internen Materialgenerator kann ein Screenshot eines
humbee-Repräsentantenvorgangs hochgeladen bzw. per Drag & Drop abgelegt
werden. Die erkannten Werte werden zunächst als Importvorschau
angezeigt und erst nach bewusstem Klick ins Formular übernommen. Reine
Komfortfunktion — die manuelle Eingabe (Abschnitt 7) bleibt vollständig
erhalten und unverändert nutzbar.

**Grundentscheidung gegen generative KI**: Da es sich immer um
denselben, fest definierten humbee-Vorgangstyp mit gleichbleibendem
Feldlayout handelt, verzichtet diese Funktion bewusst auf generative
KI oder eine externe Vision-API. Stattdessen kommt klassische,
deterministische Texterkennung (OCR) über [Tesseract.js](https://tesseract.projectnaptha.com/)
zum Einsatz, **vollständig im Browser** — kein Server-Endpunkt, kein
API-Schlüssel, keine KI-Umgebungsvariablen, keine laufenden Kosten,
keine Übertragung des Screenshots an einen externen Dienst. Der
Screenshot verlässt zu keinem Zeitpunkt den Browser-Arbeitsspeicher
und wird weder auf einem Server noch auf der Festplatte gespeichert.

**Warum regelbasiert statt generativ**: Die Zuordnung der erkannten
Textzeilen zu den zehn benötigten Feldern erfolgt ausschließlich über
feste, aus dem humbee-Layout bekannte Feldbeschriftungen
(`core/screenshot/ocrLabels.js`) — keine Interpretation von Bedeutung
oder Kontext. Das ist für einen einzigen, unveränderlichen
Vorgangstyp zuverlässiger, schneller und vollständig ohne externe
Abhängigkeit umsetzbar als ein generatives Modell.

**Tesseract.js-Anbindung**: `core/screenshot/runScreenshotOcr.js` ist
die einzige Stelle im Projekt mit einer Abhängigkeit zu `tesseract.js`
(npm-Paket, neue Abhängigkeit). `tesseract.js` wird dort ausschließlich
per dynamischem `import()` geladen — der normale Materialgenerator
lädt die Bibliothek nicht mit; sie wird erst beim tatsächlichen
Öffnen eines Screenshots als eigener, separater Chunk nachgeladen
(verifiziert über `npm run build`: die OCR-Bibliothek erscheint als
eigenständige, kleine JS-Datei, die reguläre `intern`-Bundle-Größe
bleibt dadurch unverändert).

Damit keine Anfrage an ein fremdes CDN nötig ist, werden Worker-Skript,
WASM-Kernmodule (nur die LSTM-Variante, keine Legacy-Engine) und die
deutschen Trainingsdaten über die eigene Anwendung ausgeliefert:
`scripts/copy-tesseract-assets.mjs` kopiert sie aus `node_modules`
(`tesseract.js`, `tesseract.js-core`, `@tesseract.js-data/deu`) nach
`public/tesseract/` — als `postinstall`-Skript sowie vor `dev`/`build`
(`predev`/`prebuild`), damit die Dateien unabhängig davon aktuell
sind, wann zuletzt `npm install` lief. `public/tesseract/` ist
generiert und daher in `.gitignore` ausgeschlossen (kein Quellcode,
keine Versionierung nötig). `runScreenshotOcr.js` konfiguriert
`createWorker("deu", OEM.LSTM_ONLY, { workerPath, corePath, langPath })`
entsprechend auf `/tesseract/...` statt auf die sonst von Tesseract.js
standardmäßig genutzten jsDelivr-CDN-URLs.

**Zu erkennende Felder** (ausschließlich diese, siehe
`core/screenshot/ocrLabels.js`): Vorname, Nachname, Geschlecht,
Telefonnummer, Bundesland, Region, IFK-Mailadresse, normale
Mail-Adresse, IFK-ID, PayPal-URL — jeweils über die im humbee-Layout
verwendeten Feldbeschriftungen (inkl. Schreibvarianten, z. B. "Telefon
mobil"/"Telefonnummer"/"Telefon" oder "Paypal-URL"/"PayPal-URL"). Alle
anderen im Screenshot sichtbaren Inhalte (Land, Geburtstag,
Nutzername, Erstpasswort, Aufgaben, Dokumente) werden ignoriert.

**E-Mail-Priorität** (DOM-frei und unabhängig von der OCR-Engine
abgesichert): `core/screenshot/pickEmailForForm.js` entscheidet,
welche E-Mail-Adresse ins Formular übernommen wird — bevorzugt die
IFK-Mailadresse, nur bei deren Fehlen/Ungültigkeit die normale
Mail-Adresse, sonst ein leerer Wert mit `source: null` (in der UI als
prüfbedürftig dargestellt). Diese Regel wird unverändert von
`core/screenshot/buildExtractionFields.js` angewendet.

**IFK-ID-Regel**: Eine erkannte, aber laut `core/id/validateIfkId.js`
ungültige IFK-ID wird nie übernommen (Status `needs_review`, Wert
leer). Eine bereits im Formular vorhandene IFK-ID wird beim
"Übernehmen"-Klick nicht überschrieben — `src/intern/generator.js`
prüft vor dem Setzen, ob `ifk-id-input` bereits einen Wert enthält. Es
wird an keiner Stelle automatisch eine neue IFK-ID erzeugt; dafür
bleibt ausschließlich der bestehende "Neu generieren"-Button
zuständig.

**Ablauf** (`core/screenshot/`):
1. `core/screenshot/runScreenshotOcr.js` erkennt den Bildinhalt über
   Tesseract.js und liefert die erkannten Textzeilen inkl.
   Zeilen-Konfidenz (`0`–`100`, aus `data.blocks[].paragraphs[].lines[]`)
   sowie je Zeile die einzelnen Wörter mit horizontaler Position
   (`x0`/`x1`) und Wort-Konfidenz zurück — reiner Browser-Aufruf ohne
   eigene Fachlogik.
2. `core/screenshot/extractRawFieldsFromOcrLines.js` ordnet diese
   Zeilen den zehn Feldern zu: eine Zeile gilt als Beschriftung, wenn
   sie (nach Trimmen/Kleinschreibung, optionalem Doppelpunkt sowie
   toleriertem führendem Störzeichen) exakt einer bekannten
   Label-Variante entspricht oder mit ihr beginnt. Steht der Wert auf
   derselben Zeile ("Vorname: Daniel"), wird er direkt übernommen;
   steht die Beschriftung allein in der Zeile, gilt die nächste
   nicht-leere Zeile als Wert — außer sie ist selbst eine bekannte
   Beschriftung, dann gilt das Feld als im Screenshot leer (verhindert,
   dass eine fehlende Angabe versehentlich die nächste Feldbeschriftung
   als Wert übernimmt).

   **Bereinigung von Bedienelement-Rauschen anhand der Wortposition**:
   Die reale humbee-Ansicht zeigt rechts neben jedem Wert eigene
   Bedienelemente (Icons/Buttons), die OCR gelegentlich — oft sogar mit
   hoher Konfidenz — als zusätzliches Wort auf derselben Zeile liest
   (z. B. `"Bundesland NRW €"`). Sobald Wortpositionsdaten vorliegen,
   verwirft `extractRawFieldsFromOcrLines.js` solche Wörter über zwei
   unabhängige, auflösungsunabhängige Signale: (1) ein Wortabstand, der
   ein Vielfaches des normalen Abstands zwischen Beschriftung und Wert
   derselben Zeile beträgt, und (2) eine horizontale Position nahe der
   in der gesamten Auswertung beobachteten Dokumentbreite (≥ 85 % des
   größten vorkommenden Wort-Endpunkts) — Signal (2) greift zusätzlich
   dort, wo ein sehr langer Wert (z. B. eine E-Mail-Adresse) den reinen
   Abstand zum Rauschwort klein erscheinen lässt. Ohne Wortpositionsdaten
   (z. B. in älteren Tests ohne `words`) wird unverändert der komplette
   Resttext verwendet. Diese Verfeinerung wurde anhand eines echten
   humbee-Test-Screenshots entwickelt und verifiziert.

   **PayPal-URL-Sonderfall**: Die Beschriftung "Paypal-URL" wird von
   OCR gelegentlich vollständig fehlgelesen, der danebenstehende Link
   aber zuverlässig erkannt. Findet die reguläre Label-Suche keinen
   Treffer, sucht `extractRawFieldsFromOcrLines.js` zusätzlich
   unabhängig von jeder Beschriftung nach einem Wort, das einem
   PayPal-Link-Muster entspricht. Da lange Links im humbee-Layout auf
   eine zweite Zeile umbrechen, wird zusätzlich geprüft, ob die
   Folgezeile ein Wort in derselben Wertespalte (nahezu gleiche
   horizontale Position wie der Linkbeginn) enthält, und dieses ohne
   Trennzeichen angehängt.
3. `core/screenshot/buildExtractionFields.js` validiert jedes Rohfeld
   mit denselben Core-Funktionen wie bei manueller Eingabe
   (`core/mail/validateEmail.js`, `core/id/validateIfkId.js`,
   `core/screenshot/normalizeGender.js`,
   `core/screenshot/normalizePhone.js`,
   `core/screenshot/validateExtractedPaypalUrl.js`) und bezieht dabei
   zusätzlich die OCR-Konfidenz ein — **zeichengenau, wo möglich**
   (`core/screenshot/annotateLowConfidenceCharacters.js`): Tesseract.js
   liefert neben der Wort- auch eine Zeichen-Konfidenz je erkanntem
   Zeichen (`word.symbols[].confidence`). Die Wort-Konfidenz allein ist
   dabei kein verlässliches Signal für einzelne Zeichenfehler — sie
   bezieht ein Sprachmodell mit ein und kann bei einem an sich korrekt,
   aber unplausibel wirkenden Wert (z. B. einem Teil einer
   PayPal-Vorgangs-ID) stark abfallen, obwohl fast alle Zeichen mit
   hoher Konfidenz gelesen wurden. Liegen Zeichen-Konfidenzwerte vor,
   wird deshalb nicht mehr pauschal der gesamte Wert auf
   `needs_review` herabgestuft, sobald irgendein Signal niedrig ist —
   stattdessen werden ausschließlich Zeichen mit einer Konfidenz unter
   90 % (Schwelle empirisch aus einem echten humbee-Test-Screenshot
   abgeleitet: korrekt gelesene Zeichen lagen durchgehend bei 94–99 %,
   ein tatsächlich falsch gelesenes Zeichen sichtbar darunter bei 87 %)
   als unsicher markiert (`field.chars`); enthält der Wert kein
   unsicheres Zeichen, bleibt er trotz niedriger Wort-Konfidenz
   `recognized`. Reiner Zahlenvergleich mit von Tesseract selbst
   gelieferten Werten — keine Zeichen-Verwechslungstabelle (z. B.
   "U ↔ J"), kein Raten, welches Zeichen korrekt wäre, keine KI. Liegen
   keine zeichengenauen Daten vor (z. B. bei einwortigen Werten ohne
   Positionsrekonstruktion), bleibt es bei der bisherigen, groben
   Schwelle auf Basis der Wort-/Zeilen-Konfidenz (< 60 →
   `needs_review`). Für das Geschlecht (Klassifizierung, keine
   zeichengetreue Wiedergabe des erkannten Worts) gilt weiterhin
   ausschließlich die grobe Schwelle. `core/screenshot/
   isLabelEcho.js` verhindert zusätzlich, dass eine falsch zugeordnete
   Beschriftung selbst als Wert landet.
4. `core/screenshot/extractRepresentativeDataFromScreenshot.js`
   orchestriert die drei Schritte (inkl. 30-Sekunden-Timeout) und
   nimmt die OCR-Funktion injizierbar entgegen (`runOcr`), damit Tests
   ohne echten Tesseract.js-Lauf auskommen.

**UI** (`intern/index.html`, `src/intern/generator.js`): Bereich
"Daten aus humbee-Screenshot übernehmen" oberhalb der Personenfelder
— Drag-&-Drop-Fläche, Button "Screenshot auswählen"
(`accept="image/png,image/jpeg,image/webp"`, zusätzlich serverseitig
irrelevant, da rein clientseitig verarbeitet), Ladezustand
("Screenshot wird ausgewertet …"), Erfolgs-/Fehleranzeige, danach eine
Importvorschau (Tabelle: Feldname/erkannter Wert/Status) mit dem
Button "Erkannte Daten ins Formular übernehmen". Erst dieser bewusste
Klick überträgt Werte ins Formular. Enthält das Formular zu diesem
Zeitpunkt bereits Daten, fragt `window.confirm(...)` vor dem
Überschreiben explizit nach — unabhängig davon bleibt die
IFK-ID-Sonderregel (siehe oben) in jedem Fall bestehen. Automatisch
übernommene Felder erhalten ein dezentes Badge ("Aus Screenshot
übernommen", `[data-field-badge]` in `intern/index.html`); das Badge
verschwindet automatisch beim nächsten manuellen Bearbeiten des
jeweiligen Felds (`once`-Event-Listener in `src/intern/generator.js`,
keine Persistenz der Herkunftsmarkierung).

**Zeichengenaue Markierung in der Importvorschau**: Trägt ein Feld
`chars` (siehe oben), rendert `renderValueCell()` in
`src/intern/generator.js` jedes Zeichen einzeln; unsichere Zeichen
erhalten die Klasse `screenshot-char-uncertain` (dezent gelber
Hintergrund), sichere Zeichen bleiben unauffällig. Die
E-Mail-für-Formular-Zeile spiegelt dabei die Zeichen-Markierung des
tatsächlich ausgewählten Quellfelds (IFK-Mailadresse oder normale
Mail-Adresse), da sie exakt dessen Wert übernimmt. Ein Klick auf eine
solche Wertzelle blendet ein Eingabefeld ein (`startEditingValueCell()`);
nach dem Verlassen (Blur/Enter) wird der bearbeitete Wert direkt im
Vorschau-Objekt übernommen, der Status wechselt sichtbar auf "manuell
geprüft" (`manuallyReviewedFieldKeys`, nur clientseitiger
Sitzungszustand ohne Persistenz) und die Zeichen-Hervorhebung
entfällt. Beim Klick auf "Erkannte Daten ins Formular übernehmen"
gelten manuell geprüfte Felder als ebenso übernehmbar wie automatisch
mit `recognized` erkannte (`isApplyable()`).

**Fehlerkategorien** (`core/screenshot/classifyExtractionException.js`
und direkte Reason-Codes aus
`extractRepresentativeDataFromScreenshot.js`): `invalid_image`,
`invalid_mime_type`, `timeout` (30 Sekunden, clientseitig), `ocr_error`.
Jede Kategorie hat in `src/intern/generator.js` eine eigene,
verständliche deutsche Fehlermeldung.

**Core-Module**:
- `core/screenshot/extractionStatus.js` — gemeinsames Status-Vokabular
  (`recognized`/`not_recognized`/`needs_review`).
- `core/screenshot/ocrLabels.js` — feste Feldbeschriftungen (inkl.
  Schreibvarianten) pro Feld, zentrale Quelle für Label-Erkennung und
  Label-Echo-Schutz.
- `core/screenshot/isLabelEcho.js`, `normalizeGender.js`,
  `normalizePhone.js`, `validateExtractedPaypalUrl.js`,
  `pickEmailForForm.js` — Einzelprüfungen.
- `core/screenshot/extractRawFieldsFromOcrLines.js` — regelbasierte
  Zuordnung OCR-Zeilen → Rohfelder, inkl. Rand-Rauschen-Filterung
  anhand der Wortposition und PayPal-URL-Fallback.
- `core/screenshot/annotateLowConfidenceCharacters.js` — ordnet
  einem OCR-Wert anhand vorhandener Zeichen-Konfidenzwerte zu, welche
  einzelnen Zeichen unsicher sind, statt den gesamten Wert pauschal zu
  bewerten.
- `core/screenshot/buildExtractionFields.js` — Aggregation aller
  Feldprüfungen inkl. (möglichst zeichengenauer) Konfidenz-Herabstufung.
- `core/screenshot/classifyExtractionException.js` — Ausnahme →
  Fehlerkategorie.
- `core/screenshot/extractRepresentativeDataFromScreenshot.js` —
  Orchestrierung (Timeout, injizierbarer OCR-Aufruf).
- `core/screenshot/runScreenshotOcr.js` — einzige Stelle mit
  Abhängigkeit zu `tesseract.js`, per dynamischem Import lazy
  geladen, ungetestet (reiner Browser-Aufruf ohne eigene Logik,
  analog zu `core/branding/loadImage.js`).

**Bewusst nicht Teil dieses Schritts**: generative KI/Vision-APIs,
serverseitige Verarbeitung des Screenshots, Persistenz des Screenshots
oder der erkannten Daten, automatische IFK-ID-Erzeugung, Unterstützung
weiterer humbee-Vorgangstypen mit abweichendem Layout, Änderungen an
Login, Materialerzeugung, Foto-Link-Prüfung oder Mailversand.

**Tests**: `core/screenshot/*.test.js` (Node.js eingebauter
Test-Runner, ausführbar via `npm test`) — decken u. a. ab: feste
Label-Wert-Zuordnung (getrennte Zeilen und "Label: Wert" auf einer
Zeile), abweichende Leerzeichen/Zeilenumbrüche, fehlendes Label,
Label direkt gefolgt von der nächsten Beschriftung (gilt als leer),
Priorisierung/Fallback der E-Mail-Regel, beide Mailadressen fehlen,
vorhandene/fehlende/ungültige IFK-ID, Geschlecht männlich/weiblich
sowie unbekanntes/fehlendes Geschlecht, korrekt erkannte und
abgeschnittene PayPal-URL, Feldbeschriftungen als (nicht übernommener)
OCR-Wert, niedrige OCR-Konfidenz führt zur Herabstufung auf
`needs_review` statt ungeprüfter Übernahme, ungültiger Dateityp,
fehlendes Bild, Timeout, OCR-Fehler. `core/screenshot/
annotateLowConfidenceCharacters.test.js` und die entsprechenden
Fälle in `buildExtractionFields.test.js` decken zusätzlich ab: nur
tatsächlich unsichere Zeichen werden markiert (reales Beispiel
"HMUW" statt "HMJW"), ein Wert mit niedriger Wort- aber durchgehend
hoher Zeichen-Konfidenz bleibt `recognized`, nicht übereinstimmende
Zeichen-/Symbolanzahl sowie fehlende Symboldaten fallen sauber auf die
bisherige grobe Bewertung zurück. `core/screenshot/
runScreenshotOcr.js` ist analog zu den bestehenden Browser-API-Wrappern
bewusst ungetestet (reiner Tesseract.js-Aufruf ohne eigene Logik) — in
allen Tests wird die OCR über den injizierbaren `runOcr`-Parameter
durch feste, im Test definierte Textzeilen ersetzt. Keine echten
Repräsentantendaten und kein echter Tesseract.js-Lauf in den Tests.

**Abhängigkeiten**: `core/screenshot/
extractRepresentativeDataFromScreenshot.js` → `core/screenshot/
extractRawFieldsFromOcrLines.js`, `core/screenshot/
buildExtractionFields.js`, `core/screenshot/
classifyExtractionException.js`. `core/screenshot/
buildExtractionFields.js` → `core/mail/validateEmail.js`,
`core/id/validateIfkId.js`. `src/intern/generator.js` → `core/screenshot/
extractRepresentativeDataFromScreenshot.js`, `core/screenshot/
runScreenshotOcr.js`. `scripts/copy-tesseract-assets.mjs` läuft
unabhängig von der Anwendung als `postinstall`/`predev`/`prebuild`-Skript.
Keine Abhängigkeit zu `api/send-representative-mail.js`,
`api/validate-photo.js`, `api/login.js` oder einem `api/`-Endpunkt für
diese Funktion — es existiert keiner.

**Erweiterungsmöglichkeiten**: Unterstützung weiterer humbee-Vorgangstypen
über zusätzliche Label-Sets in `core/screenshot/ocrLabels.js`,
automatischer Abgleich der erkannten IFK-ID gegen
`core/id/reserveIfkId.js` (sobald implementiert), Bildvorverarbeitung
(Kontrast/Zuschnitt) zur Verbesserung der OCR-Genauigkeit — bewusst
nicht Teil dieses Schritts.

## 12. UX-Feinschliff der Screenshot-Importvorschau

Ergänzt Abschnitt 11 um sieben gezielte Verbesserungen, alle rein auf
Basis der bereits vorhandenen Tesseract.js-Daten (keine neue
KI-/OCR-Abhängigkeit):

**Kontrastreichere Zeichen-Hervorhebung**: `.screenshot-char-uncertain`
in `src/intern/style.css` nutzt jetzt gelben Hintergrund, orangefarbenen
Rand und dunkle, fett hervorgehobene Schrift statt der zuvor kaum
sichtbaren reinen Hintergrundfarbe.

**Deutsche Geschlecht-Anzeige**: `core/screenshot/genderDisplayLabel.js`
übersetzt den internen Wert (`"male"`/`"female"`) ausschließlich für
die Anzeige in der Importvorschau nach "männlich"/"weiblich". Der
interne Wert bleibt überall unverändert (Formular-Radios,
`buildMaterialManifest`).

**IFK-ID: bestätigt leer statt prüfbedürftig**: `core/screenshot/
extractRawFieldsFromOcrLines.js` unterscheidet jetzt drei Fälle statt
zwei — `null` (Beschriftung nirgends gefunden, keine Aussage über
Existenz möglich), `{ confirmedEmpty: true }` (Beschriftung eindeutig
gefunden, kein Wert folgt) und ein gefundener Rohwert. `core/screenshot/
buildExtractionFields.js` (`ifkIdField`) nutzt dies für den neuen
Status `EXTRACTION_STATUS.CONFIRMED_EMPTY`: sowohl bei eindeutig
bestätigt leerer Zeile als auch bei einem gefundenen "Wert", der
offensichtlich kein plausibles IFK-ID-Token ist (mehrere Wörter/
Anführungszeichen — typisch für ein versehentlich aufgegriffenes
Bedienelement einer Nachbarzeile, `PLAUSIBLE_IFK_ID_CANDIDATE`-Regex).
`src/intern/generator.js` zeigt dafür "Neu generieren" statt
"prüfbedürftig" (`SCREENSHOT_STATUS_LABELS.confirmed_empty`, eigene,
neutrale Badge-Farbe). Das Formularfeld selbst trägt zusätzlich den
Hinweis "(sofern bereits in humbee hinterlegt)" (`.field-hint` in
`intern/index.html`).

**Original-Screenshot dauerhaft sichtbar**: `src/intern/generator.js`
zeigt den hochgeladenen Screenshot nach erfolgreicher Auswertung
dauerhaft neben der Importvorschau an (`showOriginalScreenshot()`) —
zweispaltiges Layout auf Desktop (`.screenshot-review-layout`, Original
links, Vorschau rechts), untereinander auf Mobile (`@media (max-width:
700px)`, gleicher Breakpoint wie die Personenfelder). Das Bild bleibt
ausschließlich als `URL.createObjectURL(file)` im Browser-Speicher,
keine Speicherung, keine Übertragung. Ein Klick öffnet eine Lightbox
(`#screenshot-lightbox`, Vollbild-Overlay, schließbar per Klick auf den
Hintergrund, den Schließen-Button oder Escape). Object-URLs werden vor
dem Anzeigen eines neuen Screenshots sauber freigegeben
(`clearOriginalScreenshot()` → `URL.revokeObjectURL`), verifiziert per
Browsertest (genau ein `revokeObjectURL`-Aufruf pro erneutem Import).

**Bildausschnitt für prüfbedürftige Felder**: `core/screenshot/
runScreenshotOcr.js` liefert nun zusätzlich `y0`/`y1` je Wort;
`extractRawFieldsFromOcrLines.js` berechnet daraus für jeden
rekonstruierten Wert eine `bbox` (Vereinigung der beitragenden
Wort-Boxen). `core/screenshot/computeCropRectangle.js` (reine,
DOM-freie Geometrie-Funktion) vergrößert diese Box um einen Rand und
klammert sie an die Bilddimensionen — liefert `null`, wenn keine
verlässliche Bounding-Box vorliegt, damit bewusst **kein** künstlicher
Ausschnitt erzeugt wird. `src/intern/generator.js`
(`cropFieldRegion()`) zeichnet den Ausschnitt bei Bedarf per Canvas aus
dem bereits geladenen Original-Bild vergrößert nach und zeigt ihn nur
für Felder mit Status `needs_review` und vorhandener `bbox` unter dem
erkannten Wert an (`.screenshot-field-crop`).

**Telefonnummer-Normalisierung**: `core/screenshot/
normalizeGermanPhoneNumber.js` schreibt eine deutsche internationale
Vorwahl (`+49…`/`0049…`) auf die inländische `0…`-Schreibweise um
(reine Präfixerkennung, z. B. `"+49 1523 3795099"` →
`"01523 3795099"`). Andere Vorwahlen (z. B. `+43`, `+41`) matchen das
Muster nicht und bleiben unverändert — keine Sonderbehandlung nötig.
Eingebunden in `buildExtractionFields.js` (`phoneField`).

**Österreich-Erkennung (Vorbereitung)**: `core/screenshot/
detectAustrianFederalState.js` (`isAustrianFederalState()`) erkennt
die neun österreichischen Bundesländer sowie das Kürzel "AT"
(case-insensitiv). `buildExtractionFields.js` nutzt dies, um bei einem
erkannten österreichischen Bundesland die deutsche
Telefonnummer-Umschreibung gezielt zu unterdrücken — auch wenn die
Nummer zufällig einem `+49…`-ähnlichen Muster entspricht. Eine
sichtbare "Land"-Angabe im Formular ist bewusst nicht Teil dieses
Schritts (Vorbereitung, kein neues Formularfeld).

**Core-Module (neu)**: `core/screenshot/genderDisplayLabel.js`,
`core/screenshot/normalizeGermanPhoneNumber.js`, `core/screenshot/
detectAustrianFederalState.js`, `core/screenshot/
computeCropRectangle.js` — alle rein, DOM-frei und einzeln getestet.

**Tests**: `genderDisplayLabel.test.js`, `normalizeGermanPhoneNumber.test.js`
(+49/0049-Umschreibung, +43/+41 bleiben unverändert),
`detectAustrianFederalState.test.js` (alle neun Bundesländer + "AT"),
`computeCropRectangle.test.js` (Randklammerung, fehlende/unvollständige
Bounding-Box, ungültige Bilddimensionen), sowie ergänzte Fälle in
`buildExtractionFields.test.js` (bestätigt leere IFK-ID,
Bedienelement-Rauschen als IFK-ID-Wert, Telefonnummer-Normalisierung
inkl. Österreich-Ausnahme) und `extractRawFieldsFromOcrLines.test.js`
(bestätigt-leer-Markierung, Bounding-Box-Vereinigung). Bildvorschau,
Lightbox und Bildausschnitt sind reines DOM-Wiring in
`src/intern/generator.js` und damit — wie der Rest der Datei —
bewusst ungetestet; per Browsertest mit einem echten humbee-Screenshot
verifiziert.

**Bewusst nicht Teil dieses Schritts**: sichtbares "Land"-Formularfeld,
Unterstützung weiterer Länder über Österreich hinaus, automatische
Bildvorverarbeitung (Kontrast/Schärfung) zur OCR-Verbesserung.
