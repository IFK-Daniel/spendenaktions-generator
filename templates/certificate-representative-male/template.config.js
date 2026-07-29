/**
 * Template-Config "Repräsentantenurkunde – männlich".
 *
 * `background.pdf` ist die endgültige Master-Vorlage (A3 hochkant,
 * keine feste Beschnittzugabe) — sie enthält bewusst KEINEN
 * vorbefüllten Namen mehr (der grüne Namensbalken ist leer), daher
 * anders als bei den Flyer-Templates keine `legacyContentCovers`.
 *
 * Einziger variabler Inhalt ist der zusammengesetzte Name (Vorname +
 * Nachname, siehe `core/materials/generateCertificateMaterial.js`).
 * Feld `name`-Koordinaten wurden aus der tatsächlichen Position und
 * Größe des grünen Namensbalkens in `background.pdf` vermessen (nicht
 * aus einer vorhandenen Textposition, da keine vorhanden ist):
 * 216 dpi-Rasterung der Vorlage, Bildausschnitt des Balkens geprüft.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);

// Trimgröße exakt aus der PDF-Seite von `background.pdf` übernommen
// (pdf-lib `page.getSize()`: 842.25 × 1190.249948pt), nicht auf ein
// rundes A3 (297 × 420mm) gerundet — die Hintergrundseite hat keine
// Beschnittzugabe, daher `sourceBleedMm`/`outputBleedMm` = 0.
const TRIM_WIDTH_MM = 297.127083;
const TRIM_HEIGHT_MM = 419.893732;

const NAME_TEXT_COLOR = "#000000";

export const certificateRepresentativeMaleTemplate = Object.freeze({
  key: "CERTIFICATE_REPRESENTATIVE_MALE",
  label: "Repräsentantenurkunde (männlich)",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: 0,
    outputBleedMm: 0,
  }),
  fonts: Object.freeze({
    bold: Object.freeze({ type: "file", path: FONT_BOLD_URL }),
  }),
  fields: Object.freeze({
    name: Object.freeze({
      type: "text",
      multiline: true,
      // Bounding-Box des grünen Namensbalkens (aus `background.pdf`
      // vermessen), nicht eingerückt — die Zentrierung übernimmt
      // `align`/`verticalAlign` unten.
      xMm: 1.176,
      yMm: 134.761,
      maxWidthMm: 294.687,
      maxHeightMm: 28.81,
      font: "bold",
      startSizePt: 40,
      // Sinnvoll definierte Mindestgröße: bei zwei Zeilen (siehe
      // Auto-Shrink/Umbruch in `wrapText.js`/`placeMultiLineText.js`)
      // passen bei dieser Größe zwei Zeilen mit Zeilenabstand 1.2
      // sicher in `maxHeightMm` (2 × 24pt × 1.2 ≈ 57.6pt < 81.7pt).
      minSizePt: 24,
      color: NAME_TEXT_COLOR,
      align: "center",
      verticalAlign: "middle",
    }),
  }),
});
