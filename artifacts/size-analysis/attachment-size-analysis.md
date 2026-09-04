# Analyse: Versandanhänge Repräsentanten-Materialpaket

Zwei Optimierungsrunden. Diese Fassung ersetzt die erste Version des
Berichts vollständig und trennt sauber zwischen einem künstlichen
Worst-Case-Test (frühere Fassung dieses Berichts) und einer am realen
Nutzerfoto kalibrierten Rekonstruktion (diese Fassung). Rohdaten:
[`before-after-sizes.json`](./before-after-sizes.json), Einzelläufe:
`package-*.json` in diesem Ordner.

## 0. Einordnung der Messmethode (wichtig)

Für das eingebettete Foto stand kein echtes Nutzerfoto zur Verfügung.
In der **ersten** Berichtsfassung wurde dafür ein synthetisches
Testfoto mit besonders viel Bilddetail/Rauschen verwendet — das ergab
beim alten (unskalierten PNG-)Verhalten eine PNG-Größe von 2,9–9,5 MB
**je Foto** und in Summe eine Payload von 34,9 MB. Das war ein
**bewusster Worst-Case-Test zur Ursachenermittlung**, aber **nicht**
repräsentativ für das tatsächlich beim Nutzer erzeugte Paket.

Der Nutzer berichtete für sein reales Paket **vor** der ersten
Optimierung: vier Flyer à ca. 2 MB (≈ 8 MB), Urkunde ca. 1,6 MB,
Anleitung + 2 QR-PNGs klein — in Summe ca. 12 MB Rohgröße.

Für diese zweite Fassung wurde das Testfoto neu kalibriert (moderates
Rauschen/Gradient, DIN-A5-Flyer-typische Aufnahme), sodass die
**rekonstruierte "Vorher"-Größe mit dem alten Code exakt in diese
Größenordnung fällt** (siehe Tabelle unten: 2,17 MB je Flyer, 11,0 MB
Gesamtrohgröße) — das bestätigt, dass die tatsächliche Ursache (Foto-
und Font-Vollembedding, siehe unten) korrekt identifiziert wurde, auch
wenn der ursprüngliche 34,9-MB-Wert nicht die reale Paketgröße des
Nutzers war.

## 1. Realistische aktuelle Dateigrößen (Stand nach Runde 2)

Testpaket: Flyer Druckerei Du+Sie, Flyer Home Du+Sie, Repräsentanten-
urkunde, PayPal-QR schwarz, GiroCode schwarz, Anleitung. Foto:
900×1200px JPEG, Qualität 88 (siehe Abschnitt 5/6).

| Datei | Rohgröße (Byte) | Rohgröße (MB) | Base64-Größe (Byte) | Anteil Gesamtgröße |
|---|---:|---:|---:|---:|
| Flyer_Druckerei_Du.pdf | 660.108 | 0,63 | 880.144 | 20,0 % |
| Flyer_Druckerei_Sie.pdf | 660.012 | 0,63 | 880.016 | 20,0 % |
| Flyer_Home_Du.pdf | 657.619 | 0,63 | 876.826 | 19,9 % |
| Flyer_Home_Sie.pdf | 657.531 | 0,63 | 876.708 | 19,9 % |
| Urkunde_Repraesentant.pdf | 648.885 | 0,62 | 865.180 | 19,6 % |
| PayPal_QR_schwarz.png | 3.400 | 0,003 | 4.534 | 0,1 % |
| GiroCode_schwarz.png | 2.020 | 0,002 | 2.694 | 0,1 % |
| Hinweise_zur_Verwendung_der_Materialien.pdf | 13.419 | 0,013 | 17.892 | 0,4 % |
| **Summe Einzeldateien** | **3.302.994** | **3,15** | **4.404.024*** | **100 %** |
| ZIP-Datei | 3.304.002 | 3,15 | — | — |
| **Recipient-Request-Payload (Base64+JSON, wie tatsächlich versendet)** | — | — | **4.405.491** | — |

\* Summe der Einzel-Base64-Größen zur Einordnung — tatsächlich versendet wird
die Base64-Größe der **ZIP-Datei** (letzte Zeile), nicht die Summe der
Einzeldateien.

## 2. Zielgröße für 10 % Reserve — exakt berechnet

