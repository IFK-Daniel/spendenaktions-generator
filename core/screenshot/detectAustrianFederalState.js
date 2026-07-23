const AUSTRIAN_FEDERAL_STATES = [
  "AT",
  "Burgenland",
  "Kärnten",
  "Niederösterreich",
  "Oberösterreich",
  "Salzburg",
  "Steiermark",
  "Tirol",
  "Vorarlberg",
  "Wien",
].map((value) => value.toLowerCase());

/**
 * Erkennt, ob ein erkanntes "Bundesland" tatsächlich ein
 * österreichisches Bundesland (oder das Länderkürzel "AT") ist —
 * fester, exakter Abgleich (case-insensitiv, getrimmt) gegen die neun
 * österreichischen Bundesländer plus "AT". Wird u. a. genutzt, um die
 * deutsche Telefonnummer-Umschreibung (`0…` statt `+49…`) für
 * österreichische Datensätze nicht fälschlich anzuwenden.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isAustrianFederalState(value) {
  if (typeof value !== "string") return false;
  return AUSTRIAN_FEDERAL_STATES.includes(value.trim().toLowerCase());
}
