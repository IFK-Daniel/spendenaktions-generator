import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { mmToPt, ptToMm } from "./units.js";
import { trimCoordinateToPdfPoint } from "./coordinates.js";
import { coverRect } from "./coverRect.js";
import { placeText } from "./placeText.js";
import { placeMultiLineText } from "./placeMultiLineText.js";
import { placeImage } from "./placeImage.js";
import { hexToRgb } from "./hexToRgb.js";
import { loadTemplateAssets as defaultLoadTemplateAssets } from "./loadTemplateAssets.js";

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
 * @param {Record<string, {bytes: Uint8Array, mimeType: "image/png"|"image/jpeg"}>} [params.imageAssets]
 *   Bildbytes für alle Felder vom Typ `"image"`, indiziert nach
 *   Feldschlüssel.
 * @param {object} [params.deps] Injizierbare Abhängigkeiten für Tests.
 * @param {typeof defaultLoadTemplateAssets} [params.deps.loadTemplateAssets]
 * @returns {Promise<Uint8Array>} Die fertige PDF-Datei als Bytes.
 * @throws {Error} Bei fehlendem Bild-Asset für ein Bildfeld oder
 *   unbekanntem Feldtyp in der Config.
 */
export async function renderFlyer({ templateConfig, textValues = {}, imageAssets = {}, deps = {} } = {}) {
  const { loadTemplateAssets = defaultLoadTemplateAssets } = deps;
  const { backgroundBytes, fonts: fontAssets } = loadTemplateAssets(templateConfig);

  const pdfDoc = await PDFDocument.create();
  if (Object.values(fontAssets).some((font) => font.type === "file")) {
    pdfDoc.registerFontkit(fontkit);
  }

  const embeddedFonts = await embedFonts(pdfDoc, fontAssets);

  const { page, outputWidthPt, outputHeightPt } = await addBackgroundPage({ pdfDoc, backgroundBytes, templateConfig });
  const outputBleedMm = templateConfig.page.outputBleedMm;
  const outputHeightMm = ptToMm(outputHeightPt);

  drawLegacyContentCovers({ page, templateConfig, outputBleedMm, outputHeightMm });

  for (const [fieldKey, field] of Object.entries(templateConfig.fields ?? {})) {
    if (field.type === "text") {
      await drawTextField({ page, field, fieldKey, textValues, embeddedFonts, outputBleedMm, outputHeightMm });
    } else if (field.type === "image") {
      await drawImageField({ pdfDoc, page, field, fieldKey, imageAssets, outputBleedMm, outputHeightMm });
    } else {
      throw new Error(`renderFlyer: unbekannter Feldtyp "${field.type}" für Feld "${fieldKey}".`);
    }
  }

  return pdfDoc.save();
}

async function embedFonts(pdfDoc, fontAssets) {
  const embedded = {};
  for (const [fontKey, fontAsset] of Object.entries(fontAssets)) {
    embedded[fontKey] = await pdfDoc.embedFont(fontAsset.type === "file" ? fontAsset.bytes : fontAsset.name);
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
    placeMultiLineText({
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
    });
  } else {
    placeText({
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

  placeImage({ page, image, xPt, yPt: topPt - heightPt, widthPt, heightPt, shape: field.shape ?? "rect" });
}