```
MAX_REQUEST_BYTES (Vercel-Limit, konservativ)     = 4.450.000 Byte
Ziel-Payload (90 % davon, ≥10 % Reserve)          = 4.005.000 Byte
JSON-Strukturoverhead (empirisch, siehe unten)    ≈ 155 Byte
Ziel-Base64-Größe                                 = 4.005.000 − 155 = 4.004.845 Byte
Ziel-Rohgröße (ZIP) = Ziel-Base64 × 3/4            = 3.003.634 Byte  (≈ 2,86 MB)
```

Der JSON-Strukturoverhead wurde direkt aus dem realen Payload
zurückgerechnet: `recipientPayloadBytes − zipBytes × 4/3 = 4.405.491 −
3.304.002 × 4/3 = 155 Byte` — vernachlässigbar, da `subject`/`text`/`html`
nur wenige hundert Zeichen umfassen.

**Belastbare Ziel-Rohgröße (Summe aller Materialien vor dem Zippen):
≤ 3.003.634 Byte (≈ 2,86 MB).**

## 3. Urkunde: Hintergrund-Optimierung (Runde 2, umgesetzt)

### Ursache gefunden

Die Urkunden-Hintergrundgrafik ist eine **eingebettete Rastergrafik von
3508×4961px** (297×420mm bei 300dpi — **Korrektur gegenüber der ersten
Berichtsfassung: das ist DIN A3, nicht DIN A4**, wie dort fälschlich
angegeben; das Seitenformat der Urkunde selbst war nie A4, siehe
Template-Config `TRIM_WIDTH_MM = 297.13`, `TRIM_HEIGHT_MM = 419.89`).
Analyse (`pikepdf`/`PIL`): Truecolor-RGB-PNG, 1.283.777 Byte, 11.511
unterschiedliche Farben — flächige Grafik + Logo + Text mit weichen
Kanten/Farbverläufen, kein Foto.

### Optimierung

`scripts/optimize-template-backgrounds.py`: wandelt die Rastergrafik
verlustarm in eine 256-Farben-Palettengrafik (Indexed-Colorspace) um —
bei 11.511 Ausgangsfarben ist das **nicht bitidentisch**, aber die
automatisierte Pixel-Diff-Prüfung (2×-Auflösung, gesamte Seite) ergab
eine mittlere Abweichung von nur 0,0135 (Skala 0–255) und eine maximale
Einzelpixelabweichung von 9 — visuell nicht wahrnehmbar (Schwellenwerte
im Skript: mean < 0,5, max < 20). Angewendet auf **alle 8**
Urkunden-Hintergründe (Repräsentant m/w + 6 weitere Wegbegleiter-Rollen,
die dieselbe Architektur nutzen, siehe Vorgabe Abschnitt 3).

Geprüfte, aber **verworfene** Ansätze:
- `PyMuPDF page.replace_image()`: erzeugte im Test ein neues,
  zusätzliches Bildobjekt statt das bestehende zu ersetzen — Ergebnis
  war eine **größere** statt kleinere Datei (verwaistes Objekt, von der
  eigenen Garbage Collection nicht erkannt). Verworfen, `pikepdf` direkt
  verwendet (zuverlässiges In-Place-Ersetzen desselben Objekts).
- PNG-Prediction vor dem Deflate-Komprimieren (Standard bei "echten"
  PNG-Dateien): ergab für dieses **indizierte** Bild sogar ein
  **schlechteres** Ergebnis (615.596 statt 612.625 Byte) — Predictor
  nutzt Korrelation zwischen benachbarten Pixel*werten*, bei
  Palettenindizes (willkürliche Reihenfolge) gibt es diese Korrelation
  nicht. Verworfen zugunsten von reinem Deflate.
- Kleinere Palette (< 256 Farben): bei 11.511 Ausgangsfarben hätte das
  sichtbares Banding riskiert — nicht versucht.

### Ergebnis

| Komponente | Vorher | Nachher | Ersparnis Bytes | Ersparnis % |
|---|---:|---:|---:|---:|
| Urkunde Repräsentant (m/w, je) | 1.328.372 / 1.328.394 | 654.846 / 654.862 | 673.526 / 673.532 | 50,7 % |
| Urkunde Botschafter/Beirat/Kuratorium/Fachrat/Wirtschaftsrat (je) | 470.106–470.449 | 235.782–236.125 | 234.324–234.354 | 49,8 % |
| **Fertiges Urkunde-PDF (Repräsentant, mit Name gerendert)** | **1.319.568** | **648.885** | **670.683** | **50,8 %** |

