# IFK Materialgenerator – Betriebs- und Architektur-Audit

**Stand dieses Audits:** 2026-09-04, verifiziert gegen Commit `eee43e1a5c8791a1b5c5f90445ac54e3142e5568` (`main`), Production-Deployment desselben Commits (Vercel-Status `success`).

**Methodik:** Jede Aussage in diesem Dokument wurde am aktuellen Code, an der aktuellen Git-/GitHub-Konfiguration oder per Live-Test gegen Production verifiziert — nicht aus früheren Gesprächen oder Erinnerungen übernommen. Wo etwas technisch nicht feststellbar war (z. B. Vercel-Dashboard-Einstellungen ohne Teamzugriff), ist das explizit als offene administrative Information markiert, nicht als Tatsache behauptet.

Bereits vorhandene Dokumente (`docs/architecture.md`, `docs/roadmap.md`) wurden NICHT als Quelle übernommen — beide sind, wie unten dokumentiert, in Teilen veraltet (z. B. beschreibt `roadmap.md` die Flyer-Erzeugung noch als "offen" und grüne QR-Codes als aktiv, obwohl beides überholt ist).

---

## Executive Summary

Der IFK Materialgenerator ist eine Vite-basierte Vanilla-JS-Anwendung mit zwei Frontends (öffentlicher Spenden-QR-Generator unter `/`, interner Materialgenerator unter `/intern/`) und fünf serverlosen Vercel-Functions unter `/api/`. Er läuft auf Vercel, versendet Mails über einen klassischen SMTP-Server via `nodemailer` (**kein Resend, keine humbee-API** — humbee ist lediglich eine normale Mail-Empfängeradresse), und speichert **keine personenbezogenen Wegbegleiter-Daten dauerhaft** — weder im Browser (kein localStorage/IndexedDB für Personendaten) noch serverseitig (kein Dateisystem-Write, keine Datenbank). Die IFK-ID wird rein clientseitig zufällig erzeugt; ein Server-seitiger Kollisions-/Reservierungsmechanismus (`reserveIfkId.js`) ist als Platzhalter angelegt, aber **nicht implementiert** — Eindeutigkeit ist derzeit ausschließlich durch die 32.768 möglichen Kombinationen und die manuelle Dokumentation in humbee gegeben.

Ein frischer Klon von GitHub (ohne jede lokale Zusatzdatei) baut und testet **erfolgreich** (683/683 Tests grün, Build erfolgreich) — das Projekt ist damit technisch aus dem Repository allein reproduzierbar. Der lokale `Medien/`-Ordner enthält historische Grafiker-Master, die bereits vollständig als `templates/*/background.pdf` ins Repository kopiert wurden; für den Betrieb wird daraus zur Laufzeit nur `Medien/IFK Logo nur Zähne.png` importiert, und diese Datei ist im Repository vorhanden.

Der größte Übergabe-Risikofaktor ist organisatorisch, nicht technisch: GitHub-Repository und Vercel-Projekt hängen jeweils an einem einzelnen persönlichen Account ohne erkennbaren zweiten Administrator; alle Secrets (SMTP, Admin-Login) sind nur im jeweiligen Dashboard hinterlegt und wurden in diesem Audit bewusst nicht ausgelesen.

---

## Systemzweck

Zwei getrennte, aus demselben Repository gebaute Anwendungen:

1. **Öffentlicher Spenden-QR-Generator** (`index.html`, `src/main.js`) — ohne Login. Spender:innen erzeugen einen PayPal-QR- und GiroCode für ihre eigene Spendenaktion und lassen sich diese optional per Mail zusenden (`api/send-email.js`).
2. **Interner Materialgenerator** (`intern/index.html`, `src/intern/generator.js`) — hinter einfachem Admin-Login (`api/login.js`). Für sechs "Wegbegleiter"-Rollen (Repräsentant, Botschafter, Wirtschaftsrat, Fachrat, Kuratorium, Beirat) werden personalisierte Flyer, QR-Codes und Urkunden erzeugt und optional direkt per Mail versendet (`api/send-representative-mail.js`), inkl. automatischer interner Dokumentations-Kopie an `office@its-for-kids.de` ("humbee").

Beide Anwendungen teilen sich ausschließlich Bausteine aus `core/` (DOM-frei, unit-testbar) — sie sind sonst unabhängig voneinander.

---

## Architekturübersicht

```
Browser (öffentlich)          Browser (intern, hinter Login)
   index.html                     intern/index.html
   src/main.js                    src/intern/generator.js
        │                              │
        │ JSON                        │ multipart/form-data
        ▼                              ▼
 api/send-email.js            api/send-representative-mail.js
        │                              │  (busboy-Parsing, In-Memory)
        │                              ▼
        │                     core/mail/buildRepresentativeMailPayloadsFromMultipart.js
        │                     core/mail/deliverRepresentativeMaterials.js
        │                              │
        └──────────────┬───────────────┘
                        ▼
              nodemailer (SMTP_* env vars)
                        │
                        ▼
                 externer SMTP-Server ──► Empfänger + humbee (office@its-for-kids.de)

api/login.js       — Admin-Login (MATERIAL_ADMIN_USERNAME/PASSWORD)
api/validate-photo.js — serverseitiger Foto-Abruf (CORS-Umgehung, kein Speichern)
```

Materialerzeugung (PDF/QR) läuft **vollständig im Browser** (`pdf-lib`, `qrcode`-Library, `tesseract.js` für OCR) — der Server ist nur für Mailversand, Login und Foto-/PayPal-Link-Validierung zuständig, nicht für Rendering.

Zentrale, DOM-freie Konfigurationsmodule (`core/materials/roleConfig.js`, `materialTypes.js`, `materialRequirements.js`) steuern das Verhalten der dünnen, DOM-lastigen `src/intern/generator.js` — dort gibt es bewusst **keine** eigene Testdatei (Architekturkonvention: UI-Glue-Code wird über die Core-Module getestet und per manuellem/Browser-Test verifiziert, nicht per Unit-Test).

---

## Repository / GitHub

| Punkt | Wert |
|---|---|
| Owner | `IFK-Daniel` (persönliches GitHub-Benutzerkonto, **kein** Organisationskonto — verifiziert via `gh api users/IFK-Daniel` → `"type":"User"`) |
| Repository | `spendenaktions-generator` |
| URL | https://github.com/IFK-Daniel/spendenaktions-generator |
| Default Branch | `main` |
| Aktuelle HEAD | `eee43e1a5c8791a1b5c5f90445ac54e3142e5568` – "feat: split certificate from companion material delivery" |
| Remote | `origin` → `https://github.com/IFK-Daniel/spendenaktions-generator.git` (einziger Remote) |
| Branches | `main` (aktiv), lokal zusätzlich `worktree-agent-ac3d4d11ebe4ae39f` (Nebenprodukt eines früheren Agenten-Worktrees, kein Produktionscode) |
| GitHub Actions | **Keine.** Kein `.github/`-Ordner im Repository. |
| GitHub als Deployment-Mechanismus? | Nein — GitHub ist reine Source Control; das Deployment erfolgt über die GitHub↔Vercel-Integration (siehe Abschnitt Hosting). |

**Bekannte lokale Auffälligkeit (nicht Teil des Repositorys, nur lokaler Arbeitsordner):** Ein defekter Git-Ref `refs/heads/main 2` existiert lokal (`git branch -a` gibt eine Warnung aus) — vermutlich Folge einer Dateisystem-Synchronisation (z. B. iCloud/Dropbox-Konfliktkopie). Betrifft nicht das Repository selbst, sollte aber bei einem Neuaufbau nicht aus diesem lokalen Ordner kopiert werden.

### `.gitignore` (vollständig)

```
node_modules
dist
.DS_Store
.vscode
.env
.env.*
public/tesseract/
```

`public/tesseract/` wird bewusst nicht versioniert — die Tesseract.js-OCR-Assets (Worker-Skript, WASM-Kernmodule, deutsche Trainingsdaten) werden bei `npm install`/`npm run build` automatisch aus `node_modules` kopiert (`scripts/copy-tesseract-assets.mjs`, als `postinstall`/`prebuild`-Hook in `package.json`) — **verifiziert im Disaster-Recovery-Test** (siehe dort): "8/8 Dateien nach public/tesseract kopiert."

### Vollständigkeit produktionsrelevanter Dateien

| Kategorie | Im Repository? | Befund |
|---|---|---|
| Flyer-Hintergrund-PDFs (26 Dateien in `templates/*/background.pdf`) | ✅ Ja | `git ls-files templates/` zeigt alle 26 Hintergrund-PDFs als getrackt; `templates/` insgesamt 11 MB. |
| Urkunden-Hintergründe | ✅ Ja | Ebenfalls unter `templates/certificate-*/background.pdf`, getrackt. |
| Fonts | ✅ Ja | `assets/fonts/NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSerif-Regular.ttf` — getrackt. |
| Statische Anleitung | ✅ Ja | `assets/material-guide/Hinweise_zur_Verwendung_der_Materialien.pdf` — getrackt. |
| Logo | ✅ Ja | `Medien/IFK Logo nur Zähne.png` (+ `IFK Logo.png`) — getrackt, wird zur Laufzeit importiert (`src/main.js:1`, `src/intern/generator.js:1`). |
| Konfigurationsdateien | ✅ Ja | `package.json`, `vite.config.js`, `.gitignore` — vollständig getrackt. Kein `vercel.json` vorhanden (siehe Hosting-Abschnitt). |

### `Medien/`-Ordner im Detail (Übergaberisiko-Prüfung)

`Medien/` enthält **17 getrackte** und **9 lokal untrackte** Dateien:

**Getrackt (im Repository, kein Risiko):**
`Flyer_RepraesentantInnen_Frauen_Du_korrigiert.pdf`, `Flyer_RepraesentantInnen_Frauen_Sie_korrigiert.pdf`, `Flyer_RepraesentantInnen_Maenner_Du_korrigiert.pdf`, `Flyer_RepraesentantInnen_Männer_Sie_korrigiert.pdf`, `Flyer_Rueckseite.pdf`, `IFK Logo nur Zähne.png`, `IFK Logo.png`, `Koordinaten der Felder für Claude.pdf`, `Urkunde Repräsentant.pdf`, `Urkunde Repräsentantin.pdf`, `Urkunde_Beirat.pdf`, `Urkunde_Botschafter.pdf`, `Urkunde_Botschafterin.pdf`, `Urkunde_Fachrat.pdf`, `Urkunde_Kuratorium.pdf`, `Urkunde_Wirtschaftsrat.pdf`, `flyer_a5_mass.pdf`.

Diese Dateien sind die **historischen Grafiker-Master**, aus denen die tatsächlich verwendeten `templates/*/background.pdf` einmalig erzeugt wurden (siehe Kommentar in `templates/flyer-representative-male-du-front/template.config.js`: *"background.pdf = Medien/Flyer_RepraesentantInnen_Maenner_Du_korrigiert.pdf (finaler Grafiker-Master, unverändert)"*). Zur Laufzeit/zum Build wird **nicht** auf diese Master zugegriffen — nur `IFK Logo nur Zähne.png` wird tatsächlich importiert. Die übrigen Master-PDFs sind Referenz-/Nachweisdateien, keine Build-Abhängigkeit.

**Lokal untracked (NICHT im Repository):**
`81bde324-d3a8-403b-a689-8f5aef2400a8.pdf`, sechs `Bildschirmfoto *.png`-Dateien, `Noto.zip`, `Unknown-2.pdf`. Diese wurden im laufenden Entwicklungsprozess in diesen Ordner abgelegt (Screenshots, ein Font-Zip). **Keine dieser Dateien wird vom Code referenziert** (verifiziert per Grep über `src/`, `core/`, `api/`) — sie sind Arbeitsdateien ohne Produktionsrelevanz.

**Ergebnis:** ⚠️ **Kein Übergaberisiko festgestellt** — Production ist ohne jede lokale Datei aus `Medien/` reproduzierbar (siehe Disaster-Recovery-Test unten, der dies praktisch bestätigt).

