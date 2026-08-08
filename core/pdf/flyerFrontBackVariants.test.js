import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "./renderMultiPageDocument.js";
import { loadTemplateAssets } from "./loadTemplateAssets.js";

import { flyerPrintFrontTemplate } from "../../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../../templates/flyer-home-front/template.config.js";
import { flyerFemalePrintFrontTemplate } from "../../templates/flyer-female-print-front/template.config.js";
import { flyerFemaleHomeFrontTemplate } from "../../templates/flyer-female-home-front/template.config.js";
import { flyerPrintBackTemplate } from "../../templates/flyer-print-back/template.config.js";
import { flyerHomeBackTemplate } from "../../templates/flyer-home-back/template.config.js";
import { flyerFemalePrintBackTemplate } from "../../templates/flyer-female-print-back/template.config.js";
import { flyerFemaleHomeBackTemplate } from "../../templates/flyer-female-home-back/template.config.js";

/**
 * Deckt alle vier Flyer-Varianten (männlich/weiblich × Druckerei/Home)
 * end-to-end ab: jede Kombination aus Vorder- + Rückseiten-Template muss
 * über `renderMultiPageDocument` ein gültiges 2-seitiges PDF ergeben,
 * und jede Rückseiten-Config muss die beiden statischen QR-Bildfelder
 * (`qrPartnerWerden`, `qrMehrErfahren`) deklarieren.
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
    region: "München",
    regionInParagraph: "München",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
  };
}

const VARIANTS = [
  { id: "männlich-druckerei", front: flyerPrintFrontTemplate, back: flyerPrintBackTemplate },
  { id: "männlich-home", front: flyerHomeFrontTemplate, back: flyerHomeBackTemplate },
  { id: "weiblich-druckerei", front: flyerFemalePrintFrontTemplate, back: flyerFemalePrintBackTemplate },
  { id: "weiblich-home", front: flyerFemaleHomeFrontTemplate, back: flyerFemaleHomeBackTemplate },
];

for (const variant of VARIANTS) {
  test(`Flyer ${variant.id}: Rückseiten-Config deklariert qrPartnerWerden und qrMehrErfahren als Bildfelder`, () => {
    assert.equal(variant.back.fields.qrPartnerWerden.type, "image");
    assert.equal(variant.back.fields.qrMehrErfahren.type, "image");
  });

  test(`Flyer ${variant.id}: Front+Back ergeben zusammen ein gültiges 2-seitiges PDF ohne Warnungen`, async () => {
    const { bytes, warnings } = await renderMultiPageDocument({
      pages: [
        {
          templateConfig: variant.front,
          textValues: frontTextValues(),
          imageAssets: { photo: tinyImage(), qrPaypal: tinyImage(), qrGiro: tinyImage() },
        },
        {
          templateConfig: variant.back,
          imageAssets: { qrPartnerWerden: tinyImage(), qrMehrErfahren: tinyImage() },
        },
      ],
      deps: nodeDeps,
    });

    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 2);
    assert.deepEqual(warnings, []);
  });
}

test("alle vier Rückseiten-Configs teilen sich dieselben Feld-Koordinaten (ein gemeinsamer Master, siehe Template-Kommentar)", () => {
  assert.deepEqual(flyerPrintBackTemplate.fields, flyerHomeBackTemplate.fields);
  assert.deepEqual(flyerPrintBackTemplate.fields, flyerFemalePrintBackTemplate.fields);
  assert.deepEqual(flyerPrintBackTemplate.fields, flyerFemaleHomeBackTemplate.fields);
});
