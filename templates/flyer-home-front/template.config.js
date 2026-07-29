import { flyerPrintFrontTemplate } from "../flyer-print-front/template.config.js";

/**
 * Template-Config "Flyer Home – Vorderseite".
 *
 * Nutzt bewusst dieselben Feld- und Cover-Koordinaten wie
 * `flyer-print-front` (identisches Layout, dieselbe Quelldatei) — nur
 * `page.outputBleedMm` wird auf 0 gesetzt, wodurch `renderFlyer.js` die
 * Hintergrund-PDF beim Einbetten automatisch auf die reine Trim-Größe
 * (148×210 mm, ohne Beschnitt) zuschneidet. Es gibt aktuell keine
 * eigene, beschnittfreie Export-Datei vom Grafiker — sobald eine
 * vorliegt, kann `background` hier auf eine eigene Datei umgestellt
 * werden, ohne dass sich an den Feldkoordinaten etwas ändert.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const flyerHomeFrontTemplate = Object.freeze({
  ...flyerPrintFrontTemplate,
  key: "FLYER_HOME",
  label: "Flyer Home",
  background: BACKGROUND_URL,
  page: Object.freeze({
    ...flyerPrintFrontTemplate.page,
    outputBleedMm: 0,
  }),
});
