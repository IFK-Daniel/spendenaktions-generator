/**
 * Gemeinsame, rollen-, geschlechts- UND ansprache-unabhängige
 * Flyer-RÜCKSEITE.
 *
 * `background.pdf` = `Medien/Flyer_Rueckseite.pdf` (finaler Grafiker-
 * Master, unverändert). Diese eine Rückseite gilt für den
 * Repräsentanten-Flyer und ist bewusst so modelliert, dass künftige
 * Wegbegleiter-Flyer (Botschafter, Kuratorium, Beirat, Fachrat,
 * Wirtschaftsrat) dieselbe Rückseite verwenden können — es wird KEINE
 * Kopie pro Rolle/Variante erzeugt. Der technische Schlüssel ist
 * deshalb neutral (`SHARED_FLYER_BACK`), nicht "representativeBack".
 *
 * Per PyMuPDF geprüft: MediaBox = CropBox = TrimBox = 419.528×595.276pt
 * = 148×210mm, KEIN Anschnitt (`sourceBleedMm = 0`, `outputBleedMm = 0`
 * — identisch zu den Vorderseiten-Mastern). Druckerei und Home nutzen
 * dieselbe Datei; der Unterschied bleibt technisch über
 * `page.outputBleedMm` / die generische Trim-/Bleed-Logik in
 * `core/pdf/renderFlyer.js`.
 *
 * STATISCHE QR-CODES: Der neue Master enthält die beiden QR-Codes
 * ("Mehr erfahren" / "Partner werden") bereits fest im Artwork (per
 * Rasterprüfung bestätigt) — sie sind NICHT individualisiert. `fields`
 * ist daher leer; der Renderer zeichnet nichts über die Rückseite.
 * (Die früher hier dynamisch erzeugten Rückseiten-QR-Felder
 * `qrPartnerWerden`/`qrMehrErfahren` entfallen damit endgültig.)
 *
 * `legacyContentCovers: []` — keine personalisierten Platzhalter auf
 * der Rückseite, der Cover-Mechanismus entfällt von vornherein.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 0;
const OUTPUT_BLEED_MM = 0;

export const SHARED_FLYER_BACK_KEY = "SHARED_FLYER_BACK";

export const sharedFlyerBackTemplate = Object.freeze({
  key: SHARED_FLYER_BACK_KEY,
  label: "Flyer – gemeinsame Rückseite",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: SOURCE_BLEED_MM,
    outputBleedMm: OUTPUT_BLEED_MM,
  }),
  fonts: Object.freeze({}),
  legacyContentCovers: Object.freeze([]),
  fields: Object.freeze({}),
});
