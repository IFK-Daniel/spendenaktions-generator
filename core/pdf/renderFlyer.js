import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { mmToPt, ptToMm } from "./units.js";
import { trimCoordinateToPdfPoint } from "./coordinates.js";
import { coverRect } from "./coverRect.js";
import { placeText } from "./placeText.js";
import { placeMultiLineText } from "./placeMultiLineText.js";
import { placeImage } from "./placeImage.js";
import { hexToRgb } from "./hexToRgb.js";

/**
 * Rendert eine Template-Config (siehe `templates/*​/template.config.js`)
 * zusammen mit Textwerten und Bild-Assets zu einem fertigen PDF.
 *
 * Vorlagen-unabhängig: kennt weder "Flyer" noch konkrete Feldnamen —
 * iteriert ausschließlich generisch über `templateConfig.fields` und
 * ordnet Werte über die dortigen Feld-Schlüssel zu. Damit funktioniert
 * dieselbe Funktion für jede künftige Vorlage (Rückseite, Visitenkarte,
 * …), solange deren Config demselben Schema folgt.
 *
 * @param {object} params
 * @param {object} params.templateConfig
 * @param {Record<string, string>} [params.textValues] Werte für alle
 *   Felder vom Typ `"text"`, indiziert nach Feldschlüssel (z. B.
 *   `{ name: "Max Mustermann", region: "Hameln", ... }`). Fehlt ein
 *   Wert für ein vorhandenes Textfeld, wird eine leere Zeichenkette
 *   gezeichnet (kein Fehler) — Validierung der Repräsentantendaten
 *   selbst ist nicht Aufgabe dieses Moduls.
 * @param {Record<string, {bytes: Uint8Array, mimeType: "image/png"|"image/jpeg", crop?: {zoom?: number, offsetX?: number, offsetY?: number}}>} [params.imageAssets]
 *   Bildbytes für alle Felder vom Typ `"image"`, indiziert nach
 *   Feldschlüssel. Ein optionales `crop` (siehe `photoCrop.js`) ersetzt
 *   den automatischen Center-Crop durch einen manuell festgelegten
 *   Ausschnitt — generisch für jedes Bildfeld, unabhängig vom "Flyer".
 * @param {object} params.deps Abhängigkeiten — `loadTemplateAssets` ist
 *   PFLICHT (keine Node-`fs`-Vorbelegung, siehe unten).
 * @param {(templateConfig: object) => Promise<{backgroundBytes: Uint8Array, fonts: object}> | {backgroundBytes: Uint8Array, fonts: object}} params.deps.loadTemplateAssets
 *   Lädt Hintergrund-PDF und Schriftdateien einer Template-Config zu
 *   Bytes. Bewusst PFLICHT statt mit einem Node-`fs`-Default vorbelegt:
 *   `renderFlyer.js` läuft sowohl in Node (Tests/Skripte, siehe
 *   `core/pdf/loadTemplateAssets.js`) als auch im Browser (interner
 *   Materialgenerator, siehe `core/pdf/loadTemplateAssetsBrowser.js`)
 *   — ein Node-`fs`-Import als Default hätte den Browser-Build brechen
 *   lassen, selbst wenn er dort nie aufgerufen wird (Bundler bündeln
 *   den gesamten Modulgraphen). Jeder Aufrufer wählt daher explizit die
 *   passende Variante.
 * @returns {Promise<{bytes: Uint8Array, warnings: Array<{fieldKey: string, sizePt: number, minSizePt: number, reason: string}>}>}
 *   `warnings` enthält einen Eintrag pro Textfeld, das auch bei
 *   `minSizePt` nicht vollständig in seine Fläche passt (siehe
 *   `fitText.js`/`placeMultiLineText.js`, `fits: false`) — z. B. ein
 *   sehr langer Regionsname im Feld `regionInParagraph`. Ein PDF wird
 *   trotzdem erzeugt (kein Abschneiden), die Aufrufer-Oberfläche kann
 *   diese Warnungen nutzen, um das Ergebnis sichtbar als vorläufig zu
 *   kennzeichnen, statt es fälschlich als pixelgenau auszugeben.
 * @throws {Error} Bei fehlendem Bild-Asset für ein Bildfeld oder
 *   unbekanntem Feldtyp in der Config.
 */
