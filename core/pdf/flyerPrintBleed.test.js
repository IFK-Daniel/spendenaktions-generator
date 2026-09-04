import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "./renderMultiPageDocument.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../materials/resolveRepresentativeFlyerFrontTemplate.js";

import { flyerRepresentativeFemaleDuPrintTemplate } from "../../templates/flyer-representative-female-du-print/template.config.js";
import { flyerRepresentativeFemaleSiePrintTemplate } from "../../templates/flyer-representative-female-sie-print/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../../templates/flyer-representative-male-du-print/template.config.js";
import { flyerRepresentativeMaleSiePrintTemplate } from "../../templates/flyer-representative-male-sie-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../../templates/flyer-shared-back-print/template.config.js";
import { mmToPt, ptToMm } from "./units.js";

/**
 * Deckt die Druckerei-Fassung des Repräsentanten-Flyers ab (siehe
 * Vorgabe, verbindliche Grundlage `Medien/flyer_a5_mass.pdf`):
 * 150×212mm Datenformat, 1mm Beschnittzugabe, 148×210mm Endformat —
 * für alle vier Geschlecht/Ansprache-Varianten UND die gemeinsame
 * Rückseite.
 */

const nodeDeps = { loadTemplateAssets };

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
function tinyImage() {
  return { bytes: Buffer.from(TINY_PNG_BASE64, "base64"), mimeType: "image/png" };
}

const FRONT_TABLE = {
  female: { du: flyerRepresentativeFemaleDuPrintTemplate, sie: flyerRepresentativeFemaleSiePrintTemplate },
  male: { du: flyerRepresentativeMaleDuPrintTemplate, sie: flyerRepresentativeMaleSiePrintTemplate },
};

const COMBOS = [
  { gender: "female", salutation: "du" },
  { gender: "female", salutation: "sie" },
  { gender: "male", salutation: "du" },
  { gender: "male", salutation: "sie" },
];

test("alle vier Druckerei-Vorderseiten und die Druckerei-Rückseite: 150x212mm Datenformat, 1mm Beschnitt, 148x210mm Endformat", () => {
  const all = [
    flyerRepresentativeFemaleDuPrintTemplate,
    flyerRepresentativeFemaleSiePrintTemplate,
    flyerRepresentativeMaleDuPrintTemplate,
    flyerRepresentativeMaleSiePrintTemplate,
    sharedFlyerBackPrintTemplate,
  ];
  for (const cfg of all) {
    assert.equal(cfg.page.trimWidthMm, 148, `${cfg.key}: Endformat-Breite`);
    assert.equal(cfg.page.trimHeightMm, 210, `${cfg.key}: Endformat-Höhe`);
    assert.equal(cfg.page.sourceBleedMm, 1, `${cfg.key}: Beschnitt Quelle`);
    assert.equal(cfg.page.outputBleedMm, 1, `${cfg.key}: Beschnitt Ausgabe`);
  }
});

test("alle vier Druckerei-Vorderseiten teilen denselben Feld-Koordinatensatz wie die Bildschirm-/Home-Fassung (keine Skalierung der Feldpositionen)", async () => {
  const { REPRESENTATIVE_FLYER_FRONT_FIELDS } = await import("../../templates/_shared/representativeFlyerFrontBase.js");
  for (const cfg of [
    flyerRepresentativeFemaleDuPrintTemplate,
    flyerRepresentativeFemaleSiePrintTemplate,
    flyerRepresentativeMaleDuPrintTemplate,
    flyerRepresentativeMaleSiePrintTemplate,
  ]) {
    assert.deepEqual(cfg.fields, REPRESENTATIVE_FLYER_FRONT_FIELDS);
  }
});

for (const { gender, salutation } of COMBOS) {
  test(`Druckerei ${gender}/${salutation}: Vorder- UND Rückseite sind je exakt 150x212mm (Datenformat), 2 Seiten, keine Warnungen`, async () => {
    const front = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE, gender, salutation);
    const { bytes, warnings } = await renderMultiPageDocument({
      pages: [
        {
          templateConfig: front,
          textValues: { name: "Kim Yu", region: "für die Region Wien", regionInParagraph: "Wien", phone: "0170 1234567", email: "kim.yu@example.com" },
          imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
        },
        { templateConfig: sharedFlyerBackPrintTemplate },
      ],
      deps: nodeDeps,
    });

    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 2);
    assert.deepEqual(warnings, []);
    for (const page of doc.getPages()) {
      assert.ok(Math.abs(ptToMm(page.getWidth()) - 150) < 0.05, "Seitenbreite 150mm");
      assert.ok(Math.abs(ptToMm(page.getHeight()) - 212) < 0.05, "Seitenhöhe 212mm");
    }
  });
}

test("Front- und Rückseite haben exakt dieselbe Seitengröße (Vorgabe: prüfen, dass beide übereinstimmen)", async () => {
  const front = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE, "female", "du");
  const { bytes } = await renderMultiPageDocument({
    pages: [
      { templateConfig: front, textValues: {}, imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() } },
      { templateConfig: sharedFlyerBackPrintTemplate },
    ],
    deps: nodeDeps,
  });
  const doc = await PDFDocument.load(bytes);
  const [p1, p2] = doc.getPages();
  assert.equal(p1.getWidth(), p2.getWidth());
  assert.equal(p1.getHeight(), p2.getHeight());
});

test("keine legacyContentCovers bei den Druckerei-Vorlagen (Master sind leer, siehe representativeFlyerPrintBase.js)", () => {
  for (const cfg of [
    flyerRepresentativeFemaleDuPrintTemplate,
    flyerRepresentativeFemaleSiePrintTemplate,
    flyerRepresentativeMaleDuPrintTemplate,
    flyerRepresentativeMaleSiePrintTemplate,
    sharedFlyerBackPrintTemplate,
  ]) {
    assert.deepEqual(cfg.legacyContentCovers, []);
  }
});
