import { flyerPrintBackTemplate } from "../flyer-print-back/template.config.js";

/**
 * Template-Config "Flyer Druckerei – Rückseite (weiblich)".
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

export const flyerFemalePrintBackTemplate = Object.freeze({
  ...flyerPrintBackTemplate,
  key: "FLYER_DRUCKEREI_FEMALE",
  label: "Flyer Druckerei (weiblich) – Rückseite",
  background: BACKGROUND_URL,
});
