import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "../core/pdf/renderMultiPageDocument.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { generateFlyerHomeSheet } from "../core/materials/generateFlyerHomeSheet.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../core/materials/resolveRepresentativeFlyerFrontTemplate.js";
import { buildFlyerVariantEntries } from "../core/materials/buildFlyerVariantEntries.js";

import { flyerRepresentativeFemaleDuFrontTemplate } from "../templates/flyer-representative-female-du-front/template.config.js";
import { flyerRepresentativeFemaleSieFrontTemplate } from "../templates/flyer-representative-female-sie-front/template.config.js";
import { flyerRepresentativeMaleDuFrontTemplate } from "../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../templates/flyer-shared-back/template.config.js";

import { flyerRepresentativeFemaleDuPrintTemplate } from "../templates/flyer-representative-female-du-print/template.config.js";
import { flyerRepresentativeFemaleSiePrintTemplate } from "../templates/flyer-representative-female-sie-print/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../templates/flyer-representative-male-du-print/template.config.js";
import { flyerRepresentativeMaleSiePrintTemplate } from "../templates/flyer-representative-male-sie-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../templates/flyer-shared-back-print/template.config.js";

import { generateCompanionMaterialGuide } from "../core/materials/generateCompanionMaterialGuide.js";
import { loadFontFile } from "../core/pdf/loadFontFile.js";

/**
 * Entwickler-Hilfsskript (nicht Teil von `npm test`): erzeugt aus den
 * echten Template-Configs die Druckerei-Fassung (150×212mm, 1mm
 * Beschnitt) UND die neue Home-Fassung (DIN-A4-quer, 2× A5 imponiert)
 * für alle acht Geschlecht/Ansprache/Ausgabeart-Kombinationen, plus die
 * Begleit-Anleitung — für die Sichtprüfung.
 *
 * Ausgabe: artifacts/flyer-preview/*.pdf
 * (die PNG-Vergleichsartefakte erzeugt danach
 * `scripts/render-flyer-print-home-artifacts.py`)
 *
 * Aufruf: node scripts/render-flyer-print-home-artifacts.mjs
 */

const OUT_DIR = new URL("../artifacts/flyer-preview/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const photoBytes = readFileSync(new URL("./test-photo-source.png", OUT_DIR));

async function buildQrPng(text) {
  return QRCode.toBuffer(text, { width: 300, margin: 2, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#ffffff" } });
}

const FRONT_TABLE_HOME = {
  female: { du: flyerRepresentativeFemaleDuFrontTemplate, sie: flyerRepresentativeFemaleSieFrontTemplate },
  male: { du: flyerRepresentativeMaleDuFrontTemplate, sie: flyerRepresentativeMaleSieFrontTemplate },
};
const FRONT_TABLE_PRINT = {
  female: { du: flyerRepresentativeFemaleDuPrintTemplate, sie: flyerRepresentativeFemaleSiePrintTemplate },
  male: { du: flyerRepresentativeMaleDuPrintTemplate, sie: flyerRepresentativeMaleSiePrintTemplate },
};

const PEOPLE = {
  female: { firstName: "Alexandra", lastName: "Mazur", region: "Hameln", phone: "0170 5802351", email: "a.mazur@its-for-kids.de", ifkId: "IFK7QX1" },
  male: { firstName: "Daniel", lastName: "Feigenbutz", region: "München", phone: "089 12345678", email: "daniel.feigenbutz@its-for-kids.de", ifkId: "IFKDF001" },
};

const qrGiro = await buildQrPng("BCD002001DE12345678901234567890123");
const paypalQr = await buildQrPng("https://www.paypal.com/donate/?hosted_button_id=TESTBUTTON123");
const imageAssets = { photo: { bytes: photoBytes, mimeType: "image/png" }, qrPaypal: { bytes: paypalQr, mimeType: "image/png" }, qrGiro: { bytes: qrGiro, mimeType: "image/png" } };

const entries = {
  FLYER_DRUCKEREI: { key: "FLYER_DRUCKEREI", label: "Flyer Druckerei", category: "flyer", format: "pdf", extension: "pdf", filename: "IFK_Test_Flyer_Druckerei.pdf" },
  FLYER_HOME: { key: "FLYER_HOME", label: "Flyer Home", category: "flyer", format: "pdf", extension: "pdf", filename: "IFK_Test_Flyer_Home.pdf" },
};

for (const gender of ["female", "male"]) {
  const person = PEOPLE[gender];
  for (const salutation of ["du", "sie"]) {
    // --- Druckerei (150x212mm, Beschnitt) ---
    const printFront = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE_PRINT, gender, salutation);
    const regionPrefixPrint = printFront.fields.region?.regionPrefix ?? "";
    const textValues = {
      name: `${person.firstName} ${person.lastName}`,
      region: `${regionPrefixPrint}${person.region}`,
      regionInParagraph: person.region,
      phone: person.phone,
      email: person.email,
    };
    const { bytes: printBytes } = await renderMultiPageDocument({
      pages: [
        { templateConfig: printFront, textValues, imageAssets },
        { templateConfig: sharedFlyerBackPrintTemplate },
      ],
      deps: { loadTemplateAssets },
    });
    writeFileSync(new URL(`representative-${gender}-${salutation}-druckerei-bleed.pdf`, OUT_DIR), printBytes);

    // --- Home (DIN A4 quer, 2x A5 imponiert) ---
    const homeFront = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE_HOME, gender, salutation);
    const homeResult = await generateFlyerHomeSheet({
      entry: entries.FLYER_HOME,
      frontTemplateConfig: homeFront,
      backTemplateConfig: sharedFlyerBackTemplate,
      person: { firstName: person.firstName, lastName: person.lastName, region: person.region, phone: person.phone, email: person.email },
      photoAsset: imageAssets.photo,
      qrPaypalAsset: imageAssets.qrPaypal,
      qrGiroAsset: imageAssets.qrGiro,
      deps: { loadTemplateAssets },
    });
    const homeBuf = Buffer.from(await homeResult.content.arrayBuffer());
    writeFileSync(new URL(`representative-${gender}-${salutation}-home-a4.pdf`, OUT_DIR), homeBuf);

    console.log(`${gender}/${salutation}: Druckerei ${printBytes.length}B, Home ${homeBuf.length}B`);
  }
}

// Begleit-Anleitung
const guide = await generateCompanionMaterialGuide({ deps: { loadFontBytes: loadFontFile } });
const guideBuf = Buffer.from(await guide.content.arrayBuffer());
writeFileSync(new URL(guide.filename, OUT_DIR), guideBuf);
console.log(`${guide.filename}: ${guideBuf.length}B`);

console.log("fertig ->", OUT_DIR.pathname);
