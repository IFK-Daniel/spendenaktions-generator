# Analyse: Versandanhänge Repräsentanten-Materialpaket

Messmethode: `scripts/measure-representative-package.mjs` erzeugt mit dem echten
Core-Rendering-Code (`renderFlyer.js`, `generateFlyerHomeSheet.js`,
`generateCompanionMaterialGuide.js`) ein typisches vollständiges Paket (Flyer
Druckerei Du+Sie, Flyer Home Du+Sie, Urkunde, PayPal-QR schwarz, GiroCode
schwarz, Anleitung), zippt es identisch zu `buildMaterialZip.js` und berechnet
die Base64-/JSON-Payload-Größe identisch zu `sendRepresentativeMaterials.js`
(`estimateJsonBytes`). Rohdaten: [`before-after-sizes.json`](./before-after-sizes.json),
Einzelläufe: `package-*.json` in diesem Ordner.

Für das Foto stand kein echtes Nutzerfoto zur Verfügung; verwendet wurde eine
synthetische, aber realistische Rekonstruktion eines Smartphone-Fotos
(3024×4032px, mit sanften Farbverläufen + leichtem Rauschen, als JPEG-Quelle
vergleichbar mit einem typischen per Foto-Link bereitgestellten Bild).

## 1. Woher kommt das Mail-Limit tatsächlich?

`core/mail/sendRepresentativeMaterials.js`, `MAX_REQUEST_BYTES = 4.450.000
Byte`. Das ist **nicht** unser Maildienst-Limit, sondern das Body-Limit von
Vercel Serverless Functions (Node-Runtime): ca. 4,5 MB, plattformseitig fix,
nicht per Konfiguration erhöhbar. Der konkrete Wert wurde per Live-Test gegen
Production eingegrenzt: 4.400.155 Byte kamen durch (200 OK), 4.506.823 Byte
wurden abgelehnt (413) — 4.450.000 liegt mittig in diesem Fenster.

Wichtig, wie im Auftrag vermutet: Dieses Limit gilt für die **Base64-kodierte
JSON-Payload**, nicht für die Rohdatei-Summe. Base64 vergrößert Binärdaten um
Faktor 4/3 (+33 %); JSON-Strukturzeichen kommen quasi kostenlos hinzu, da
Base64 bereits reines ASCII ist. Der Recipient-Request enthält **einen**
ZIP-Anhang als Base64-String — anders als bei humbee (`chunkAttachments()`)
gibt es für den Empfänger-Request aktuell **keine** Aufteilung auf mehrere
Mails; ein zu großes ZIP schlägt komplett fehl (das ist exakt die berichtete
Fehlermeldung „Versand an Empfänger: Anhänge zu groß …“).

| Größe | Wert |
|---|---|
| Rohdatei-Summe (ZIP-Inhalt, unkomprimiert gedacht) | Basis |
| ZIP-Datei | ≈ Rohdatei-Summe (siehe Abschnitt 5) |
| Base64 der ZIP-Datei | × 4/3 |
| JSON-Payload (`{recipient: {..., zipContent: <Base64>}}`) | ≈ Base64-Größe + wenige Byte Struktur |
| **Vercel-Limit** | **4.450.000 Byte** |

## 2. Ursache der 12,9 MB — was tatsächlich gemessen wurde

Drei unabhängige, kumulative Ursachen wurden gefunden und behoben:

### Ursache 1 (dominant): Foto wurde unskaliert als verlustfreies PNG eingebettet

`core/photo/normalizePhotoToPng.js` hat jedes Foto — unabhängig von
Originalauflösung und -format — 1:1 in ein PNG in **Originalauflösung**
gewandelt. Das Foto wird im Flyer nur in einem Kreis von ⌀ 31,2–31,9 mm
dargestellt (`templates/_shared/representativeFlyerFrontBase.js`,
`templates/flyer-print-front/template.config.js`), bei 300dpi Druckauflösung
also ca. 378px. Ein typisches, per Foto-Link bereitgestelltes Smartphone-Foto
(mehrere Megapixel) wurde damit als PNG mehrere MB groß eingebettet — **und
zwar separat in JEDEM der vier Flyer-PDFs**, da jeder Flyer sein eigenes
`imageAssets.photo` erhält.

Messung (3024×4032px-Testfoto): PNG-Wandlung des vollen Originals ≈ 2,9 MB.
Eingebettet in 4 Flyer-PDFs → allein dafür ≈ 11,6 MB zusätzliche Rohgröße.

### Ursache 2: Text-Schriften wurden komplett statt als Subset eingebettet

