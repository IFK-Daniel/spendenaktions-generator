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
    region: Object.freeze({
      type: "text",
      xMm: 64.4,
      yMm: 49.55,
      maxWidthMm: 75.6,
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
    email: Object.freeze({
      type: "text",
      xMm: 85.42,
      yMm: 71.45,
      maxWidthMm: 55.0,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste: QR-Code Paypal X 14.6mm Y 99.4mm B/H 20mm.
    qrPaypal: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 14.6,
      yMm: 99.4,
      widthMm: 20,
      heightMm: 20,
    }),
    // Koordinatenliste: GiroCode X 81.221mm Y 99.4mm B/H 20mm.
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 81.221,
      yMm: 99.4,
      widthMm: 20,
      heightMm: 20,
    }),
  }),
});
