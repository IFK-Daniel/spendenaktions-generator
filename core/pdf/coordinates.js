import { mmToPt } from "./units.js";

/**
 * Wandelt eine Grafiker-Koordinate (X/Y ab der Trim-Kante der Seite,
 * Y von oben nach unten, wie in InDesign) in eine pdf-lib-Position um
 * (Ursprung unten links, Y nach oben).
 *
 * `outputBleedMm` ist der Beschnitt, der auf der tatsächlich erzeugten
 * Ausgabeseite noch vorhanden ist (z. B. 3 für Druck, 0 für Home) —
 * unabhängig vom Beschnitt der Hintergrund-PDF-Quelldatei selbst.
 *
 * @param {object} params
 * @param {number} params.xMm
 * @param {number} params.yMm
 * @param {number} params.outputBleedMm
 * @param {number} params.outputHeightMm Gesamthöhe der Ausgabeseite (Trim + 2×Beschnitt).
 * @returns {{xPt: number, yPt: number}}
 */
export function trimCoordinateToPdfPoint({ xMm, yMm, outputBleedMm, outputHeightMm }) {
  const xPt = mmToPt(xMm + outputBleedMm);
  const yFromTopPt = mmToPt(yMm + outputBleedMm);
  const yPt = mmToPt(outputHeightMm) - yFromTopPt;
  return { xPt, yPt };
}
