import { buildRepresentativeFlyerPrintTemplate } from "../_shared/representativeFlyerPrintBase.js";

/**
 * Repräsentanten-Flyer – DRUCKEREI-Vorderseite, männlich + Ansprache "Du".
 * Siehe `templates/flyer-representative-female-du-print/template.config.js`.
 */
export const flyerRepresentativeMaleDuPrintTemplate = buildRepresentativeFlyerPrintTemplate({
  key: "FLYER_PRINT_REPRESENTATIVE_MALE_DU",
  label: "Repräsentanten-Flyer Druckerei-Vorderseite (männlich, Du)",
  background: new URL("./background.pdf", import.meta.url),
});
