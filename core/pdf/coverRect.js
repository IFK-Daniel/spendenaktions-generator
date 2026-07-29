/**
 * Zeichnet ein deckendes, einfarbiges Rechteck — verwendet, um in
 * einer Hintergrund-PDF bereits vorhandenen (statischen) Inhalt vor
 * dem Platzieren neuer Feldinhalte zu überdecken (siehe
 * `template.legacyContentCovers` in den Template-Configs).
 *
 * @param {object} params
 * @param {import("pdf-lib").PDFPage} params.page
 * @param {number} params.xPt
 * @param {number} params.yPt
 * @param {number} params.widthPt
 * @param {number} params.heightPt
 * @param {{r: number, g: number, b: number}} params.color
 */
export function coverRect({ page, xPt, yPt, widthPt, heightPt, color }) {
  page.drawRectangle({ x: xPt, y: yPt, width: widthPt, height: heightPt, color });
}