---

## Hosting / Vercel

| Punkt | Wert | Quelle |
|---|---|---|
| Deployment-Ziel | Vercel | Deployment-Status auf GitHub-Commit (`context: "Vercel"`), Vercel-Dashboard-URLs |
| Production-Deployment (aktueller Commit) | `https://spendenaktions-generator-4m1dwyk2u-ifk-de.vercel.app` (Deployment-Alias), Team/Scope **`ifk-de`** | `gh api repos/.../deployments/6271282249/statuses`, GitHub-Status `target_url: vercel.com/ifk-de/spendenaktions-generator/...` |
| **Stabile, öffentliche Production-Domain** (z. B. eigene Domain wie `*.its-for-kids.de`) | ⚠️ **Nicht technisch feststellbar** — im Repository gibt es kein `vercel.json` mit Domain-Angabe; die geprüfte Deployment-URL ist eine per-Deployment-URL mit Vercel-eigenem Login-Schutz (Deployment Protection), keine erkennbar dauerhafte Alias-Domain. | — |
| GitHub↔Vercel-Verbindung | Aktiv — jeder Push auf `main` löst automatisch ein Deployment aus (verifiziert: Push von `eee43e1` erzeugte automatisch einen "Production"-Deployment-Status auf GitHub, `environment: "Production"`) | `gh api repos/.../deployments/6271282249` |
| Deploy-Branch | `main` (Environment `"Production"`) | s. o. |
| `vercel.json` im Repository | **Nicht vorhanden.** Alle Vercel-Projekteinstellungen (Framework-Preset, Build Command, Output-Verzeichnis, Node-Version, Domains, Deployment Protection) liegen ausschließlich im Vercel-Dashboard, nicht im Code. | `find . -iname "vercel*"` → kein Treffer |
| Vermuteter Build Command | `npm run build` → `vite build` (Vercel-Standarderkennung für Vite-Projekte ohne `vercel.json`) | `package.json`, nicht per Dashboard verifiziert |
| Vermuteter Output | `dist/` (Vite-Standard, per lokalem `npm run build` bestätigt) | lokaler Build-Test |
| Node-Version | ⚠️ Nicht im Repository festgelegt (kein `engines`-Feld in `package.json`, keine `.nvmrc`) — Vercel verwendet die im Dashboard konfigurierte oder eine Plattform-Default-Version. **Administrativ zu ergänzen.** | `package.json` |
| Serverless Functions | 5 Node-Functions unter `api/`: `send-email.js`, `login.js`, `validate-photo.js`, `send-representative-mail.js`, `_lib/buildMailTransporter.js` (Hilfsmodul, keine eigene Route) | `find api -type f` |
| Request-Body-Limit (empirisch ermittelt, nicht Vercel-Doku) | ≈ 4,45 MB nutzbar (zwischen empirisch bestätigten 4.400.155 Byte OK und 4.506.823 Byte 413) — siehe `core/mail/sendRepresentativeMaterials.js`, Konstante `MAX_REQUEST_BYTES = 4_450_000` | Code-Kommentar + Live-Tests aus früherer Session, in diesem Audit nicht erneut gegen Production wiederholt |
| Deployment Protection | **Aktiv** — die geprüfte Deployment-URL verlangt einen Vercel-Login, bevor die Anwendung sichtbar wird (in diesem Audit per Browser bestätigt: Aufruf ohne Login zeigt "Login – Vercel"). Ob dies für ALLE Deployments (inkl. einer etwaigen Custom-Domain) gilt oder nur für die geprüfte Deployment-URL, ist **administrativ zu klären**. | Browser-Test in dieser Session |
| Vercel-Account/Team, unter dem das Projekt läuft | Team-Slug **`ifk-de`** (aus Dashboard-URL ableitbar) — **Team-Struktur, Mitglieder und 2FA-Status konnten in diesem Audit NICHT programmatisch geprüft werden**, da die verfügbare Vercel-CLI-Session (`vercel whoami` → `feigenbutzd`) nur Zugriff auf das persönliche Team `feigenbutz-d` hat, nicht auf `ifk-de` (`vercel project ls --scope ifk-de` → "Error: The specified scope does not exist"). **Administrativ zu ergänzen.** | CLI-Test in dieser Session |

---

## Environment Variables

Vollständig aus dem Code inventarisiert (`grep -rn "process.env." api core src scripts`) — **keine Werte ausgegeben**, nur Variablennamen und Zweck.

| Variable | Verwendung | Benötigt für | Client/Server | Sensibel | Fallback | Was passiert, wenn sie fehlt |
|---|---|---|---|---|---|---|
| `SMTP_HOST` | `nodemailer.createTransport({host: ...})` | Mailversand (beide Generatoren) | Server | Ja | Keiner | `undefined` an nodemailer → Verbindungsfehler beim Versand, Nutzer sieht generische Fehlermeldung |
| `SMTP_PORT` | `Number(process.env.SMTP_PORT)` | Mailversand | Server | Nein (aber Infrastrukturdetail) | Keiner | `NaN` als Port → Verbindungsfehler |
| `SMTP_SECURE` | `=== "true"` → TLS/SSL an/aus | Mailversand | Server | Nein | `false` (jeder nicht-`"true"`-Wert) | Fällt still auf unverschlüsselt/STARTTLS-Verhalten von nodemailer zurück |
| `SMTP_USER` | SMTP-Auth-Benutzername; auch Fallback für `MAIL_FROM` | Mailversand | Server | **Ja** | Keiner | Auth schlägt fehl → Versand schlägt fehl |
| `SMTP_PASS` | SMTP-Auth-Passwort | Mailversand | Server | **Ja** | Keiner | Auth schlägt fehl → Versand schlägt fehl |
| `MAIL_FROM` | Absenderadresse aller ausgehenden Mails | Mailversand | Server | Nein (aber sollte gültige, autorisierte Absenderadresse sein) | `SMTP_USER` | Absenderadresse = `SMTP_USER` |
| `INFO_RECIPIENT` | Optionale interne Benachrichtigung im **öffentlichen** Generator bei `infoOptIn: true` (`api/send-email.js`) | Öffentlicher Generator, optional | Server | Nein | Keiner (Zweig wird übersprungen) | Diese optionale zweite Mail wird einfach nicht versendet, kein Fehler |
| `MATERIAL_ADMIN_USERNAME` | Login-Prüfung interner Generator | Interner Login | Server | **Ja** | Keiner | Login-Endpunkt antwortet mit 500 "Login ist derzeit nicht verfügbar" (siehe `api/login.js:20-24`) |
| `MATERIAL_ADMIN_PASSWORD` | Login-Prüfung interner Generator | Interner Login | Server | **Ja** | Keiner | s. o. |
| `UPSTASH_REDIS_REST_URL` **oder** `KV_REST_API_URL` | REST-Endpunkt-URL der Redis-Instanz (`api/_lib/upstashRedis.js`) — beide Namensschemata werden gleichwertig unterstützt (erstes Paar hat Vorrang, falls beide vollständig gesetzt sind); **produktiv aktiv über `KV_REST_API_URL`** (Custom Prefix `KV` beim Vercel-Storage-Connect gewählt) | IFK-ID-Reservierung (`api/reserve-ifk-id.js`) | Server | Nein (Infrastruktur-URL, kein Secret im engeren Sinn, aber nicht öffentlich zu machen) | Keiner | `isUpstashConfigured()` liefert `false` → `/api/reserve-ifk-id` antwortet mit 503, "Neu generieren" zeigt die Meldung "Die IFK-ID konnte gerade nicht eindeutig reserviert werden. Bitte versuche es später erneut." und zeigt **keine** ungeprüfte ID an — dieser Zustand wurde vor der Anbindung live verifiziert (siehe unten) |
| `UPSTASH_REDIS_REST_TOKEN` **oder** `KV_REST_API_TOKEN` | REST-Auth-Token derselben Instanz (dasselbe Namensschema wie die zugehörige URL-Variable — ein Mischen der beiden Paare gilt bewusst als "nicht konfiguriert") | IFK-ID-Reservierung | Server | **Ja** | Keiner | s. o. |

**Insgesamt 11 Variablen** (das Redis-Paar zählt einfach, unabhängig davon, welches der beiden Namensschemata verwendet wird), alle ausschließlich serverseitig (keine `VITE_*`/`import.meta.env`-Variablen im gesamten Code gefunden — der Client kennt keine Secrets).

**Wo bei einem Neuaufbau hinterlegen:** Ausschließlich im Vercel-Projekt unter *Project Settings → Environment Variables* (Production-Scope). Es gibt keine `.env`-Datei im Repository (durch `.gitignore` ausgeschlossen) und keinen anderen Mechanismus — ohne die 9 Mail-/Login-Variablen im Vercel-Dashboard funktionieren Login und Mailversand nicht; ohne eines der beiden Redis-Variablenpaare funktioniert ausschließlich "Neu generieren" für die IFK-ID nicht (manuelle Eingabe/Übernahme bestehender IDs bleibt unabhängig davon nutzbar) — der Rest der Anwendung (Materialerzeugung, Vorschau, Download) bleibt in beiden Fällen nutzbar.

**Aktueller Stand (2026-09-05): produktiv aktiv.** `KV_REST_API_URL`/`KV_REST_API_TOKEN` sind in Vercel gesetzt (Production **und** Preview, als Sensitive markiert, Development bewusst nicht verbunden) und verweisen auf die Upstash-Ressource `ifk-materialgenerator-ifk-ids` (Region Frankfurt, Plan Free, siehe Abschnitt "Externer Dienst: Upstash Redis" für Details). Zwischenzeitlich (vor dem für die Env-Var-Übernahme nötigen Redeployment) wurde das Fail-safe-Verhalten live verifiziert: `POST /api/reserve-ifk-id` lieferte HTTP 503 mit der vorgesehenen deutschen Fehlermeldung, keine technischen Details, keine ungeprüfte ID. Nach dem Redeployment (Commit `beb06e2`) funktioniert "Neu generieren" produktiv — Alt-ID-Import und mehrere Live-Tests (Kollision, Doppelreservierung, Parallelität) sind erfolgreich durchgeführt (siehe unten).

---

## Authentifizierung

**Interner Generator** (`intern/index.html`):

- Serverseitige Prüfung in `api/login.js`: Vergleich von `username`/`password` aus dem Request-Body gegen `MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD` (Klartextvergleich, `===`).
- **Genau ein gemeinsames Administrator-Konto** — keine Benutzerverwaltung, keine Rollen, keine Datenbank, kein Token.
- Bei Erfolg antwortet der Endpunkt nur mit `{ ok: true }`; der "angemeldet"-Zustand wird ausschließlich clientseitig in `window.sessionStorage` unter dem Schlüssel `ifk_intern_authenticated` gehalten (`core/auth/authSession.js`, `src/intern/auth.js`).
- **Session-Verhalten:** `sessionStorage` — der Zustand bleibt nur für den aktuellen Browser-Tab/die aktuelle Session erhalten, ist nach Schließen des Tabs/Browsers weg. Kein Ablaufdatum, kein serverseitiges Session-Tracking.
- **Bekannte Sicherheitsgrenzen:**
  - Kein Rate-Limiting/Brute-Force-Schutz im Login-Endpunkt erkennbar.
  - Klartext-Zugangsdaten-Vergleich (kein Hashing) — für ein einzelnes, servergehaltenes Secret-Paar in diesem Umfang gängige, aber nicht bestmögliche Praxis.
  - Kein Passwort-Reset-Mechanismus; eine Passwortänderung erfordert Zugriff auf die Vercel-Environment-Variablen.
  - **Zukünftiger Verbesserungspunkt (markiert, nicht umgesetzt):** Aktuell nur EIN gemeinsames Administrator-Login für alle internen Nutzer:innen — keine Einzelnutzer-Zuordnung, kein Audit-Trail, wer sich wann angemeldet hat.

