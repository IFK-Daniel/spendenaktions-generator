import { buildRepresentativeFlyerPrintTemplate } from "../_shared/representativeFlyerPrintBase.js";

/**
 * Repräsentanten-Flyer – DRUCKEREI-Vorderseite, weiblich + Ansprache "Sie".
 * Siehe `templates/flyer-representative-female-du-print/template.config.js`.
 */
export const flyerRepresentativeFemaleSiePrintTemplate = buildRepresentativeFlyerPrintTemplate({
  key: "FLYER_PRINT_REPRESENTATIVE_FEMALE_SIE",
  label: "Repräsentanten-Flyer Druckerei-Vorderseite (weiblich, Sie)",
  background: new URL("./background.pdf", import.meta.url),
});
