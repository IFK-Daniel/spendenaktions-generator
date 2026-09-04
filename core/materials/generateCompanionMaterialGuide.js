import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { COMPANION_MATERIAL_GUIDE_SECTIONS, COMPANION_MATERIAL_GUIDE_TITLE } from "./companionMaterialGuideContent.js";
import { wrapText } from "../pdf/wrapText.js";
import { mmToPt } from "../pdf/units.js";
import { hexToRgb } from "../pdf/hexToRgb.js";
import { buildFileContent } from "./buildFileContent.js";

const FONT_BOLD_URL = new URL("../../assets/fonts/NotoSans-Bold.ttf", import.meta.url);
const FONT_REGULAR_URL = new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url);

/** Dateiname der Anleitung — bewusst OHNE IFK-ID und OHNE Namen (kein personenbezogenes Dokument, siehe Vorgabe). */
export const COMPANION_MATERIAL_GUIDE_FILENAME = "Hinweise_zur_Verwendung_der_Materialien.pdf";
export const COMPANION_MATERIAL_GUIDE_KEY = "COMPANION_MATERIAL_GUIDE";
export const COMPANION_MATERIAL_GUIDE_LABEL = "Hinweise zur Verwendung der Materialien";

const IFK_GREEN = "#8CC140";
const TEXT_DARK_GREY = "#494D4D";
const WHITE = "#FFFFFF";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - 2 * MARGIN_MM;
const BANNER_HEIGHT_MM = 32;

const TITLE_SIZE_PT = 18;
const HEADING_SIZE_PT = 13;
const BODY_SIZE_PT = 10.5;
const LINE_HEIGHT_FACTOR = 1.35;
const SECTION_GAP_MM = 8;
const PARAGRAPH_GAP_MM = 3;

/**
 * Rendert die rollen-, geschlechts- und materialunabhängige Begleit-
 * Anleitung „Hinweise zur Verwendung Deiner Materialien" (Inhalt siehe
 * `companionMaterialGuideContent.js`) als eigenständiges, mehrseitiges
 * PDF (DIN A4 hoch) — reines pdf-lib-Text-Layout (kein Hintergrund-
 * Master, anders als die Flyer-/Urkunden-Vorlagen), da dieses Dokument
 * an keine Grafiker-Vorlage gebunden ist.
 *
 * KEIN personenbezogenes Dokument: die zurückgegebene Datei ist für
 * jeden Wegbegleiter identisch (kein Name, keine IFK-ID, keine
 * Kontaktdaten) — wird deshalb in `src/intern/generator.js` genau
 * EINMAL erzeugt, unabhängig davon, wie viele Ansprache-/Materialvarianten
 * ausgewählt sind (siehe dort).
 *
 * Modular über `COMPANION_MATERIAL_GUIDE_SECTIONS` (siehe
 * `companionMaterialGuideContent.js`) — ein weiterer Abschnitt (z. B.
 * für ein künftiges Material) erfordert keine Änderung an dieser
 * Rendering-Funktion.
 *
 * @param {object} [params]
 * @param {object} [params.deps]
 * @param {(url: URL) => Uint8Array | Promise<Uint8Array>} [params.deps.loadFontBytes]
 *   PFLICHT: lädt eine Schriftdatei zu Bytes — `core/pdf/loadFontFile.js`
 *   in Node, `core/pdf/loadFontFileBrowser.js` im Browser (analog zum
 *   `deps.loadTemplateAssets`-Muster in `renderFlyer.js`, bewusst ohne
 *   Node-`fs`-Default, damit der Browser-Build nicht bricht).
 * @returns {Promise<{key: string, label: string, category: "guide", format: "pdf", extension: "pdf", filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number}>}
 * @throws {Error} Wenn `deps.loadFontBytes` fehlt.
 */
