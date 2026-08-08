import { flyerFemalePrintFrontTemplate } from "../flyer-female-print-front/template.config.js";

/**
 * Template-Config "Flyer Home – Vorderseite (weiblich)".
 *
 * Nutzt bewusst dieselben Feld-Koordinaten wie `flyer-female-print-front`
 * (identisches Layout) UND bewusst dieselbe `background.pdf` — der neue
 * Grafiker-Master (`Medien/Flyer_RepräsentantInnen_Frauen_Du.pdf`) hat
 * laut eigenen PDF-Metadaten überhaupt keinen Anschnitt (MediaBox =
 * CropBox = TrimBox, siehe Kommentar in `flyer-female-print-front`).
 * Es gibt also (noch) keine eigene Druckerei-Fassung mit 3mm Beschnitt
 * rundum, die sich von der Home-Fassung unterscheiden würde — beide
 * Varianten sind aktuell technisch identisch (`outputBleedMm: 0`).
 * Getrennte Ordner/Configs trotzdem beibehalten (Konsistenz mit dem
 * männlichen Pärchen `flyer-print-front`/`flyer-home-front` und der
 * Materialtyp-Architektur, die pro Schlüssel eine eigene Config
 * erwartet) — sobald der Grafiker eine echte Druckerei-Fassung mit
 * Anschnittmarken liefert, muss nur `flyer-female-print-front` (bzw.
 * dessen `background.pdf`/`sourceBleedMm`/`outputBleedMm`) angepasst
 * werden, diese Home-Variante bleibt unverändert.
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
