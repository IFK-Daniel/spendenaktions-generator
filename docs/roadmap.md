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
- **ZIP** (`core/zip/`) — Struktur angelegt, Implementierung offen.
  Bündelung mehrerer generierter Dateien zu einem Download-Archiv.
- **Mail-Templates** (`core/templates/`) — Struktur angelegt,
  Implementierung offen. Zentrale, wiederverwendbare Mail-Textbausteine
  für mehrere Generatoren.
- **humbee** (`core/integrations/humbee/`) — Struktur angelegt,
  Implementierung offen. Anbindung an die externe Mail-Plattform humbee
  als möglicher zusätzlicher Versandkanal.

## Phase 3 — Materialgenerator

Aufbau einer neuen, eigenständigen App (analog zum bestehenden
QR-Code-Generator), die die in Phase 1 und 2 geschaffenen Core-Module
nutzt, um weitere Spendenaktions-Materialien zu erzeugen. Kein Bestandteil
der aktuellen Umbauten — betrifft neue Oberflächen, neue Seiten und neue
fachliche Logik.

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
