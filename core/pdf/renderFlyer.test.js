import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderFlyer } from "./renderFlyer.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../../templates/flyer-home-front/template.config.js";

const nodeDeps = { loadTemplateAssets };

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

function sampleTextValues(overrides = {}) {
  return {
    name: "Kim Yu",
    region: "München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
    ...overrides,
  };
}

test("renderFlyer wirft ohne deps.loadTemplateAssets (kein impliziter Node-Default mehr, siehe Browser-Kompatibilität)", async () => {
  await assert.rejects(
    () =>
      renderFlyer({
        templateConfig: flyerPrintFrontTemplate,
        textValues: sampleTextValues(),
        imageAssets: tinyImageAssets(),
      }),
    /deps\.loadTemplateAssets/
  );
});

test("renderFlyer erzeugt aus der echten Print-Vorlage ein gültiges PDF mit korrekter Seitengröße (inkl. 3mm Beschnitt)", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });

  const result = await PDFDocument.load(bytes);
  assert.equal(result.getPageCount(), 1);
  assert.deepEqual(warnings, []);

  const page = result.getPage(0);
  const { width, height } = page.getSize();
  // 154 x 216 mm (148x210 Trim + 3mm Beschnitt rundum) in pt, Toleranz für Rundung.
  assert.ok(Math.abs(width - (154 / 25.4) * 72) < 0.5);
  assert.ok(Math.abs(height - (216 / 25.4) * 72) < 0.5);
});

test("renderFlyer erzeugt aus der Home-Vorlage eine Seite ohne Beschnitt (148x210mm)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: flyerHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
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
        deps: nodeDeps,
      }),
    /fehlendes Bild-Asset/
  );
});

test("renderFlyer akzeptiert leere textValues (keine Pflichtprüfung, leere Zeichenkette statt Fehler)", async () => {
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: {},
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
});

test("ein sehr langer Regionsname im Fließtext erzeugt eine warning statt stillschweigend zu überlaufen", async () => {
  const { bytes, warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues({
      region: "Landkreis Mecklenburgische Seenplatte",
      regionInParagraph: "Landkreis Mecklenburgische Seenplatte",
    }),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
  const fieldKeys = warnings.map((w) => w.fieldKey);
  assert.ok(fieldKeys.includes("regionInParagraph"), `erwartete Warnung für regionInParagraph, erhalten: ${fieldKeys}`);
});

test("ein extrem langer Name erzeugt keine Warnung (Auto-Shrink + 2-zeiliger Umbruch reichen)", async () => {
  const { warnings } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues({ name: "Maximilian Bartholomäus-Schweighofer" }),
    imageAssets: tinyImageAssets(),
    deps: nodeDeps,
  });
  const fieldKeys = warnings.map((w) => w.fieldKey);
  assert.ok(!fieldKeys.includes("name"), `unerwartete Warnung für name: ${JSON.stringify(warnings)}`);
});

test("ein manueller photoCrop am Bild-Asset wird berücksichtigt (kein Fehler, PDF entsteht weiterhin)", async () => {
  const assets = tinyImageAssets();
  assets.photo.crop = { zoom: 2, offsetX: 0.5, offsetY: -0.5 };
  const { bytes } = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });
  assert.ok(bytes.length > 0);
});

test("Home- und Druckerei-Vorlage erzeugen mit identischem photoCrop-Asset jeweils gültige PDFs (derselbe Ausschnitt wird durchgereicht)", async () => {
  const assets = tinyImageAssets();
  assets.photo.crop = { zoom: 1.8, offsetX: -1, offsetY: 1 };

  const print = await renderFlyer({
    templateConfig: flyerPrintFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });
  const home = await renderFlyer({
    templateConfig: flyerHomeFrontTemplate,
    textValues: sampleTextValues(),
    imageAssets: assets,
    deps: nodeDeps,
  });

  assert.ok(print.bytes.length > 0);
  assert.ok(home.bytes.length > 0);
});
