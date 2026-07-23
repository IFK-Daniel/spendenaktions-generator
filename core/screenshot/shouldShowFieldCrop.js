/**
 * Entscheidet, ob für ein Vorschau-Feld ein vergrößerter Bildausschnitt
 * der Originalzeile angezeigt werden soll. Reine Entscheidungslogik,
 * getrennt vom eigentlichen Zeichnen (`src/intern/generator.js`), damit
 * sie ohne Browser/Canvas testbar ist.
 *
 * Nur für tatsächlich prüfbedürftige Felder (`needs_review`) mit
 * verlässlicher Bounding-Box — nicht für `recognized` (nichts zu
 * prüfen) und nicht für `confirmed_empty`/`not_recognized` (kein
 * Wert vorhanden, ein Ausschnitt wäre irreführend).
 *
 * @param {{ status?: string, bbox?: object } | null | undefined} field
 * @returns {boolean}
 */
export function shouldShowFieldCrop(field) {
  if (!field) return false;
  return field.status === "needs_review" && !!field.bbox;
}
