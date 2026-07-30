import { wrapText } from "./wrapText.js";

/**
 * Zeichnet einen mehrzeiligen Text in einer Fläche, mit der in der
 * Umsetzung geforderten Priorität: zunächst Auto-Shrink der
 * Schriftgröße, erst danach Zeilenumbruch — und nur, wenn beides nicht
 * ausreicht, wird bei `minSizePt` belassen (kein Abschneiden).
 *
 * Ablauf je Kandidat-Schriftgröße (von `startSizePt` bis `minSizePt`,
 * in `stepPt`-Schritten): Text bei dieser Größe umbrechen, prüfen ob
 * die resultierende Zeilenzahl in `maxHeightPt` passt. Die erste
 * Größe, bei der das gelingt, wird verwendet; sonst `minSizePt` mit
 * so vielen Zeilen wie nötig (ggf. Überlauf über `maxHeightPt` hinaus).
 *
 * @param {object} params
 * @param {import("pdf-lib").PDFPage} params.page
 * @param {import("pdf-lib").PDFFont} params.font
 * @param {string} params.text
 * @param {number} params.xPt Linke obere Ecke der Textfläche.
 * @param {number} params.yPt
 * @param {number} params.maxWidthPt
 * @param {number} [params.maxHeightPt=Infinity]
 * @param {number} params.startSizePt
 * @param {number} [params.minSizePt=6]
 * @param {number} [params.lineHeightFactor=1.2]
 * @param {{r: number, g: number, b: number}} params.color
 * @param {"left"|"center"|"right"} [params.align="left"]
 * @param {"top"|"middle"} [params.verticalAlign="top"] Bei `"middle"` wird
 *   der gesamte Textblock (alle Zeilen zusammen) vertikal in `maxHeightPt`
 *   zentriert, statt (wie bisher) an der Oberkante der Fläche zu beginnen.
 *   Ohne Wirkung, wenn `maxHeightPt` nicht angegeben ist (`Infinity`).
 * @param {number} [params.verticalOffsetPt=0] Generischer, rein additiver
 *   Y-Korrekturwert (in PDF-Punkten, positiv = nach oben auf der Seite),
 *   der nach der eigentlichen Positionierung (`verticalAlign`) auf jede
 *   Baseline angewendet wird. Dient dazu, den systematischen Versatz
 *   zwischen rechnerischer Mitte (Font-Ascent ohne Descender) und
 *   optischer Mitte auszugleichen, den bestimmte Schriften/Schriftgrade
 *   erzeugen können — der Wert selbst gehört in die jeweilige
 *   Template-Config des Aufrufers (siehe z. B. `templates/certificate-
 *   representative-{male,female}/template.config.js`), nicht hierher
 *   fest codiert.
 * @returns {{sizePt: number, lines: string[]}}
 */
export function placeMultiLineText({
  page,
  font,
  text,
  xPt,
  yPt,
  maxWidthPt,
  maxHeightPt = Infinity,
  startSizePt,
  minSizePt = 6,
  lineHeightFactor = 1.2,
  color,
  align = "left",
  verticalAlign = "top",
  verticalOffsetPt = 0,
  stepPt = 0.5,
}) {
  const exceedsMaxWidth = (candidateLines, candidateSize) =>
    candidateLines.some((line) => font.widthOfTextAtSize(line, candidateSize) > maxWidthPt);

  let size = startSizePt;
  let lines = wrapText({ font, text, sizePt: size, maxWidthPt });
  let lineHeightPt = size * lineHeightFactor;

  while ((lines.length * lineHeightPt > maxHeightPt || exceedsMaxWidth(lines, size)) && size > minSizePt) {
    size = Math.max(minSizePt, size - stepPt);
    lines = wrapText({ font, text, sizePt: size, maxWidthPt });
    lineHeightPt = size * lineHeightFactor;
  }

  const ascentPt = font.heightAtSize(size, { descender: false });

  let blockTopYPt = yPt;
  if (verticalAlign === "middle" && Number.isFinite(maxHeightPt)) {
    const blockHeightPt = lines.length * lineHeightPt;
    blockTopYPt = yPt - (maxHeightPt - blockHeightPt) / 2;
  }

  lines.forEach((line, index) => {
    const lineWidthPt = font.widthOfTextAtSize(line, size);
    let drawXPt = xPt;
    if (align === "center") {
      drawXPt = xPt + (maxWidthPt - lineWidthPt) / 2;
    } else if (align === "right") {
      drawXPt = xPt + (maxWidthPt - lineWidthPt);
    }
    const baselineYPt = blockTopYPt - ascentPt - index * lineHeightPt + verticalOffsetPt;
    page.drawText(line, { x: drawXPt, y: baselineYPt, size, font, color });
  });

  return { sizePt: size, lines };
}
