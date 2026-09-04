/**
 * Benennungs-Hilfe für automatisch erzeugte Flyer-ANSPRACHE-Varianten
 * (siehe `core/materials/roleConfig.js`, `flyerSalutationVariants` —
 * der Anwender wählt keine Ansprache aus, der Generator iteriert für
 * jedes Flyer-Material über alle konfigurierten Varianten).
 *
 * Baut aus dem bereits vorhandenen Basis-Dateinamen/-Label eines
 * Flyer-Materials (aus `buildMaterialFilenames.js`, unverändert) die
 * variantenspezifische Fassung — reine String-Erweiterung, keine
 * eigene Sanitizing-/Transliterationslogik (die des Basis-Dateinamens
 * gilt bereits).
 *
 * Beispiel: `IFK_Max_Mustermann_Flyer_Druckerei.pdf` + `"du"`
 * → `IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf`.
 */

/** Sichtbares/Dateinamens-Suffix je Ansprache-Variante. */
const VARIANT_SUFFIX_BY_KEY = Object.freeze({
  du: "Du",
  sie: "Sie",
});

function suffixFor(variant) {
  const suffix = VARIANT_SUFFIX_BY_KEY[variant];
  if (!suffix) {
    throw new Error(`buildFlyerVariantFilename: unbekannte Ansprache-Variante "${variant}".`);
  }
  return suffix;
}

/**
 * @param {string} baseFilename z. B. `IFK_Max_Mustermann_Flyer_Druckerei.pdf`.
 * @param {"du" | "sie"} variant
 * @returns {string} z. B. `IFK_Max_Mustermann_Flyer_Druckerei_Du.pdf`.
 * @throws {Error} Bei unbekannter Variante oder Dateiname ohne Endung.
 */
export function buildFlyerVariantFilename(baseFilename, variant) {
  const suffix = suffixFor(variant);
  const dotIndex = typeof baseFilename === "string" ? baseFilename.lastIndexOf(".") : -1;
  if (dotIndex <= 0) {
    throw new Error(`buildFlyerVariantFilename: ungültiger Basis-Dateiname "${baseFilename}".`);
  }
  return `${baseFilename.slice(0, dotIndex)}_${suffix}${baseFilename.slice(dotIndex)}`;
}

/**
 * @param {string} baseLabel z. B. `"Flyer Druckerei"`.
 * @param {"du" | "sie"} variant
 * @returns {string} z. B. `"Flyer Druckerei – Du"`.
 */
export function buildFlyerVariantLabel(baseLabel, variant) {
  return `${baseLabel} – ${suffixFor(variant)}`;
}