## 4. Flyer: erneute Analyse (Runde 2)

Geprüft: eingebettetes Foto, JPEG-Qualität, Pixelzahl, redundante
PDF-Objekte, Metadaten, ungenutzte Ressourcen, statische Rückseite,
Font-Subsetting.

- **Metadaten**: `docinfo` (Creator/Producer/Datum) + XMP zusammen nur
  ~230 Byte — vernachlässigbar, nichts zu tun.
- **Redundante PDF-Objekte**: geprüft per Byte-Hash-Vergleich aller
  Bild- und Font-Objekte zwischen Vorder- und Rückseite EINES
  Flyer-PDFs — keine nennenswerten echten Duplikate gefunden (391 Byte
  bei zwei identischen Schnittmarken-PNGs, alles andere bereits
  korrekt einmalig eingebettet). Ein zusätzlicher `pikepdf`-Save-Pass
  (Objektstream-Kompaktierung) brachte nur 270 Byte — pdf-lib
  komprimiert die Cross-Reference-Tabelle bereits effizient.
- **Statische Rückseite** (Abschnitt 7 unten): geprüft, keine
  Ersparnis gefunden ohne Auflösung/Qualität zu verschlechtern.
- **Font-Subsetting**: bereits in Runde 1 behoben, in Runde 2 nochmal
  verifiziert — keine weiteren Vollembeddings gefunden.
- **Foto**: Auflösung und JPEG-Qualität neu hergeleitet, siehe
  Abschnitt 5/6 — umgesetzt.

### Ergebnis (Flyer Druckerei Du, exemplarisch)

| | Runde 1 (1600px/q88-Foto) | Runde 2 (1200px/q88-Foto + Fixes oben) | Ersparnis |
|---|---:|---:|---:|
| Flyer_Druckerei_Du.pdf | 676.037 B | 660.108 B | 15.929 B (2,4 %) |

Die Flyer-Ersparnis in Runde 2 kommt ausschließlich aus der reduzierten
Fotoauflösung (Abschnitt 5) — die Basisgröße des Flyers selbst (Fonts,
Vorder-/Rückseiten-Artwork) war bereits in Runde 1 ausgereizt und blieb
unverändert bei ca. 640–643 KB je Datei.

## 5. Fotoauflösung — neu hergeleitet

Zielfläche: Kreis ⌀ 31,9mm (`flyer-print-front`) bzw. 31,195mm
(Repräsentanten-Vorlagen). Berechnung:

| dpi | Zielpixel (kein Zoom) | × Zoom 2 | × Zoom 3 (Editor-Maximum, `PHOTO_CROP_MAX_ZOOM`) |
|---|---:|---:|---:|
| 300dpi | 377px | 754px | **1.130px** |
| 450dpi | 565px | 1.130px | 1.695px |

300dpi ist der Branchenstandard für Digital-/Offsetdruck (ausreichend
für "professionellen Druck", Vorgabe Abschnitt 9). Der ungünstigste
Fall bei 300dpi (maximaler manueller Zoom im Fotoausschnitt-Editor) ist
**1.130px**. Die bisherige Grenze von 1600px lag **41 % über** diesem
Bedarf. Neue Grenze: **1200px** (≈ 6 % Reserve über dem berechneten
Minimum — bewusst kein pauschales starkes Herunterrechnen, sondern
knapp über dem exakt hergeleiteten Wert). `core/photo/normalizePhotoToPng.js`,
`MAX_PHOTO_DIMENSION_PX = 1200` (vorher 1600). Automatisierter Test
(`core/photo/normalizePhotoToPng.test.js`) verifiziert, dass diese
Grenze den 300dpi/3×-Zoom-Fall weiterhin abdeckt.

Effekt am realen Testfoto: 38.437 Byte (1600px) → 22.504 Byte (1200px),
**41,4 % kleiner**, bei identischer JPEG-Qualität.

## 6. JPEG-Qualität — Vergleichsmatrix

Gleiches (bei 1200px bereits herunterskaliertes) Testfoto, verschiedene
Qualitätsstufen:

| Qualität | Dateigröße | Ersparnis ggü. 88 % |
|---:|---:|---:|
| 90 % | 24.548 B | −9,1 % (größer) |
| **88 % (aktuell, unverändert)** | **22.504 B** | — |
| 85 % | 20.594 B | 8,5 % |
| 80 % | 19.463 B | 13,5 % |
| 75 % | 18.775 B | 16,6 % |

