import {
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
} from "pdf-lib";
import { centerCrop } from "./centerCrop.js";

// Kappa-Konstante zur Annäherung eines Kreises durch vier kubische
// Bézierkurven (Standardwert, siehe z. B. https://spencermortensen.com/articles/bezier-circle/).
const CIRCLE_KAPPA = 0.5522847498;

/**
 * Platziert ein Bild proportional (ohne Verzerrung) in einer
 * rechteckigen oder kreisrunden Zielfläche, mittig zugeschnitten
 * ("cover", siehe `centerCrop.js`). Wiederverwendbar für beliebige
 * Bildfelder in beliebigen Vorlagen (z. B. Porträtfoto, Logo).
 *
 * @param {object} params
 * @param {import("pdf-lib").PDFPage} params.page
 * @param {import("pdf-lib").PDFImage} params.image Bereits eingebettetes Bild
 *   (`pdfDoc.embedPng`/`embedJpg`).
 * @param {number} params.xPt Linke untere Ecke der Zielfläche.
 * @param {number} params.yPt
 * @param {number} params.widthPt
 * @param {number} params.heightPt
 * @param {"rect"|"circle"} [params.shape="rect"]
 */
export function placeImage({ page, image, xPt, yPt, widthPt, heightPt, shape = "rect" }) {
  const { drawWidth, drawHeight, offsetX, offsetY } = centerCrop({
    sourceWidth: image.width,
    sourceHeight: image.height,
    targetWidth: widthPt,
    targetHeight: heightPt,
  });

  page.pushOperators(pushGraphicsState(), ...buildClipOperators({ shape, xPt, yPt, widthPt, heightPt }));

  page.drawImage(image, {
    x: xPt + offsetX,
    y: yPt + offsetY,
    width: drawWidth,
    height: drawHeight,
  });

  page.pushOperators(popGraphicsState());
}

function buildClipOperators({ shape, xPt, yPt, widthPt, heightPt }) {
  if (shape === "circle") {
    return buildCircleClipOperators({ xPt, yPt, widthPt, heightPt });
  }
  return buildRectClipOperators({ xPt, yPt, widthPt, heightPt });
}

function buildRectClipOperators({ xPt, yPt, widthPt, heightPt }) {
  return [
    moveTo(xPt, yPt),
    lineTo(xPt + widthPt, yPt),
    lineTo(xPt + widthPt, yPt + heightPt),
    lineTo(xPt, yPt + heightPt),
    closePath(),
    clip(),
    endPath(),
  ];
}

function buildCircleClipOperators({ xPt, yPt, widthPt, heightPt }) {
  const cx = xPt + widthPt / 2;
  const cy = yPt + heightPt / 2;
  const rx = widthPt / 2;
  const ry = heightPt / 2;
  const ox = rx * CIRCLE_KAPPA;
  const oy = ry * CIRCLE_KAPPA;

  return [
    moveTo(cx + rx, cy),
    appendBezierCurve(cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry),
    appendBezierCurve(cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy),
    appendBezierCurve(cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry),
    appendBezierCurve(cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy),
    closePath(),
    clip(),
    endPath(),
  ];
}
