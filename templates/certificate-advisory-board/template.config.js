/**
 * Template-Config "Urkunde Beirat" — zugleich die kanonische Basis für
 * die übrigen Wegbegleiter-Urkunden (Botschafter/-in, Kuratorium,
 * Fachrat, Wirtschaftsrat), die daraus per Spread `key`/`label`/
 * `background` überschreiben (analog zu
 * `certificate-representative-female` ↔ `-male`).
 *
 * `background.pdf` ist die vom Grafiker gelieferte Master-Vorlage
 * (`Medien/Urkunde_Beirat.pdf`, A3 hochkant, ohne Beschnittzugabe). Sie
 * enthält den vollständigen statischen Text ("Hiermit berufen wir … in
 * den Beirat der Stiftung", Dankestext, Logo, Unterschriften) —
 * einziger variabler Inhalt ist der zusammengesetzte Name (Vorname +
 * Nachname) im hellgrünen Namensbalken (siehe
 * `core/materials/generateCertificateMaterial.js`).
 *
 * Diese Urkunde ist bewusst GESCHLECHTSNEUTRAL formuliert — es gibt
 * genau eine Vorlage, Geschlecht wird für die Erzeugung nicht benötigt
 * (siehe `core/materials/roleConfig.js`, `certificateRequiresGender`).
 *
 * Namensbalken-Geometrie: unabhängig aus `background.pdf` vermessen
 * (300 dpi-Rasterung, hellgrüne Balkenfläche #E4F1D5), NICHT blind aus
 * der Repräsentantenurkunde übernommen. Ergebnis (für alle sechs neuen
 * Urkunden identisch):
 *   Balken x  4.32 – 838.08 pt  (1.52 – 295.66 mm), Breite 833.76 pt
 *   Balken y  382.08 – 462.72 pt von oben  (134.79 – 163.24 mm), Höhe 80.64 pt
 * Diese Werte stimmen mit der bereits visuell abgestimmten
 * Repräsentantenurkunde überein (dort yMm 134.761, maxWidthMm 294.687) —
 * dieselbe Design-Familie, daher gilt auch dieselbe optische
 * Y-Korrektur (`verticalOffsetMm`).
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);

// Trimgröße exakt aus der PDF-Seite von `background.pdf` (pdf-lib
// `page.getSize()`: 842.25 × 1190.249948 pt) — identisch zur
// Repräsentantenurkunde, keine Beschnittzugabe.
const TRIM_WIDTH_MM = 297.127083;
const TRIM_HEIGHT_MM = 419.893732;

const NAME_TEXT_COLOR = "#000000";

export const certificateAdvisoryBoardTemplate = Object.freeze({
  key: "CERTIFICATE_ADVISORY_BOARD",
  label: "Urkunde Beirat",
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
      // Bounding-Box des hellgrünen Namensbalkens (aus `background.pdf`
      // vermessen). Zentrierung übernimmt `align`/`verticalAlign`.
      xMm: 1.52,
      yMm: 134.79,
      maxWidthMm: 294.13,
      maxHeightMm: 28.45,
      font: "bold",
      // Bevorzugte Originalgröße der Vorlage (die statische
      // Rollenzeile "… der Stiftung" ist ebenfalls Noto Sans Bold 40pt).
      startSizePt: 40,
      // Auto-Shrink bis hier; bei 24pt passen zwei Zeilen mit
      // Zeilenabstand 1.2 sicher in `maxHeightMm`
      // (2 × 24 × 1.2 = 57.6pt < 80.6pt). Reicht auch das nicht, meldet
      // `renderFlyer.js` eine Warnung statt den Namen abzuschneiden.
      minSizePt: 24,
      color: NAME_TEXT_COLOR,
      align: "center",
      verticalAlign: "middle",
      // Optische Y-Korrektur nach oben — identisch zur
      // Repräsentantenurkunde (männlich), dieselbe Design-Familie und
      // dieselbe vermessene Balkenposition. Bei Bedarf nach visueller
      // Prüfung der Testartefakte (artifacts/certificate-preview/)
      // nachjustieren.
      verticalOffsetMm: 3.8,
    }),
  }),
});