**Entscheidung: Qualität bleibt bei 88 %.** Begründung: (1) Das
verfügbare synthetische Testfoto (glatte Farbverläufe, keine Kanten/
Gesichter) kann JPEG-Kompressionsartefakte an Kanten/Details nicht
sichtbar machen — ein belastbarer visueller Vergleich bei 80–85 % ist
damit nicht seriös möglich, ohne ein echtes Foto zu testen. (2) Selbst
die aggressivste getestete Stufe (75 %) spart nur ~3.700 Byte pro Foto
(~15 KB über alle 4 Flyer) — das ist angesichts der verbleibenden Lücke
von ~300 KB (Abschnitt 9) keine relevante Verbesserung, das Risiko
sichtbarer Artefakte im gedruckten Flyer steht in keinem Verhältnis zum
Nutzen. Empfehlung: Qualität unverändert lassen, bis ein echtes Foto für
einen seriösen visuellen Vergleich vorliegt.

## 7. Statische Rückseite — geprüft, keine Änderung

Die Rückseite ist in `templates/flyer-shared-back/background.pdf` (Home)
und `templates/flyer-shared-back-print/background.pdf` (Druckerei) als
gemeinsames Asset hinterlegt (wird in jedes der 4 Flyer-PDFs eingebettet,
da PDF-Dateien keine Ressourcen über Dateigrenzen hinweg teilen können).

Alle 12 eingebetteten Rastergrafiken der Rückseite wurden vermessen
(Pixelgröße vs. tatsächliche Druckfläche laut Platzierungs-Matrix):

| Grafik | Pixel | Fläche (mm) | effektive dpi | Byte |
|---|---|---|---:|---:|
| 10 von 12 Grafiken | diverse | diverse | **300–301** | 2.439–121.350 |
| 1 Grafik (Logo) | 1000×1000 | 17,2×16,8 | **1477** | 5.219 (komprimiert, nicht 18.343 wie zunächst per PyMuPDF-Reexport fälschlich gemessen — siehe unten) |
| 1 Grafik (Logo) | 370×338 | 20,0×18,3 | 470 | ~370 (geschätzt, zu klein für Optimierung relevant) |

10 der 12 Grafiken sind bereits **exakt korrekt** für 300dpi-Druck
dimensioniert — kein Optimierungspotenzial ohne Qualitätsverlust.

Die eine deutlich überdimensionierte Grafik (1000×1000px bei nur
17×17mm Darstellung) wurde testweise auf 210×210px (≈300dpi) verkleinert
— Ergebnis: **die komprimierte Dateigröße wurde dabei größer** (5.219 →
10.636 Byte), weil das ursprüngliche 1000×1000px-Logo bereits sehr
effizient komprimiert (viele große einfarbige Flächen bei hoher
Auflösung komprimieren mit Deflate besser als dieselbe Grafik in
niedrigerer Auflösung mit durch das Verkleinern entstandenen
Zwischentönen). **Änderung verworfen, Originaldatei wiederhergestellt**
(`git checkout`) — bestätigt die Vorgabe, nichts blind zu optimieren,
sondern zu messen: die naheliegende Annahme ("1477dpi ist zu viel")
war hier schlicht falsch.

**Ergebnis: keine Änderung an der Rückseite vorgenommen.**

## 8. Request-Architektur — dokumentiert, nichts umgebaut

### Aktueller Ablauf (verifiziert im Code)

```
Browser (core/materials/generateFlyerMaterial.js, generateCertificateMaterial.js, …)
  → fertige PDF-/PNG-Bytes (Uint8Array/Blob) im Speicher
  → core/materials/buildMaterialZip.js: ZIP-Archiv (core/zip/createZip.js, JSZip)
  → core/mail/encodeAttachmentBase64.js: ZIP-Blob → Base64-String (btoa)
  → core/materials/buildRepresentativeDeliveryRequest.js: { recipient: { …, zipContent: <Base64> } }
  → fetch POST /api/send-representative-mail (JSON.stringify, Content-Type: application/json)
  → api/send-representative-mail.js (Vercel Serverless Function, Node-Runtime):
      Buffer.from(recipient.zipContent, "base64") → nodemailer attachment
  → core/mail/deliverRepresentativeMaterials.js → transporter.sendMail() → SMTP
```

Das Vercel-Bodylimit (~4,5 MB) greift auf den **rohen HTTP-Request-Body**,
also auf die Base64+JSON-Größe — nicht auf die Rohdateigröße.