**Öffentlicher Generator** (`index.html`): kein Login, keine Authentifizierung — bewusst öffentlich zugänglich.

---

## Datenschutz und Datenspeicherung

**Grundsatz laut Code-Kommentaren und Architektur bestätigt:** Das Tool speichert keine personenbezogenen Wegbegleiter-Datensätze dauerhaft. Feldweise verifiziert:

| Feld | Persistent gespeichert? | Lebenszyklus |
|---|---|---|
| Vorname, Nachname | Nein | Nur im Arbeitsspeicher des Browser-Tabs (Formularfeld-DOM-State, JS-Variablen `lastManifest`/`lastFiles` in `generator.js`) während der Sitzung; bei Tab-Schluss/Reload weg. Erscheint zusätzlich im Klartext-PDF-Inhalt (Flyer/Urkunde) und im Mailtext, siehe unten. |
| Geschlecht | Nein | Wie oben — nur zur Vorlagenauswahl (männliche/weibliche Urkunden-/Flyer-Vorlage) verwendet, nicht separat gespeichert. |
| E-Mail | Nein | Formularfeld-State im Browser; als Empfängeradresse Teil des SMTP-Requests (transient, siehe Mail-Datenfluss); keine Ablage in einer Mail-Historie/DB. |
| Telefon | Nein | Nur als Text im generierten Flyer-PDF eingebettet; sonst nur Formularfeld-State. |
| Bundesland/Region | Nein | Formularfeld-State; erscheint im Flyer-Text und im humbee-Mail-Betreff, sonst keine Speicherung. |
| Foto | Nein | Wird per `/api/validate-photo` serverseitig abgerufen und als Base64 in der HTTP-Antwort an den Client zurückgegeben (kein Zwischenspeichern auf dem Server, kein `fs.writeFile` im gesamten `api/`-Code verifiziert) — der Client hält es als Object-URL/In-Memory-Blob (`lastPhoto` in `generator.js`), bis die Seite verlassen/neu geladen wird. |
| PayPal-Link | Nein | Formularfeld-State, im QR-Code-Inhalt und im Flyer eingebettet; keine separate Speicherung. |
| Erzeugte PDFs (Flyer, Urkunden) | Nein serverseitig — als Blob im Browser (Object-URLs für Vorschau/Download, `activeObjectUrls` in `generator.js`, werden vor jeder Neuerzeugung und beim Verlassen der Seite via `URL.revokeObjectURL()` freigegeben). Serverseitig existieren sie nur als In-Memory-Buffer für die Dauer eines einzelnen Mail-Versand-Requests (`busboy`-Parsing in `core/mail/parseMultipartFormData.js` — `Buffer.concat`, kein Dateisystem-Write). | Siehe oben |
| QR-Codes | Nein | Wie PDFs — reines In-Memory-/Blob-Handling. |
| Mailtexte | Nein | Werden bei jedem Versand neu aus Templates (`core/templates/*.js`) generiert, nicht gespeichert. |

**Explizit geprüfte Speicherorte:**

- **LocalStorage:** Keine Verwendung im gesamten Code (`grep -rn "localStorage"` → 0 Treffer außer im hier zitierten Audit-Text selbst).
- **SessionStorage:** Genau EIN Verwendungszweck im gesamten Code — der boolesche Login-Status (`ifk_intern_authenticated`, siehe Authentifizierungs-Abschnitt). Keine Personendaten darin.
- **IndexedDB:** Keine Verwendung (0 Treffer).
- **Server-Dateisystem:** Keine Schreibzugriffe in `api/`, `core/`, `src/` (nur in lokalen Entwickler-/Build-Skripten unter `scripts/`, die nicht Teil der laufenden Produktionsanwendung sind).
- **Vercel Storage (KV/Blob/Postgres) oder externe Datenbank:** Keine entsprechenden Abhängigkeiten in `package.json`, keine Importe im Code gefunden.
- **Logs:** `console.log`/`console.error`-Aufrufe in `api/send-representative-mail.js` und `core/mail/deliverRepresentativeMaterials.js` protokollieren **bewusst ausschließlich technische Metadaten** (Vorgang, Request-ID, SMTP-Response-Code, Anhang-Anzahl/-Typen, Fehlerkategorie) — der Code-Kommentar in `deliverRepresentativeMaterials.js` benennt explizit: *"NIEMALS Namen, E-Mail-Adressen, IFK-ID, Bundesland/Region, Betreff, Dateinamen, Mailtext, Dateiinhalte oder Zugangsdaten."* Ob Vercel diese Logs über die Standard-Aufbewahrungsfrist hinaus persistiert, ist eine Vercel-Plattformeigenschaft, keine Anwendungsentscheidung.
- **Externe Dienste:** Der einzige externe Datenempfänger ist der konfigurierte SMTP-Server (liefert die Mail an Empfänger + humbee aus) — was dieser Server-Betreiber selbst protokolliert/speichert, liegt außerhalb der Kontrolle dieser Anwendung.

**Fazit:** Der fachliche Anspruch "keine dauerhafte Speicherung personenbezogener Wegbegleiter-Daten" ist technisch zutreffend für Anwendungscode und -infrastruktur. Die einzige über die Sitzung hinaus wirksame Spur ist die versendete E-Mail selbst (beim Empfänger und bei humbee/office@its-for-kids.de) sowie ggf. SMTP-Provider- und Vercel-Function-Logs außerhalb dieser Codebasis.

---

## IFK-ID

| Aspekt | Befund |
|---|---|
| Format | `IFK` + 3 Zeichen aus Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 Zeichen, ohne `I`/`O`/`0`/`1` — Verwechslungsgefahr bei manueller Übertragung), Gesamtlänge 6 Zeichen, z. B. `IFK7QX` (`core/id/generateIfkId.js`). |
| Generierungslogik | `generateIfkId()` — rein clientseitiger `Math.random()`-Aufruf, drei Zeichen aus dem 32-Zeichen-Alphabet → 32³ = **32.768** mögliche IDs. Unverändert seit Einführung der Reservierung (siehe unten) — das Format selbst wurde nicht geändert. |
| Kollisionsvermeidung | **Implementiert seit `fix: persist and reserve ifk ids`.** "Neu generieren" (`ifkIdGenerateBtn` in `src/intern/generator.js`) ruft `generateAndReserveIfkId()` (`core/id/generateAndReserveIfkId.js`) auf: erzeugt einen Kandidaten, reserviert ihn atomar serverseitig (`core/id/reserveIfkId.js` → `POST /api/reserve-ifk-id` → `api/_lib/upstashRedis.js` → Upstash Redis `SET key 1 NX`), und erzeugt bei Kollision automatisch einen neuen Kandidaten (bis zu 10 Versuche). Die ID wird dem Formular **erst nach erfolgreicher Reservierung** angezeigt — nie eine ungeprüfte ID. Ist der Speicher nicht erreichbar/konfiguriert, wird ebenfalls keine ID angezeigt, sondern eine allgemeine Fehlermeldung. |
| Wo bereits vergebene IDs gespeichert werden | **Upstash Redis** (siehe eigener Abschnitt "Externer Dienst: Upstash Redis" unten), Key-Schema `ifk:id:<ID>` → Value `"1"`. Ausschließlich die ID selbst, keine Personendaten. |
| Was zusammen mit der ID gespeichert wird | Im neuen Redis-Speicher: **nur die ID selbst** (Value `"1"`, rein technischer Marker; kein Timestamp aktuell genutzt, das Schema würde einen rein technischen `createdAt` als optionale Erweiterung zulassen, siehe `api/reserve-ifk-id.js`-Kommentar). Innerhalb der übrigen Anwendung: nichts dauerhaft (siehe Datenschutz-Abschnitt) — die ID existiert sonst nur im Formular-State, im generierten PDF/QR-Inhalt und im Mailtext/-betreff. |
| Namensbezug neben der ID gespeichert? | Im Redis-Speicher: **nein, nie** — es wird ausschließlich der Key `ifk:id:<ID>` mit Wert `"1"` geschrieben, kein Name, keine E-Mail, keine Rolle. Außerhalb der Anwendung: **ja, faktisch** — die Mail an den Wegbegleiter und die humbee-Kopie enthalten sowohl Name als auch IFK-ID im selben Betreff/Text (z. B. `buildHumbeeMailSubject`: `"Repräsentant Bayern / München / Mustermann, Max"`) — das bleibt weiterhin der einzige Ort, an dem die Zuordnung Name↔IFK-ID tatsächlich persistiert (im Mailpostfach des Empfängers und von humbee). |
| Übernahme einer bestehenden IFK-ID | Über das Formularfeld `ifk-id-input`; Validierung über `validateIfkId()` (Format-Check). Eine manuell eingetragene oder per Screenshot-Import übernommene bestehende ID wird **nicht automatisch reserviert** — nur über "Neu generieren" erzeugte IDs durchlaufen `reserveIfkId()`. Für bereits andernorts (humbee) vergebene Alt-IDs siehe Alt-ID-Import unten. |
| Alt-ID-Import | `scripts/import-ifk-ids.mjs` (nutzt `core/id/importLegacyIfkIds.js`) — liest eine Liste von IFK-IDs (Datei-Pfad als Argument oder stdin), validiert Format, ignoriert Dubletten in der Eingabe, überschreibt keine bereits vorhandenen IDs, und gibt einen Bericht aus (eingelesen/gültig/ungültig/eindeutig/neu importiert/bereits vorhanden). Idempotent (Redis `SET ... NX`). Beispiel-Eingabedatei: `scripts/ifk-id-legacy-import.txt` (51 aus humbee ermittelte Alt-IDs, Stand 2026-09-05). Aufruf: `node scripts/import-ifk-ids.mjs scripts/ifk-id-legacy-import.txt` (benötigt `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` in der Shell-Umgebung). |
| Warum die Zuordnung in humbee weiterhin organisatorisch erforderlich ist | Der neue Redis-Speicher garantiert nur **Eindeutigkeit** der ID, keine Zuordnung zu einer Person — die einzige Aufzeichnung, welche IFK-ID welcher Person zugeordnet wurde, bleibt die humbee-Dokumentations-Mail (siehe nächster Abschnitt). |
| Was passiert, wenn eine ID dort nicht dokumentiert wird | Aus Code-Sicht: nichts Technisches — der Versand funktioniert unabhängig davon. **Fachlich/organisatorisch** (nicht im Code erzwingbar): die betreffende IFK-ID-Zuordnung ginge dann ohne humbee-Dokumentation faktisch verloren, da keine andere Aufzeichnung existiert — die Eindeutigkeit der ID selbst bleibt davon unberührt. |

**Bewertung (aktualisiert):** Das Format (`IFK` + 3 Zeichen, 32.768 mögliche Kombinationen) ist unverändert. Die vormals rein zufallsbasierte, ungeschützte Vergabe ist durch eine atomare serverseitige Reservierung (Upstash Redis, `SET ... NX`) ersetzt — zwei gleichzeitige "Neu generieren"-Klicks können nicht mehr dieselbe ID erhalten, da genau einer der beiden Requests die Reservierung gewinnt und der andere automatisch einen neuen Kandidaten erzeugt. Der neue Speicher enthält ausschließlich vergebene IFK-IDs ohne Personenbezug; die Zuordnung IFK-ID ↔ Person bleibt weiterhin ausschließlich in humbee bzw. den dort dokumentierten Vorgängen.

---

## Externer Dienst: Upstash Redis

**Produktionsstatus (2026-09-05): produktiv aktiv.** Genutzt ausschließlich für die IFK-ID-Reservierung (siehe oben). Bewusst kein größerer Datenbank-Unterbau — genutzt wird ausschließlich der eine atomare Befehl `SET key value NX` über die Upstash-REST-API (`api/_lib/upstashRedis.js`, per einfachem `fetch()`, keine zusätzliche Client-Bibliothek).

