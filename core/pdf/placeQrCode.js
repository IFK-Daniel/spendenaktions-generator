import { placeImage } from "./placeImage.js";

/**
 * Platziert einen QR-/GiroCode in der vorgesehenen Fläche. Dünner,
 * semantischer Wrapper um `placeImage.js` — die Größe kommt
 * ausschließlich aus `widthPt`/`heightPt` (aus der Template-Config),
 * es gibt keine im Code fest codierte QR-Größe.
 *
 * @param {object} params
 * @param {import("pdf-lib").PDFPage} params.page
 * @param {import("pdf-lib").PDFImage} params.image Bereits eingebettetes QR-Bild.
 * @param {number} params.xPt
 * @param {number} params.yPt
 * @param {number} params.widthPt
 * @param {number} params.heightPt
 */
export function placeQrCode({ page, image, xPt, yPt, widthPt, heightPt }) {
  placeImage({ page, image, xPt, yPt, widthPt, heightPt, shape: "rect" });
}
