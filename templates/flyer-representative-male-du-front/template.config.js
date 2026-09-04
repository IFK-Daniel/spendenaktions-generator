import { buildRepresentativeFlyerFrontTemplate } from "../_shared/representativeFlyerFrontBase.js";

/**
 * Repräsentanten-Flyer – Vorderseite, männlich + Ansprache "Du".
 * `background.pdf` = `Medien/Flyer_RepraesentantInnen_Maenner_Du_korrigiert.pdf`
 * (finaler Grafiker-Master, unverändert). Feld-/Seiten-/Cover-Angaben
 * aus `templates/_shared/representativeFlyerFrontBase.js`.
 */
export const flyerRepresentativeMaleDuFrontTemplate = buildRepresentativeFlyerFrontTemplate({
  key: "FLYER_FRONT_REPRESENTATIVE_MALE_DU",
  label: "Repräsentanten-Flyer Vorderseite (männlich, Du)",
  background: new URL("./background.pdf", import.meta.url),
});