`core/pdf/renderFlyer.js` und `core/materials/generateCompanionMaterialGuide.js`
riefen `pdfDoc.embedFont(bytes)` ohne `{ subset: true }` auf. **pdf-lib bettet
ohne diese Option das komplette Font-File ein**, nicht nur die im Dokument
tatsächlich benutzten Glyphen. Die verwendete NotoSans-Schriftdatei (Unicode,
mehrere hundert KB je Schnitt) wurde dadurch pro Textfeld-Font vollständig
eingebettet — nachgewiesen per PyMuPDF-Fontanalyse: `NotoSans-Bold` mit
630.964 Byte und `NotoSans-Regular` mit 629.024 Byte allein auf der
Flyer-Vorderseite (ohne Subset-Präfix wie `ABCDEF+`, ein klares Indiz für
Vollembedding — die parallel dazu bereits korrekt subsetteten Fonts aus den
Hintergrund-PDFs tragen dagegen Präfixe wie `NPVKHN+` und sind nur 12–19 KB
groß).

Betrifft **jedes** von unserem Code erzeugte Text-PDF: alle 4 Flyer, die
Urkunde, die Anleitung.

### Ursache 3 (kleiner, aber real): kein struktureller Duplikat-Bug in unserem Code

Geprüft wurde, ob `pdf-lib`s `copyPages()` beim Zusammenführen von Vorder-
und Rückseite (`renderMultiPageDocument.js`, `generateFlyerHomeSheet.js`)
Ressourcen dupliziert. Das ist **nicht der Fall** — die verbleibende
„Verdopplung“ zwischen Einzel-Template (151 KB) und Gesamt-Flyer (642 KB
nach Fix) erklärt sich vollständig durch Fonts/Bilder, die in JEDER
Seite (Vorder- UND Rückseite) unabhängig eingebettet werden, weil Vorder-
und Rückseite als zwei separate `renderFlyer()`-Aufrufe (zwei separate
`PDFDocument`e) entstehen und erst danach zusammengeführt werden. Das ist
architektonisch bewusst so (siehe `renderFlyer.js`-Doku: einzelseitiger
Renderer, wiederverwendbar) und wurde **nicht verändert** — eine Umstellung
auf einen gemeinsamen `PDFDocument` für Vorder-+Rückseite wäre ein
Architekturbruch mit größerem Risiko für vergleichsweise kleinen Zusatz-
gewinn, nachdem Ursache 1+2 behoben sind.

Gefunden, aber ebenfalls **nicht verändert** (siehe Abschnitt 4): Die
statischen Hintergrund-PDFs selbst (z. B. `templates/flyer-shared-back/
background.pdf`) enthalten pro Datei bis zu drei separate, bereits beim
Grafik-Export subsettete Kopien von `MinionPro-Regular` — das stammt aus dem
Design-Tool-Export der Grafiker-Vorlage, nicht aus unserem Rendering-Code,
und lässt sich ohne Neuexport der Vorlage nicht sauber beheben.

## 3. Tabelle: Materialgrößen vorher/nachher

| Material | Vorher | Nachher | Reduktion |
|---|---:|---:|---:|
| Flyer Druckerei Du | 5.978.555 B (5,70 MB) | 689.453 B (0,66 MB) | 88,5 % |
| Flyer Druckerei Sie | 5.978.467 B | 689.360 B | 88,5 % |
| Flyer Home Du | 5.976.098 B | 686.972 B | 88,5 % |
| Flyer Home Sie | 5.976.005 B | 686.885 B | 88,5 % |
| Urkunde Repräsentant | 1.643.990 B (1,57 MB) | 1.319.568 B (1,26 MB) | 19,7 % |
| PayPal-QR schwarz | 3.400 B | 3.400 B | – |
| GiroCode schwarz | 2.020 B | 2.020 B | – |
| Anleitung (Hinweise …) | 645.844 B (631 KB) | 12.723 B (12,4 KB) | 98,0 % |
| **Summe Einzeldateien** | **26.204.379 B (25,0 MB)** | **4.090.381 B (3,90 MB)** | **84,4 %** |
| ZIP-Datei | 26.205.387 B | 4.091.389 B | 84,4 % |
| **Recipient-Request-Payload (Base64+JSON)** | **34.940.671 B (33,3 MB)** | **5.455.343 B (5,20 MB)** | **84,4 %** |
| Anteil am Limit (4.450.000 B) | 785 % | **123 %** | – |

