import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderFlyer } from "./renderFlyer.js";
import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../../templates/flyer-home-front/template.config.js";

// 1x1-Pixel weißes PNG als Platzhalter für Foto/QR-Codes in Tests.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function tinyImageAssets() {
  const bytes = Buffer.from(TINY_PNG_BASE64, "base64");
  return {
    photo: { bytes, mimeType: "image/png" },
    qrPaypal: { bytes, mimeType: "image/png" },
    qrGiro: { bytes, mimeType: "image/png" },
  };
}

function sampleTextValues() {
  return {
    name: "Kim Yu",
    region: "München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
  };
}

test("renderFlyer erzeugt aus der echten Print-Vorlage ein gültiges, mehrseitiges PDF mit korrekter Seitengröße (inkl. 3mm Beschnitt)", async () => {
  const bytes = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
  });

  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 1);

  const page = result.getPage(0);
  const { width, height } = page.getSize();
  // 154 x 216 mm (148x210 Trim + 3mm Beschnitt rundum) in pt, Toleranz für Rundung.
  assert.ok(Math.abs(width - (154 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (216 / 25.4) * 72) < 0.5);
});

test("renderFlyer erzeugt aus der Home-Vorlage eine Seite ohne Beschnitt (148x210mm)", async () => {
  const bytes = await renderFlyer({
    templateConfig: flyerHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
  });

  const result = await PDFDocument.load(bytes);
  const page = result.getPage(0);
  const { width, height } = page.getSize();
  assert.ok(Math.abs(width - (148 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (210 / 25.4) * 72) < 0.5);
});

test("renderFlyer wirft bei fehlendem Bild-Asset für ein Bildfeld", async () => {
  await assert.rejects(
    () =>
      renderFlyer({
        templateConfig: flyerPrintFrontTemplate,
        textValues: sampleTextValues(),
        imageAssets: {},
      }),
    /fehlendes Bild-Asset/
  );
});

test("renderFlyer akzeptiert leere textValues (keine Pflichtprüfung, leere Zeichenkette statt Fehler)", async () => {
  const bytes = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: {},
    imageAssets: tinyImageAssets(),
  });
  assert.ok(bytes.length > 0);
});
