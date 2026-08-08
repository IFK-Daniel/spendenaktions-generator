import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "../core/pdf/renderMultiPageDocument.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { flyerPrintFrontTemplate } from "../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../templates/flyer-home-front/template.config.js";
import { flyerFemalePrintFrontTemplate } from "../templates/flyer-female-print-front/template.config.js";
import { flyerFemaleHomeFrontTemplate } from "../templates/flyer-female-home-front/template.config.js";
import { flyerPrintBackTemplate } from "../templates/flyer-print-back/template.config.js";
import { flyerHomeBackTemplate } from "../templates/flyer-home-back/template.config.js";
import { flyerFemalePrintBackTemplate } from "../templates/flyer-female-print-back/template.config.js";
import { flyerFemaleHomeBackTemplate } from "../templates/flyer-female-home-back/template.config.js";
import { buildGirocodePayload } from "../core/girocode/buildGirocodePayload.js";
import { QR_COLOR_GRUEN } from "../core/config/colors.js";
import { GIROCODE_DEFAULTS } from "../core/config/girocodeDefaults.js";

/**
 * Entwickler-Hilfsskript (nicht Teil von `npm test`): erzeugt aus den
 * echten Template-Configs eine Testmatrix aus zweiseitigen (Vorder- +
 * Rückseite) Flyer-PDFs für die Sichtprüfung — 3 Repräsentanten-
 * Datensätze × 4 Varianten (männlich/weiblich × Druckerei/Home). Nutzt
 * echte, scanbare QR-/GiroCodes (über das bestehende `qrcode`-Paket,
 * dieselbe Bibliothek wie `core/qr/generateQr.js`) und ein
 * synthetisches Testfoto mit farbigen Ecken, um die Kreis-Maskierung
 * sichtbar zu verifizieren. Die beiden Rückseiten-QR-Codes ("Partner
 * werden"/"Mehr erfahren") sind bewusst nur einmal erzeugt (statisch,
 * siehe `templates/flyer-print-back/template.config.js`).
 *
 * Erzeugt zusätzlich EIN kombiniertes Mehrseiten-PDF
 * (`flyer-alle-varianten-normalfall.pdf`), das alle vier Varianten des
 * "normalfall"-Datensatzes hintereinander enthält (2 Seiten je
 * Variante = 8 Seiten gesamt) — für schnelles Durchblättern ohne 12
 * Einzeldateien öffnen zu müssen.
 *
 * Aufruf: node scripts/render-flyer-test-matrix.mjs
 * Ausgabe: artifacts/flyer-preview/*.pdf
 */

