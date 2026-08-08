/**
 * Template-Config "Flyer Druckerei – Vorderseite (weiblich)".
 *
 * Vollständig neu aus dem finalen Grafiker-Master erzeugt (löst die
 * vorherige, aus einer Vorabversion abgeleitete Fassung ab — siehe
 * Konversation, "Neuerstellung nach Verwurf der ersten Fassung"):
 *
 * - `background.pdf` = Seite 0 von
 *   `Medien/Flyer_RepräsentantInnen_Frauen_Du.pdf`, unverändert
 *   übernommen. Die Datei hat laut eigenen PDF-Metadaten (MediaBox =
 *   CropBox = TrimBox, per PyMuPDF geprüft) exakt 148×210mm OHNE jeden
 *   Anschnitt/Beschnitt (`sourceBleedMm = 0`). Anders als bei der
 *   männlichen Vorlage liefert der Grafiker hier also (noch) keine
 *   Druckerei-Fassung mit 3mm Beschnitt rundum — `outputBleedMm` ist
 *   deshalb ebenfalls `0`. Sollte für den Echtdruck randabfallendes
 *   Escheinungsbild (Bleed) benötigt werden, muss beim Grafiker eine
 *   Fassung mit Anschnittmarken nachgefordert werden; bis dahin ist
 *   dieses Druckerei-Template technisch identisch zur Home-Variante
 *   (siehe `flyer-female-home-front/template.config.js`) und nutzt
 *   bewusst dieselbe `background.pdf`.
 * - Alle Feld-Koordinaten stammen aus der aktuellen
 *   "Koordinaten der Felder für Claude.pdf" (Stand siehe Konversation).
 *   Per Pixel-/Textmessung direkt gegen den neuen Master geprüft (siehe
 *   unten) — sie stimmen (anders als in der vorherigen Runde) fast
 *   exakt mit dem Artwork überein, keine Korrektur nötig. X/Y messen ab
 *   der Trim-Kante der Seite, Y von oben nach unten (InDesign-
 *   Konvention) — `core/pdf/coordinates.js` rechnet das in
 *   pdf-lib-Punkte um.
 *
 * WICHTIG — Status der bekannten Übergangslösungen:
 *
 * 1) `legacyContentCovers: []` — bewusst LEER. Der neue Master ist ein
 *    echtes leeres Template ohne Beispielinhalte. Geprüft per
 *    `embedPage`-Rundlauf-Diff (derselbe Pfad wie in
 *    `core/pdf/renderFlyer.js`, `addBackgroundPage`): eine direkte
 *    Rasterisierung der Quelldatei wurde pixelweise gegen eine
 *    Rasterisierung nach `PDFDocument.create()` → `embedPage()` →
 *    `drawPage()` verglichen (4×/288dpi, Toleranz 15/255 pro Kanal).
 *    Ergebnis: Der einzige Unterschied ist gleichmäßiges Antialiasing-
 *    Rauschen (max. Differenz 39/255) über den ohnehin vorhandenen
 *    statischen Text der Vorlage verteilt — insbesondere an den
 *    Feldpositionen (Name, Region, Telefon, Email, Foto, QR-Flächen)
 *    erscheint KEIN zusätzlicher Inhalt. Anders als beim vorherigen,
 *    verworfenen Master ist hier also kein Cover-Mechanismus nötig.
 * 2) Die Koordinatenliste gibt für Textfelder nur X/Y vor (Breite/Höhe
 *    laut Legende variabel). maxWidth/maxHeight sind daher technische
 *    Zusatzwerte, hergeleitet aus dem verfügbaren Platz bis zur
 *    nächsten Kante/zum nächsten statischen Element (Trim-Rand bzw.
 *    Trennstrich Telefon/E-Mail in der Pille).
 * 3) Kein `regionInParagraph`-Feld: Der Fließtext im aktuellen Master
 *    nennt die Region nicht mehr namentlich ("... in meiner Region
 *    vertreten ..."), anders als bei der männlichen Vorlage — es gibt
 *    nur das eine `region`-Feld für den Satz "für die Region {Region}".
 * 4) Ersatzschriften Noto Sans/Noto Sans Bold (siehe
 *    `assets/fonts/README.md`), identisch zur männlichen Vorlage —
 *    Original "Droid Sans"/"Droid Sans Bold" laut Koordinatenliste
 *    weiterhin nicht vorliegend.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);

// PyMuPDF-Messung von Medien/Flyer_RepräsentantInnen_Frauen_Du.pdf:
// MediaBox = CropBox = TrimBox = 419.528×595.276pt = 148.000×210.000mm,
// kein Anschnitt (siehe Hinweis oben).
const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 0;
const OUTPUT_BLEED_MM = 0;

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
  // Neuer Master ist leer — kein Cover-Bedarf (siehe Hinweis 1 oben).
  legacyContentCovers: Object.freeze([]),
  fields: Object.freeze({
    // Koordinatenliste: Bild X 7.5mm Y 32.5mm B/H 31.9mm.
    photo: Object.freeze({
      type: "image",
      shape: "circle",
      xMm: 7.5,
      yMm: 32.5,
      widthMm: 31.9,
      heightMm: 31.9,
    }),
    // Koordinatenliste: Name X 44.5mm Y 35.7mm (B/H variabel, Droid Sans
    // Bold 9pt Vorgabe). startSizePt/minSizePt an der männlichen Vorlage
    // orientiert (Auto-Shrink-Bereich statt fester Größe, siehe
    // Modul-Doku), da die Feldbreite variabel ist und der Name je nach
    // Repräsentantin unterschiedlich lang sein kann.
    name: Object.freeze({
      type: "text",
      multiline: true,
      xMm: 44.5,
      yMm: 35.7,
      maxWidthMm: 95.5,
      maxHeightMm: 7.0,
      font: "bold",
      startSizePt: 14,
      minSizePt: 8,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste: Region X 44.5mm Y 46.975mm ("Koord. für den
    // ganzen Satz: 'für die Region XXXX'", Droid Sans Regular 9pt).
    // Anders als bei der männlichen Vorlage ist "für die Region" im
    // neuen Master KEIN statischer Text (per Textextraktion geprüft —
    // die Zeile fehlt komplett im Master-PDF) — `regionPrefix` markiert
    // das für `buildFlyerTextValues` (`core/materials/generateFlyerMaterial.js`),
    // damit der volle Satz gerendert wird statt nur des Regionsnamens.
    region: Object.freeze({
      type: "text",
      xMm: 44.5,
      yMm: 46.975,
      maxWidthMm: 95.5,
      font: "regular",
      startSizePt: 9,
      minSizePt: 6,
      color: TEXT_DARK_GREY,
      align: "left",
      regionPrefix: "für die Region ",
      flagShrinkAsProvisional: true,
    }),
    // Koordinatenliste: Telefon X 19.7mm Y 71.45mm (Droid Sans Regular
    // 7pt). Per Textmessung geprüft: das statische Label "Telefon" im
    // Master beginnt bei x=19.700mm — exakte Übereinstimmung mit der
    // Listenangabe, keine Korrektur nötig.
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
    // Koordinatenliste: Email X 85.42mm Y 71.45mm. Per Textmessung
    // geprüft: das statische Label "Email" im Master beginnt bei
    // x=85.399mm — Abweichung von 0.02mm liegt innerhalb der
    // Messungenauigkeit, keine Korrektur nötig (anders als beim
    // vorherigen, verworfenen Master, wo die Listenangabe um ~1.3mm
    // danebenlag).
    email: Object.freeze({
      type: "text",
      xMm: 85.42,
      yMm: 71.45,
      maxWidthMm: 54.6,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    // Koordinatenliste: QR-Code Paypal X 13.9mm Y 99.4mm B/H 21mm — per
    // Pixelmessung am Master bestätigt (weiße Box x 13.91-34.86mm,
    // y 99.41-120.35mm), keine Korrektur nötig.
    qrPaypal: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 13.9,
      yMm: 99.4,
      widthMm: 21,
      heightMm: 21,
    }),
    // Koordinatenliste: GiroCode X 81.221mm Y 99.4mm B/H 21mm — per
    // Pixelmessung am Master bestätigt (weiße Box x 81.22-102.19mm,
    // y 99.41-120.35mm), keine Korrektur nötig.
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 81.221,
      yMm: 99.4,
      widthMm: 21,
      heightMm: 21,
    }),
  }),
});
