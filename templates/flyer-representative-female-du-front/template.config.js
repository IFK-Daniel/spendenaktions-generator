import { buildRepresentativeFlyerFrontTemplate } from "../_shared/representativeFlyerFrontBase.js";

/**
 * Repräsentanten-Flyer – Vorderseite, weiblich + Ansprache "Du".
 * `background.pdf` = `Medien/Flyer_RepraesentantInnen_Frauen_Du_korrigiert.pdf`
 * (finaler Grafiker-Master, unverändert). Alle Feld-/Seiten-/Cover-
 * Angaben stammen aus `templates/_shared/representativeFlyerFrontBase.js`
 * (ein gemeinsamer Koordinatensatz für alle vier Varianten).
 */
export const flyerRepresentativeFemaleDuFrontTemplate = buildRepresentativeFlyerFrontTemplate({
  key: "FLYER_FRONT_REPRESENTATIVE_FEMALE_DU",
  label: "Repräsentanten-Flyer Vorderseite (weiblich, Du)",
  background: new URL("./background.pdf", import.meta.url),
});
