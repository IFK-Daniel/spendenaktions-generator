/**
 * Template-Config "Flyer Druckerei – Vorderseite (weiblich)".
 *
 * Vollständig neu aus den aktuellen Grafiker-Dateien in `Medien/`
 * erzeugt (siehe Konversation, Neuerstellung nach Verwurf der ersten
 * Fassung):
 *
 * - `background.pdf` = Seite 0 von
 *   "Flyer_RepräsentantInnen_Seite01_2.Draft (mit Anschnittmarken).pdf",
 *   verlustfrei auf die in dieser Datei selbst hinterlegte BleedBox
 *   zugeschnitten (BleedBox laut PDF-Metadaten: x=21pt, y=21pt,
 *   436.535×612.283pt = 154×216mm = 148×210mm Trim + 3mm Beschnitt
 *   rundum). Per Pixel-Diff gegen eine unabhängige Rasterisierung der
 *   Original-Datei geprüft (siehe unten) — identisch bis auf die
 *   unter 1) beschriebenen Beispielinhalte.
 * - Alle Feld-Koordinaten stammen ausschließlich aus der aktuellen
 *   "Koordinaten der Felder für Claude.pdf". X/Y messen ab der
 *   Trim-Kante der Seite (ohne Beschnitt), Y von oben nach unten
 *   (InDesign-Konvention) — `core/pdf/coordinates.js` rechnet das in
 *   pdf-lib-Punkte um.
 *
 * WICHTIG — bekannte, bewusst dokumentierte Übergangslösung:
 *
 * 1) `legacyContentCovers` — `background.pdf` enthält weiterhin
 *    Beispielinhalte des Grafikers ("Alexandra Mazur" / "Hameln" /
 *    "0170 5802351" / "a.manzur@its-for-kids.de"). Diese sind in
 *    gängigen PDF-Renderern (macOS Quick Look/`sips`, Chrome/pdfium)
 *    UNSICHTBAR (vermutlich Font-Subsetting-Eigenheit der Datei),
 *    werden aber nach dem Einbetten über `pdf-lib`
 *    (`core/pdf/renderFlyer.js`, `addBackgroundPage`) sichtbar —
 *    zweifelsfrei nachgewiesen per Pixel-Diff: eine direkte
 *    Rasterisierung der Original-Datei (ohne jede pdf-lib-Verarbeitung)
 *    zeigt an exakt denselben vier Stellen nichts, während dieselbe
 *    Fläche nach dem `embedPage`-Rundlauf (wie ihn `renderFlyer.js`
 *    beim echten Rendern ebenfalls durchläuft) die Beispieltexte zeigt.
 *    Die vier Deckflächen unten wurden aus genau diesem Pixel-Diff
 *    vermessen (Bounding-Box der abweichenden Pixel + 0,5mm Rand) —
 *    nicht geschätzt, nicht aus der vorherigen (verworfenen)
 *    Konfiguration übernommen. `legacyContentCovers` deckt diese vier
 *    Bereiche vor dem Zeichnen der echten Werte mit weißen Rechtecken
 *    ab. Reihenfolge: Name, Region, Telefon, E-Mail.
 *    TODO(vor Produktion): Sobald der Grafiker ein Master-PDF ohne
 *    diese Beispielinhalte liefert, `legacyContentCovers` auf `[]`
 *    reduzieren — an `fields` ändert sich dabei nichts.
 *
 * 2) Die Koordinatenliste gibt für Textfelder nur X/Y vor (Breite/Höhe
 *    laut Legende variabel). maxWidth/maxHeight sind daher technische
 *    Zusatzwerte, hergeleitet aus dem verfügbaren Platz bis zur
 *    nächsten Kante/zum nächsten statischen Element (Trim-Rand bzw.
 *    vertikaler Trennstrich Telefon/E-Mail), NICHT aus der alten
 *    Konfiguration übernommen.
 *
 * 3) Kein `regionInParagraph`-Feld: Der Fließtext im aktuellen Master
 *    nennt die Region nicht mehr namentlich ("... in meiner Region
 *    vertreten ..."), anders als bei der männlichen Vorlage — es gibt
 *    nur noch das eine `region`-Feld für den Satz "für die Region
 *    {Region}".
 *
 * 4) Ersatzschriften Noto Sans/Noto Sans Bold (siehe
 *    `assets/fonts/README.md`), identisch zur männlichen Vorlage.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);

// Aus der BleedBox-Metadaten der Grafiker-Datei (siehe Hinweis oben):
// TrimBox 148×210mm, 3mm Beschnitt rundum.
const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 3;
const OUTPUT_BLEED_MM = 3;

const TEXT_DARK_GREY = "#494D4D";

export const flyerFemalePrintFrontTemplate = Object.freeze({
  key: "FLYER_DRUCKEREI_FEMALE",
  label: "Flyer Druckerei (weiblich)",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: SOURCE_BLEED_MM,
    outputBleedMm: OUTPUT_BLEED_MM,
  }),
  fonts: Object.freeze({
    bold: Object.freeze({ type: "file", path: FONT_BOLD_URL }),
    regular: Object.freeze({ type: "file", path: FONT_REGULAR_URL }),
  }),
  // Per Pixel-Diff vermessene Deckflächen (siehe Hinweis 1 oben).
  // Reihenfolge: Name, Region, Telefon, E-Mail.
  legacyContentCovers: Object.freeze([
    Object.freeze({ xMm: 44.5, yMm: 30.3, widthMm: 55, heightMm: 9.8, color: "#FFFFFF" }),
    Object.freeze({ xMm: 64.4, yMm: 46.5, widthMm: 27, heightMm: 7.5, color: "#FFFFFF" }),
    Object.freeze({ xMm: 18, yMm: 71, widthMm: 35, heightMm: 7, color: "#FFFFFF" }),
    Object.freeze({ xMm: 83, yMm: 71, widthMm: 42, heightMm: 7, color: "#FFFFFF" }),
  ]),
  fields: Object.freeze({
    // Koordinaten laut "Koordinaten der Felder für Claude.pdf": Bild X 7.5mm Y 32.5mm B/H 31.9mm.
    photo: Object.freeze({
      type: "image",
      shape: "circle",
      xMm: 7.5,
      yMm: 32.5,
      widthMm: 31.9,
      heightMm: 31.9,
    }),
    // Koordinatenliste: Name X 44.54mm Y 34mm (B/H variabel).
    name: Object.freeze({
      type: "text",
      multiline: true,
      xMm: 44.54,
      yMm: 34,
      maxWidthMm: 95.3,
      maxHeightMm: 7.0,
      font: "bold",
      startSizePt: 14,
      minSizePt: 8,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste: Region X 64.4mm Y 49.55mm ("Koord. für den ganzen Satz: 'für die Region XXXX'").
    // yMm hier auf 46.13mm korrigiert (-3,42mm): Bei Y=49.55mm (Listenwert)
    // sitzt die Grundlinie nachweislich (per Content-Stream- und
    // Pixelmessung an einem echten Testrender verifiziert) 3,42mm/9,7pt
    // UNTER der Grundlinie der statischen Zeile "für die Region" im
    // Hintergrund-Artwork — sichtbar als Zeilenversatz. Grafiker-Vorgabe
    // (Y=49.55mm) und tatsächliches Artwork weichen hier voneinander ab;
    // der Korrekturwert wurde direkt am Artwork gemessen, nicht geschätzt.
    // xMm zusätzlich um 1,5mm auf 65.9mm erhöht: bei X=64.4mm (Listenwert)
    // stößt der Regionsname direkt ohne Leerzeichen an "…Region" an (siehe
    // Testrender "…RegionWien"), da das statische Label selbst offenbar
    // kein Leerzeichen am Ende mitbringt — Abstand ergänzt.
    // Feinschliff (visueller Vergleich mehrerer ±0,2mm-Varianten anhand
    // eines echten Testrenders, siehe Konversation): xMm von 66.2 auf
    // 65.9mm (-0,3mm) und yMm von 46.13 auf 45.93mm (-0,2mm) verfeinert,
    // damit der Wortabstand vor "Düsseldorf"/"Hameln" optisch demselben
    // Abstand wie zwischen "für"/"die"/"Region" entspricht und die
    // Grundlinie exakt mit "für die Region" fluchtet.
    region: Object.freeze({
      type: "text",
      xMm: 65.9,
      yMm: 45.93,
      maxWidthMm: 74.1,
      font: "regular",
      startSizePt: 9,
      minSizePt: 6,
      color: TEXT_DARK_GREY,
      align: "left",
      flagShrinkAsProvisional: true,
    }),
    // Koordinatenliste: Telefon X 19.7mm Y 71.45mm.
    phone: Object.freeze({
      type: "text",
      xMm: 19.7,
      yMm: 71.45,
      maxWidthMm: 52.9,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste: Email X 85.42mm Y 71.45mm.
    // xMm hier auf 84.1mm korrigiert (-1,32mm): per Content-Stream-Messung
    // sitzt das statische Label "Email" im Artwork tatsächlich bei x=84.1mm
    // (nicht 85.42mm) — Wert misst die tatsächliche Label-Position, nicht
    // die Listenangabe, damit die E-Mail-Adresse linksbündig mit "Email"
    // beginnt (siehe Vorgabe).
    email: Object.freeze({
      type: "text",
      xMm: 84.1,
      yMm: 71.45,
      maxWidthMm: 55.0,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste sagt X 14.6mm Y 99.4mm B/H 20mm — die tatsächliche
    // Eckmarken-Box im Artwork (per Pixelmessung an einem echten
    // Testrender ermittelt: schwarze Eckmarken bei x=12.7mm, y=98.4mm,
    // Größe 20x20mm) liegt davon abweichend ~1,9mm weiter links und
    // ~1mm weiter oben. Werte hier auf die gemessene Artwork-Position
    // korrigiert (entspricht nahezu exakt den früheren männlichen
    // Koordinaten 12.7/98.4 — die "korrigierten" Listenwerte scheinen
    // für dieses gelieferte Hintergrund-PDF noch nicht umgesetzt).
    // Feinschliff geprüft: mehrere ±0,15mm-Varianten anhand eines echten
    // Testrenders verglichen (sichtbarer schwarzer Rahmen oben/unten/
    // links/rechts um die QR-Fläche gemessen) — bei 12.7/98.4 ist der
    // Rahmen bereits auf allen vier Seiten gleich breit sichtbar, keine
    // Korrektur nötig.
    qrPaypal: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 12.7,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
    // Koordinatenliste sagt X 81.221mm Y 99.4mm — Artwork-Eckmarken
    // gemessen bei x=79.2mm, y=98.4mm (siehe Hinweis bei qrPaypal).
    // Feinschliff: bei x=79.2mm blieb der Rahmen rechts unsichtbar (vom
    // GiroCode selbst knapp verdeckt) — per Variantenvergleich (±0,15mm)
    // auf x=79.05mm (-0,15mm) korrigiert, danach Rahmen auf allen vier
    // Seiten gleich breit sichtbar.
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 79.05,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
  }),
});
