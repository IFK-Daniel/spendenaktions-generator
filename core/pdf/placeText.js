import { fitText } from "./fitText.js";

/**
 * Zeichnet einen einzeiligen Text an einer festen Position, mit
 * Auto-Shrink (siehe `fitText.js`), aber ohne Zeilenumbruch — gedacht
 * für Felder, die layoutbedingt eine Zeile bleiben müssen (Name,
 * Telefonnummer, E-Mail, einzelnes eingesetztes Wort).
 *
 * `xPt`/`yPt` bezeichnen die linke obere Ecke des Textbereichs (wie in
 * der Grafiker-Koordinatenliste) — die tatsächliche Grundlinie wird
 * intern aus der (ggf. geschrumpften) Schriftgröße abgeleitet.
 *
 * Passt der Text auch bei `minSizePt` nicht in `maxWidthPt`, wird er
 * trotzdem bei `minSizePt` gezeichnet (bewusst kein Abschneiden) —
 * siehe `fitText.js`.
 *
 * @param {object} params
 * @param {import("pdf-lib").PDFPage} params.page
 * @param {import("pdf-lib").PDFFont} params.font
 * @param {string} params.text
 * @param {number} params.xPt
 * @param {number} params.yPt
 * @param {number} params.maxWidthPt
 * @param {number} params.startSizePt
 * @param {number} [params.minSizePt=6]
 * @param {{r: number, g: number, b: number}} params.color pdf-lib `rgb(...)`-Farbe.
 * @param {"left"|"center"|"right"} [params.align="left"]
 * @returns {{sizePt: number, fits: boolean}}
 */
export function placeText({ page, font, text, xPt, yPt, maxWidthPt, startSizePt, minSizePt = 6, color, align = "left" }) {
  const { sizePt, fits, widthPt } = fitText({ font, text, maxWidthPt, startSizePt, minSizePt });

  const ascentPt = font.heightAtSize(sizePt, { descender: false });
  const baselineYPt = yPt - ascentPt;

  let drawXPt = xPt;
  if (align === "center") {
    drawXPt = xPt + (maxWidthPt - widthPt) / 2;
  } else if (align === "right") {
    drawXPt = xPt + (maxWidthPt - widthPt);
  }

  page.drawText(text, { x: drawXPt, y: baselineYPt, size: sizePt, font, color });

  return { sizePt, fits };
}
