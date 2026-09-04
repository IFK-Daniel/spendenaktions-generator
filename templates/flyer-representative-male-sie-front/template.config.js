import { buildRepresentativeFlyerFrontTemplate } from "../_shared/representativeFlyerFrontBase.js";

/**
 * Repräsentanten-Flyer – Vorderseite, männlich + Ansprache "Sie".
 * `background.pdf` = `Medien/Flyer_RepraesentantInnen_Männer_Sie_korrigiert.pdf`
 * (finaler Grafiker-Master, unverändert). Feld-/Seiten-/Cover-Angaben
 * aus `templates/_shared/representativeFlyerFrontBase.js`.
 */
export const flyerRepresentativeMaleSieFrontTemplate = buildRepresentativeFlyerFrontTemplate({
  key: "FLYER_FRONT_REPRESENTATIVE_MALE_SIE",
  label: "Repräsentanten-Flyer Vorderseite (männlich, Sie)",
  background: new URL("./background.pdf", import.meta.url),
});