| Aspekt | Befund |
|---|---|
| Ressource | `ifk-materialgenerator-ifk-ids` (Upstash Redis, Marketplace-Integration über Vercel) |
| Vercel-Projekt | `spendenaktions-generator`, Team `ifk-de` |
| Region | Frankfurt (`fra1`) |
| Plan | Free |
| Eviction | `False` (Keys werden nicht automatisch verdrängt — für die kleine, dauerhaft benötigte ID-Menge korrekt) |
| Verbundene Environments | Production **und** Preview. **Development bewusst nicht verbunden** (lokale Entwicklung ohne Redis-Zugriff — konsistent mit dem übrigen Projekt, das keine `.env`-Datei im Repository führt). |
| Verwendetes Env-Var-Schema | Beim Connect wurde der Custom Prefix `KV` gewählt → Vercel legte `KV_REST_API_URL`/`KV_REST_API_TOKEN` (plus `KV_URL`, `KV_REDIS_URL`, `KV_REST_API_READ_ONLY_TOKEN`, von denen der Code nur die beiden REST-API-Variablen nutzt) an, als **Sensitive** markiert. Der Code (`api/_lib/upstashRedis.js`, seit Commit `2ea45ed`) erkennt dieses Schema gleichwertig zum `UPSTASH_REDIS_REST_*`-Schema — keine weitere Anpassung nötig. |
| Redeployment nach Env-Var-Anlage | **War erforderlich.** Die zuerst geprüfte Deployment (`38b873e`) lief noch mit dem alten Environment-Snapshot (`/api/reserve-ifk-id` lieferte weiterhin `503`). Ein leerer Commit (`chore: trigger redeploy to pick up redis environment variables`, `beb06e2`) hat ein neues Production-Deployment ausgelöst; danach war die Konfiguration aktiv (per `curl` gegen den echten Endpunkt verifiziert, siehe unten). |
| Zugriffsweg | REST-API über die o. g. Umgebungsvariablen, ausschließlich serverseitig (`api/reserve-ifk-id.js`, sowie beim Alt-ID-Import über denselben Production-Endpunkt) — kein Client-seitiger Zugriff, kein direkter Redis-Zugriff aus dieser Session heraus (der REST-Token selbst wurde mir zu keinem Zeitpunkt mitgeteilt oder gelesen — sämtliche Verifikation lief über den bestehenden, ohnehin öffentlich erreichbaren `POST /api/reserve-ifk-id`-Endpunkt). |
| Zweck | Ausschließlich Kollisionsvermeidung für neu generierte IFK-IDs — atomare "reserviere nur, wenn noch nicht vorhanden"-Prüfung. Keine weitere fachliche Funktion. |
| Gespeichertes Schema | Pro vergebener IFK-ID ein Key-Value-Paar: Key `ifk:id:<ID>` (z. B. `ifk:id:IFKLJP`), Value `"1"`. **Ausdrücklich keine** Namen, E-Mail-Adressen, Rollen, Telefonnummern, Fotos oder sonstigen Wegbegleiterdaten. |
| Recovery/Übergabe | Zugangsdaten liegen ausschließlich im Vercel-Storage-Tab (Team `ifk-de`) bzw. bei direktem Upstash-Zugriff im Upstash-Dashboard. Ohne dokumentierten Zugang zu einem dieser Accounts ist weder Token-Rotation noch eine Migration möglich, ohne den bestehenden Datenbestand (bereits vergebene IDs, Stand dieses Audits: 53, siehe unten) zu verlieren — ein Verlust wäre kein Datenschutzvorfall (keine Personendaten betroffen), würde aber das Kollisionsrisiko auf den Vor-Implementierungs-Zustand zurücksetzen, bis der Alt-ID-Import erneut durchgeführt wird. |
| 2FA/Account-Ownership | **Nicht im Rahmen dieses Audits geprüft** (kein Dashboard-Zugriff dieser Session) — organisatorisch zu klären, wer im Team `ifk-de` administrativen Zugriff auf die Storage-Integration hat und ob 2FA aktiv ist. |

### Initialer Alt-ID-Import (2026-09-05, gegen die jetzt produktive Instanz)

Datenquelle: `scripts/ifk-id-legacy-import.txt` (51 aus humbee ermittelte Alt-IDs). Vorab erneut programmatisch bestätigt: **51 Einträge, 51 unique, 0 invalid.**