export async function generateCompanionMaterialGuide({ deps = {} } = {}) {
  if (typeof deps.loadFontBytes !== "function") {
    throw new Error(
      "generateCompanionMaterialGuide: 'deps.loadFontBytes' ist erforderlich (z. B. loadFontFile.js in Node oder loadFontFileBrowser.js im Browser)."
    );
  }

  const [boldBytes, regularBytes] = await Promise.all([
    deps.loadFontBytes(FONT_BOLD_URL),
    deps.loadFontBytes(FONT_REGULAR_URL),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  // WICHTIG — `subset: true` bewusst NICHT verwenden: hat einen
  // schweren Production-Bug verursacht (zerstörte Texte, siehe
  // `core/pdf/renderFlyer.js` für die volle Erklärung und
  // `artifacts/pdf-regression/`). Diese Funktion bleibt als
  // Render-Quelle für künftige Neuerzeugungen der Anleitung erhalten,
  // die tatsächliche Produktivausgabe verwendet inzwischen aber ein
  // einmal geprüftes, statisches PDF (siehe
  // `core/materials/staticCompanionMaterialGuide.js`).
  const bold = await pdfDoc.embedFont(boldBytes);
  const regular = await pdfDoc.embedFont(regularBytes);

  const layout = new GuideLayout(pdfDoc, { bold, regular });
  layout.drawTitleBanner(COMPANION_MATERIAL_GUIDE_TITLE);

  for (const section of COMPANION_MATERIAL_GUIDE_SECTIONS) {
    layout.drawHeading(section.heading);
    for (const paragraph of section.paragraphs ?? []) {
      layout.drawParagraph(paragraph);
    }
    if (Array.isArray(section.steps) && section.steps.length > 0) {
      layout.drawOrderedList(section.steps);
    }
    for (const paragraph of section.closingParagraphs ?? []) {
      layout.drawParagraph(paragraph);
    }
    layout.addSectionGap();
  }

  const bytes = await pdfDoc.save();
  const { content, size } = buildFileContent(bytes, COMPANION_MATERIAL_GUIDE_FILENAME, "application/pdf");

  return {
    key: COMPANION_MATERIAL_GUIDE_KEY,
    label: COMPANION_MATERIAL_GUIDE_LABEL,
    category: "guide",
    format: "pdf",
    extension: "pdf",
    filename: COMPANION_MATERIAL_GUIDE_FILENAME,
    mimeType: "application/pdf",
    content,
    size,
  };
}

/**
 * Kleine, private Lauftext-Layout-Hilfe: platziert Überschriften/
 * Absätze/nummerierte Listen nacheinander auf einer oder mehreren
 * DIN-A4-Seiten, mit automatischem Seitenumbruch, sobald der
 * verbleibende Platz nicht mehr reicht. Bewusst nur innerhalb dieses
 * Moduls verwendet (kein allgemeiner Fließtext-Renderer für andere
 * Materialien) — eine generischere Lösung kann bei Bedarf später aus
 * dieser Klasse extrahiert werden.
 */
class GuideLayout {
  constructor(pdfDoc, fonts) {
    this.pdfDoc = pdfDoc;
    this.fonts = fonts;
    this.page = null;
    this.cursorMm = 0;
    this.addPage();
  }

  addPage() {
    const widthPt = mmToPt(PAGE_WIDTH_MM);
    const heightPt = mmToPt(PAGE_HEIGHT_MM);
    this.page = this.pdfDoc.addPage([widthPt, heightPt]);
    this.cursorMm = MARGIN_MM;
  }

  ensureSpace(neededMm) {
    if (this.cursorMm + neededMm > PAGE_HEIGHT_MM - MARGIN_MM) {
      this.addPage();
    }
  }

  drawTitleBanner(title) {
    const bannerHeightPt = mmToPt(BANNER_HEIGHT_MM);
    const pageHeightPt = mmToPt(PAGE_HEIGHT_MM);
    this.page.drawRectangle({
      x: 0,
      y: pageHeightPt - bannerHeightPt,
      width: mmToPt(PAGE_WIDTH_MM),
      height: bannerHeightPt,
      color: hexToRgb(IFK_GREEN),
    });

    // Vertikal im Banner zentriert: `topMm` = Abstand des Textblocks von
    // der Seitenoberkante (top-down, wie `this.cursorMm` überall sonst
    // in dieser Klasse) — nach unten wachsend pro Zeile, wie erwartet.
    const lines = wrapText({ font: this.fonts.bold, text: title, sizePt: TITLE_SIZE_PT, maxWidthPt: mmToPt(CONTENT_WIDTH_MM) });
    const lineHeightMmValue = lineHeightMm(TITLE_SIZE_PT);
    const blockHeightMm = lines.length * lineHeightMmValue;
    let topMm = BANNER_HEIGHT_MM / 2 - blockHeightMm / 2;
    for (const line of lines) {
      this.page.drawText(line, {
        x: mmToPt(MARGIN_MM),
        y: mmToPt(PAGE_HEIGHT_MM - topMm - (TITLE_SIZE_PT * 0.8) / (72 / 25.4)),
        size: TITLE_SIZE_PT,
        font: this.fonts.bold,
        color: hexToRgb(WHITE),
      });
      topMm += lineHeightMmValue;
    }
    this.cursorMm = BANNER_HEIGHT_MM + 14;
  }

  drawHeading(text) {
    this.ensureSpace(12);
    this.drawLine(text, { font: this.fonts.bold, sizePt: HEADING_SIZE_PT, color: IFK_GREEN });
    this.cursorMm += 4;
  }

  drawParagraph(text) {
    const lines = wrapText({ font: this.fonts.regular, text, sizePt: BODY_SIZE_PT, maxWidthPt: mmToPt(CONTENT_WIDTH_MM) });
    for (const line of lines) {
      this.drawLine(line, { font: this.fonts.regular, sizePt: BODY_SIZE_PT, color: TEXT_DARK_GREY });
    }
    this.cursorMm += PARAGRAPH_GAP_MM;
  }

  drawOrderedList(items) {
    items.forEach((item, index) => {
      const prefix = `${index + 1}. `;
      const maxWidthPt = mmToPt(CONTENT_WIDTH_MM) - mmToPt(6);
      const lines = wrapText({ font: this.fonts.regular, text: item, sizePt: BODY_SIZE_PT, maxWidthPt });
      lines.forEach((line, lineIndex) => {
        this.ensureSpace(lineHeightMm());
        this.page.drawText(lineIndex === 0 ? `${prefix}${line}` : line, {
          x: mmToPt(MARGIN_MM + (lineIndex === 0 ? 0 : 6)),
          y: mmToPt(PAGE_HEIGHT_MM - this.cursorMm - BODY_SIZE_PT * 0.8 / (72 / 25.4)),
          size: BODY_SIZE_PT,
          font: this.fonts.regular,
          color: hexToRgb(TEXT_DARK_GREY),
        });
        this.cursorMm += lineHeightMm();
      });
    });
    this.cursorMm += PARAGRAPH_GAP_MM;
  }

  drawLine(text, { font, sizePt, color }) {
    this.ensureSpace(lineHeightMm(sizePt));
    this.page.drawText(text, {
      x: mmToPt(MARGIN_MM),
      y: mmToPt(PAGE_HEIGHT_MM - this.cursorMm - (sizePt * 0.8) / (72 / 25.4)),
      size: sizePt,
      font,
      color: hexToRgb(color),
    });
    this.cursorMm += lineHeightMm(sizePt);
  }

  addSectionGap() {
    this.cursorMm += SECTION_GAP_MM;
  }
}

function lineHeightMm(sizePt = BODY_SIZE_PT) {
  return (sizePt * LINE_HEIGHT_FACTOR) / (72 / 25.4);
}


