/**
 * Template-Config "Flyer Druckerei – Vorderseite".
 *
 * Alle Koordinaten stammen unverändert aus der vom Grafiker gelieferten
 * "Koordinaten der Felder für Claude.pdf" (Medien/) und sind laut
 * Vorgabe verbindlich. Sie sind gegen die gelieferte Hintergrund-PDF
 * geometrisch geprüft (siehe Analyse in der Konversation): X/Y messen
 * ab der Trim-Kante der Seite (ohne Beschnitt), Y von oben nach unten
 * (InDesign-Konvention). `core/pdf/coordinates.js` rechnet das in
 * pdf-lib-Punkte um.
 *
 * WICHTIG — bekannte, bewusst dokumentierte Übergangslösungen (Stand:
 * technischer Prototyp, siehe Konversation):
 *
 * 1) ÜBERGANGSLÖSUNG "legacyContentCovers" — NUR FÜR DEN TECHNISCHEN TEST.
 *    `background.pdf` ist kein leeres Master-Template, sondern das vom
 *    Grafiker gelieferte Beispiel-PDF (bereits mit "Alexandra Mazur" /
 *    "Hameln" / Telefonnummer / E-Mail befüllt). `legacyContentCovers`
 *    deckt genau diese fünf Textbereiche vor dem Zeichnen der echten
 *    Werte mit weißen Rechtecken ab (Koordinaten aus der tatsächlichen
 *    Textposition im Beispiel-PDF vermessen, NICHT aus der
 *    Koordinatenliste des Grafikers). Diese Deckflächen dürfen NICHT im
 *    Renderer (`core/pdf/renderFlyer.js`) hart codiert oder dort um
 *    weitere Flächen ergänzt werden — sie gehören ausschließlich hierher.
 *    TODO(vor Produktion): Sobald der Grafiker ein leeres Master-PDF
 *    liefert, `background` auf die neue Datei umstellen und
 *    `legacyContentCovers` auf ein leeres Array (`[]`) reduzieren — an
 *    `fields` ändert sich dabei nichts.
 *
 * 2) ÜBERGANGSLÖSUNG "Ersatzschriften" — Noto Sans / Noto Sans Bold /
 *    Noto Serif (SIL Open Font License, von Grafiker in `Medien/Noto.zip`
 *    geliefert, siehe `assets/fonts/README.md`) werden anstelle der im
 *    Original-Flyer verwendeten Schriften "Droid Sans" / "Droid Sans
 *    Bold" / "Droid Serif" eingesetzt. Metrisch nicht identisch — bitte
 *    vom Grafiker folgende Original-Dateien anfordern:
 *      - Droid Sans Regular (.ttf)
 *      - Droid Sans Bold (.ttf)
 *      - Droid Serif Regular (.ttf)
 *    TODO(vor Produktion): Dateien unter `assets/fonts/` ablegen und in
 *    `fonts` unten die `path`-Werte austauschen — an der
 *    Platzierungslogik ändert sich dabei nichts.
 *
 * 3) Das zweite Vorkommen des Regionsnamens im Fließtext ("...in der
 *    Region {Region} zu vertreten...", Feld `regionInParagraph`) ist
 *    NICHT Teil der ursprünglichen Koordinatenliste, sondern wurde auf
 *    Wunsch als zweites Feld ergänzt (Koordinate aus dem Beispiel-PDF
 *    vermessen, siehe `fields.regionInParagraph` unten). Da der Text
 *    drumherum statisch ist (kein Umbruch möglich, ohne den Satz zu
 *    verschieben), passt bei deutlich längeren Regionsnamen als
 *    "Hameln" (z. B. "Landkreis Mecklenburgische Seenplatte") nur
 *    Auto-Shrink bis `minSizePt` — reicht das nicht, kollidiert der
 *    Text sichtbar mit dem nachfolgenden Wort "zu". `renderFlyer.js`
 *    meldet das über den zurückgegebenen `warnings`-Eintrag für dieses
 *    Feld (`fits: false`); die Oberfläche zeigt darauf einen "vorläufig,
 *    nicht pixelgenau"-Hinweis. NICHT final pixelgenau, bis ein
 *    Master-Template mit eigener Textbox für diese Stelle vorliegt.
 */

