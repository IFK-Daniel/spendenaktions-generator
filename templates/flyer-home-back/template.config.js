import { flyerPrintBackTemplate } from "../flyer-print-back/template.config.js";

/**
 * Template-Config "Flyer Home – Rückseite".
 *
 * Inhaltlich identisch zu `flyer-print-back` (siehe dortiger
 * ausführlicher Kommentar) — die Rückseite ist geschlechts- und
 * druckvarianten-unabhängig, derselbe Master ohne jeden Anschnitt wird
 * hier nur mit eigenem `key`/`label`/`background` re-exportiert
 * (gleiches Muster wie `flyer-home-front` → `flyer-print-front`).
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const flyerHomeBackTemplate = Object.freeze({
  ...flyerPrintBackTemplate,
  key: "FLYER_HOME",
  label: "Flyer Home – Rückseite",
  background: BACKGROUND_URL,
});
