import { PDFDocument, rgb } from "pdf-lib";
import { mmToPt } from "./units.js";

/**
 * Generische PDF-Imposition: platziert die (einzige) Seite eines
 * bereits fertig gerenderten Quell-PDFs mehrfach, UNSKALIERT, auf einem
 * größeren Ausgabebogen — z. B. zwei DIN-A5-Flyerseiten nebeneinander
 * auf einem DIN-A4-Bogen (siehe `core/materials/generateFlyerHomeSheet.js`).
 *
 * Bewusst NICHT "Flyer"- oder "Home"-spezifisch: kennt weder Vorder-/
 * Rückseite noch Ansprache/Geschlecht, sondern nimmt eine beliebige
 * Quellseite und eine Liste von Platzierungen entgegen. Spätere weitere
 * Druckbögen (andere Seitenzahl, andere Bogengröße) können dieselbe
 * Funktion wiederverwenden.
 *
 * KEINE erzwungene Skalierung: jede Platzierung übernimmt standardmäßig
 * die tatsächliche Breite/Höhe der Quellseite (`sourcePage.getWidth()`/
 * `getHeight()`) — nur wenn eine Platzierung `widthMm`/`heightMm`
 * EXPLIZIT angibt, wird (bewusst) skaliert; ohne Angabe bleibt die
 * Quellseite unverändert 1:1.
 *
 * @param {object} params
 * @param {Uint8Array} params.sourceBytes Einzelseitiges Quell-PDF (z. B.
 *   das Ergebnis von `core/pdf/renderFlyer.js`, `renderFlyer()`).
 * @param {number} [params.sourcePageIndex=0]
 * @param {number} params.sheetWidthMm
 * @param {number} params.sheetHeightMm
 * @param {Array<{xMm: number, yMm: number, widthMm?: number, heightMm?: number}>} params.placements
 *   Position der linken OBEREN Ecke jeder Platzierung, gemessen von der
 *   linken oberen Ecke des Ausgabebogens (Grafiker-Koordinate wie in
 *   `core/pdf/coordinates.js`, Y nach unten) — nicht die pdf-lib-eigene
 *   Bottom-Left-Konvention, damit Aufrufer dieselbe Denkweise wie beim
 *   Rest der Template-Koordinaten verwenden können. `widthMm`/`heightMm`
 *   optional (siehe oben, Standard = Quellseiten-Originalgröße).
 * @param {Array<{x1Mm: number, y1Mm: number, x2Mm: number, y2Mm: number, colorHex?: string, widthPt?: number}>} [params.guideLines]
 *   Optionale einfache Hilfslinien (z. B. dezente Schnittmarken) — je
 *   ein gerades Liniensegment, Koordinaten wie bei `placements`
 *   (linke-obere-Ecke-Ursprung, Y nach unten). Generisch gehalten, nicht
 *   auf Schnittmarken beschränkt, damit künftige Druckbögen (z. B.
 *   Falzmarken, Passermarken) dieselbe Funktion nutzen können.
 * @returns {Promise<{bytes: Uint8Array}>}
 * @throws {Error} Bei leeren `placements` oder wenn `sourceBytes` keine
 *   gültige, mindestens einseitige PDF-Datei ist.
 */
export async function imposePagesOnSheet({
  sourceBytes,
  sourcePageIndex = 0,
  sheetWidthMm,
  sheetHeightMm,
  placements,
  guideLines = [],
}) {
  if (!Array.isArray(placements) || placements.length === 0) {
    throw new Error("imposePagesOnSheet: 'placements' muss ein Array mit mindestens einem Eintrag sein.");
  }

  const srcDoc = await PDFDocument.load(sourceBytes);
  const srcPage = srcDoc.getPage(sourcePageIndex);
  const naturalWidthPt = srcPage.getWidth();
  const naturalHeightPt = srcPage.getHeight();

  const outDoc = await PDFDocument.create();
  const sheetWidthPt = mmToPt(sheetWidthMm);
  const sheetHeightPt = mmToPt(sheetHeightMm);
  const page = outDoc.addPage([sheetWidthPt, sheetHeightPt]);
  const embedded = await outDoc.embedPage(srcPage);

  for (const placement of placements) {
    const widthPt = placement.widthMm !== undefined ? mmToPt(placement.widthMm) : naturalWidthPt;
    const heightPt = placement.heightMm !== undefined ? mmToPt(placement.heightMm) : naturalHeightPt;
    const xPt = mmToPt(placement.xMm);
    const topYPt = mmToPt(placement.yMm);
    const yPt = sheetHeightPt - topYPt - heightPt;
    page.drawPage(embedded, { x: xPt, y: yPt, width: widthPt, height: heightPt });
  }

  for (const line of guideLines) {
    const x1Pt = mmToPt(line.x1Mm);
    const y1Pt = sheetHeightPt - mmToPt(line.y1Mm);
    const x2Pt = mmToPt(line.x2Mm);
    const y2Pt = sheetHeightPt - mmToPt(line.y2Mm);
    const [r, g, b] = hexToRgbTuple(line.colorHex ?? "#999999");
    page.drawLine({
      start: { x: x1Pt, y: y1Pt },
      end: { x: x2Pt, y: y2Pt },
      thickness: line.widthPt ?? 0.5,
      color: rgb(r, g, b),
    });
  }

  const bytes = await outDoc.save();
  return { bytes };
}

function hexToRgbTuple(hex) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;
  return [r, g, b];
}
