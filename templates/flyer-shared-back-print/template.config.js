/**
 * Gemeinsame Flyer-RÜCKSEITE — DRUCKEREI-Fassung (mit 1mm
 * Beschnittzugabe, 150×212mm). Inhaltlich identisch zu
 * `templates/flyer-shared-back/template.config.js` (statisch, keine
 * dynamischen Felder, QR-Codes fest im Artwork) — nur die
 * Hintergrunddatei unterscheidet sich (Beschnitt statt reinem
 * 148×210mm-Trimformat).
 *
 * `background.pdf` per `scripts/build-flyer-print-bleed-backgrounds.py`
 * aus `templates/flyer-shared-back/background.pdf` erzeugt (siehe dort
 * für die Beschnitt-Erzeugungsmethode und
 * `templates/_shared/representativeFlyerPrintBase.js` für die
 * verbindliche Flyeralarm-Maßvorgabe).
 *
 * Rollen-/geschlechts-/ansprache-neutral wie die Home-Fassung — auch
 * hier EINE Datei für alle Wegbegleiter-Flyer, keine Kopie pro Rolle.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

export const sharedFlyerBackPrintTemplate = Object.freeze({
  key: "SHARED_FLYER_BACK_PRINT",
  label: "Flyer – gemeinsame Rückseite (Druckerei)",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: 148,
    trimHeightMm: 210,
    sourceBleedMm: 1,
    outputBleedMm: 1,
  }),
  fonts: Object.freeze({}),
  legacyContentCovers: Object.freeze([]),
  fields: Object.freeze({}),
});
