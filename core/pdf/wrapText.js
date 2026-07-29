/**
 * Bricht `text` an Wortgrenzen in Zeilen um, die jeweils `maxWidthPt`
 * bei `sizePt` nicht überschreiten (greedy line breaking).
 *
 * Ein einzelnes Wort, das für sich allein bereits breiter als
 * `maxWidthPt` ist, wird nicht innerhalb des Wortes getrennt (keine
 * Silbentrennung) — es bildet stattdessen eine eigene, überlange Zeile.
 *
 * @param {object} params
 * @param {{widthOfTextAtSize: (text: string, size: number) => number}} params.font
 * @param {string} params.text
 * @param {number} params.sizePt
 * @param {number} params.maxWidthPt
 * @returns {string[]} Die umgebrochenen Zeilen, mindestens eine (leerer Text → `[""]`).
 */
export function wrapText({ font, text, sizePt, maxWidthPt }) {
  if (!font || typeof font.widthOfTextAtSize !== "function") {
    throw new Error("wrapText: 'font' muss 'widthOfTextAtSize(text, size)' bereitstellen.");
  }
  if (typeof maxWidthPt !== "number" || maxWidthPt <= 0) {
    throw new Error("wrapText: 'maxWidthPt' muss eine positive Zahl sein.");
  }

  const words = (text ?? "").split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine === "" ? word : `${currentLine} ${word}`;
    const candidateWidth = font.widthOfTextAtSize(candidate, sizePt);

    if (candidateWidth <= maxWidthPt || currentLine === "") {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines;
}