const BACKGROUND_URL = new URL("./background.pdf", import.meta.url);
// Bewusst als volle, literale `new URL(...)`-Aufrufe (nicht über eine
// gemeinsame Verzeichnis-Variable zusammengesetzt) — Vite erkennt das
// Asset-URL-Muster nur bei einem literalen Pfad-String im selben
// Aufruf und bündelt die Datei sonst nicht in den Browser-Build.
const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);
const FONT_SERIF_URL = new URL("../../assets/fonts/NotoSerif-Regular.ttf", import.meta.url);

const TRIM_WIDTH_MM = 148;
const TRIM_HEIGHT_MM = 210;
const SOURCE_BLEED_MM = 3;
const OUTPUT_BLEED_MM = 3;

const TEXT_DARK_GREY = "#494D4D";

export const flyerPrintFrontTemplate = Object.freeze({
  key: "FLYER_DRUCKEREI",
  label: "Flyer Druckerei",
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
    serif: Object.freeze({ type: "file", path: FONT_SERIF_URL }),
  }),
  // Weiße Deckflächen für die im Beispiel-PDF bereits vorhandenen
  // Textwerte (siehe Hinweis oben). Reihenfolge: Name, Region-Kopfzeile,
  // Region im Fließtext, Telefon, E-Mail.
  legacyContentCovers: Object.freeze([
    Object.freeze({ xMm: 43.5, yMm: 31.01, widthMm: 46.85, heightMm: 9.2, color: "#FFFFFF" }),
    Object.freeze({ xMm: 64.25, yMm: 47.45, widthMm: 12.5, heightMm: 6.69, color: "#FFFFFF" }),
    Object.freeze({ xMm: 115.61, yMm: 55.04, widthMm: 8.83, heightMm: 3.16, color: "#FFFFFF" }),
    Object.freeze({ xMm: 18.5, yMm: 70.45, widthMm: 18.28, heightMm: 3.96, color: "#FFFFFF" }),
    Object.freeze({ xMm: 82.92, yMm: 70.45, widthMm: 30.84, heightMm: 3.96, color: "#FFFFFF" }),
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
      xMm: 44.7,
      yMm: 33.7,
      maxWidthMm: 95.3,
      // Verfügbare Höhe bis zur nächsten statischen Zeile ("Repräsentant(in)
      // der Stiftung..."), siehe legacyContentCovers-Herleitung — genug für
      // ca. 2 Zeilen bei minSizePt, absichtlich knapp bemessen.
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
      // Bleibt rechnerisch innerhalb der Seite (maxWidthMm ist so
      // gewählt, dass die rechte Kante immer vor der Trim-Kante liegt),
      // kann bei sehr langen Regionsnamen aber gedrängt wirken — bei
      // Erreichen von minSizePt ebenfalls als vorläufig markieren.
      flagShrinkAsProvisional: true,
    }),
    regionInParagraph: Object.freeze({
      type: "text",
      xMm: 115.91,
      yMm: 55.24,
      maxWidthMm: 30,
      font: "serif",
      startSizePt: 6,
      minSizePt: 4,
      color: TEXT_DARK_GREY,
      align: "left",
      // Siehe Hinweis 3) oben: statischer Text drumherum kann nicht
      // umbrechen. Erreicht dieses Feld minSizePt, ist das ein
      // zuverlässiges Signal für einen riskanten/nicht pixelgenauen
      // Sitz (mögliche Kollision mit dem folgenden Wort "zu") — auch
      // wenn `fits` technisch `true` zurückgibt. renderFlyer.js meldet
      // das dann als `warnings`-Eintrag.
      flagShrinkAsProvisional: true,
    }),
    phone: Object.freeze({
      type: "text",
      xMm: 19.7,
      yMm: 71.45,
      maxWidthMm: 56.4,
      font: "regular",
      startSizePt: 7,
      minSizePt: 5,
      color: TEXT_DARK_GREY,
      align: "left",
    }),
    email: Object.freeze({
      type: "text",
      xMm: 84.12,
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
      xMm: 12.7,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
    qrGiro: Object.freeze({
      type: "image",
      shape: "rect",
      xMm: 79.321,
      yMm: 98.4,
      widthMm: 20,
      heightMm: 20,
    }),
  }),
});
