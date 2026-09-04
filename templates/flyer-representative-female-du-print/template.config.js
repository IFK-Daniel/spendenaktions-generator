import { buildRepresentativeFlyerPrintTemplate } from "../_shared/representativeFlyerPrintBase.js";

/**
 * Repräsentanten-Flyer – DRUCKEREI-Vorderseite, weiblich + Ansprache "Du".
 * `background.pdf` = per `scripts/build-flyer-print-bleed-backgrounds.py`
 * aus `templates/flyer-representative-female-du-front/background.pdf`
 * erzeugte 150×212mm-Fassung mit 1mm Beschnittzugabe (siehe
 * `templates/_shared/representativeFlyerPrintBase.js`).
 */
export const flyerRepresentativeFemaleDuPrintTemplate = buildRepresentativeFlyerPrintTemplate({
  key: "FLYER_PRINT_REPRESENTATIVE_FEMALE_DU",
  label: "Repräsentanten-Flyer Druckerei-Vorderseite (weiblich, Du)",
  background: new URL("./background.pdf", import.meta.url),
});
