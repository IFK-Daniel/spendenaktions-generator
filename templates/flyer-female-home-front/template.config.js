import { flyerFemalePrintFrontTemplate } from "../flyer-female-print-front/template.config.js";

/**
 * Template-Config "Flyer Home – Vorderseite (weiblich)".
 *
 * Nutzt bewusst dieselben Feld- und Cover-Koordinaten wie
 * `flyer-female-print-front` (identisches Layout, dieselbe Quelle) —
 * verwendet aber eine eigene, echte beschnittfreie Export-Datei vom
 * Grafiker ("Flyer_RepräsentantInnen_Seite01_2.Draft.pdf", ohne
 * Anschnittmarken). `background.pdf` ist Seite 0 dieser Datei
 * (unverändert übernommen — ihre eigene MediaBox ist bereits
 * bleed-only, 154×216mm = Trim + 2×3mm, siehe PDF-Metadaten).
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const flyerFemaleHomeFrontTemplate = Object.freeze({
  ...flyerFemalePrintFrontTemplate,
  key: "FLYER_HOME_FEMALE",
  label: "Flyer Home (weiblich)",
  background: BACKGROUND_URL,
  page: Object.freeze({
    ...flyerFemalePrintFrontTemplate.page,
    outputBleedMm: 0,
  }),
});
