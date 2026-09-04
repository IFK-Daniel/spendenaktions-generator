/**
 * Gemeinsame Seiten-, Schrift- und Feld-Definition für ALLE vier
 * Repräsentanten-Flyer-Vorderseiten (Geschlecht × Ansprache).
 *
 * Hintergrund: der Grafiker liefert seit Sept. 2026 vier final
 * korrigierte Master unter `Medien/`:
 *   Flyer_RepraesentantInnen_Frauen_Du_korrigiert.pdf
 *   Flyer_RepraesentantInnen_Frauen_Sie_korrigiert.pdf
 *   Flyer_RepraesentantInnen_Maenner_Du_korrigiert.pdf
 *   Flyer_RepraesentantInnen_Männer_Sie_korrigiert.pdf
 * Diese lösen die früheren Prototyp-Vorderseiten
 * (`templates/flyer-print-front`, `flyer-female-print-front`, …)
 * vollständig ab — kein produktiver Codepfad zeigt mehr auf jene
 * (siehe `src/intern/generator.js`).
 *
 * Die vier Master sind GEOMETRISCH IDENTISCH (per PyMuPDF direkt
 * vermessen, Sept. 2026): Fotokreis, beide weißen QR-Flächen und alle
 * statischen Anker­labels ("Telefon" x=19.70mm, "Email" x=85.40mm,
 * Rollenzeile x=44.50mm) liegen in jeder der vier Dateien auf exakt
 * denselben Koordinaten; male-vs-female unterscheiden sich nur im Wort
 * "Repräsentant"/"Repräsentantin" und im Du-/Sie-Fließtext. Deshalb
 * genau EIN gemeinsamer Koordinatensatz für alle vier Varianten.
 *
 * Seitenmaße: MediaBox = CropBox = TrimBox = 419.528×595.276pt =
 * 148×210mm, KEIN Anschnitt (`sourceBleedMm = 0`). Es gibt (noch) keine
 * eigene Druckerei-Fassung mit 3mm Beschnitt — Druckerei und Home
 * nutzen deshalb denselben Master, der Unterschied bleibt technisch
 * (`page.outputBleedMm`, generische Trim-/Bleed-Logik in
 * `core/pdf/renderFlyer.js`). Sobald der Grafiker eine echte
 * beschnittene Druckerei-Fassung liefert, kann pro Materialschlüssel
 * eine eigene `background`/`page` ergänzt werden, ohne die Feldwerte zu
 * ändern.
 *
 * `legacyContentCovers: []` — bewusst LEER. Die vier Master sind echte
 * leere Templates ohne Beispielinhalte. Verifiziert per
 * `embedPage`-Rundlauf-Pixel-Diff (derselbe Pfad wie
 * `addBackgroundPage` in `core/pdf/renderFlyer.js`, 220 dpi):
 * Rasterisierung der Quelldatei gegen Rasterisierung nach
 * `PDFDocument.create()` → `embedPage()` → `drawPage()` ergab für jede
 * der vier Dateien eine maximale Kanaldifferenz von 0 — insbesondere
 * an allen Feldpositionen (Name, Region, Telefon, E-Mail, Foto,
 * QR-Flächen) erscheint keinerlei Inhalt. Kein Cover-Mechanismus nötig.
 *
 * KOORDINATEN (Stand Sept. 2026, direkt am neuen Artwork vermessen –
 * X/Y ab Trim-Kante, Y von oben; `core/pdf/coordinates.js` rechnet in
 * pdf-lib-Punkte um. Für Textfelder ist X/Y die linke OBERE Ecke des
 * Textbereichs, die Grundlinie leitet `placeText`/`placeMultiLineText`
 * intern aus der Schriftgröße ab):
 *
 * | Feld     | Quelle im Master                                   | X/Y mm         | B×H mm        |
 * |----------|----------------------------------------------------|----------------|---------------|
 * | photo    | grün gestrichelter Kreis, bbox                      | 7.853 / 32.853 | 31.195×31.195 |
 * | name     | leerer Bereich ÜBER der statischen Rollenzeile      | 44.5 / 34.2    | ≤95.5 (maxH 7)|
 * |          | (Rollenzeile beginnt bei y0=41.48mm; 34.2 statt der  |                |               |
 * |          | reinen Messung, damit der große Name Luft zur Zeile  |                |               |
 * |          | darunter behält — visuell abgestimmt)               |                |               |
 * | region   | leere Bold-Platzhalterzeile zwischen Rollenzeile    | 44.5 / 46.46   | ≤93.5         |
 * |          | (endet y1=45.18) und Fließtext (beginnt y0=53.66);  |                |               |
 * |          | "für die Region" ist NICHT statisch → `regionPrefix`|                |               |
 * | phone    | unter dem statischen Label "Telefon" (x0=19.70,     | 19.7 / 71.45   | ≤52.9         |
 * |          | y1≈70.82), mittig in der Pille (y 66.68–76.02)      |                |               |
 * | email    | unter dem statischen Label "Email" (x0=85.40)       | 85.4 / 71.45   | ≤53.5         |
 * | qrPaypal | weiße Fläche in der PayPal-Karte, bbox              | 14.076 / 99.577| 20.647×20.647 |
 * | qrGiro   | weiße Fläche in der Banking-Karte, bbox            | 81.397 / 99.577| 20.647×20.647 |
 *
 * Die beiden weißen QR-Flächen sind in allen vier Mastern exakt
 * gleich groß (20.647mm) und auf gleicher Höhe (y=99.577mm) — die
 * QR-Bilder füllen jeweils die weiße Fläche vollständig (das
 * `qrcode`-Paket bringt bereits eine Modul-Ruhezone mit), dadurch
 * sitzen beide Codes optisch gleichmäßig im sichtbaren Rahmen.
 *
 * Ersatzschriften Noto Sans / Noto Sans Bold (Original "Droid Sans"
 * laut Grafiker nicht ausgeliefert, siehe `assets/fonts/README.md`).
 */

