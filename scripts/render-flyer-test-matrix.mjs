import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import QRCode from "qrcode";
import { renderFlyer } from "../core/pdf/renderFlyer.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { flyerPrintFrontTemplate } from "../templates/flyer-print-front/template.config.js";
import { flyerHomeFrontTemplate } from "../templates/flyer-home-front/template.config.js";
import { buildGirocodePayload } from "../core/girocode/buildGirocodePayload.js";
import { QR_COLOR_GRUEN } from "../core/config/colors.js";
import { GIROCODE_DEFAULTS } from "../core/config/girocodeDefaults.js";

/**
 * Entwickler-Hilfsskript (nicht Teil von `npm test`): erzeugt aus den
 * echten Template-Configs eine Testmatrix aus PDFs für die
 * Sichtprüfung — 3 Repräsentanten-Datensätze × 2 Varianten
 * (Druckerei/Home). Nutzt echte, scanbare QR-/GiroCodes (über das
 * bestehende `qrcode`-Paket, dieselbe Bibliothek wie
 * `core/qr/generateQr.js`) und ein synthetisches Testfoto mit farbigen
 * Ecken, um die Kreis-Maskierung sichtbar zu verifizieren.
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

const TEMPLATES = [
  { id: "druckerei", config: flyerPrintFrontTemplate },
  { id: "home", config: flyerHomeFrontTemplate },
];

for (const testCase of CASES) {
  const giroPayload = buildGirocodePayload({
    empfaenger: GIROCODE_DEFAULTS.empfaenger,
    iban: GIROCODE_DEFAULTS.iban,
    bic: GIROCODE_DEFAULTS.bic,
    betrag: "",
    verwendungszweck: `${testCase.ifkId} Spende`,
  });
  const giroQrBytes = await buildQrPng(giroPayload, QR_COLOR_GRUEN);

  const imageAssets = {
    photo: { bytes: photoBytes, mimeType: "image/png" },
    qrPaypal: { bytes: paypalQrBytes, mimeType: "image/png" },
    qrGiro: { bytes: giroQrBytes, mimeType: "image/png" },
  };

  for (const template of TEMPLATES) {
    const { bytes, warnings } = await renderFlyer({
      templateConfig: template.config,
      textValues: testCase.textValues,
      imageAssets,
      deps: { loadTemplateAssets },
    });
    const filename = `flyer-${testCase.id}-${template.id}.pdf`;
    writeFileSync(new URL(filename, OUT_DIR), bytes);
    console.log(filename, "-", bytes.length, "bytes", warnings.length ? `WARNUNGEN: ${JSON.stringify(warnings)}` : "(keine Warnungen)");
  }
}

console.log("fertig ->", OUT_DIR.pathname);