export async function renderFlyer({ templateConfig, textValues = {}, imageAssets = {}, deps } = {}) {
  if (!deps || typeof deps.loadTemplateAssets !== "function") {
    throw new Error(
      "renderFlyer: 'deps.loadTemplateAssets' ist erforderlich (z. B. loadTemplateAssets.js in Node oder loadTemplateAssetsBrowser.js im Browser)."
    );
  }
  const { loadTemplateAssets } = deps;
  const { backgroundBytes, fonts: fontAssets } = await loadTemplateAssets(templateConfig);

  const pdfDoc = await PDFDocument.create();
  if (Object.values(fontAssets).some((font) => font.type === "file")) {
    pdfDoc.registerFontkit(fontkit);
  }

  const embeddedFonts = await embedFonts(pdfDoc, fontAssets);

  const { page, outputWidthPt, outputHeightPt } = await addBackgroundPage({ pdfDoc, backgroundBytes, templateConfig });
  const outputBleedMm = templateConfig.page.outputBleedMm;
  const outputHeightMm = ptToMm(outputHeightPt);

  drawLegacyContentCovers({ page, templateConfig, outputBleedMm, outputHeightMm });

  const warnings = [];
  for (const [fieldKey, field] of Object.entries(templateConfig.fields ?? {})) {
    if (field.type === "text") {
      const result = await drawTextField({
        page,
        field,
        fieldKey,
        textValues,
        embeddedFonts,
        outputBleedMm,
        outputHeightMm,
      });
      // Nahe an minSizePt (statt exakt gleich) prüfen, da fitText() in
      // stepPt-Schritten schrumpft und die Zielgröße dabei knapp über
      // minSizePt landen kann, ohne dass das am Ergebnis noch etwas ändert.
      const shrunkNearFloor =
        field.flagShrinkAsProvisional && result && result.sizePt <= field.minSizePt + 0.5;
      if (result && (result.fits === false || shrunkNearFloor)) {
        warnings.push({
          fieldKey,
          sizePt: result.sizePt,
          minSizePt: field.minSizePt,
          reason:
            result.fits === false
              ? "Text passt auch bei minSizePt nicht vollständig in die vorgesehene Fläche (kein Abschneiden, Ergebnis kann überlaufen)."
              : "Text wurde bis zur Mindestgröße geschrumpft — bei umgebendem statischem Text (siehe Template-Config) kein zuverlässig pixelgenauer Sitz garantiert.",
        });
      }
    } else if (field.type === "image") {
      await drawImageField({ pdfDoc, page, field, fieldKey, imageAssets, outputBleedMm, outputHeightMm });
    } else {
      throw new Error(`renderFlyer: unbekannter Feldtyp "${field.type}" für Feld "${fieldKey}".`);
    }
  }

  const bytes = await pdfDoc.save();
  return { bytes, warnings };
}

async function embedFonts(pdfDoc, fontAssets) {
  const embedded = {};
  for (const [fontKey, fontAsset] of Object.entries(fontAssets)) {
    // WICHTIG — `subset: true` bewusst NICHT verwenden: Diese Option
    // wurde kurzzeitig eingesetzt, um die Dateigröße zu reduzieren
    // (komplettes Font-File vs. nur benutzte Glyphen), hat aber einen
    // schweren Production-Bug verursacht — pdf-lib/fontkit weist beim
    // Subsetting Glyph-IDs inkonsistent zu, sobald derselbe Font sowohl
    // für reine Breitenmessung (`font.widthOfTextAtSize()`, aufgerufen
    // z. B. beim iterativen Auto-Shrink in `fitText.js`/
    // `placeMultiLineText.js`) ALS AUCH für das tatsächliche Zeichnen
    // (`page.drawText()`) verwendet wird: Ergebnis waren zerstörte
    // Texte (z. B. "Daniel Feigenbutz" -> nur "b", Telefonnummern/
    // E-Mail-Adressen zerstückelt, siehe
    // `artifacts/pdf-regression/` und Commit
    // "fix: restore pdf text integrity"). Dokumentintegrität hat
    // Vorrang vor Dateigröße — nicht ohne sehr sorgfältige Verifikation
    // wieder aktivieren.
    embedded[fontKey] =
      fontAsset.type === "file" ? await pdfDoc.embedFont(fontAsset.bytes) : await pdfDoc.embedFont(fontAsset.name);
  }
  return embedded;
}

