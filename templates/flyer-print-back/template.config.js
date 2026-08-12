/**
 * Template-Config "Flyer Druckerei – Rückseite".
 *
 * Die Rückseite ist bewusst geschlechts- UND druckvarianten-
 * unabhängig: `Medien/Flyer_RepräsentantInnen_Rückseite.pdf` ist ein
 * einziger, generischer Master ("Wir schaffen Chancen für Kinder und
 * Jugendliche" — Mutwald, Teilhabe/Inklusion, Echthaarperücken,
 * Studien, Kreativspenden-Infokarten, Partner-Sektion), der für
 * männlich/weiblich UND Druckerei/Home gleichermaßen verwendet wird
 * (siehe `flyer-home-back`, `flyer-female-print-back`,
 * `flyer-female-home-back` — alle vier re-exportieren diese Config nur
 * mit anderem `key`/`label`, identisch zum Muster
 * `flyer-home-front.js` → `flyer-print-front.js`). Es gibt hier also
 * inhaltlich nur EINE Rückseite; die vier Dateien existieren trotzdem
 * getrennt, weil die Materialtyp-Architektur (siehe
 * `resolveFlyerTemplate` in `src/intern/generator.js`) pro
 * Materialschlüssel/Geschlecht eine eigene Config-Referenz erwartet.
 *
 * - `background.pdf` = Seite 0 von
 *   `Medien/Flyer_RepräsentantInnen_Rückseite.pdf`, unverändert
 *   übernommen. Per PyMuPDF geprüft: MediaBox = CropBox = TrimBox =
 *   419.528×595.276pt = 148.000×210.000mm, KEIN Anschnitt (identisch
 *   zum neuen weiblichen Vorderseiten-Master, siehe dortiger
 *   Kommentar) — auch hier deshalb `sourceBleedMm = 0` und
 *   `outputBleedMm = 0`.
 * - Enthielt ursprünglich zwei vom Grafiker leer gelassene weiße Boxen
 *   ("Partner werden" / "Mehr erfahren") für statische QR-Codes. Diese
 *   beiden QR-Codes wurden bewusst entfernt (Entscheidung: werden in
 *   einer künftigen Grafikversion vom Grafiker fest eingebaut, da nicht
 *   individualisiert) — `fields` enthält daher aktuell keine Einträge.
 *   Die Boxen selbst bleiben auf der Hintergrundgrafik sichtbar, werden
 *   aber vom Renderer nicht mehr befüllt.
 *
 * `legacyContentCovers: []` — der Rückseiten-Master enthält keine
 * personalisierten Felder (keine Name/Telefon/E-Mail-Platzhalter),
 * daher entfällt der gesamte Cover-Mechanismus hier von vornherein.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 0;
const OUTPUT_BLEED_MM = 0;

export const flyerPrintBackTemplate = Object.freeze({
  key: "FLYER_DRUCKEREI",
  label: "Flyer Druckerei – Rückseite",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: SOURCE_BLEED_MM,
    outputBleedMm: OUTPUT_BLEED_MM,
  }),
  fonts: Object.freeze({}),
  legacyContentCovers: Object.freeze([]),
  // Bewusst leer: die beiden statischen QR-Codes ("Partner werden" /
  // "Mehr erfahren") wurden entfernt, siehe Kommentar oben.
  fields: Object.freeze({}),
});