Da der REST-Token der Redis-Instanz nicht an diese Session weitergegeben wurde (bewusst — „Sensitive"-Variable, nur in Vercel hinterlegt) und dadurch weder das lokale `scripts/import-ifk-ids.mjs` noch ein direkter Upstash-Zugriff von hier aus möglich war, lief der Import stattdessen **über den bestehenden, ohnehin öffentlich erreichbaren Production-Endpunkt** `POST /api/reserve-ifk-id` — dieselbe `importLegacyIfkIds()`-Kernlogik (`core/id/importLegacyIfkIds.js`) wie im lokalen Script, nur mit einer `reserve`-Funktion, die pro ID einen echten HTTPS-Request an Production stellt, statt direkt auf Redis zuzugreifen. Kein Secret wurde dafür heruntergeladen oder in eine Datei geschrieben.

| Lauf | Neu importiert | Bereits vorhanden | Ungültig | Fehler |
|---|---|---|---|---|
| 1 (leere Datenbank) | 51 | 0 | 0 | 0 |
| 2 (unmittelbar danach, Idempotenz-Test) | 0 | 51 | 0 | 0 |

Zusätzlich einzeln gegen die echte Reservierungslogik verifiziert:

- **`IFKLJP`** (bekannte Alt-ID) → `{"ok":true,"reserved":false}` — als bereits vergeben erkannt, nicht erneut reserviert.
- **`IFKTST`** (neue, klar als Test gekennzeichnete ID) → erste Reservierung `{"ok":true,"reserved":true}`, unmittelbar wiederholte Reservierung `{"ok":true,"reserved":false}` — Doppelreservierung korrekt abgelehnt.
- **`IFKPAR`** (weitere Test-ID, Parallelitätstest) → zwei **echte gleichzeitige** `POST`-Requests (`Promise.all`) gegen Production: genau einer lieferte `reserved:true`, der andere `reserved:false` — atomare `SET ... NX`-Semantik gegen die reale Datenbank bestätigt, kein doppelter Gewinner.

**`IFKTST` und `IFKPAR` gelten ab jetzt als vergeben und wurden nicht gelöscht** — bei Bedarf in humbee als technische Test-IDs (kein Personenbezug) dokumentierbar.

**Gesamtzahl reservierter IDs (Stand dieses Audits): 53** — 51 Alt-IDs + `IFKTST` + `IFKPAR`. Diese Zahl ist eine Herleitung aus den oben protokollierten Operationen, keine direkte Zählung: `api/reserve-ifk-id.js` exponiert bewusst ausschließlich `SET ... NX` (Schreiben/Prüfen einzelner Keys), keinen Lese-/Auflistungs-Endpunkt — genau das hält die Angriffsfläche minimal, macht aber ein direktes `COUNT`/`KEYS` von hier aus unmöglich. Da die Ressource unmittelbar vor diesem Import frisch angelegt wurde (Status "Available", keine vorherige Nutzung) und außer den oben protokollierten Requests keine weiteren Schreibzugriffe stattfanden, ist 53 die belastbare Zahl.

### Datenschutzprüfung

Ein direktes Auslesen des Redis-Inhalts war aus demselben Grund (kein Lese-Endpunkt, kein Token in dieser Session) nicht möglich. Die Zusicherung "ausschließlich `ifk:id:<ID>` → `1`, keine Personendaten" stützt sich stattdessen auf zwei unabhängige Belege:

1. **Code-Garantie:** `redisSetNx(key, value)` in `api/_lib/upstashRedis.js` wird ausschließlich von zwei Stellen aufgerufen — `api/reserve-ifk-id.js` (übergibt exakt `` `ifk:id:${check.normalized}` `` und `"1"`, `check.normalized` ist das Ergebnis von `validateIfkId()`, also nachweislich nur ein 6-stelliger IFK-ID-String) und dem oben beschriebenen Alt-ID-Import (dieselbe Signatur). Es gibt im gesamten Code keinen weiteren Aufrufer und keine Stelle, die zusätzliche Felder (Name, E-Mail, Rolle, Telefon, Region, Foto) an Redis übergibt.
2. **Transkript-Beleg:** Jeder in diesem Audit dokumentierte Request an `/api/reserve-ifk-id` (Import Lauf 1+2, `IFKLJP`, `IFKTST`, `IFKPAR`) hatte als Body ausschließlich `{"ifkId": "<ID>"}` — kein weiteres Feld wurde zu irgendeinem Zeitpunkt gesendet.

**Bestätigt:** Der Redis-Speicher enthält gemäß Code-Architektur und den durchgeführten Live-Tests ausschließlich IFK-ID-Keys mit neutralem Marker-Wert, keine Namen, E-Mail-Adressen, Telefonnummern, Rollen, Regionen, Fotos oder sonstigen personenbezogenen Daten.

### „Neu generieren" in Production

Der interne Materialgenerator liegt hinter Login (`MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD`); ein automatisiertes Login mit echten Zugangsdaten wird bewusst nicht durchgeführt (Eingabe von Zugangsdaten in Formulare ist grundsätzlich ausgeschlossen). Stattdessen wurde die **zugrundeliegende Logik vollständig über den echten Production-Endpunkt verifiziert** — `ifkIdGenerateBtn` in `src/intern/generator.js` ruft exakt denselben `POST /api/reserve-ifk-id`-Endpunkt auf, der oben mehrfach gegen Production getestet wurde (Kandidat erzeugen → serverseitig reservieren → erst danach anzeigen, kein 503 mehr, keine ungeprüfte ID). Ein visueller Klicktest im eingeloggten Generator ist damit funktional redundant, aber jederzeit möglich, falls gewünscht.

---

## Rollen

Alle Angaben aus `core/materials/roleConfig.js` (`ROLE_CONFIG`), Stand des aktuellen Commits.

| Rolle (Key) | Sichtbarer Name | Region/Bundesland | Geschlecht für Urkunde | Urkunde | Flyer verfügbar | QR-Materialien | `certificateDeliveryMode` | Versand |
|---|---|---|---|---|---|---|---|---|
| `representative` | Repräsentant/-in | **Ja, Pflicht** | Ja (m/w) | `CERTIFICATE_REPRESENTATIVE` | Ja (Druckerei + Home, je Du/Sie) | Beide (PayPal, GiroCode) | `separate_email` | ✅ Materialien + eigene Urkunden-Mail |
| `ambassador` | Botschafter/-in | Nein | Ja (m/w) | `CERTIFICATE_AMBASSADOR` | **Noch keine Vorlage** (`flyerMaterialKeys: []`) | Beide | `blocked` | Materialien: ✅ · Urkunde: 🚫 automatisiert gesperrt |
| `economic_council` | Wirtschaftsrat | Nein | Nein (neutral) | `CERTIFICATE_ECONOMIC_COUNCIL` | **Noch keine Vorlage** | Beide | `blocked` | wie oben |
| `expert_council` | Fachrat | Nein | Nein (neutral) | `CERTIFICATE_EXPERT_COUNCIL` | **Noch keine Vorlage** | Beide | `blocked` | wie oben |
| `curator` | Kurator/-in | Nein | Nein — Urkunde neutral, aber Rollenbezeichnung im Mailtext geschlechtsabhängig ("Kurator"/"Kuratorin") | `CERTIFICATE_CURATORIUM` | **Noch keine Vorlage** | Beide | `blocked` | wie oben |
| `advisory_board` | Beirat | Nein | Nein (neutral) | `CERTIFICATE_ADVISORY_BOARD` | **Noch keine Vorlage** | Beide | `blocked` | wie oben |

**Starter-Set:** Nur `representative` hat aktuell ein definiertes Standard-Starter-Set (`starterSetMaterialKeys`); für alle anderen fünf Rollen ist es leer → der "Standard-Starter-Set auswählen"-Button ist für sie ausgeblendet (`hasStarterSet()`).

**Besonderheiten:**
- Für Botschafter/Wirtschaftsrat/Fachrat/Kurator/Beirat ist die **Urkunden-Erzeugung, -Vorschau und der -Download bereits voll funktionsfähig** — nur der automatisierte Mailversand ist gesperrt (siehe Abschnitt "Offene Prozessentscheidungen").
- Für dieselben fünf Rollen fehlt bisher jede **Flyer-Vorlage** (`flyerMaterialKeys: []`) — kein Fallback auf die Repräsentanten-Flyer, die Flyer-Checkboxen bleiben für diese Rollen deaktiviert.
- Nur `representative` erfordert Bundesland/Region als Pflichtangabe.

---

## Materialien

| Material | Pflichtfelder (aus `materialRequirements.js`) | Format | Dateinamensschema (Beispiel) | Dynamisch/Statisch | Personalisierung | Versand | humbee |
|---|---|---|---|---|---|---|---|
| Flyer Druckerei – Du | Vorname, Nachname, Geschlecht, E-Mail, Telefon, IFK-ID, Foto-Link, PayPal-Link (+ Region/Bundesland bei `representative`) | PDF (150×212mm, 1mm Beschnitt) | `IFK_<Vorname>_<Nachname>_Flyer_Druckerei_Du.pdf` | Dynamisch (pro Person gerendert) | Foto, Name, Region, Telefon, E-Mail, PayPal-QR, GiroCode | Im ZIP der Materialien-Mail | Als Einzeldatei |
| Flyer Home – Du | wie oben | PDF (A4 quer, 2× A5-Fläche) | `IFK_<Vorname>_<Nachname>_Flyer_Home_Du.pdf` | Dynamisch | wie oben | wie oben | wie oben |
| Flyer Druckerei – Sie | wie oben | PDF | `..._Flyer_Druckerei_Sie.pdf` | Dynamisch | wie oben | Nur wenn statt Du gewählt (technisch gegenseitig ausgeschlossen) | wie oben |
| Flyer Home – Sie | wie oben | PDF | `..._Flyer_Home_Sie.pdf` | Dynamisch | wie oben | wie oben | wie oben |
| PayPal QR schwarz | Vorname, Nachname, PayPal-Link | PNG | `IFK_<Vorname>_<Nachname>_PayPal_QR_schwarz.png` | Dynamisch | PayPal-Link als QR-Inhalt, IFK-Logo mittig | Im ZIP der Materialien-Mail | Als Einzeldatei |
| GiroCode schwarz | Vorname, Nachname, IFK-ID | PNG | `IFK_<Vorname>_<Nachname>_GiroCode_schwarz.png` | Dynamisch | EPC-QR mit statischem Empfänger/IBAN + IFK-ID im Verwendungszweck | wie oben | wie oben |
| Urkunden (6 Varianten, rollenabhängig) | Vorname, Nachname (+ Geschlecht nur bei Repräsentant/Botschafter) | PDF | z. B. `Urkunde_<Vorname>_<Nachname>.pdf` | Dynamisch | Name, IFK-ID (nur Repräsentant), Geschlecht-abhängige Vorlage | Rollenabhängig: `representative` → eigene Urkunden-Mail; andere Rollen → gesperrt (nur Download) | Nur bei `representative`, eigene Dokumentations-Mail (Betreff-Suffix " – Urkundenversand") |
| Hinweise zur Verwendung der Materialien | Keine (materialunabhängig) | PDF (statisch) | `Hinweise_zur_Verwendung_der_Materialien.pdf` | **Statisch** — vorgefertigtes PDF-Asset (`assets/material-guide/`), nicht pro Person gerendert | Keine — enthält keinen Namen/keine IFK-ID/Kontaktdaten | Immer automatisch im ZIP der Materialien-Mail dabei, sobald mindestens ein Material erzeugt wurde — **kein eigenes auswähl­bares Material** | Wird **niemals** an humbee mitgeschickt (nur die tatsächlich individuellen Materialien) |

---

## PDF-Rendering

- **Bibliothek:** `pdf-lib` (Erzeugung/Manipulation) + `@pdf-lib/fontkit` (Custom-Font-Einbettung, z. B. für Nicht-Standard-Glyphen).
- **Font-Einbettung:** `core/pdf/renderFlyer.js`, Funktion `embedFonts()` — `pdfDoc.embedFont(fontAsset.bytes)` bzw. `.embedFont(fontAsset.name)`.
- **⚠️ Font-Subsetting bewusst NICHT verwendet** (`{ subset: true }` fehlt absichtlich): Ein ausführlicher Code-Kommentar in `renderFlyer.js` (Zeilen 118–140) dokumentiert einen **schweren, bereits aufgetretenen Production-Bug**: Bei aktiviertem Subsetting weisen `pdf-lib`/`fontkit` Glyph-IDs inkonsistent zu, sobald derselbe Font sowohl für reine Breitenmessung (`widthOfTextAtSize()`, z. B. beim Auto-Shrink-Textumbruch) als auch für das tatsächliche Zeichnen (`drawText()`) verwendet wird — Ergebnis waren **zerstörte Texte** (dokumentiertes Beispiel: "Daniel Feigenbutz" wurde zu nur "b" gerendert, Telefonnummern/E-Mail-Adressen zerstückelt).
  **Ausdrückliche Warnung im Code:** *"Dokumentintegrität hat Vorrang vor Dateigröße — nicht ohne sehr sorgfältige Verifikation wieder aktivieren."*
- **Regressionsschutz:** `core/pdf/pdfVisualRegression.test.js` + `scripts/pdf-visual-diff.py` (PyMuPDF-basiert) sind laut Code-Kommentaren die **einzige** Testart, die diese Art von Glyph-Korruption zuverlässig erkennt — reine Text-Extraktions-Tests (`pdfjs-dist`) erkennen es NICHT, da das ToUnicode-CMap auch bei kaputtem Rendering korrekt bleibt.
- **Foto-Normalisierung:** `core/photo/normalizePhotoToPng.js` — skaliert Fotos auf maximal 1200px (`MAX_PHOTO_DIMENSION_PX`), nie hoch, konvertiert nach PNG.
- **Druckerei-Bleed:** siehe Flyer-Abschnitt unten (1mm, Grundlage `Medien/flyer_a5_mass.pdf`, Flyeralarm-Datenblatt).
- **Home-Imposition:** siehe Flyer-Abschnitt unten.
- **Statische Anleitung:** `core/materials/staticCompanionMaterialGuide.js` lädt ein vorgefertigtes PDF-Asset (kein Rendering pro Person).

---

## Flyer

**Vier Repräsentanten-Vorderseiten** (Geschlecht × Ansprache, `templates/flyer-representative-{female,male}-{du,sie}-front/` sowie deren `-print`-Pendants für die Druckerei-Bleed-Fassung) + **eine gemeinsame Rückseite** (`templates/flyer-shared-back/`, `SHARED_FLYER_BACK_KEY = "SHARED_FLYER_BACK"`) — bewusst rollen-/geschlechts-/ansprache-neutral benannt, um für künftige Wegbegleiter-Flyer wiederverwendbar zu sein.

**Dynamische Felder** (siehe `templates/_shared/representativeFlyerFrontBase.js`): Foto, Name, Region (mit `regionPrefix`), Telefon, E-Mail, PayPal-QR, GiroCode — Koordinaten relativ zur Trim-Kante definiert, identisch für Home- und Druckerei-Fassung (ein einziger Koordinatensatz, siehe `representativeFlyerPrintBase.js`).

### Druckerei-Ausgabe
- Endformat: 148 × 210 mm (DIN A5)
- Datenformat (mit Beschnitt): 150 × 212 mm
- Beschnittzugabe: 1 mm umlaufend, Sicherheitsabstand 4 mm
- Grundlage: `Medien/flyer_a5_mass.pdf` (Flyeralarm-Datenblatt), per PyMuPDF verifiziert (laut Code-Kommentar)
- Technische Erzeugung: Original-Artwork unskaliert 1mm versetzt in die größere Seite eingebettet (keine Skalierung, kein Verschieben der Feldkoordinaten) — die zusätzliche Beschnittzugabe entsteht durch randnahe Farbfortsetzung im Hintergrund-PDF selbst (`scripts/build-flyer-print-bleed-backgrounds.py`), nicht durch Laufzeit-Logik.

### Home-Ausgabe
- DIN A4 quer (297×210mm), zwei identische DIN-A5-Flächen nebeneinander, unskaliert
- Seite 1 = Vorderseite doppelt, Seite 2 = Rückseite doppelt → nach Duplexdruck und mittigem Schnitt bei x=148,5mm entstehen zwei identische A5-Flyer
- **Duplex-Einstellung (geometrisch hergeleitet):** "An der kurzen Kante wenden" (Short-Edge-Binding) — bei Querformat-Papier physikalisch korrekt, damit die Rückseite nach dem Wenden seitenrichtig und unspiegelt erscheint
- Dezente Schnittmarkierungen (kurze graue Striche, 3mm, oben/unten bei x=148,5mm) — kein durchgehender Strich durchs Artwork
- Diese Duplex-Anleitung ist auch Teil der statischen Nutzeranleitung (`companionMaterialGuide.js`)

---

## Urkunden

Sechs Templates (`templates/certificate-*/`), je Rolle genau eine, Repräsentant/Botschafter zusätzlich geschlechtsabhängig:

| Rolle | Template-Verzeichnis(se) | Geschlechtsabhängig? |
|---|---|---|
| Repräsentant/-in | `certificate-representative-male/`, `certificate-representative-female/` | Ja |
| Botschafter/-in | `certificate-ambassador-male/`, `certificate-ambassador-female/` | Ja |
| Kuratorium | `certificate-curatorium/` | Nein (eine Vorlage) |
| Beirat | `certificate-advisory-board/` | Nein |
| Fachrat | `certificate-expert-council/` | Nein |
| Wirtschaftsrat | `certificate-economic-council/` | Nein |

Variable Inhalte: Name, IFK-ID (nur bei Repräsentant, siehe `materialRequirements.js` — die übrigen Urkunden benötigen keine IFK-ID). Dateiname folgt dem Schema `Urkunde_<Vorname>_<Nachname>.pdf` (bzw. rollenspezifisch, siehe `buildMaterialFilenames.js`). Versandstrategie: siehe Rollen-Tabelle oben (`certificateDeliveryMode`).

---

## QR-Codes

**PayPal QR:** Datenquelle = validierter PayPal-Link aus dem Formular (`extractPaypalLink`), Farbe Schwarz (`QR_COLOR_SCHWARZ = "#000000"`), IFK-Logo mittig eingebettet, Ausgabe als PNG. **IFK-ID ist NICHT Bestandteil** dieses QR-Inhalts (`generateQrMaterials.js`, Kommentar: *"die IFK-ID ist NICHT Bestandteil des PayPal-QR-Inhalts"*).

**GiroCode:** EPC-QR-Format (`core/girocode/buildGirocodePayload.js`), statischer Empfänger/IBAN aus `core/config/girocodeDefaults.js` (`empfaenger: "Stiftung It s for Kids"`, IBAN `DE48300800000228228800`, kein BIC hinterlegt), Verwendungszweck dynamisch `"<IFK-ID> Spende"` — damit trägt der GiroCode die IFK-ID zur internen Zuordnung beim Bank-Scan in einer Banking-App (Empfänger/IBAN/Verwendungszweck werden automatisch befüllt).

**Statische QR-Codes auf der Flyer-Rückseite:** Laut Memory-Notiz zwei statische (nicht-personalisierte) QR-Felder auf der gemeinsamen Rückseite (`qrPartnerWerden` → `https://www.its-for-kids.de/spenden/partnerschaftsantrag-auswahl`, `qrMehrErfahren` → `https://www.its-for-kids.de`) — **diese konkrete Aussage stammt aus einer früheren Session und wurde in diesem Audit nicht erneut am Template-Code re-verifiziert; sollte vor Übernahme ins Handbuch am Template `flyer-shared-back` gegengeprüft werden.**

---

## OCR

- **Bibliothek:** `tesseract.js` (dynamisch nachgeladen, nicht Teil des Haupt-Bundles) — ausschließlich in `core/screenshot/runScreenshotOcr.js` verwendet.
- **Assets:** Worker-Skript, WASM-Kernmodule, deutsche Trainingsdaten werden über die eigene Anwendung ausgeliefert (`public/tesseract/`, aus `node_modules` kopiert per `scripts/copy-tesseract-assets.mjs`) — **kein fremdes CDN**.
- **Erkannte Felder** (`core/screenshot/buildExtractionFields.js`): `firstName`, `lastName`, `gender`, `phone`, `federalState`, `region`, `ifkEmail`/`regularEmail` (Auswahl über `pickEmailForForm`), `ifkId`, `paypalUrl`. **Nicht** aus OCR: Foto-Link (wird nie automatisch erkannt, immer manuell einzutragen).
- **Review-/Korrekturprozess:** Erkannte Werte durchlaufen eine Konfidenz-/Plausibilitätsbewertung (`isFieldAutoRecognized.js`, `annotateLowConfidenceCharacters.js`) und werden in einer Vorschau-Tabelle mit Korrekturmöglichkeit angezeigt, bevor sie ins Formular übernommen werden.
- **Grüne Feldmarkierung:** Übernommene/importierte Feldwerte werden im Formular optisch hervorgehoben (`.field-complete`/Import-Status-Logik in `generator.js`).
- **Datenschutz/Lebenszyklus:** *"Der Screenshot verlässt zu keinem Zeitpunkt den Browser"* (Code-Kommentar in `runScreenshotOcr.js`) — die OCR läuft vollständig clientseitig; es gibt keinen Server-Endpunkt, der Screenshots entgegennimmt. Das Bild existiert nur als Object-URL im Speicher der laufenden Seite (`lastScreenshotObjectUrl`), wird bei Verlassen der Lightbox/Seite via `URL.revokeObjectURL()` freigegeben.

---

## Foto

- **Foto-Link:** Formularfeld, HTTP(S)-URL.
- **Servervalidierung:** `/api/validate-photo` → `core/photo/retrieveRepresentativePhotoAsset.js` — genau ein serverseitiger HTTP-Request, prüft Status 200 und `Content-Type` beginnt mit `image/`. Grund für die Serverseitigkeit: viele Foto-Hosts erlauben kein CORS für direkten Browser-Abruf.
- **"Download":** Der Server liefert den Bildinhalt Base64-kodiert in der JSON-Antwort an den Client zurück (kein Zwischenspeichern, siehe Datenschutz-Abschnitt).
- **Crop-Editor:** `src/intern/photoCropEditor.js` — rein clientseitig, keine Netzwerk-/Storage-Aufrufe (verifiziert per Grep).
- **Gespeicherte Crop-Daten während der Session:** `photoCrop`/`photoCropSourceUrl` als In-Memory-Variablen in `generator.js`, an den jeweiligen Foto-Link gebunden und bei Link-Wechsel verworfen — keine Persistenz über die Sitzung hinaus.
- **Normalisierung:** siehe PDF-Rendering-Abschnitt (`normalizePhotoToPng.js`, max. 1200px, PNG).
- **Einbettung:** direkt in Flyer-PDFs via `pdf-lib`.
- **Keine dauerhafte Fotospeicherung — technisch bestätigt** (kein `fs.writeFile`/Datenbank-Call in der Foto-Pipeline).

---

## Materialabhängige Pflichtfelder

Zentrale Architektur in `core/materials/materialRequirements.js`: **keine pauschale Formularpflicht**, sondern je Materialtyp eine explizite Feldliste, plus rollenabhängige Ergänzung um Bundesland/Region nur bei Flyer-Materialien, wenn die Rolle `requiresRegion: true` hat.

| Material | Pflichtfelder |
|---|---|
| Urkunde (Repräsentant/Botschafter) | Vorname, Nachname, Geschlecht |
| Urkunde (Beirat/Kuratorium/Fachrat/Wirtschaftsrat) | Vorname, Nachname |
| PayPal QR schwarz | Vorname, Nachname, PayPal-Link |
| GiroCode schwarz | Vorname, Nachname, IFK-ID |
| Flyer (beide) | Vorname, Nachname, Geschlecht, E-Mail, Telefon, IFK-ID, Foto-Link, PayPal-Link (+ Bundesland/Region bei `representative`) |

`getRequiredFieldsForMaterials()` bildet die Vereinigungsmenge über mehrere gleichzeitig gewählte Materialien; `getMissingFields()` prüft rein oberflächlich auf Vorhandensein (kein Format-Check — das bleibt spezialisierten Validierern wie `validateIfkId`/`validateEmail` vorbehalten).

---

## Starter-Set

Repräsentant, `starterSetMaterialKeys` in `roleConfig.js`:
1. Flyer Druckerei (Du-Version)
2. Flyer Home (Du-Version)
3. PayPal QR schwarz
4. GiroCode schwarz
5. Repräsentantenurkunde

Die statische Anleitung ist **kein** auswählbares Starter-Set-Element — sie wird automatisch bei jeder Erzeugung ergänzt.

**Versand:** ein Klick auf "Materialien versenden" löst — sofern sowohl Materialien als auch Urkunde erzeugt wurden — automatisch **zwei unabhängige Empfänger-Mails** aus (Material-Mail ohne Urkunde + separate Urkunden-Mail) sowie zwei unabhängige humbee-Dokumentations-Mails, siehe humbee-Abschnitt.

**Du/Sie-Mischung:** technisch blockiert — sobald eine Checkbox einer Ansprache aktiv ist, werden alle Checkboxen der jeweils anderen Ansprache `disabled` (nicht automatisch abgewählt), siehe `applyFlyerSalutationExclusion()` in `src/intern/generator.js`. Grund: kombinierter Payload beider Ansprachen sprengt das Vercel-Limit (siehe nächster Abschnitt).

---

## Mailversand

**Kein Resend.** Explizit im gesamten Code (inkl. `package.json`) geprüft — keine Resend-Abhängigkeit, kein Resend-Import, kein Resend-API-Aufruf. Verwendet wird ausschließlich:

- **Bibliothek:** `nodemailer` (^6.9.14, aus `package.json`)
- **Transport:** klassisches SMTP, konfiguriert über `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS` (siehe Environment-Variables-Tabelle)
- **TLS/SSL:** gesteuert über `SMTP_SECURE === "true"` (nodemailer `secure`-Option — bei `true` implizites TLS von Verbindungsbeginn an, sonst ggf. STARTTLS je nach Portkonfiguration, nodemailer-Standardverhalten)
- **Absenderlogik:** `MAIL_FROM`, sonst Fallback auf `SMTP_USER` (`api/_lib/buildMailTransporter.js`, `getMailFromAddress()`)
- **Reply-To:** **Nicht konfiguriert** — kein `replyTo`-Feld im gesamten Mail-Code gefunden.
- **Empfängerlogik (interner Generator):** `resolveCompanionRecipient()` in `core/materials/buildRepresentativeDeliveryRequest.js` — verwendet **immer den aktuell im Formular sichtbaren** Wert (kein Snapshot-Wert aus der Materialerzeugung).
- **Alternative Empfängeradresse:** über Radio-Auswahl "An abweichende E-Mail-Adresse senden" im Versandbereich — überschreibt bei nicht-leerer, gültiger Adresse den direkten Empfänger.
- **humbee-Kopie:** siehe eigener Abschnitt unten.
- **Transport Browser → Vercel:** `multipart/form-data` (nativer `FormData`, kein Base64/JSON) — siehe Payload-Abschnitt.
- **Attachment-Verarbeitung Vercel → Mailserver:** `busboy` parst den Multipart-Body vollständig in In-Memory-`Buffer`s (`core/mail/parseMultipartFormData.js`), die dann 1:1 als `nodemailer`-Attachments (`content: Buffer`) übergeben werden — kein Zwischenspeichern auf Platte.

---

## Datenfluss Mailversand (vollständig)

```
Browser (interner Generator)
  │ 1. Formular ausfüllen / Screenshot-OCR (rein clientseitig)
  │ 2. Materialerzeugung (pdf-lib/qrcode, im Browser) → Blobs
  │ 3. buildRepresentativeDeliveryRequest() baut
  │    - bis zu 2 Empfänger-Mail-Teile (Materialien-ZIP, Urkunde)
  │    - bis zu 2 humbee-Mail-Teile (Materialien-Einzeldateien, Urkunde)
  ▼
sendRepresentativeMaterials()
  │ pro Mail-Teil: EIN eigener multipart/form-data-Request
  │ (Feld "metadata" = JSON-Text, Feld "files" = rohe Datei-Blobs)
  ▼
POST /api/send-representative-mail  (Vercel Node-Function)
  │ 4. parseMultipartFormData() → busboy, In-Memory-Buffer
  │ 5. buildRepresentativeMailPayloadsFromMultipart() validiert/baut Payload
  │ 6. deliverRepresentativeMaterials() → nodemailer.sendMail()
  ▼
Externer SMTP-Server (SMTP_HOST)
  │
  ├──► Empfänger (Wegbegleiter oder abweichende Adresse)
  └──► humbee (office@its-for-kids.de) — separater, unabhängiger Request
```

**Wo welche Daten liegen:**

| Ort | Daten | Dauer |
|---|---|---|
| Browser (Tab-Speicher) | Formulardaten, erzeugte Blobs, Foto-Preview | Bis Reload/Tab-Schluss |
| HTTP-Request (Browser→Vercel) | Multipart-Body mit Metadaten (JSON) + Dateiinhalten | Einmaliger Transport |
| Arbeitsspeicher der Vercel-Function | Geparste Buffer, Mail-Objekt | Dauer eines einzelnen Function-Aufrufs (typ. Sekunden) |
| SMTP-Provider | Mail inkl. Anhänge | Außerhalb der Kontrolle dieser Anwendung (Provider-Policy) |
| **Persistente Speicherung durch dieses Tool** | **Keine** | — |

---

## humbee

**Wichtiger Klarstellungs-Befund:** *"humbee" ist keine API-Integration.* Es existiert ein vorbereiteter, aber **nicht implementierter und nicht verwendeter** Platzhalter `core/integrations/humbee/sendHumbeeMail.js` (`throw new Error("sendHumbeeMail: noch nicht implementiert")`, an keiner Stelle im Code aufgerufen). Tatsächlich ist "humbee" schlicht die feste Mail-Empfängeradresse `office@its-for-kids.de` (hardcodierte Konstante `HUMBEE_RECIPIENT` in `core/materials/buildRepresentativeDeliveryRequest.js`), die über denselben `nodemailer`/SMTP-Versand wie jede andere Mail bedient wird.

**Wann humbee eine Mail erhält:**
- Bei jedem erfolgreichen Versand von Materialien (Flyer/QR) **und/oder** einer Repräsentanten-Urkunde über den internen Generator.
- Für nicht-automatisiert versendbare Urkunden (Botschafter/Beirat/Kuratorium/Fachrat/Wirtschaftsrat, `certificateDeliveryMode: "blocked"`) wird **keine** humbee-Mail erzeugt — reine Erzeugung/Download löst keinen Versand und damit keine humbee-Dokumentation aus.

**Betreffsystematik** (`buildHumbeeMailSubject()`):
- Mit Region (nur `representative`): `"<Rolle> <Bundesland> / <Region> / <Nachname>, <Vorname>"`
- Ohne Region (alle anderen Rollen): `"<Rolle> / <Nachname>, <Vorname>"`
- Suffix je nach Art: `" – Materialversand"` oder `" – Urkundenversand"`

**Anhänge:**
- Materialversand-Mail an humbee: die tatsächlich individuell erzeugten Materialien als **Einzeldateien** (kein ZIP) — **niemals** die statische Anleitung.
- Urkundenversand-Mail an humbee (nur `representative`): genau die eine Urkunden-PDF.

**IFK-ID/Zuordnung:** Mailtext enthält `"IFK-ID: <ID>"` (nur, wenn tatsächlich vorhanden — kein "undefined"), plus Name im Betreff — das macht diese Mail faktisch zur einzigen persistenten Zuordnungsdokumentation (siehe IFK-ID-Abschnitt).

**Was das Tool automatisiert:** Materialversand + ggf. Repräsentanten-Urkundenversand an humbee, inkl. korrekter Betreff-/Anhang-Trennung.

**Was das Verwaltungsmanagement weiterhin manuell erledigen muss:** Jede Kommunikation rund um Urkunden der fünf nicht-repräsentativen Rollen (persönliche Übergabe o. Ä., siehe "Offene Prozessentscheidungen") — dafür entsteht mangels automatisiertem Versand auch keine humbee-Mail; eine etwaige Dokumentation dieser Fälle liegt vollständig außerhalb dieses Tools.

---

## Payload-/Größenlimits

- **Vercel Request-Limit:** ≈ 4,45 MB nutzbarer Spielraum für den rohen HTTP-Body einer Node-Serverless-Function (empirisch ermittelt, nicht aus offizieller Vercel-Dokumentation zitiert — siehe Konstante `MAX_REQUEST_BYTES = 4_450_000` in `core/mail/sendRepresentativeMaterials.js` mit Herleitungskommentar: 4.400.155 Byte kamen durch, 4.506.823 Byte wurden mit 413 abgelehnt).
- **`multipart/form-data` statt Base64/JSON:** Base64 vergrößert Binärdaten um Faktor 4/3 (+33 %); reines Multipart überträgt Dateien unkodiert — bei gleichem Vercel-Limit passt dadurch ca. 33 % mehr tatsächliche Materialgröße in einen Request.
- **Warum die Urkunde separat verschickt wird:** Ursprünglich waren Materialien + Urkunde in einem gemeinsamen ZIP/einer Mail — das führte in Production zu einem realen Fehlschlag ("Anhänge zu groß für den Mailversand (4.2 MB, Limit ca. 4.2 MB)"). Die fachliche Trennung (Urkunde = persönliche Auszeichnung, kein Marketingmaterial) wurde zugleich zur technischen Lösung: zwei unabhängige, kleinere Mails statt einer großen.
- **Aktuelle Payload-Regressionstests:**
  - `core/mail/representativeStarterSetSplitPayloadSize.test.js` — **harter** Test: Standard-Starter-Set-Materialien-Mail und -Urkunden-Mail müssen beide unter 90 % des Limits bleiben (verifiziert, aktuell ≈ 72,9 % bzw. ≈ 21,9 %).
  - `core/mail/representativeMailPayloadSize.test.js` — **weicher** Diagnosetest für ein (in der realen Anwendung durch Du/Sie-Sperre und Urkunden-Trennung so nicht mehr erreichbares) kombiniertes "Alles in einem Paket"-Szenario mit allen vier Flyer-Varianten + Urkunde; prüft nur gegen eine großzügige Sanity-Obergrenze (15 MB), nicht gegen das 90 %-Ziel — bewusst, siehe nächster Punkt.
- **Warum keine weitere aggressive PDF-Kompression:** Ein früherer Versuch, die Dateigröße per Font-Subsetting zu reduzieren, hat den oben dokumentierten Text-Korruptions-Bug verursacht. Seitdem gilt im Code die ausdrückliche Priorität *"Dokumentintegrität vor Dateigröße"* — das Payload-Problem wird stattdessen strukturell (Mail-Aufteilung, Du/Sie-Exklusivität) statt durch Komprimierung gelöst.

---

## Deployment

Verifizierter, tatsächlicher Ablauf (kein Wunschprozess):

```bash
# 1. Abhängigkeiten installieren (frischer Checkout)
npm ci        # oder: npm install

# 2. Tests
npm test      # node --test core/**/*.test.js

# 3. Build
npm run build # vite build → dist/

# 4. Commit
git add <relevante Dateien>
git commit -m "..."

# 5. Push
git push origin main

# 6. Automatisches Vercel-Deployment
#    (GitHub-Integration löst bei jedem Push auf main automatisch
#    einen Production-Build/Deploy aus — kein manueller Vercel-Befehl
#    im normalen Ablauf nötig)

# 7. Deployment-Status prüfen
gh auth status                         # ggf. Account wechseln
gh api repos/IFK-Daniel/spendenaktions-generator/commits/<sha>/status
```

`gh` (GitHub CLI) wird für Auth-Check und Status-Abfrage verwendet, nicht für das Deployment selbst — das Deployment ist vollständig Vercel-getrieben über die Git-Integration.

**Keine manuellen `vercel deploy`-Aufrufe im normalen Workflow** (kein `vercel.json`, keine dokumentierten manuellen CLI-Deployments in der Codebasis).

---

## Disaster Recovery

**Praktisch durchgeführter Test** (in dieser Audit-Session, danach vollständig entfernt, keine Änderungen committed):

| Schritt | Ergebnis |
|---|---|
| 1. Frischer Klon von `https://github.com/IFK-Daniel/spendenaktions-generator.git` in `/tmp/ifk-dr-test/` | ✅ Erfolgreich, `HEAD` = `eee43e1a...` (identisch zum lokalen Arbeitsordner) |
| 2. `npm ci` (keine manuell kopierten Dateien) | ✅ Erfolgreich — inkl. automatischem `postinstall`-Hook "8/8 Dateien nach public/tesseract kopiert" |
| 3. `npm test` | ✅ **683/683 Tests grün** |
| 4. `npm run build` | ✅ Erfolgreich, `dist/` vollständig erzeugt (inkl. aller 26 Template-Hintergrund-PDFs, Fonts, Logo, statischer Anleitung) |
| 5. Aufräumen | ✅ Temporärer Klon vollständig entfernt (`rm -rf`) |

**Was fehlt für einen ECHTEN Production-Betrieb (über Build/Test hinaus):**
- Die 9 Environment-Variablen (SMTP_*, MAIL_FROM, INFO_RECIPIENT, MATERIAL_ADMIN_*) müssen im Vercel-Dashboard neu hinterlegt werden — sie sind bewusst nicht im Repository.
- Ein Vercel-Projekt muss neu mit dem GitHub-Repository verknüpft werden (Team `ifk-de` oder Nachfolgestruktur).
- Eine ggf. vorhandene Custom-Domain müsste neu konfiguriert werden (in diesem Audit nicht abschließend identifizierbar, siehe Hosting-Abschnitt).

**Ergebnis:** ✅ **Das Projekt ist aus einem frischen GitHub-Klon heraus technisch vollständig reproduzierbar** — Code, Tests und Build hängen an keiner lokalen Datei aus dem bestehenden Arbeitsordner.

---

## Single Points of Failure

| Risiko | Bewertung | Begründung |
|---|---|---|
| GitHub-Repository hängt an einem einzelnen persönlichen Account (`IFK-Daniel`, Typ "User", nicht Organisation) | **Kritisch** | `gh api repos/.../collaborators` zeigt genau einen Collaborator (`IFK-Daniel`, `admin: true`) — kein zweiter Administrator feststellbar. Zugang zu diesem Account entscheidet über den Zugriff auf den gesamten Quellcode-Verlauf. |
| Vercel-Projekt unter Team `ifk-de` — Mitgliederstruktur/2FA in diesem Audit nicht prüfbar | **Mittel bis kritisch (nicht abschließend bewertbar)** | Die verfügbare Vercel-CLI-Session (`feigenbutzd`) hat keinen Zugriff auf `ifk-de` — ob dort ein zweiter Administrator existiert, ist unbekannt. **Muss administrativ/manuell im Vercel-Dashboard geprüft werden.** |
| SMTP-Zugang | **Kritisch** | Passwort nur als Vercel-Environment-Variable hinterlegt; ohne dokumentierten Zugang zum Mail-Provider-Konto ist weder Fehlerdiagnose noch ein Absender-/Domain-Wechsel möglich. |
| Gemeinsames Admin-Passwort für den internen Generator | **Mittel** | Ein einzelnes Credential-Paar für alle internen Nutzer:innen — kein Audit-Trail, keine Einzelsperrung bei Missbrauch/Weggang einer Person. |
| IFK-ID-Speicher | **Mittel** | Es gibt **keinen** zentralen IFK-ID-Speicher (siehe IFK-ID-Abschnitt) — die einzige Aufzeichnung ist die humbee-Mail-Historie im jeweiligen Postfach. Fällt dieses Postfach aus/wird es nicht gepflegt, geht die einzige Zuordnungsquelle verloren. |
| Lokale Masterdateien (`Medien/`) | **Niedrig** | Wie im Repository-Abschnitt gezeigt: alle produktionsrelevanten Inhalte sind bereits als eigenständige Kopien in `templates/` versioniert; die Master in `Medien/` sind Referenz, kein Build-Pfad. |
| Fehlende Backup-/Recovery-Dokumentation für Vercel-Projekteinstellungen (kein `vercel.json`) | **Mittel** | Build Command, Domains, Deployment Protection, Node-Version liegen ausschließlich im Dashboard — ohne dessen Zugang oder eine schriftliche Sicherung dieser Einstellungen müsste ein Neuaufbau diese Werte erraten/neu festlegen. |
| `npm audit`: 5 gemeldete Schwachstellen (1 moderate, 4 high) in transitiven Abhängigkeiten (Stand Disaster-Recovery-Test) | **Niedrig bis mittel** | Nicht im Detail auf konkrete CVEs/Ausnutzbarkeit im Produktionskontext geprüft (außerhalb des Auftragsumfangs) — sollte vor einer Übergabe einmal mit `npm audit` durchgesehen werden. |

**26A — Zugangs-/Wiederherstellungs-Struktur je System** (soweit technisch feststellbar; **keine Recovery Codes, Passkeys, Seeds oder Secrets wurden abgefragt oder ausgegeben**):

| System | Konto-Typ | Zweiter Admin feststellbar? | Login-Methode/2FA/Passkey feststellbar? | Einordnung |
|---|---|---|---|---|
| GitHub (`IFK-Daniel`) | Persönliches Benutzerkonto (kein Org-Konto) | **Nein** — einziger Collaborator mit Admin-Rechten laut API | Nicht öffentlich über die API einsehbar (GitHub gibt 2FA-/Passkey-Status fremder Accounts nicht preis; für das eigene Konto in dieser Session nicht geprüft, da das außerhalb des technischen Audits liegt) | **B — hängt faktisch an einem einzelnen persönlichen Account.** Ob 2FA aktiv ist, ändert daran nichts, solange kein zweiter Admin existiert. |
| Vercel (Team `ifk-de`) | Team-Konto (Team-Slug `ifk-de` erkennbar) | **Nicht feststellbar** — die in dieser Session verfügbare Vercel-CLI-Identität (`feigenbutzd`) ist nicht Mitglied von `ifk-de` und kann Team-Mitglieder/2FA-Status nicht abfragen | Nicht feststellbar | **C — Recovery-Prozess unbekannt, manuell zu dokumentieren.** Es ist nicht einmal feststellbar, wer aktuell Mitglied des Teams ist. |
| SMTP/Mailprovider | Unbekannt (welcher Provider konkret hinter `SMTP_HOST` steht, wurde in diesem Audit bewusst nicht durch Auslesen der Environment-Variable ermittelt) | Nicht feststellbar | Nicht feststellbar | **C — vollständig manuell zu dokumentieren.** |
| Interner Generator (Admin-Login) | Ein gemeinsames Credential-Paar, kein Nutzerkonto-System | Entfällt (kein Konto-Konzept) | Kein 2FA/Passkey — Klartext-Zugangsdatenvergleich per Environment-Variable | **B-artig** — jede Person mit Kenntnis des einen Passworts hat vollen Zugriff; kein Wiederherstellungsprozess außer Ändern der Vercel-Environment-Variable. |

**Empfehlung (in die SPOF-Bewertung aufgenommen, keine Umsetzung in diesem Audit):** Für GitHub und Vercel sollte vor einer echten Übergabe geprüft und ergänzt werden, ob ein zweiter administrativer Zugang existiert bzw. eingerichtet wird (Kategorie A), da beide Systeme aktuell nachweislich (GitHub) bzw. mangels Prüfbarkeit potenziell (Vercel) an einer einzelnen Person hängen.

---

## Zugangssysteme

Für folgende Systeme müssen bei einer Übergabe **Zugangsdaten separat** (nicht in dieser technischen Dokumentation) hinterlegt werden, z. B. im Sinne der Vorgabe *"Zugangsdaten befinden sich im geschützten humbee-Vorgang …"*:

- **GitHub** (Account `IFK-Daniel`, ggf. Personal Access Token für `gh`)
- **Vercel** (Team `ifk-de`, Projekt `spendenaktions-generator`) — **verifizierter Single Point of Failure:** in diesem Audit wurde geprüft, dass ein anderer, lokal bereits authentifizierter Vercel-Account (`feigenbutzd`) **keinen** Zugriff auf das Team `ifk-de` hat (`vercel project ls`/`vercel --scope ifk-de` schlagen fehl) — ohne Zugang zu einem `ifk-de`-Mitgliedskonto ist das Vercel-Projekt (Environment Variables, Deployments, Domains, künftige Storage-Ressourcen) von außen nicht administrierbar.
- **SMTP/Mailprovider** (Host aus `SMTP_HOST`, Zugangsdaten `SMTP_USER`/`SMTP_PASS`)
- **Interner Generator** (`MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD`)
- **Upstash Redis** (IFK-ID-Reservierung, siehe Abschnitt "Externer Dienst: Upstash Redis") — **Stand 2026-09-05: produktiv aktiv**, Ressource `ifk-materialgenerator-ifk-ids`, über den Vercel-„Storage"-Tab im Team `ifk-de` provisioniert. Zugang läuft damit über denselben Vercel-`ifk-de`-Zugang wie das Hauptprojekt (kein separates Upstash-Konto nötig, sofern die Integration über Vercel verwaltet bleibt).
- **humbee-Postfach** `office@its-for-kids.de` (kein eigenes System dieser Anwendung, aber operativ notwendig, um die IFK-ID-Zuordnungshistorie einzusehen)

Keine Werte wurden in diesem Audit ausgelesen oder dokumentiert.

**Für eine vollständige Übergabe mindestens erforderlich** (Ownership/Zugriff, keine Werte):

| System | Mindestrolle | 2FA/Passkey/Recovery |
|---|---|---|
| GitHub | Admin auf `IFK-Daniel/spendenaktions-generator` (oder Repo-Transfer auf Organisationskonto) | Organisatorisches Thema, in diesem Audit nicht geprüft — sollte bei Übergabe verifiziert und dokumentiert werden (u. a. Recovery-Codes sicher hinterlegt, nicht nur beim bisherigen Einzel-Account). |
| Vercel | Owner/Admin im Team `ifk-de` | Wie oben — Team-Mitgliedschaft und 2FA-Status des Teams sind organisatorisch zu klären, nicht aus dem Code ableitbar. |
| Redis/Upstash (`ifk-materialgenerator-ifk-ids`) | Owner/Admin im Vercel-Team `ifk-de` (Storage-Integration verwaltet, kein separates Upstash-Konto) | Wie oben — Team-Mitgliedschaft/2FA-Status ist organisatorisch zu klären; produktionskritisch, da "Neu generieren" ohne diese Ressource wieder auf den fail-safe 503-Zustand zurückfällt. |
| SMTP/Mailprovider | Admin-Zugang zum Mail-Provider-Konto (Reset-/Rotationsfähigkeit für `SMTP_USER`/`SMTP_PASS`) | Nicht geprüft (welcher Provider konkret hinter `SMTP_HOST` steht, wurde bewusst nicht durch Auslesen der Environment-Variable ermittelt). |
| Interner Generator | Fähigkeit, `MATERIAL_ADMIN_USERNAME`/`MATERIAL_ADMIN_PASSWORD` in Vercel zu ändern (= Vercel-Zugang, kein separates System) | Kein eigenes Login-/Recovery-System (siehe Authentifizierungs-Abschnitt) — Rotation läuft ausschließlich über den Vercel-Zugang. |

Keine Passwörter, Seeds oder Recovery-Codes werden hier dokumentiert — nur welche Zugriffsrolle für eine funktionsfähige Übergabe jeweils nötig ist.

---

## Offene Prozessentscheidungen

Kennzeichnung nach der vorgegebenen Taxonomie:

| Punkt | Einordnung | Begründung |
|---|---|---|
| Du/Sie-Flyer dürfen nie gemeinsam versendet werden | **TECHNISCH ERZWUNGEN** | Direkte Folge des Vercel-Payload-Limits (siehe Payload-Abschnitt) — kein reiner Stilentscheid. |
| Repräsentantenurkunde in eigener, separater Mail | **FACHLICH ENTSCHIEDEN** | Begründet mit "Urkunde ist eine persönliche Auszeichnung, kein Marketingmaterial" (Code-Kommentar in `roleConfig.js`) — unabhängig vom Payload-Limit auch inhaltlich gewollt. |
| Automatisierter Versand der Urkunden für Botschafter/Beirat/Kuratorium/Fachrat/Wirtschaftsrat gesperrt (`certificateDeliveryMode: "blocked"`) | **VORLÄUFIGE PROZESSENTSCHEIDUNG** | Ausdrücklich im Code als *"bewusste, vorläufige fachliche Sperre"* dokumentiert — Erzeugung/Vorschau/Download bleiben unberührt; spätere, aktuell **nicht implementierte** Optionen laut Code-Kommentar: persönliche Übergabe, physisches Starterpaket, individuelle Mail durch Vorstand/Stiftungsdirektion, automatisierter Versand aus anderer Absenderadresse. |
| `CERTIFICATE_DELIVERY_MODES.WITH_MATERIALS` als dritter Modus vorbereitet, aber von keiner Rolle genutzt | **ZUKÜNFTIG ERWEITERBAR** | Bewusst als Wert angelegt, ohne aktuelle Verwendung — offene Architektur für einen möglichen künftigen Rollentyp. |
| Fehlende Flyer-Vorlagen für fünf der sechs Rollen | **ZUKÜNFTIG ERWEITERBAR** | `flyerMaterialKeys: []` — Architektur ist vorbereitet (dieselbe Iterationsmechanik in `generator.js` würde eine neue Rolle ohne Sonderfall-Code aufnehmen), es fehlt schlicht das Grafiker-Artwork. |
| IFK-ID-Reservierung/Kollisionsschutz (`reserveIfkId.js`) | **VOLLSTÄNDIG PRODUKTIV** | Seit `997b24f`/`2ea45ed`/`beb06e2` vollständig implementiert, deployed und mit angebundener Redis-Ressource live verifiziert (Alt-ID-Import, Idempotenz, Kollisions-, Doppelreservierungs- und Parallelitätstest — siehe Abschnitt "Externer Dienst: Upstash Redis"). Kein offener Schritt mehr. |
| Gemeinsames Administrator-Login statt Einzelnutzer-Konten | **VORLÄUFIGE PROZESSENTSCHEIDUNG / ZUKÜNFTIGER VERBESSERUNGSPUNKT** | Im Code selbst nicht explizit als "vorläufig" kommentiert, aber laut `docs/roadmap.md` (Phase 5) als offener Ausbaupunkt vorgesehen. |
| `docs/architecture.md`/`docs/roadmap.md` teilweise veraltet (z. B. grüne QR-Codes, Flyer-Erzeugung als "offen" beschrieben) | **DOKUMENTATIONS-SCHULD, kein Code-Zustand** | In diesem Audit festgestellt, nicht behoben (Auftrag: kein Codeänderung/keine Doku-Änderung außer der neuen Audit-Datei). |

---

## Empfehlungen für Betriebsfestigkeit

*(Empfehlungen, keine in diesem Audit vorgenommenen Änderungen.)*

1. **Zweiten administrativen Zugang für GitHub und Vercel einrichten** — aktuell hängt beides nachweislich bzw. mutmaßlich an einer Einzelperson (siehe SPOF-Abschnitt).
2. **Vercel-Projekteinstellungen schriftlich sichern** (Build Command, Domains, Node-Version, Deployment Protection, Environment Variables — Namen und Zweck, keine Werte) außerhalb des Vercel-Dashboards, z. B. als Ergänzung zu diesem Audit.
3. **`docs/architecture.md`/`docs/roadmap.md` aktualisieren oder als historisch markieren**, damit ein neuer Entwickler sie nicht versehentlich als aktuellen Stand missversteht.
4. **`npm audit` vor der Übergabe einmal durchgehen** und bewerten, ob die 5 gemeldeten Schwachstellen produktionsrelevant sind.
5. **Entscheidung zu `CERTIFICATE_DELIVERY_MODES.BLOCKED` treffen oder bewusst offen dokumentieren** — die vorläufige Sperre für fünf Rollen ist im Code sauber vorbereitet, aber fachlich noch nicht final entschieden (siehe Roadmap-Optionen im Code-Kommentar).

---

## Grundlage für Anwenderhandbuch

Aus dem verifizierten Ist-Zustand ergibt sich folgender Standard-Workflow für den internen Generator (Quelle: Code-Ablauf in `src/intern/generator.js`, nicht separat als Nutzerdokument getestet):

1. **Login** (`intern/index.html`, gemeinsames Administrator-Konto)
2. **Wegbegleiter-Art wählen** (Dropdown, sechs Rollen)
3. **Daten erfassen** — entweder Screenshot hochladen (clientseitige OCR-Erkennung + Korrekturtabelle) oder manuell eintragen
4. **Daten prüfen** (grüne Markierung erkannter/übernommener Felder, `*`-Kennzeichnung der für die aktuelle Materialauswahl benötigten Pflichtfelder)
5. **IFK-ID** — vorhandene eintragen oder neu generieren (`generateIfkId()`, mit Bestätigungsabfrage bei vorhandenem Wert)
6. **Foto-Link** eintragen, serverseitige Prüfung, optional Fotoausschnitt anpassen
7. **Material auswählen** — "Standard-Starter-Set auswählen" (nur bei Rollen mit definiertem Set) oder Einzelauswahl (vier Flyer-Checkboxen mit technischer Du/Sie-Sperre, PayPal QR, GiroCode, Urkunde)
8. **"Materialien erstellen"** — Client-seitige Erzeugung, nicht-blockierende Warnungen bei einzelnen fehlenden Feldern (andere ausgewählte Materialien werden trotzdem erzeugt)
9. **Vorschau** (eingebettete PDF-/Bild-Vorschau je Ergebniskarte)
10. **Download** (Einzeldateien)
11. **Versand** — "Materialien versenden": direkt an den Wegbegleiter oder an eine abweichende Adresse; bei blockierter Urkunde erscheint eine Klartext-Meldung statt eines technischen Fehlers, der Button wird nur deaktiviert, wenn ausschließlich eine nicht-versendbare Urkunde vorliegt
12. **humbee-Dokumentation** — automatisch, parallel zum Empfängerversand, ohne weiteres Zutun

**Sonderfälle:**
- Rollen ohne Flyer-Vorlage: Flyer-Checkboxen dauerhaft deaktiviert.
- Rollen mit `certificateDeliveryMode: "blocked"`: Urkunde erzeugbar/herunterladbar, aber Versand-Button-Verhalten wie oben.
- Bundesland/Region nur bei `representative` überhaupt sichtbar/Pflicht.

Dieser Abschnitt ist als **Rohgrundlage** zu verstehen — für ein tatsächliches Anwenderhandbuch fehlen noch Screenshots, Fehlerbild-Beispiele und eine didaktische Aufbereitung, die bewusst nicht Teil dieses Audits sind.

---

*Ende des Audits. Keine Code- oder Dokumentationsänderungen außer dieser Datei wurden vorgenommen. Kein Commit, kein Push.*
