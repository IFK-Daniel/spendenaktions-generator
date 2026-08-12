import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "./renderMultiPageDocument.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { flyerPrintBackTemplate } from "../../templates/flyer-print-back/template.config.js";
import { flyerFemalePrintFrontTemplate } from "../../templates/flyer-female-print-front/template.config.js";
import { flyerFemalePrintBackTemplate } from "../../templates/flyer-female-print-back/template.config.js";

const nodeDeps = { loadTemplateAssets };

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function tinyImage() {
  return { bytes: Buffer.from(TINY_PNG_BASE64, "base64"), mimeType: "image/png" };
}

function frontTextValues() {
  return {
    name: "Kim Yu",
    region: "München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
  };
}

test("renderMultiPageDocument wirft ohne 'pages'", async () => {
  await assert.rejects(() => renderMultiPageDocument({ deps: nodeDeps }), /pages/);
  await assert.rejects(() => renderMultiPageDocument({ pages: [], deps: nodeDeps }), /pages/);
});

test("renderMultiPageDocument mit einer Seite verhält sich wie renderFlyer (ein PDF mit einer Seite)", async () => {
  const { bytes, warnings } = await renderMultiPageDocument({
    pages: [
      {
        templateConfig: flyerPrintFrontTemplate,
        textValues: frontTextValues(),
        imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
      },
    ],
    deps: nodeDeps,
  });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  assert.deepEqual(warnings, []);
});

test("renderMultiPageDocument fügt Vorder- und Rückseite zu einem 2-seitigen PDF zusammen (männlich)", async () => {
  const { bytes, warnings } = await renderMultiPageDocument({
    pages: [
      {
        templateConfig: flyerPrintFrontTemplate,
        textValues: frontTextValues(),
        imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
      },
      {
        templateConfig: flyerPrintBackTemplate,
        imageAssets: { qrPartnerWerden: tinyImage(), qrMehrErfahren: tinyImage() },
      },
    ],
    deps: nodeDeps,
  });

  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  assert.deepEqual(warnings, []);

  // Beide Seiten müssen dieselbe Trim-Seitengröße haben (148x210mm, kein
  // Beschnitt bei diesem Materialpaar — flyerPrintFrontTemplate hat 3mm,
  // hier daher explizit unterschiedliche Größen zulässig geprüft).
  const frontSize = doc.getPage(0).getSize();
  const backSize = doc.getPage(1).getSize();
  assert.ok(Math.abs(backSize.width - (148 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(backSize.height - (210 / 25.4) * 72) < 0.5);
  assert.ok(frontSize.width > 0 && frontSize.height > 0);
});

test("renderMultiPageDocument fügt Vorder- und Rückseite zu einem 2-seitigen PDF zusammen (weiblich)", async () => {
  const { bytes, warnings } = await renderMultiPageDocument({
    pages: [
      {
        templateConfig: flyerFemalePrintFrontTemplate,
        textValues: frontTextValues(),
        imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
      },
      {
        templateConfig: flyerFemalePrintBackTemplate,
        imageAssets: { qrPartnerWerden: tinyImage(), qrMehrErfahren: tinyImage() },
      },
    ],
    deps: nodeDeps,
  });

  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  assert.deepEqual(warnings, []);
});

test("renderMultiPageDocument sammelt warnings pro Seite mit korrektem pageIndex", async () => {
  const { warnings } = await renderMultiPageDocument({
    pages: [
      {
        templateConfig: flyerPrintFrontTemplate,
        textValues: {
          ...frontTextValues(),
          region: "Landkreis Mecklenburgische Seenplatte",
          regionInParagraph: "Landkreis Mecklenburgische Seenplatte",
        },
        imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
      },
      {
        templateConfig: flyerPrintBackTemplate,
      },
    ],
    deps: nodeDeps,
  });

  assert.ok(warnings.length > 0);
  assert.ok(warnings.every((w) => w.pageIndex === 0));
});

test("renderMultiPageDocument rendert die Rückseite ohne Bild-Assets (statische QR-Codes entfernt, keine Bildfelder mehr)", async () => {
  const { bytes } = await renderMultiPageDocument({
    pages: [
      {
        templateConfig: flyerPrintFrontTemplate,
        textValues: frontTextValues(),
        imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
      },
      { templateConfig: flyerPrintBackTemplate, imageAssets: {} },
    ],
    deps: nodeDeps,
  });

  assert.ok(bytes.length > 0);
});
