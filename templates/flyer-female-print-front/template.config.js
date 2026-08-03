/**
 * Template-Config "Flyer Druckerei – Vorderseite (weiblich)".
 *
 * `background.pdf` ist aus der vom Grafiker gelieferten
 * "Flyer_RepräsentantInnen_Seite01_2.Draft (mit Anschnittmarken).pdf"
 * (Medien/) erzeugt: Seite 0 (Vorderseite) auf ihre BleedBox
 * zugeschnitten (siehe dortige TrimBox/BleedBox-Metadaten — Trim
 * 148×210 mm, 3 mm Beschnitt rundum), Ursprung auf (0,0) verschoben —
 * exakt dieselbe Konvention wie `templates/flyer-print-front/background.pdf`.
 * Alle Feld-Koordinaten stammen unverändert aus der dazu gelieferten
 * "Koordinaten der Felder für Claude.pdf" (Medien/) und sind laut
 * Vorgabe verbindlich. X/Y messen ab der Trim-Kante der Seite (ohne
 * Beschnitt), Y von oben nach unten (InDesign-Konvention) —
 * `core/pdf/coordinates.js` rechnet das in pdf-lib-Punkte um.
 *
 * WICHTIG — bekannte, bewusst dokumentierte Übergangslösungen:
 *
 * 1) `legacyContentCovers` — die vom Grafiker gelieferte `background.pdf`
 *    ist kein leeres Master-Template, sondern enthält (wie schon bei
 *    `flyer-print-front`) unsichtbar wirkende Beispielinhalte
 *    ("Alexandra Mazur" / "Hameln" / Telefonnummer / E-Mail). Diese
 *    Texte werden von macOS Quick Look/`sips` NICHT gerendert (dort
 *    unsichtbar), tauchen aber nach dem Embedding über `pdf-lib`
 *    (`core/pdf/renderFlyer.js`, `addBackgroundPage`) sichtbar wieder
 *    auf — geprüft durch Testrender dieser Datei über dieselbe
 *    `embedPage`-Pipeline. `legacyContentCovers` deckt daher genau
 *    diese vier Textbereiche vor dem Zeichnen der echten Werte mit
 *    weißen Rechtecken ab. Koordinaten hergeleitet aus den
 *    entsprechenden Werten in `templates/flyer-print-front/
 *    template.config.js` (dort für dieselben Beispieltexte "Alexandra
 *    Mazur"/"Hameln"/"0170 5802351"/"a.manzur@its-for-kids.de" bereits
 *    vermessen) plus dem Versatz zwischen alter und neuer Feld-Position
 *    aus der neuen Koordinatenliste — NICHT erneut pixelgenau
 *    nachvermessen. Diese Deckflächen dürfen NICHT im Renderer
 *    (`core/pdf/renderFlyer.js`) hart codiert werden — sie gehören
 *    ausschließlich hierher.
 *    TODO(vor Produktion): Sobald der Grafiker ein wirklich leeres
 *    Master-PDF liefert, `background` auf die neue Datei umstellen und
 *    `legacyContentCovers` auf `[]` reduzieren.
 *
 * 2) Die Koordinatenliste gibt für Textfelder nur X/Y vor (Breite/Höhe
 *    sind laut Legende "variabel"), maxWidth/maxHeight/Schriftgrößen
 *    sind daher NICHT explizit vorgegeben. Da Seitengröße, Ränder und
 *    Feld-Positionen praktisch identisch zu `flyer-print-front` sind
 *    (siehe Diff der X/Y-Werte in der Konversation), werden dieselben
 *    maxWidth/maxHeight/Schriftgrößen wie dort übernommen.
 *
 * 3) Im Unterschied zu `flyer-print-front` entfällt das Feld
 *    `regionInParagraph` vollständig (siehe Vorgabe) — der Fließtext
 *    im neuen Master nennt die Region nicht mehr namentlich ("... in
 *    meiner Region vertreten ..." statt "... in der Region {Region}
 *    ..."), es gibt nur noch das eine `region`-Feld für den Satz
 *    "für die Region {Region}".
 *
 * 4) Ersatzschriften Noto Sans/Noto Sans Bold (siehe
 *    `assets/fonts/README.md`) — identisch zu `flyer-print-front`.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 3;
const OUTPUT_BLEED_MM = 3;

const TEXT_DARK_GREY = "#494D4D";

export const flyerFemalePrintFrontTemplate = Object.freeze({
  key: "FLYER_DRUCKEREI_FEMALE",
  label: "Flyer Druckerei (weiblich)",
  background: BACKGROUND_URL,
  page: Object.freeze({
    trimWidthMm: TRIM_WIDTH_MM,
    trimHeightMm: TRIM_HEIGHT_MM,
    sourceBleedMm: SOURCE_BLEED_MM,
    outputBleedMm: OUTPUT_BLEED_MM,
  }),
  fonts: Object.freeze({
    bold: Object.freeze({ type: "file", path: FONT_BOLD_URL }),
    regular: Object.freeze({ type: "file", path: FONT_REGULAR_URL }),
  }),
  // Weiße Deckflächen für die im geliefertem PDF vorhandenen
  // Beispielwerte (siehe Hinweis 1) oben). Reihenfolge: Name, Region,
  // Telefon, E-Mail.
  legacyContentCovers: Object.freeze([
    Object.freeze({ xMm: 43.34, yMm: 31.31, widthMm: 46.85, heightMm: 9.2, color: "#FFFFFF" }),
    Object.freeze({ xMm: 63.5, yMm: 47.0, widthMm: 20, heightMm: 5.8, color: "#FFFFFF" }),
    Object.freeze({ xMm: 18.5, yMm: 70.45, widthMm: 18.28, heightMm: 3.96, color: "#FFFFFF" }),
    Object.freeze({ xMm: 84.22, yMm: 70.45, widthMm: 30.84, heightMm: 3.96, color: "#FFFFFF" }),
  ]),
  fields: Object.freeze({
    photo: Object.freeze({
      type: "image",
      shape: "circle",
      xMm: 7.5,
      yMm: 32.5,
      widthMm: 31.9,
      heightMm: 31.9,
    }),
    name: Object.freeze({
      type: "text",
      multiline: true,
      xMm: 44.54,
      yMm: 34,
      maxWidthMm: 95.3,
      maxHeightMm: 7.0,
      font: "bold",
      startSizePt: 14,
      minSizePt: 8,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    region: Object.freeze({
      type: "text",
      xMm: 64.4,
      yMm: 49.55,
      maxWidthMm: 75.6,
      font: "regular",
      startSizePt: 9,
      minSizePt: 6,
      color: TEXT_DARK_GREY,
      align: "left",
      flagShrinkAsProvisional: true,
    }),
    phone: Object.freeze({
      type: "text",
      xMm: 19.7,
      yMm: 71.45,
      maxWidthMm: 52.9,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    email: Object.freeze({
      type: "text",
      xMm: 85.42,
      yMm: 71.45,
      maxWidthMm: 55.0,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    qrPaypal: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 14.6,
      yMm: 99.4,
      widthMm: 20,
      heightMm: 20,
    }),
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 81.221,
      yMm: 99.4,
      widthMm: 20,
      heightMm: 20,
    }),
  }),
});
