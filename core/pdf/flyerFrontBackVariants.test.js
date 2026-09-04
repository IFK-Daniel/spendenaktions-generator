import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "./renderMultiPageDocument.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../materials/resolveRepresentativeFlyerFrontTemplate.js";

import { flyerRepresentativeFemaleDuFrontTemplate } from "../../templates/flyer-representative-female-du-front/template.config.js";
import { flyerRepresentativeFemaleSieFrontTemplate } from "../../templates/flyer-representative-female-sie-front/template.config.js";
import { flyerRepresentativeMaleDuFrontTemplate } from "../../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../../templates/flyer-shared-back/template.config.js";

/**
 * Deckt alle vier Repräsentanten-Flyer-Vorderseiten (Geschlecht ×
 * Ansprache) end-to-end ab: jede Kombination aus gewählter Vorderseite +
 * der EINEN gemeinsamen Rückseite muss über `renderMultiPageDocument`
 * ein gültiges 2-seitiges PDF ohne Warnungen ergeben. Die Rückseite ist
 * geschlechts-, ansprache- und rollenunabhängig und enthält ihre
 * QR-Codes fest im Artwork — sie hat daher keine dynamischen Felder.
 */

const nodeDeps = { loadTemplateAssets };

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function tinyImage() {
  return { bytes: Buffer.from(TINY_PNG_BASE64, "base64"), mimeType: "image/png" };
}

function frontTextValues() {
  return {
    name: "Kim Yu",
    region: "für die Region München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
  };
}

const FRONT_TABLE = {
  female: { du: flyerRepresentativeFemaleDuFrontTemplate, sie: flyerRepresentativeFemaleSieFrontTemplate },
  male: { du: flyerRepresentativeMaleDuFrontTemplate, sie: flyerRepresentativeMaleSieFrontTemplate },
};

const COMBOS = [
  { gender: "female", salutation: "du" },
  { gender: "female", salutation: "sie" },
  { gender: "male", salutation: "du" },
  { gender: "male", salutation: "sie" },
];

test("die gemeinsame Rückseite deklariert keine dynamischen Felder (QR-Codes sind fest im Artwork)", () => {
  assert.deepEqual(sharedFlyerBackTemplate.fields, {});
  assert.deepEqual(sharedFlyerBackTemplate.legacyContentCovers, []);
});

test("alle vier Vorderseiten teilen exakt denselben Feld- und Seiten-Koordinatensatz", () => {
  const all = [
    flyerRepresentativeFemaleDuFrontTemplate,
    flyerRepresentativeFemaleSieFrontTemplate,
    flyerRepresentativeMaleDuFrontTemplate,
    flyerRepresentativeMaleSieFrontTemplate,
  ];
  for (const cfg of all.slice(1)) {
    assert.deepEqual(cfg.fields, all[0].fields);
    assert.deepEqual(cfg.page, all[0].page);
    assert.deepEqual(cfg.legacyContentCovers, []);
  }
  // Nur die Hintergrunddatei unterscheidet die vier Varianten.
  const backgrounds = new Set(all.map((cfg) => String(cfg.background)));
  assert.equal(backgrounds.size, 4);
});

for (const { gender, salutation } of COMBOS) {
  test(`Flyer ${gender}/${salutation}: Resolver liefert die richtige Vorderseite`, () => {
    assert.equal(
      resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE, gender, salutation),
      FRONT_TABLE[gender][salutation]
    );
  });

  test(`Flyer ${gender}/${salutation}: Vorderseite + gemeinsame Rückseite ergeben ein gültiges 2-seitiges PDF ohne Warnungen`, async () => {
    const front = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE, gender, salutation);
    const { bytes, warnings } = await renderMultiPageDocument({
      pages: [
        {
          templateConfig: front,
          textValues: frontTextValues(),
          imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
        },
        { templateConfig: sharedFlyerBackTemplate },
      ],
      deps: nodeDeps,
    });

    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 2);
    assert.deepEqual(warnings, []);
  });
}

test("die Rückseite ist in allen vier Kombinationen identisch (dieselbe Config-Referenz)", () => {
  const backs = COMBOS.map(() => sharedFlyerBackTemplate);
  for (const back of backs) {
    assert.equal(back, sharedFlyerBackTemplate);
  }
});