const OUT_DIR = new URL("../artifacts/flyer-preview/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const photoBytes = readFileSync(new URL("./test-photo-source.png", OUT_DIR));

async function buildQrPng(text, color) {
  return QRCode.toBuffer(text, { width: 280, margin: 2, errorCorrectionLevel: "H", color: { dark: color, light: "#ffffff" } });
}

const paypalQrBytes = await buildQrPng("https://www.paypal.com/donate/?hosted_button_id=TESTBUTTON123", QR_COLOR_GRUEN);

// Statische Rückseiten-QR-Codes — dieselben Ziel-URLs wie in
// `src/intern/generator.js` (`FLYER_BACK_QR_PARTNER_WERDEN_URL`/
// `FLYER_BACK_QR_MEHR_ERFAHREN_URL`), hier ohne Logo-Overlay (reines
// Vorschauskript, kein Anspruch auf Branding-Pixel-Genauigkeit).
const qrPartnerWerdenBytes = await buildQrPng(
  "https://www.its-for-kids.de/spenden/partnerschaftsantrag-auswahl",
  QR_COLOR_GRUEN
);
const qrMehrErfahrenBytes = await buildQrPng("https://www.its-for-kids.de", QR_COLOR_GRUEN);
const backImageAssets = {
  qrPartnerWerden: { bytes: qrPartnerWerdenBytes, mimeType: "image/png" },
  qrMehrErfahren: { bytes: qrMehrErfahrenBytes, mimeType: "image/png" },
};

const CASES = [
  {
    id: "normalfall",
    textValues: {
      name: "Alexandra Mazur",
      region: "Hameln",
      regionInParagraph: "Hameln",
      phone: "0170 5802351",
      email: "a.manzur@its-for-kids.de",
    },
    ifkId: "IFK7QX1",
  },
  {
    id: "kurz",
    textValues: {
      name: "Kim Yu",
      region: "Wien",
      regionInParagraph: "Wien",
      phone: "+43 664 1234567",
      email: "kim.yu@example.com",
    },
    ifkId: "IFKAT02",
  },
  {
    id: "extremfall",
    textValues: {
      name: "Maximilian Bartholomäus-Schweighofer",
      region: "Landkreis Mecklenburgische Seenplatte",
      regionInParagraph: "Landkreis Mecklenburgische Seenplatte",
      phone: "0170 1234567890",
      email: "maximilian.bartholomaeus-schweighofer@stiftung-example.de",
    },
    ifkId: "IFKLONG9",
  },
];

const VARIANTS = [
  { id: "druckerei", front: flyerPrintFrontTemplate, back: flyerPrintBackTemplate },
  { id: "home", front: flyerHomeFrontTemplate, back: flyerHomeBackTemplate },
  { id: "druckerei-weiblich", front: flyerFemalePrintFrontTemplate, back: flyerFemalePrintBackTemplate },
  { id: "home-weiblich", front: flyerFemaleHomeFrontTemplate, back: flyerFemaleHomeBackTemplate },
];

const combinedDoc = await PDFDocument.create();

for (const testCase of CASES) {
  const giroPayload = buildGirocodePayload({
    empfaenger: GIROCODE_DEFAULTS.empfaenger,
    iban: GIROCODE_DEFAULTS.iban,
    bic: GIROCODE_DEFAULTS.bic,
    betrag: "",
    verwendungszweck: `${testCase.ifkId} Spende`,
  });
  const giroQrBytes = await buildQrPng(giroPayload, QR_COLOR_GRUEN);

  const frontImageAssets = {
    photo: { bytes: photoBytes, mimeType: "image/png" },
    qrPaypal: { bytes: paypalQrBytes, mimeType: "image/png" },
    qrGiro: { bytes: giroQrBytes, mimeType: "image/png" },
  };

  for (const variant of VARIANTS) {
    // Manche Vorlagen (siehe `flyer-female-print-front/template.config.js`)
    // erwarten im `region`-Feld den ganzen Satz "für die Region XXXX"
    // statt nur des Regionsnamens (`fields.region.regionPrefix`) — siehe
    // `buildFlyerTextValues` in `core/materials/generateFlyerMaterial.js`,
    // hier dieselbe Logik dupliziert, da dieses Skript unabhängig von
    // `generateFlyerMaterial` direkt mit den Template-Configs arbeitet.
    const regionPrefix = variant.front.fields.region?.regionPrefix ?? "";
    const textValues = { ...testCase.textValues, region: `${regionPrefix}${testCase.textValues.region}` };

    const { bytes, warnings } = await renderMultiPageDocument({
      pages: [
        { templateConfig: variant.front, textValues, imageAssets: frontImageAssets },
        { templateConfig: variant.back, imageAssets: backImageAssets },
      ],
      deps: { loadTemplateAssets },
    });
    const filename = `flyer-${testCase.id}-${variant.id}.pdf`;
    writeFileSync(new URL(filename, OUT_DIR), bytes);
    console.log(
      filename,
      "-",
      bytes.length,
      "bytes, 2 Seiten",
      warnings.length ? `WARNUNGEN: ${JSON.stringify(warnings)}` : "(keine Warnungen)"
    );

    if (testCase.id === "normalfall") {
      const doc = await PDFDocument.load(bytes);
      const copiedPages = await combinedDoc.copyPages(doc, [0, 1]);
      for (const page of copiedPages) combinedDoc.addPage(page);
    }
  }
}

const combinedFilename = "flyer-alle-varianten-normalfall.pdf";
writeFileSync(new URL(combinedFilename, OUT_DIR), await combinedDoc.save());
console.log(combinedFilename, "-", combinedDoc.getPageCount(), "Seiten (alle 4 Varianten, Datensatz 'normalfall')");

console.log("fertig ->", OUT_DIR.pathname);
