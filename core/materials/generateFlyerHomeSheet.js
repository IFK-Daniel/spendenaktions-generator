import { PDFDocument } from "pdf-lib";
import { renderFlyer } from "../pdf/renderFlyer.js";
import { imposePagesOnSheet } from "../pdf/imposePagesOnSheet.js";
import { buildFlyerTextValues } from "./buildFlyerTextValues.js";
import { buildFileContent } from "./buildFileContent.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

/**
 * Erzeugt die "Flyer Home"-Ausgabe: KEIN einzelnes DIN-A5-PDF mehr,
 * sondern ein druckfreundlicher DIN-A4-quer-Bogen (297×210mm), auf dem
 * je Seite zweimal dieselbe, unskalierte DIN-A5-Fläche sitzt:
 *
 *   Seite 1: Vorderseite (personalisiert) | Vorderseite (identisch)
 *   Seite 2: Rückseite (gemeinsam)        | Rückseite (identisch)
 *
 * Nach normalem Duplexdruck auf DIN-A4-quer und mittigem Durchschneiden
 * bei x=148,5mm entstehen daraus zwei identische, zweiseitige
 * DIN-A5-Flyer.
 *
 * ─────────────────────────────────────────────────────────────────
 * GEOMETRIE (siehe Vorgabe, geometrisch nachgerechnet):
 * Zwei DIN-A5-Flächen (je 148mm) nebeneinander = 296mm; DIN-A4-quer
 * ist 297mm breit → 1mm Rest, symmetrisch verteilt: 0,5mm Außenrand
 * links, A5 bis 148,5mm (Schnittmitte), A5 bis 296,5mm, 0,5mm
 * Außenrand rechts. Vertikal exakt 210mm (keine Anpassung nötig,
 * DIN-A5-Höhe = DIN-A4-quer-Höhe). Keine Skalierung der A5-Flächen
 * (siehe `core/pdf/imposePagesOnSheet.js`, Platzierung ohne
 * `widthMm`/`heightMm` → natürliche Quellgröße).
 *
 * DUPLEX-EINSTELLUNG (geometrisch hergeleitet, nicht angenommen):
 * Seite 1 und Seite 2 werden mit IDENTISCHEM Layout beschrieben (beide
 * Slots jeweils eine unveränderte, unmirrorte Kopie der jeweiligen
 * Vorlage) — bei einem landscape-Bogen (lange Kante = 297mm oben/unten)
 * ist die physikalisch korrekte Einstellung dafür "An der KURZEN Kante
 * wenden" (Short-Edge-Binding): diese Einstellung spiegelt den Bogen
 * links-rechts (nicht oben-unten), wodurch nach dem Umdrehen einer
 * A5-Hälfte (übliche Kartenbewegung: um die eigene vertikale
 * Mittelachse drehen) die Rückseite automatisch seitenrichtig UND
 * unspiegelt erscheint — zwei gegensätzliche Spiegelungen (Drucker-
 * Wende + Nutzer-Wende) heben sich auf. Mit "An der LANGEN Kante
 * wenden" stünde die Rückseite kopfüber UND gespiegelt. Diese Regel
 * deckt sich mit der etablierten Druck-Faustregel "Querformat → kurze
 * Kante, Hochformat → lange Kante". Die Anleitung
 * (`core/materials/companionMaterialGuide.js`, Abschnitt `flyerHome`)
 * nennt exakt diese Einstellung.
 * ─────────────────────────────────────────────────────────────────
 *
 * Schnittmarkierung: zwei sehr dezente, kurze graue Striche bei
 * x=148,5mm (oben/unten, je 3mm lang) — bewusst kein durchgehender
 * Strich durchs Artwork (Vorgabe: darf den Flyer nicht optisch
 * beeinträchtigen).
 *
 * @param {object} params
 * @param {{key: string, label: string, category: string, format: string, extension: string, filename: string}} params.entry
 *   Der `FLYER_HOME`-Eintrag (bereits ansprache-varianten-spezifisch
 *   benannt, siehe `buildFlyerVariantEntries`).
 * @param {object} params.frontTemplateConfig Vorderseiten-Template-Config
 *   (148×210mm, KEIN Beschnitt — dieselbe wie am Bildschirm/für
 *   `resolveRepresentativeFlyerFrontTemplate` aufgelöst).
 * @param {object} params.backTemplateConfig Die gemeinsame Rückseiten-
 *   Template-Config, ebenfalls ohne Beschnitt (`sharedFlyerBackTemplate`).
 * @param {object} params.person `manifest.person`.
 * @param {{bytes: Uint8Array, mimeType: string}} params.photoAsset
 * @param {{bytes: Uint8Array, mimeType: string}} params.qrPaypalAsset
 * @param {{bytes: Uint8Array, mimeType: string}} params.qrGiroAsset
 * @param {object} [params.deps]
 * @param {typeof renderFlyer} [params.deps.renderFlyer]
 * @param {typeof imposePagesOnSheet} [params.deps.imposePagesOnSheet]
 * @returns {Promise<{key: string, label: string, category: string, format: string, extension: string, filename: string, mimeType: "application/pdf", content: Blob | Uint8Array, size: number, warnings: Array<object>}>}
 */
