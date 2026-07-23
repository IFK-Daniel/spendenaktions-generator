const GENDER_DISPLAY_LABELS = {
  male: "männlich",
  female: "weiblich",
};

/**
 * Übersetzt den internen Geschlecht-Wert (`"male"`/`"female"`) in die
 * für Nutzer:innen sichtbare deutsche Bezeichnung — ausschließlich für
 * die Anzeige (z. B. Screenshot-Importvorschau). Der interne Wert
 * selbst bleibt überall unverändert `"male"`/`"female"` (u. a. weil
 * `core/materials/buildMaterialManifest.js` und die Formular-Radios
 * genau diese Werte erwarten).
 *
 * @param {string} value
 * @returns {string} Die deutsche Bezeichnung, oder der unveränderte
 *   Wert, falls er keinem der beiden bekannten internen Werte
 *   entspricht.
 */
export function genderDisplayLabel(value) {
  if (typeof value !== "string") return "";
  return GENDER_DISPLAY_LABELS[value] || value;
}