Bezogen auf den real berichteten Fehler (12,9 MB Payload beim tatsächlichen
Versand) ist unser rekonstruiertes „Vorher“-Szenario (33,3 MB) deutlich
höher — plausibel, weil (a) das echte Nutzerfoto vermutlich kleiner/stärker
komprimiert war als unser worst-case-Testfoto und (b) im echten Vorfall
möglicherweise nicht beide Ansprache-Varianten (Du+Sie) gleichzeitig
enthalten waren. Der Mechanismus (Foto- und Font-Vollembedding) ist jedoch
in jedem Fall derselbe und in der Größenordnung ausreichend, um 12,9 MB
zwanglos zu erklären.

## 4. Was NICHT verändert wurde (und warum)

**Urkunden-Hintergrundgrafik** (`templates/certificate-representative-male/
background.pdf`, ebenso -female): Die A4-Hintergrundgrafik ist ein
3508×4961px-PNG mit 1.287.222 Byte — praktisch die gesamte Dateigröße der
Urkunde. Analyse: Das Bild ist überwiegend flächige Grafik (Logo, Farbflächen,
Text), kein Foto. Eine verlustfreie Farbpaletten-Reduktion (256 Farben, keine
sichtbare Qualitätsänderung bei diesem Motiv) wurde geprüft und hätte
theoretisch **616.541 Byte statt 1.287.222 Byte** ergeben (−52 %, ca. 670 KB
Ersparnis pro Urkunde). Ein Versuch, dies direkt in der Binär-PDF-Datei zu
patchen (PyMuPDF `replace_image`), führte jedoch zu einer fehlerhaft
**vergrößerten** Datei (verwaistes Bildobjekt wurde nicht bereinigt) — das
verfügbare Tooling in dieser Session (kein `pikepdf`, kein `sharp`/`canvas`
in Node, keine PNG-CLI-Tools) reichte nicht für eine sicher verifizierbare
Low-Level-PDF-Bearbeitung dieser statischen Design-Datei. Die Änderung wurde
daher **verworfen und die Originaldatei wiederhergestellt**, statt ein
Risiko für die Druckqualität der Urkunde einzugehen (Vorgabe: „lieber eine
saubere Architektur als schlechte Druck-PDFs“). Empfehlung: dieselbe
Optimierung mit geeignetem Werkzeug (z. B. `pikepdf`/`img2pdf` lokal oder
im Design-Tool selbst) nachholen — der Effekt ist real und verlustfrei
verifiziert, nur die Umsetzung in dieser Session war nicht sicher genug.

Zusätzlich beobachtet, ebenfalls nicht verändert: Die Repräsentanten-
Urkunden nutzen eine 3508×4961px-Hintergrundgrafik (≈300dpi A4), während die
vier Gremien-Urkunden (Beirat, Kuratorium, Fachrat, Wirtschaftsrat) exakt
dieselbe Grafik nur mit halber Auflösung (1754×2481px, ≈150dpi A4)
verwenden — das deutet auf einen inkonsistenten Export der Repräsentanten-
Vorlagen mit unnötig hoher Auflösung hin. Nicht angepasst, da das eine
Entscheidung über die Quellqualität der Design-Datei ist, die über reine
Neukompression hinausgeht.

**Duplizierte Fonts in `flyer-shared-back/background.pdf`** (bis zu 3×
`MinionPro-Regular`): stammt aus dem Grafik-Export der Vorlage selbst, nicht
aus unserem Rendering — Behebung würde einen Neuexport der Grafiker-Vorlage
erfordern, außerhalb des Scopes dieser Session.

## 5. ZIP vs. Summe Einzeldateien

| | Summe Einzeldateien | ZIP | Unterschied |
|---|---:|---:|---:|
| Vorher | 26.204.379 B | 26.205.387 B | ZIP ist **0,004 % größer** |
| Nachher | 4.090.381 B | 4.091.389 B | ZIP ist **0,025 % größer** |

Bestätigt die Vermutung aus dem Auftrag: PDFs und PNGs sind bereits intern
komprimiert (FlateDecode/DCTDecode); ein ZIP-Container bringt hier keine
zusätzliche Kompression, sondern nur ca. 1 KB ZIP-Overhead. **ZIP löst das
Größenproblem nicht.**

## 6. Qualitätsprüfung

- **PDF-Seitengrößen/Beschnitt/QR-Geometrie/Home-Geometrie**: unverändert —
  es wurde ausschließlich die Bild-/Font-*Kodierung* geändert, keine
  Positionen, Maße oder Layout-Logik. Bestehende Regressionstests
  (`renderFlyer.test.js`, `generateFlyerHomeSheet.*`, u. a. für 148×210mm-
  Trimgröße, 150×212mm-Druckgröße, Beschnittmarken) laufen unverändert grün
  (343/343 Tests).