### Bewertung der vier Alternativen (technisch, nicht umgesetzt)

**A. Mehrere Requests an denselben Endpunkt, serverseitig mehrere Mails
daraus:** Löst das Body-Limit-Problem nicht grundsätzlich — Vercel
Serverless Functions sind zustandslos; um aus mehreren Requests EINE
E-Mail zusammenzusetzen, müsste der Server die Teile zwischen den
Aufrufen irgendwo zwischenspeichern (und sei es nur für Sekunden) —
das ist faktisch eine (kleine) neue Speicherkomponente. Ohne
Zwischenspeicherung bleibt nur: jeder Request wird zu einer eigenen
Mail (= die vom Nutzer aktuell explizit nicht gewünschte
Mehr-Mails-Lösung, bereits für humbee im Einsatz).

**B. Dateien einzeln hochladen, dann erst senden:** Gleiches Problem
wie A — ohne Zwischenspeicherung der Teile (= neue Infrastruktur) lässt
sich daraus keine einzelne Mail zusammensetzen. Verschiebt das Problem,
löst es nicht.

**C. Andere Kodierung statt Base64/JSON (z. B. `multipart/form-data`
mit rohen Binärdaten statt Base64-Text):** **Technisch der
vielversprechendste Hebel, wenn weiterer Spielraum gebraucht wird.**
Base64 vergrößert Binärdaten um Faktor 4/3 (+33 %). Da das Vercel-Limit
auf der **Bytezahl des rohen Request-Bodys** greift, unabhängig von der
Kodierung, würde `multipart/form-data` mit rohen (nicht Base64-kodierten)
Dateien bei GLEICHEM Bodylimit ca. 33 % mehr tatsächliche Rohdaten
erlauben: statt aktuell ≈ 3,34 MB Rohdaten-Budget (4,45 MB / 4 × 3)
wären es effektiv fast die vollen 4,45 MB — mehr als genug Reserve für
das aktuelle Paket (3,30 MB), ganz ohne jeden Qualitätsverlust am
Material selbst. Aufwand: Client von `fetch(JSON)` auf `FormData`
umstellen, Server-Handler von Vercels eingebautem JSON-`bodyParser`
auf einen Multipart-Parser (z. B. `busboy`, `bodyParser: false` in der
Function-Config) umstellen. Kein neuer Dienst, keine neue
Infrastruktur — nur ein anderes Transportformat für denselben
Endpunkt. **Empfehlung für die nächste Runde, falls weitere Reserve
gebraucht wird.**

**D. Serverseitige Rekonstruktion aus Templates statt fertige PDFs zu
übertragen:** Größtes Potenzial (nur Foto + Textwerte statt fertiger
PDFs übertragen, geschätzt > 90 % kleinere Payload), aber auch der
größte Umbau: der komplette PDF-Rendering-Code (`core/pdf/renderFlyer.js`
u. a.) müsste serverseitig statt browserseitig laufen. Technisch
machbar (die Core-Module sind bereits Node-kompatibel, siehe
`core/pdf/loadTemplateAssets.js`), aber ein grundlegender
Architekturwechsel (Rendering wandert vom Client auf den Server) —
nicht "nichts Großes umbauen", daher hier nur als langfristige Option
dokumentiert, nicht empfohlen für die aktuelle Entscheidung.

**Fazit:** Nur Option C reduziert den tatsächlichen Vercel-Request-Body
wirklich (weniger Bytes bei gleicher Information); A und B verschieben
das Problem nur (sie brauchen neue Zwischenspeicherung, um bei EINER
Mail zu bleiben); D würde das Problem am wirksamsten lösen, ist aber ein
großer Umbau.

## 9. Base64-Overhead — konkret nachgewiesen (aktuelles Paket)

```
Rohdateien gesamt (ZIP-Inhalt):     3.304.002 Byte
Base64:                             4.405.336 Byte   (Faktor 1,3333 = 4/3)
JSON-Payload (recipient-Request):   4.405.491 Byte   (+155 Byte Struktur)
Overhead durch Transportart:        33,37 %           (reine Base64-Kodierung)
Overhead durch JSON-Struktur:        0,0035 %          (vernachlässigbar)
```

## 10. Vollständiger Vorher/Nachher-Vergleich

