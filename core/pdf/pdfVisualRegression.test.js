import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderFlyer } from "./renderFlyer.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../../templates/certificate-representative-male/template.config.js";
import { loadStaticCompanionMaterialGuide } from "../materials/staticCompanionMaterialGuide.js";
import { loadFontFile } from "./loadFontFile.js";
import { comparePdfPageToGolden, isVisualDiffAvailable } from "./pdfVisualDiff.js";

/**
 * ECHTE visuelle Regressionstests — rendern kritische PDFs als Pixel-
 * bild (PyMuPDF, über `pdfVisualDiff.js`) und vergleichen sie gegen
 * eingecheckte Referenzbilder (`artifacts/pdf-regression/golden/`).
 *
 * WARUM diese Tests nötig sind (und reine Text-Extraktion NICHT
 * reicht): der `embedFont(..., { subset: true })`-Bug (siehe
 * `renderFlyer.js`) hat NUR die tatsächlich gerenderten Glyphen
 * zerstört — die im PDF eingebettete ToUnicode-CMap (die
 * `extractPdfText.js`/`pdfjs-dist` UND `PyMuPDF.get_text()` zum
 * Extrahieren nutzen) blieb korrekt. Ein Test, der nur den
 * extrahierten Text prüft, hätte "Daniel Feigenbutz" gemeldet, obwohl
 * auf der Seite sichtbar nur "b" stand. Nur echtes Pixel-Rendering
 * deckt das auf — verifiziert durch einen gezielten Rückbau-Test
 * während der Fehlerbehebung (siehe Commit
 * "fix: restore pdf text integrity").
 *
 * Voraussetzung: `python3` mit `PyMuPDF`/`Pillow`/`numpy` (kein
 * npm-Paket) — Tests überspringen sich selbst (`t.skip(...)`), wenn
 * das nicht verfügbar ist, statt Umgebungen ohne Python spurious rot
 * zu machen.
 *
 * Golden-Bilder neu erzeugen (nur nach GEPRÜFTER, gewollter visueller
 * Änderung!): `core/pdf/pdfVisualDiff.js`, `createGolden(...)`, oder
 * direkt `python3 scripts/pdf-visual-diff.py <pdf> <seite> <golden> --create`.
 */

const OUT_DIR = new URL("../../artifacts/pdf-regression/", import.meta.url);
const GOLDEN_DIR = new URL("golden/", OUT_DIR);
mkdirSync(fileURLToPath(GOLDEN_DIR), { recursive: true });

const TINY_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

function skipIfUnavailable(t) {
  if (!isVisualDiffAvailable()) {
    t.skip("python3 mit PyMuPDF/Pillow/numpy nicht verfügbar — visueller Regressionstest übersprungen");
    return true;
  }
  return false;
}

test("Visuelle Regression: Flyer mit dynamischem Text entspricht dem geprüften Referenzbild", async (t) => {
  if (skipIfUnavailable(t)) return;

  const imageAssets = {
    photo: { bytes: TINY_PNG_BYTES, mimeType: "image/png" },
    qrPaypal: { bytes: TINY_PNG_BYTES, mimeType: "image/png" },
    qrGiro: { bytes: TINY_PNG_BYTES, mimeType: "image/png" },
  };
  const textValues = {
    name: "Daniel Feigenbutz",
    region: "Düsseldorf",
    regionInParagraph: "Düsseldorf",
    phone: "015233795099",
    email: "d.feigenbutz@its-for-kids.de",
  };
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues,
    imageAssets,
    deps: { loadTemplateAssets },
  });

  const pdfPath = fileURLToPath(new URL("representative-flyer-daniel.pdf", OUT_DIR));
  writeFileSync(pdfPath, bytes);

  const result = comparePdfPageToGolden({
    pdfPath,
    pageIndex: 0,
    goldenPngPath: fileURLToPath(new URL("representative-flyer-daniel.png", GOLDEN_DIR)),
  });

  assert.ok(
    result.ok,
    `Flyer weicht visuell vom Referenzbild ab (meanDiff=${result.meanDiff}, maxDiff=${result.maxDiff}, error=${result.error}) — ` +
      `prüfe artifacts/pdf-regression/representative-flyer-daniel.pdf gegen artifacts/pdf-regression/golden/representative-flyer-daniel.png`
  );
});

test("Visuelle Regression: Urkunde mit langem Namen entspricht dem geprüften Referenzbild", async (t) => {
  if (skipIfUnavailable(t)) return;

  const { bytes } = await renderFlyer({
    templateConfig: certificateRepresentativeMaleTemplate,
    textValues: { name: "Maximilian Bartholomäus-Schweighofer" },
    imageAssets: {},
    deps: { loadTemplateAssets },
  });

  const pdfPath = fileURLToPath(new URL("representative-certificate-daniel.pdf", OUT_DIR));
  writeFileSync(pdfPath, bytes);

  const result = comparePdfPageToGolden({
    pdfPath,
    pageIndex: 0,
    goldenPngPath: fileURLToPath(new URL("representative-certificate-daniel.png", GOLDEN_DIR)),
    zoom: 1.5,
  });

  assert.ok(
    result.ok,
    `Urkunde weicht visuell vom Referenzbild ab (meanDiff=${result.meanDiff}, maxDiff=${result.maxDiff}, error=${result.error}) — ` +
      `prüfe artifacts/pdf-regression/representative-certificate-daniel.pdf gegen artifacts/pdf-regression/golden/representative-certificate-daniel.png`
  );
});

test("Visuelle Regression: statische Anleitung (Seite 1) entspricht dem geprüften Referenzbild", async (t) => {
  if (skipIfUnavailable(t)) return;

  const guide = await loadStaticCompanionMaterialGuide({ deps: { loadStaticBytes: loadFontFile } });
  const pdfPath = fileURLToPath(new URL("material-guide.pdf", OUT_DIR));
  writeFileSync(pdfPath, Buffer.from(await guide.content.arrayBuffer()));

  const result = comparePdfPageToGolden({
    pdfPath,
    pageIndex: 0,
    goldenPngPath: fileURLToPath(new URL("material-guide-page-1.png", GOLDEN_DIR)),
  });

  assert.ok(
    result.ok,
    `Anleitung weicht visuell vom Referenzbild ab (meanDiff=${result.meanDiff}, maxDiff=${result.maxDiff}, error=${result.error}) — ` +
      `prüfe artifacts/pdf-regression/material-guide.pdf gegen artifacts/pdf-regression/golden/material-guide-page-1.png`
  );
});