const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 0;
const OUTPUT_BLEED_MM = 0;

const TEXT_DARK_GREY = "#494D4D";

export const REPRESENTATIVE_FLYER_FRONT_PAGE = Object.freeze({
  trimWidthMm: TRIM_WIDTH_MM,
  trimHeightMm: TRIM_HEIGHT_MM,
  sourceBleedMm: SOURCE_BLEED_MM,
  outputBleedMm: OUTPUT_BLEED_MM,
});

export const REPRESENTATIVE_FLYER_FRONT_FONTS = Object.freeze({
  bold: Object.freeze({ type: "file", path: FONT_BOLD_URL }),
  regular: Object.freeze({ type: "file", path: FONT_REGULAR_URL }),
});

export const REPRESENTATIVE_FLYER_FRONT_FIELDS = Object.freeze({
  photo: Object.freeze({
    type: "image",
    shape: "circle",
    xMm: 7.853,
    yMm: 32.853,
    widthMm: 31.195,
    heightMm: 31.195,
  }),
  name: Object.freeze({
    type: "text",
    multiline: true,
    xMm: 44.5,
    yMm: 34.2,
    maxWidthMm: 95.5,
    maxHeightMm: 7.0,
    font: "bold",
    startSizePt: 14,
    minSizePt: 8,
    color: TEXT_DARK_GREY,
    align: "left",
  }),
  region: Object.freeze({
    type: "text",
    xMm: 44.5,
    yMm: 46.46,
    maxWidthMm: 93.5,
    font: "regular",
    startSizePt: 9,
    minSizePt: 6,
    color: TEXT_DARK_GREY,
    align: "left",
    regionPrefix: "für die Region ",
    flagShrinkAsProvisional: true,
  }),
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
  email: Object.freeze({
    type: "text",
    xMm: 85.4,
    yMm: 71.45,
    maxWidthMm: 53.5,
    font: "regular",
    startSizePt: 7,
    minSizePt: 5,
    color: TEXT_DARK_GREY,
    align: "left",
  }),
  qrPaypal: Object.freeze({
    type: "image",
    shape: "rect",
    xMm: 14.076,
    yMm: 99.577,
    widthMm: 20.647,
    heightMm: 20.647,
  }),
  qrGiro: Object.freeze({
    type: "image",
    shape: "rect",
    xMm: 81.397,
    yMm: 99.577,
    widthMm: 20.647,
    heightMm: 20.647,
  }),
});

/**
 * Baut eine vollständige Vorderseiten-Template-Config für eine
 * Geschlecht-/Ansprache-Variante. `background` ist die einzige
 * variantenspezifische Angabe — Seite, Schriften, Felder und (leere)
 * Cover sind für alle vier Varianten identisch.
 *
 * @param {{ key: string, label: string, background: URL }} params
 * @returns {Readonly<object>}
 */
export function buildRepresentativeFlyerFrontTemplate({ key, label, background }) {
  return Object.freeze({
    key,
    label,
    background,
    page: REPRESENTATIVE_FLYER_FRONT_PAGE,
    fonts: REPRESENTATIVE_FLYER_FRONT_FONTS,
    legacyContentCovers: Object.freeze([]),
    fields: REPRESENTATIVE_FLYER_FRONT_FIELDS,
  });
}
