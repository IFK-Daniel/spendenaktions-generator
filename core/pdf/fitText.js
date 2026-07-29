/**
 * Ermittelt die größte Schriftgröße (zwischen `minSizePt` und
 * `startSizePt`), bei der `text` einzeilig in `maxWidthPt` passt.
 *
 * Passt der Text auch bei `minSizePt` nicht, wird `minSizePt`
 * zurückgegeben und `fits: false` gesetzt — der Aufrufer entscheidet,
 * ob er trotzdem zeichnet (Überlauf) oder umbricht. Es wird hier
 * bewusst nicht abgeschnitten.
 *
 * @param {object} params
 * @param {{widthOfTextAtSize: (text: string, size: number) => number}} params.font
 *   Ein pdf-lib `PDFFont` (oder ein Test-Double mit derselben Methode).
 * @param {string} params.text
 * @param {number} params.maxWidthPt
 * @param {number} params.startSizePt
 * @param {number} [params.minSizePt=6]
 * @param {number} [params.stepPt=0.25]
 * @returns {{sizePt: number, fits: boolean, widthPt: number}}
 */
export function fitText({ font, text, maxWidthPt, startSizePt, minSizePt = 6, stepPt = 0.25 }) {
  if (!font || typeof font.widthOfTextAtSize !== "function") {
    throw new Error("fitText: 'font' muss 'widthOfTextAtSize(text, size)' bereitstellen.");
  }
  if (typeof maxWidthPt !== "number" || maxWidthPt <= 0) {
    throw new Error("fitText: 'maxWidthPt' muss eine positive Zahl sein.");
  }
  if (typeof startSizePt !== "number" || startSizePt <= 0) {
    throw new Error("fitText: 'startSizePt' muss eine positive Zahl sein.");
  }

  let size = startSizePt;
  let width = font.widthOfTextAtSize(text, size);

  while (width > maxWidthPt && size > minSizePt) {
    size = Math.max(minSizePt, size - stepPt);
    width = font.widthOfTextAtSize(text, size);
  }

  return { sizePt: size, fits: width <= maxWidthPt, widthPt: width };
}