| | Rekonstruiertes "Vorher" (Original-Code, kalibriertes reales Foto) | Nach Runde 1 (Foto- + Font-Fix) | Nach Runde 2 (+ Urkunden-Optimierung + Foto-Auflösung) |
|---|---:|---:|---:|
| Flyer Druckerei Du | 2.169.431 B | 676.037 B | 660.108 B |
| Urkunde Repräsentant | 1.643.990 B | 1.319.568 B | 648.885 B |
| Anleitung | 645.844 B | 13.419 B | 13.419 B |
| **Summe Einzeldateien** | **10.967.886 B (10,46 MB)** | **4.037.411 B (3,85 MB)** | **3.302.994 B (3,15 MB)** |
| ZIP-Datei | 10.968.894 B | 4.038.419 B | 3.304.002 B |
| **Base64-/Request-Payload** | **14.625.347 B (13,95 MB)** | **5.384.715 B (5,13 MB)** | **4.405.491 B (4,20 MB)** |
| Anteil am Limit (4.450.000 B) | 329 % | 121 % | **99 %** |
| Reserve unter Limit | −229 % (überschritten) | −21 % (überschritten) | **+1,0 %** |
| Reserve ggü. 10 %-Ziel (Abschnitt 2) | — | — | **fehlen 9,97 %** |

## 11. Qualitätsprüfung

- **Alle Geometrie-/Beschnitt-/QR-/Home-Tests**: unverändert grün (619
  Tests gesamt nach Runde 2, inkl. 2 neuer Regressionstests für die
  Foto-Zielauflösung und die Urkunden-Hintergrundgröße).
- **Urkunde**: Pixel-Diff-Verifikation direkt im Optimierungsskript
  (mean 0,0135, max 9 von 255) — für alle 8 optimierten Hintergründe
  automatisiert geprüft, nicht nur stichprobenartig.
- **QR-Codes**: unverändert (Vorgabe Abschnitt 12) — kein Test/Scan
  nötig, da kein Code berührt wurde.
- **Text**: unverändert scharf (nur Bildkodierung geändert, kein
  Vektortext berührt).
- **Foto im Flyer**: neue Auflösung (1200px) deckt den ungünstigsten
  Zoom-Fall weiterhin mit Reserve ab (automatisierter Test).

## 12. Entscheidung

**B. Es passt trotz sinnvoller, mehrfach verifizierter Optimierung
NICHT mit den geforderten mindestens 10 % Reserve in einen einzelnen
Vercel-Request.**

Präzisierung, weil das Ergebnis knapp ist: Das Paket passt nach Runde 2
tatsächlich **unter das absolute Vercel-Limit** (99 % von 4.450.000
Byte, ca. 1,0 % Reserve) — ein einzelner Versand würde also aktuell
vermutlich funktionieren. Es erreicht aber **nicht** die vom Nutzer
explizit geforderte, robustere 10-%-Reserve (Vorgabe: "nicht 4,19 MB
bei 4,2 MB Limit"). Fehlbetrag exakt:

```
Aktuelle Rohgröße (ZIP):        3.302.994 Byte
Ziel-Rohgröße (10% Reserve):    3.003.634 Byte
Fehlbetrag:                       299.360 Byte  (9,97 % zu groß)

Aktueller Payload:              4.405.491 Byte
Ziel-Payload (10% Reserve):     4.005.000 Byte
Fehlbetrag:                       400.491 Byte  (10,00 % zu groß)
```

Alle in dieser Runde identifizierten, sicheren (verlustfreien bzw.
visuell verlustfreien) Optimierungen wurden umgesetzt und geprüft
(Urkunden-Hintergrund, Foto-Zielauflösung). Die verbleibende Lücke von
knapp 300 KB lässt sich ohne echten Qualitätsverlust an Fotos, Fonts
oder Grafiken nicht mehr schließen — die Basisgröße der 4 Flyer-PDFs
(Fonts + korrekt bereits bei 300dpi dimensionierte Rückseiten-Grafiken)
ist bereits ausgereizt.

**Empfehlung**: Wenn eine robustere Reserve gewünscht ist, ist
Abschnitt 8, Option C (`multipart/form-data` statt Base64/JSON) der
wirksamste nächste Schritt — reduziert die Transport-Overhead-Kosten
um ca. 33 %, ohne Materialqualität oder Mailanzahl anzufassen. Das
wurde in dieser Runde bewusst **nicht** umgesetzt (Vorgabe: "noch
nichts Großes umbauen") und wartet auf eine bewusste Entscheidung.