export const HOME_SHEET_WIDTH_MM = 297;
export const HOME_SHEET_HEIGHT_MM = 210;
export const HOME_SLOT_WIDTH_MM = 148;
const HOME_OUTER_MARGIN_MM = 0.5;
export const HOME_CUT_X_MM = HOME_OUTER_MARGIN_MM + HOME_SLOT_WIDTH_MM; // 148.5

const CROP_MARK_LENGTH_MM = 3;
const CROP_MARK_COLOR = "#999999";
const CROP_MARK_WIDTH_PT = 0.5;

function homeCropMarks() {
  return [
    { x1Mm: HOME_CUT_X_MM, y1Mm: 0, x2Mm: HOME_CUT_X_MM, y2Mm: CROP_MARK_LENGTH_MM, colorHex: CROP_MARK_COLOR, widthPt: CROP_MARK_WIDTH_PT },
    {
      x1Mm: HOME_CUT_X_MM,
      y1Mm: HOME_SHEET_HEIGHT_MM - CROP_MARK_LENGTH_MM,
      x2Mm: HOME_CUT_X_MM,
      y2Mm: HOME_SHEET_HEIGHT_MM,
      colorHex: CROP_MARK_COLOR,
      widthPt: CROP_MARK_WIDTH_PT,
    },
  ];
}

function homeSlotPlacements() {
  return [
    { xMm: HOME_OUTER_MARGIN_MM, yMm: 0 },
    { xMm: HOME_CUT_X_MM, yMm: 0 },
  ];
}

export async function generateFlyerHomeSheet({
  entry,
  frontTemplateConfig,
  backTemplateConfig,
  person,
  photoAsset,
  qrPaypalAsset,
  qrGiroAsset,
  deps = {},
} = {}) {
  if (!entry || typeof entry.filename !== "string" || entry.filename.trim() === "") {
    throw new Error(`generateFlyerHomeSheet: fehlender Dateiname für Materialtyp "${entry?.key}" im Manifest.`);
  }
  if (entry.key !== MATERIAL_TYPE_KEYS.FLYER_HOME) {
    throw new Error(`generateFlyerHomeSheet: "${entry.key}" ist kein Home-Flyer-Materialtyp.`);
  }
  if (!photoAsset) {
    throw new Error("generateFlyerHomeSheet: 'photoAsset' ist für Flyer-Materialien erforderlich.");
  }
  if (!qrPaypalAsset || !qrGiroAsset) {
    throw new Error("generateFlyerHomeSheet: 'qrPaypalAsset' und 'qrGiroAsset' sind für Flyer-Materialien erforderlich.");
  }

  const {
    renderFlyer: renderFlyerFn = renderFlyer,
    imposePagesOnSheet: imposeFn = imposePagesOnSheet,
    ...renderDeps
  } = deps;

  const warnings = [];

  const front = await renderFlyerFn({
    templateConfig: frontTemplateConfig,
    textValues: buildFlyerTextValues(person, frontTemplateConfig),
    imageAssets: { photo: photoAsset, qrPaypal: qrPaypalAsset, qrGiro: qrGiroAsset },
    deps: renderDeps,
  });
  warnings.push(...front.warnings.map((w) => ({ ...w, pageIndex: 0 })));

  const back = await renderFlyerFn({
    templateConfig: backTemplateConfig,
    deps: renderDeps,
  });
  warnings.push(...back.warnings.map((w) => ({ ...w, pageIndex: 1 })));

  const frontSheet = await imposeFn({
    sourceBytes: front.bytes,
    sheetWidthMm: HOME_SHEET_WIDTH_MM,
    sheetHeightMm: HOME_SHEET_HEIGHT_MM,
    placements: homeSlotPlacements(),
    guideLines: homeCropMarks(),
  });
  const backSheet = await imposeFn({
    sourceBytes: back.bytes,
    sheetWidthMm: HOME_SHEET_WIDTH_MM,
    sheetHeightMm: HOME_SHEET_HEIGHT_MM,
    placements: homeSlotPlacements(),
    guideLines: homeCropMarks(),
  });

  const outDoc = await PDFDocument.create();
  for (const sheetBytes of [frontSheet.bytes, backSheet.bytes]) {
    const sheetDoc = await PDFDocument.load(sheetBytes);
    const [copiedPage] = await outDoc.copyPages(sheetDoc, [0]);
    outDoc.addPage(copiedPage);
  }
  const bytes = await outDoc.save();

  const { content, size } = buildFileContent(bytes, entry.filename, "application/pdf");

  return {
    key: entry.key,
    label: entry.label,
    category: entry.category,
    format: entry.format,
    extension: entry.extension,
    filename: entry.filename,
    mimeType: "application/pdf",
    content,
    size,
    warnings,
  };
}
