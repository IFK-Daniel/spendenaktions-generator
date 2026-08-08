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
 * - Enthält zwei vom Grafiker absichtlich leer gelassene weiße Boxen
 *   ("Partner werden" / "Mehr erfahren"), vorgesehen für QR-Codes.
 *   Koordinaten per Pixelmessung ermittelt: Box "Partner werden"
 *   x 95.75-111.20mm, Box "Mehr erfahren" x 119.80-135.26mm, beide
 *   y 169.98-184.51mm (15.45mm breit × 14.53mm hoch). Der QR-Code
 *   selbst wird quadratisch auf die kleinere Dimension (Höhe,
 *   14.53mm) skaliert und horizontal in der Box zentriert, oben
 *   bündig zur Box (da die Höhe bereits exakt der Boxhöhe entspricht).
 *
 * WICHTIG:
 *
 * 1) Diese beiden QR-Codes sind STATISCH (nicht personalisiert) — sie
 *    zeigen für jede Repräsentantin/jeden Repräsentanten auf dieselbe
 *    Ziel-URL. Erzeugung erfolgt über den bestehenden
 *    `core/qr/generateQr.js`, siehe
 *    `core/materials/generateFlyerMaterial.js`. Ziel-URLs (User-
 *    bestätigt, siehe Konversation — bei Bedarf hier anpassen):
 *      - "Partner werden" → https://www.its-for-kids.de/spenden/partnerschaftsantrag-auswahl
 *      - "Mehr erfahren"  → https://www.its-for-kids.de
 * 2) `legacyContentCovers: []` — der Rückseiten-Master enthält keine
 *    personalisierten Felder (keine Name/Telefon/E-Mail-Platzhalter),
 *    daher entfällt der gesamte Cover-Mechanismus hier von vornherein.
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
  fields: Object.freeze({
    // Box "Partner werden": x 95.75-111.20mm, y 169.98-184.51mm,
    // 15.45×14.53mm — QR quadratisch auf 14.53mm (Boxhöhe), horizontal
    // zentriert: 95.75 + (15.45 - 14.53) / 2 = 96.21mm.
    qrPartnerWerden: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 96.21,
      yMm: 169.98,
      widthMm: 14.53,
      heightMm: 14.53,
    }),
    // Box "Mehr erfahren": x 119.80-135.26mm, y 169.98-184.51mm,
    // gleiche Logik: 119.80 + (15.46 - 14.53) / 2 = 120.27mm.
    qrMehrErfahren: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 120.27,
      yMm: 169.98,
      widthMm: 14.53,
      heightMm: 14.53,
    }),
  }),
});
