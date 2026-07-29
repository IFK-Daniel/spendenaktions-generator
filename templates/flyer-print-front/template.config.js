import { StandardFonts } from "pdf-lib";

/**
 * Template-Config "Flyer Druckerei – Vorderseite".
 *
 * Alle Koordinaten stammen unverändert aus der vom Grafiker gelieferten
 * "Koordinaten der Felder für Claude.pdf" (Medien/) und sind laut
 * Vorgabe verbindlich. Sie sind gegen die gelieferte Hintergrund-PDF
 * geometrisch geprüft (siehe Analyse in der Konversation): X/Y messen
 * ab der Trim-Kante der Seite (ohne Beschnitt), Y von oben nach unten
 * (InDesign-Konvention). `core/pdf/coordinates.js` rechnet das in
 * pdf-lib-Punkte um.
 *
 * WICHTIG — bekannte Einschränkungen dieser Config (siehe Konversation):
 * - `background.pdf` ist kein leeres Master-Template, sondern das vom
 *   Grafiker gelieferte Beispiel-PDF (bereits mit "Alexandra Mazur"
 *   befüllt). `legacyContentCovers` deckt die vier betroffenen
 *   Textbereiche vor dem Zeichnen der echten Werte mit weißen
 *   Rechtecken ab (Koordinaten aus der tatsächlichen Textposition im
 *   Beispiel-PDF vermessen, nicht aus der Koordinatenliste). Sobald der
 *   Grafiker eine echte leere Vorlage liefert, kann `legacyContentCovers`
 *   auf ein leeres Array reduziert werden.
 * - `fonts` verweist aktuell auf pdf-lib-Standardschriften (Helvetica /
 *   Helvetica-Bold / Times-Roman) als Platzhalter, NICHT auf die im
 *   Flyer tatsächlich verwendeten Schriften "Droid Sans" / "Droid Sans
 *   Bold" / "Droid Serif". Die echten .ttf-Dateien lagen nicht vor und
 *   sind rechtlich nicht zuverlässig automatisiert beschaffbar — bitte
 *   vom Grafiker anfordern und unter `assets/fonts/` ablegen, dann hier
 *   auf `{ type: "file", path: new URL("../../assets/fonts/...ttf",
 *   import.meta.url) }` umstellen.
 * - Das zweite Vorkommen des Regionsnamens im Fließtext ("...in der
 *   Region {Region} zu vertreten...") ist NICHT Teil der ursprünglichen
 *   Koordinatenliste, sondern wurde auf Wunsch als zweites Feld
 *   ergänzt (Koordinate aus dem Beispiel-PDF vermessen). Da der Text
 *   drumherum statisch ist, wird nur das Wort ersetzt, ohne Umbruch —
 *   bei deutlich längeren Regionsnamen als "Hameln" kann es dort eng
 *   werden (Auto-Shrink greift, siehe `minSizePt`).
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 3;
const OUTPUT_BLEED_MM = 3;

const TEXT_DARK_GREY = "#494D4D";

export const flyerPrintFrontTemplate = Object.freeze({
  key: "FLYER_DRUCKEREI",
  label: "Flyer Druckerei",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: SOURCE_BLEED_MM,
    outputBleedMm: OUTPUT_BLEED_MM,
  }),
  fonts: Object.freeze({
    bold: Object.freeze({ type: "standard", name: StandardFonts.HelveticaBold }),
    regular: Object.freeze({ type: "standard", name: StandardFonts.Helvetica }),
    serif: Object.freeze({ type: "standard", name: StandardFonts.TimesRoman }),
  }),
  // Weiße Deckflächen für die im Beispiel-PDF bereits vorhandenen
  // Textwerte (siehe Hinweis oben). Reihenfolge: Name, Region-Kopfzeile,
  // Region im Fließtext, Telefon, E-Mail.
  legacyContentCovers: Object.freeze([
    Object.freeze({ xMm: 43.5, yMm: 31.01, widthMm: 46.85, heightMm: 9.2, color: "#FFFFFF" }),
    Object.freeze({ xMm: 63.2, yMm: 47.45, widthMm: 13.55, heightMm: 6.69, color: "#FFFFFF" }),
    Object.freeze({ xMm: 115.61, yMm: 55.04, widthMm: 8.83, heightMm: 3.16, color: "#FFFFFF" }),
    Object.freeze({ xMm: 18.5, yMm: 70.45, widthMm: 18.28, heightMm: 3.96, color: "#FFFFFF" }),
    Object.freeze({ xMm: 82.92, yMm: 70.45, widthMm: 30.84, heightMm: 3.96, color: "#FFFFFF" }),
  ]),
  fields: Object.freeze({
    photo: Object.freeze({
      type: "image",
      shape: "circle",
      xMm: 7.5,
      yMm: 32.5,
      widthMm: 31.9,
      heightMm: 31.9,
    }),
    name: Object.freeze({
      type: "text",
      xMm: 44.7,
      yMm: 33.7,
      maxWidthMm: 95.3,
      font: "bold",
      startSizePt: 14,
      minSizePt: 8,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
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
    }),
    regionInParagraph: Object.freeze({
      type: "text",
      xMm: 115.91,
      yMm: 55.24,
      maxWidthMm: 30,
      font: "serif",
      startSizePt: 6,
      minSizePt: 4,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    phone: Object.freeze({
      type: "text",
      xMm: 19.7,
      yMm: 71.45,
      maxWidthMm: 56.4,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    email: Object.freeze({
      type: "text",
      xMm: 84.12,
      yMm: 71.45,
      maxWidthMm: 55.0,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    qrPaypal: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 12.7,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 79.321,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
  }),
});
