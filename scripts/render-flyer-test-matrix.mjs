import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "../core/pdf/renderMultiPageDocument.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../core/materials/resolveRepresentativeFlyerFrontTemplate.js";
import { flyerRepresentativeFemaleDuFrontTemplate } from "../templates/flyer-representative-female-du-front/template.config.js";
import { flyerRepresentativeFemaleSieFrontTemplate } from "../templates/flyer-representative-female-sie-front/template.config.js";
import { flyerRepresentativeMaleDuFrontTemplate } from "../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../templates/flyer-shared-back/template.config.js";
import { buildGirocodePayload } from "../core/girocode/buildGirocodePayload.js";
import { GIROCODE_DEFAULTS } from "../core/config/girocodeDefaults.js";

/**
 * Entwickler-Hilfsskript (nicht Teil von `npm test`): erzeugt aus den
 * echten Template-Configs die vollständige Testmatrix zweiseitiger
 * Repräsentanten-Flyer.
 *
 * Achse 1: Geschlecht × Ansprache (vier final korrigierte Vorderseiten-
 * Master, aufgelöst über `resolveRepresentativeFlyerFrontTemplate`).
 * Achse 2: Druckerei / Home (technisch identisch, da die Master keinen
 * Anschnitt haben — `page.outputBleedMm` ist in beiden Fällen 0; die
 * Trennung bleibt für die spätere echte beschnittene Druckfassung).
 * Rückseite: immer dieselbe eine `sharedFlyerBackTemplate` (QR-Codes
 * fest im Artwork, keine dynamischen Felder).
 *
 * Testdaten: Daniel Feigenbutz (männlich) / Alexandra Mazur (weiblich),
 * jeweils für beide Anspracheformen. Nutzt echte, scanbare QR-/
 * GiroCodes (schwarz, ohne Logo-Overlay — reines Vorschauskript) und
 * das synthetische Testfoto mit farbigen Ecken zur Kontrolle der
 * Kreis-Maskierung.
 *
 * Ausgabe: artifacts/flyer-preview/representative-*.pdf sowie
 * artifacts/flyer-preview/representative-full-comparison.pdf (alle acht
 * Varianten hintereinander, 16 Seiten). Die PNG-Vergleichsartefakte
 * (Einzel-Vorderseiten, gemeinsame Rückseite, 2×2-Grid) erzeugt danach
 * `scripts/render-flyer-preview-artifacts.py`.
 *
 * Aufruf: node scripts/render-flyer-test-matrix.mjs
 */

const OUT_DIR = new URL("../artifacts/flyer-preview/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const photoBytes = readFileSync(new URL("./test-photo-source.png", OUT_DIR));

async function buildQrPng(text) {
  return QRCode.toBuffer(text, {
    width: 300,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

const FRONT_TABLE = {
  female: { du: flyerRepresentativeFemaleDuFrontTemplate, sie: flyerRepresentativeFemaleSieFrontTemplate },
  male: { du: flyerRepresentativeMaleDuFrontTemplate, sie: flyerRepresentativeMaleSieFrontTemplate },
};

const PEOPLE = {
  female: { firstName: "Alexandra", lastName: "Mazur", region: "Hameln", phone: "0170 5802351", email: "a.mazur@its-for-kids.de", ifkId: "IFK7QX1" },
  male: { firstName: "Daniel", lastName: "Feigenbutz", region: "München", phone: "089 12345678", email: "daniel.feigenbutz@its-for-kids.de", ifkId: "IFKDF07" },
};

const SALUTATIONS = ["du", "sie"];
const PRINT_VARIANTS = ["druckerei", "home"];

const paypalQrBytes = await buildQrPng("https://www.paypal.com/donate/?hosted_button_id=TESTBUTTON123");

const combinedDoc = await PDFDocument.create();

for (const gender of ["female", "male"]) {
  const person = PEOPLE[gender];
  const giroPayload = buildGirocodePayload({
    empfaenger: GIROCODE_DEFAULTS.empfaenger,
    iban: GIROCODE_DEFAULTS.iban,
    bic: GIROCODE_DEFAULTS.bic,
    betrag: "",
    verwendungszweck: `${person.ifkId} Spende`,
  });
  const giroQrBytes = await buildQrPng(giroPayload);
  const frontImageAssets = {
    photo: { bytes: photoBytes, mimeType: "image/png" },
    qrPaypal: { bytes: paypalQrBytes, mimeType: "image/png" },
    qrGiro: { bytes: giroQrBytes, mimeType: "image/png" },
  };

  for (const salutation of SALUTATIONS) {
    const front = resolveRepresentativeFlyerFrontTemplate(FRONT_TABLE, gender, salutation);
    const regionPrefix = front.fields.region?.regionPrefix ?? "";
    const textValues = {
      name: `${person.firstName} ${person.lastName}`,
      region: `${regionPrefix}${person.region}`,
      regionInParagraph: person.region,
      phone: person.phone,
      email: person.email,
    };

    for (const printVariant of PRINT_VARIANTS) {
      const { bytes, warnings } = await renderMultiPageDocument({
        pages: [
          { templateConfig: front, textValues, imageAssets: frontImageAssets },
          { templateConfig: sharedFlyerBackTemplate },
        ],
        deps: { loadTemplateAssets },
      });
      const filename = `representative-${gender}-${salutation}-${printVariant}.pdf`;
      writeFileSync(new URL(filename, OUT_DIR), bytes);
      console.log(
        filename,
        "-",
        bytes.length,
        "bytes, 2 Seiten",
        warnings.length ? `WARNUNGEN: ${JSON.stringify(warnings)}` : "(keine Warnungen)"
      );

      const doc = await PDFDocument.load(bytes);
      const copiedPages = await combinedDoc.copyPages(doc, [0, 1]);
      for (const page of copiedPages) combinedDoc.addPage(page);
    }
  }
}

const combinedFilename = "representative-full-comparison.pdf";
writeFileSync(new URL(combinedFilename, OUT_DIR), await combinedDoc.save());
console.log(combinedFilename, "-", combinedDoc.getPageCount(), "Seiten (alle acht Geschlecht/Ansprache/Druckvariante-Kombinationen)");

console.log("fertig ->", OUT_DIR.pathname);