async function addBackgroundPage({ pdfDoc, backgroundBytes, templateConfig }) {
  const { trimWidthMm, trimHeightMm, sourceBleedMm, outputBleedMm } = templateConfig.page;

  const sourceDoc = await PDFDocument.load(backgroundBytes);
  const sourcePage = sourceDoc.getPage(0);

  const cropOffsetPt = mmToPt(sourceBleedMm - outputBleedMm);
  const outputWidthPt = mmToPt(trimWidthMm + 2 * outputBleedMm);
  const outputHeightPt = mmToPt(trimHeightMm + 2 * outputBleedMm);

  const embeddedPage = await pdfDoc.embedPage(sourcePage, {
    left: cropOffsetPt,
    bottom: cropOffsetPt,
    right: cropOffsetPt + outputWidthPt,
    top: cropOffsetPt + outputHeightPt,
  });

  const page = pdfDoc.addPage([outputWidthPt, outputHeightPt]);
  page.drawPage(embeddedPage, { x: 0, y: 0 });

  return { page, outputWidthPt, outputHeightPt };
}

function drawLegacyContentCovers({ page, templateConfig, outputBleedMm, outputHeightMm }) {
  for (const cover of templateConfig.legacyContentCovers ?? []) {
    const { xPt, yPt: topPt } = trimCoordinateToPdfPoint({
      xMm: cover.xMm,
      yMm: cover.yMm,
      outputBleedMm,
      outputHeightMm,
    });
    const widthPt = mmToPt(cover.widthMm);
    const heightPt = mmToPt(cover.heightMm);
    coverRect({ page, xPt, yPt: topPt - heightPt, widthPt, heightPt, color: hexToRgb(cover.color) });
  }
}

async function drawTextField({ page, field, fieldKey, textValues, embeddedFonts, outputBleedMm, outputHeightMm }) {
  const font = embeddedFonts[field.font];
  if (!font) {
    throw new Error(`renderFlyer: unbekannte Schrift "${field.font}" für Feld "${fieldKey}".`);
  }
  const text = textValues[fieldKey] ?? "";
  const { xPt, yPt } = trimCoordinateToPdfPoint({
    xMm: field.xMm,
    yMm: field.yMm,
    outputBleedMm,
    outputHeightMm,
  });
  const maxWidthPt = mmToPt(field.maxWidthMm);
  const color = hexToRgb(field.color);

  if (field.multiline) {
    const { sizePt, lines } = placeMultiLineText({
      page,
      font,
      text,
      xPt,
      yPt,
      maxWidthPt,
      maxHeightPt: field.maxHeightMm ? mmToPt(field.maxHeightMm) : undefined,
      startSizePt: field.startSizePt,
      minSizePt: field.minSizePt,
      color,
      align: field.align,
      verticalAlign: field.verticalAlign,
      verticalOffsetPt: field.verticalOffsetMm ? mmToPt(field.verticalOffsetMm) : undefined,
    });
    const widestLineWidthPt = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, sizePt)));
    const fits = widestLineWidthPt <= maxWidthPt;
    return { sizePt, fits };
  }

  return placeText({
    page,
    font,
    text,
    xPt,
    yPt,
    maxWidthPt,
    startSizePt: field.startSizePt,
    minSizePt: field.minSizePt,
    color,
    align: field.align,
  });
}

async function drawImageField({ pdfDoc, page, field, fieldKey, imageAssets, outputBleedMm, outputHeightMm }) {
  const asset = imageAssets[fieldKey];
  if (!asset) {
    throw new Error(`renderFlyer: fehlendes Bild-Asset für Feld "${fieldKey}".`);
  }

  const image =
    asset.mimeType === "image/jpeg" ? await pdfDoc.embedJpg(asset.bytes) : await pdfDoc.embedPng(asset.bytes);

  const { xPt, yPt: topPt } = trimCoordinateToPdfPoint({
    xMm: field.xMm,
    yMm: field.yMm,
    outputBleedMm,
    outputHeightMm,
  });
  const widthPt = mmToPt(field.widthMm);
  const heightPt = mmToPt(field.heightMm);

  placeImage({
    page,
    image,
    xPt,
    yPt: topPt - heightPt,
    widthPt,
    heightPt,
    shape: field.shape ?? "rect",
    crop: asset.crop,
  });
}
