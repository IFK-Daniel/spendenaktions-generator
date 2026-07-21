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
│   └── text/
│       ├── extractPaypalLink.js
│       ├── extractCampaignTitle.js
│       ├── isDonateLink.js
│       └── slugify.js
├── api/
│   └── send-email.js            # Serverless Function (Vercel), unverändert
├── src/
│   ├── main.js                  # DOM-Wiring, Event-Handling, Orchestrierung
│   └── style.css
├── index.html
├── Medien/                      # Logo-Quelldateien
├── public/                      # statische Assets (Header-Logo)
└── docs/
    └── architecture.md          # dieses Dokument
```

Diese Struktur ändert nichts an `index.html`, `src/style.css`, `Medien/`,
`public/` oder an `api/send-email.js` — alle bestehenden DOM-IDs, Klassen
und das Layout bleiben unangetastet.

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
