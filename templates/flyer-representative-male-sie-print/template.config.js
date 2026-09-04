import { buildRepresentativeFlyerPrintTemplate } from "../_shared/representativeFlyerPrintBase.js";

/**
 * Repräsentanten-Flyer – DRUCKEREI-Vorderseite, männlich + Ansprache "Sie".
 * Siehe `templates/flyer-representative-female-du-print/template.config.js`.
 */
export const flyerRepresentativeMaleSiePrintTemplate = buildRepresentativeFlyerPrintTemplate({
  key: "FLYER_PRINT_REPRESENTATIVE_MALE_SIE",
  label: "Repräsentanten-Flyer Druckerei-Vorderseite (männlich, Sie)",
  background: new URL("./background.pdf", import.meta.url),
});
