import { buildRepresentativeFlyerFrontTemplate } from "../_shared/representativeFlyerFrontBase.js";

/**
 * Repräsentanten-Flyer – Vorderseite, weiblich + Ansprache "Sie".
 * `background.pdf` = `Medien/Flyer_RepraesentantInnen_Frauen_Sie_korrigiert.pdf`
 * (finaler Grafiker-Master, unverändert). Feld-/Seiten-/Cover-Angaben
 * aus `templates/_shared/representativeFlyerFrontBase.js`.
 */
export const flyerRepresentativeFemaleSieFrontTemplate = buildRepresentativeFlyerFrontTemplate({
  key: "FLYER_FRONT_REPRESENTATIVE_FEMALE_SIE",
  label: "Repräsentanten-Flyer Vorderseite (weiblich, Sie)",
  background: new URL("./background.pdf", import.meta.url),
});
