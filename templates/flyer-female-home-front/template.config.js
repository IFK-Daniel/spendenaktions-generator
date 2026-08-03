import { flyerFemalePrintFrontTemplate } from "../flyer-female-print-front/template.config.js";

/**
 * Template-Config "Flyer Home – Vorderseite (weiblich)".
 *
 * Nutzt bewusst dieselben Feld- und Cover-Koordinaten wie
 * `flyer-female-print-front` (identisches Layout, dieselbe Quelle) —
 * verwendet aber eine eigene, echte beschnittfreie Export-Datei vom
 * Grafiker ("Flyer_RepräsentantInnen_Seite01_2.Draft.pdf", ohne
 * Anschnittmarken) statt wie bei den männlichen Templates die
 * Druck-Datei mit `outputBleedMm = 0` weiterzuverwenden. `background.pdf`
 * ist Seite 0 dieser Datei (bereits bleed-only, 154×216 mm = Trim +
 * 2×3 mm), unverändert übernommen.
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
