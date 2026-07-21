# Roadmap

Diese Roadmap beschreibt die geplanten Entwicklungsphasen auf dem Weg zu
einem gemeinsamen Materialgenerator, aufbauend auf dem bestehenden
QR-Code-Generator. Sie ist ein grober Fahrplan, kein verbindlicher
Zeitplan.

## Phase 1 — Core (abgeschlossen)

Extraktion der bestehenden QR-Code-Generator-Logik in ein
wiederverwendbares, DOM-freies `core/`-Modul (`core/qr`, `core/girocode`,
`core/branding`, `core/mail`, `core/config`, `core/text`), ohne jede
funktionale Änderung am bestehenden QR-Code-Generator. Siehe
[architecture.md](architecture.md).

## Phase 2 — Gemeinsame Infrastruktur (in Arbeit)

Ausbau des Cores um die technische Infrastruktur, die ein künftiger
Materialgenerator zusätzlich zum bestehenden QR-Code-Generator benötigt.
Struktur und öffentliche API wurden für alle vier Bereiche angelegt
(siehe Abschnitt 6 in [architecture.md](architecture.md)); die
fachliche Implementierung erfolgt schrittweise pro Bereich.

- **IFK-ID Core** (`core/id/`) — **abgeschlossen.** Erzeugung
  (`generateIfkId.js`) und Validierung (`validateIfkId.js`) sind
  vollständig implementiert und getestet; unabhängig von einer
  Datenbank. Die Reservierung (`reserveIfkId.js`) bleibt bewusst ein
  Platzhalter, bis ein Backend/eine Datenbank existiert.
- **ZIP Core** (`core/zip/`) — **abgeschlossen.** `createZip.js` ist
  vollständig implementiert und getestet (Bibliothek: JSZip), bündelt
  beliebig viele Dateien inkl. verschachtelter Ordner zu einem Archiv.
  Noch nicht in eine App integriert (kein Download, keine Mail-Anbindung).
- **Mail-Templates** (`core/templates/`) — Struktur angelegt,
  Implementierung offen. Zentrale, wiederverwendbare Mail-Textbausteine
  für mehrere Generatoren.
- **humbee** (`core/integrations/humbee/`) — Struktur angelegt,
  Implementierung offen. Anbindung an die externe Mail-Plattform humbee
  als möglicher zusätzlicher Versandkanal.

## Phase 3 — Materialgenerator

Aufbau einer neuen, eigenständigen App (analog zum bestehenden
QR-Code-Generator), die die in Phase 1 und 2 geschaffenen Core-Module
nutzt, um weitere Spendenaktions-Materialien zu erzeugen.

- **Materialtypen-Core** (`core/materials/materialTypes.js`) —
  **abgeschlossen.** Unveränderliche Definition der sechs individuellen
  Materialtypen (Flyer Druckerei, Flyer Home, PayPal QR grün/schwarz,
  GiroCode grün/schwarz) mit `{ key, label, category, format,
  extension }`, vollständig getestet.
- **Materialliste** (`core/materials/buildMaterialList.js`) —
  **abgeschlossen.** Auswahl der zu erzeugenden Materialien per
  `include`/`exclude`, feste reproduzierbare Reihenfolge, vollständig
  getestet.
- **Dateinamenslogik** (`core/materials/buildMaterialFilenames.js`) —
  **abgeschlossen.** Erzeugt personalisierte Dateinamen inkl.
  IFK-ID-Prüfung (`core/id/validateIfkId.js`) und Namensbereinigung,
  vollständig getestet.
- **Materialmanifest** (`core/materials/buildMaterialManifest.js`) —
  **abgeschlossen.** Baut aus Materialauswahl und Dateinamen ein rein
  fachliches Manifest (keine Dateiinhalte, keine Blob-/URL-/Mail-/
  ZIP-Daten), vollständig getestet.
- **Erzeugung PayPal QR grün** — **abgeschlossen.**
- **Erzeugung PayPal QR schwarz** — **abgeschlossen.**
- **Erzeugung GiroCode grün** — **abgeschlossen.**
- **Erzeugung GiroCode schwarz** — **abgeschlossen.**
  Alle vier über `core/materials/generateQrMaterials.js` (nutzt
  `generateMaterial.js`), auf Basis des bestehenden
  `core/qr/generateQr.js`, `core/girocode/buildGirocodePayload.js` und
  `core/branding/loadImage.js` — keine Duplikation der bestehenden
  QR-/GiroCode-/Branding-Logik, vollständig getestet.
- **Flyer Druckerei** — offen. **Flyer Home** — offen. (bewusst nicht
  Teil dieses Schritts, siehe Phase 4)

Noch offen (nicht Teil dieses Schritts): eigenständige App/Oberfläche,
Erzeugung der beiden Flyer-PDFs, ZIP-Paketierung und Mailversand der
erzeugten Materialien, Login/Authentifizierung.

## Phase 4 — Grafikintegration

Anbindung an eine Grafik-/Layout-Erzeugung (z. B. Flyer, druckfähige
Vorlagen), aufbauend auf dem Materialgenerator aus Phase 3. Umfasst
voraussichtlich neue Abhängigkeiten für Layout-/PDF-Erzeugung, die zum
jetzigen Zeitpunkt bewusst noch nicht Teil des Cores sind.

## Phase 5 — Erweiterungen

Weiterführende Ausbaustufen, deren Umfang zum jetzigen Zeitpunkt noch
nicht final definiert ist, z. B. Authentifizierung, Datenhaltung/
Datenbankanbindung für IFK-IDs, weitere Integrationen unter
`core/integrations/`, oder zusätzliche Materialtypen.