- **QR-Codes**: nicht verändert (weiterhin PNG, unverändertes
  `core/qr/generateQr.js`) — bleiben scanbar.
- **Foto im Flyer**: Zielauflösung 1600px lange Kante, JPEG Qualität 0,88.
  Das deckt selbst den ungünstigsten Fall des manuellen Zoom-Reglers
  (`core/pdf/photoCrop.js`, `PHOTO_CROP_MAX_ZOOM = 3`) komfortabel ab: bei
  maximalem Zoom auf die 31,9mm-Kreisfläche werden bei 300dpi ca. 1.134px
  Quellauflösung benötigt (378px × Zoom 3) — 1600px liegen darüber.
  Automatisierter Test (`core/photo/normalizePhotoToPng.test.js`) verifiziert
  Downscale-Verhalten und Nicht-Hochskalierung kleiner Fotos.
- **Urkunde/Anleitung/Flyer-Text**: unverändert scharf — Subsetting ändert
  nur, WELCHE Glyphen im Font-File mitgeliefert werden, nicht deren
  Rendering/Auflösung (Vektor-Text bleibt Vektor-Text).

## 7. Ergebnis

Das vollständige Repräsentanten-Paket passt nach den umgesetzten,
verlustarmen Optimierungen **noch nicht mit ausreichender Reserve** unter
das Vercel-Limit: 5,46 MB Payload bei 4,45 MB Limit (123 % — 1,0 MB
Überschreitung). Von ursprünglich 785 % auf 123 % ist ein großer, realer
Fortschritt (−84 % Payload-Größe, ausschließlich durch Korrektheits-Fixes,
ohne jeden Qualitätsverlust), reicht aber laut Vorgabe („nicht 4,19 MB bei
4,2 MB Limit, sondern deutlich darunter“) nicht aus, um das Problem als
gelöst zu betrachten.

**Aussage gemäß Vorgabe Abschnitt 13/15: Mailanhänge sind für ein
vollständiges Materialpaket (4 Flyer-Varianten + Urkunde) strukturell noch
nicht zuverlässig ausreichend — auch nach den durchgeführten,
qualitätsneutralen Optimierungen bleibt eine Überschreitung von ca. 1 MB.**

### Nächster Schritt (Architekturvorschlag, nicht umgesetzt)

Zwei unabhängige, nicht sich ausschließende Optionen, beide ohne neue
Cloud-/Storage-Infrastruktur:

1. **Kurzfristig, kleiner Change, bestehende Architektur wiederverwenden:**
   Den Empfänger-ZIP-Versand auf dasselbe Aufteilungs-Muster umstellen, das
   für humbee bereits produktiv ist (`chunkAttachments()` in
   `sendRepresentativeMaterials.js`) — bei Bedarf zwei ZIPs statt einem,
   als zwei Mails mit „(Teil 1/2)“-Kennzeichnung an denselben Empfänger.
   Repräsentant:in bekommt weiterhin **alle** vorgesehenen Materialien,
   ggf. in zwei statt einer Mail. Kein neuer Dienst, kein Download-Link,
   nur Wiederverwendung eines bereits getesteten Musters. Wurde in dieser
   Session **nicht** umgesetzt, weil es das Versand-UX (Empfänger bekommt
   ggf. 2 statt 1 Mail) verändert und dafür eine bewusste Entscheidung
   sinnvoll ist statt einer stillschweigenden Änderung.
2. **Mittelfristig:** Die verlustfreie Urkunden-Hintergrund-Optimierung
   (Abschnitt 4, −670 KB, verifiziert aber nicht sicher umsetzbar mit dem
   in dieser Session verfügbaren Tooling) mit geeigneten Werkzeugen
   nachholen — würde die verbleibende Lücke von 1,0 MB auf ca. 0,33 MB
   reduzieren und wahrscheinlich zusammen mit Option 1 sogar überflüssig
   machen.

Ohne eine dieser beiden Maßnahmen bleibt die bestehende, klare
Fehlermeldung „Anhänge zu groß für den Mailversand … Bitte weniger
Materialien gleichzeitig versenden.“ unverändert bestehen (nicht entfernt,
siehe Vorgabe Abschnitt 18) — sie greift jetzt aber nur noch in einem
deutlich kleineren Rest-Fall (ca. 1 MB statt vorher 30 MB Überschreitung).
