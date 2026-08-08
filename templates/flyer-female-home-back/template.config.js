import { flyerPrintBackTemplate } from "../flyer-print-back/template.config.js";

/**
 * Template-Config "Flyer Home – Rückseite (weiblich)".
 *
 * Inhaltlich identisch zu `flyer-print-back` (siehe dortiger
 * ausführlicher Kommentar) — die Rückseite ist geschlechts- und
 * druckvarianten-unabhängig, derselbe Master ohne jeden Anschnitt wird
 * hier nur mit eigenem `key`/`label`/`background` re-exportiert.
 * Eigener Ordner/eigene Datei existiert ausschließlich, damit
 * `resolveFlyerTemplate` (siehe `src/intern/generator.js`) pro
 * Materialschlüssel/Geschlecht eine eigene Config-Referenz hat.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const flyerFemaleHomeBackTemplate = Object.freeze({
  ...flyerPrintBackTemplate,
  key: "FLYER_HOME_FEMALE",
  label: "Flyer Home (weiblich) – Rückseite",
  background: BACKGROUND_URL,
});
