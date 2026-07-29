/**
 * Berechnet Skalierung und Position, um ein Bild proportional (ohne
 * Verzerrung) so zu skalieren, dass es eine Zielfläche vollständig
 * ausfüllt ("cover"), mittig zugeschnitten.
 *
 * Einheiten sind beliebig, solange source und target dieselbe Einheit
 * verwenden — das Ergebnis ist ein reiner Skalierungsfaktor plus ein
 * Versatz relativ zur linken unteren Ecke der Zielfläche.
 *
 * @param {object} params
 * @param {number} params.sourceWidth
 * @param {number} params.sourceHeight
 * @param {number} params.targetWidth
 * @param {number} params.targetHeight
 * @returns {{scale: number, drawWidth: number, drawHeight: number, offsetX: number, offsetY: number}}
 *   `offsetX`/`offsetY` sind relativ zur Zielfläche (können negativ sein,
 *   da das skalierte Bild größer als die Zielfläche ist und mittig
 *   überstehen soll, bevor es auf die Zielfläche geclippt wird).
 * @throws {Error} Bei nicht-positiven Maßen.
 */
export function centerCrop({ sourceWidth, sourceHeight, targetWidth, targetHeight }) {
  for (const [name, value] of Object.entries({ sourceWidth, sourceHeight, targetWidth, targetHeight })) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`centerCrop: '${name}' muss eine positive Zahl sein.`);
    }
  }

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  return { scale, drawWidth, drawHeight, offsetX, offsetY };
}
