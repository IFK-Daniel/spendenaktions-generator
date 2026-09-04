import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";
import { renderMultiPageDocument } from "../core/pdf/renderMultiPageDocument.js";
import { renderFlyer } from "../core/pdf/renderFlyer.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { generateFlyerHomeSheet } from "../core/materials/generateFlyerHomeSheet.js";
import { resolveRepresentativeFlyerFrontTemplate } from "../core/materials/resolveRepresentativeFlyerFrontTemplate.js";
import { loadStaticCompanionMaterialGuide } from "../core/materials/staticCompanionMaterialGuide.js";
import { loadFontFile } from "../core/pdf/loadFontFile.js";
import { createZip } from "../core/zip/createZip.js";

import { flyerRepresentativeMaleDuFrontTemplate } from "../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../templates/flyer-shared-back/template.config.js";

import { flyerRepresentativeMaleDuPrintTemplate } from "../templates/flyer-representative-male-du-print/template.config.js";
import { flyerRepresentativeMaleSiePrintTemplate } from "../templates/flyer-representative-male-sie-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../templates/flyer-shared-back-print/template.config.js";

import { certificateRepresentativeMaleTemplate } from "../templates/certificate-representative-male/template.config.js";

/**
 * Misst ein TYPISCHES vollständiges Repräsentanten-Materialpaket
 * (Flyer Druckerei Du+Sie, Flyer Home Du+Sie, Urkunde, PayPal-QR,
 * GiroCode, Begleit-Anleitung) — Rohgrößen, ZIP-Größe und die reale
 * Versand-Payload-Größe (Base64 + JSON, wie `sendRepresentativeMaterials.js`
 * sie tatsächlich berechnet). Wird per `--photo <path>` mit einem
 * gegebenen Foto (bereits normalisiert: {bytes, mimeType}) aufgerufen,
 * damit sich Vorher/Nachher-Fotoformate direkt vergleichen lassen.
 *
 * Aufruf: node scripts/measure-representative-package.mjs --photo <pfad> [--label <name>]
 */

const args = process.argv.slice(2);
const photoPathIdx = args.indexOf("--photo");
const labelIdx = args.indexOf("--label");
const photoPath = photoPathIdx !== -1 ? args[photoPathIdx + 1] : "artifacts/flyer-preview/test-photo-source.png";
const label = labelIdx !== -1 ? args[labelIdx + 1] : "default";

const photoBytes = readFileSync(photoPath);
const photoMimeType = photoPath.endsWith(".jpg") || photoPath.endsWith(".jpeg") ? "image/jpeg" : "image/png";

async function buildQrPng(text) {
  return QRCode.toBuffer(text, { width: 300, margin: 2, errorCorrectionLevel: "H", color: { dark: "#000000", light: "#ffffff" } });
}

const qrGiro = await buildQrPng("BCD002001DE12345678901234567890123");
const paypalQr = await buildQrPng("https://www.paypal.com/donate/?hosted_button_id=TESTBUTTON123");
const imageAssets = {
  photo: { bytes: photoBytes, mimeType: photoMimeType },
  qrPaypal: { bytes: paypalQr, mimeType: "image/png" },
  qrGiro: { bytes: qrGiro, mimeType: "image/png" },
};

const person = { firstName: "Daniel", lastName: "Feigenbutz", region: "München", phone: "089 12345678", email: "daniel.feigenbutz@its-for-kids.de", ifkId: "IFKDF001" };

const files = [];

async function addPrint(salutation, frontTemplate) {
  const textValues = {
    name: `${person.firstName} ${person.lastName}`,
    region: `${frontTemplate.fields.region?.regionPrefix ?? ""}${person.region}`,
    regionInParagraph: person.region,
    phone: person.phone,
    email: person.email,
  };
  const { bytes } = await renderMultiPageDocument({
    pages: [
      { templateConfig: frontTemplate, textValues, imageAssets },
      { templateConfig: sharedFlyerBackPrintTemplate },
    ],
    deps: { loadTemplateAssets },
  });
  files.push({ filename: `Flyer_Druckerei_${salutation}.pdf`, content: Buffer.from(bytes) });
}

async function addHome(salutation, frontTemplate) {
  const result = await generateFlyerHomeSheet({
    entry: { key: "FLYER_HOME", label: "Flyer Home", category: "flyer", format: "pdf", extension: "pdf", filename: `Flyer_Home_${salutation}.pdf` },
    frontTemplateConfig: frontTemplate,
    backTemplateConfig: sharedFlyerBackTemplate,
    person,
    photoAsset: imageAssets.photo,
    qrPaypalAsset: imageAssets.qrPaypal,
    qrGiroAsset: imageAssets.qrGiro,
    deps: { loadTemplateAssets },
  });
  files.push({ filename: result.filename, content: Buffer.from(await result.content.arrayBuffer()) });
}

await addPrint("Du", flyerRepresentativeMaleDuPrintTemplate);
await addPrint("Sie", flyerRepresentativeMaleSiePrintTemplate);
await addHome("Du", flyerRepresentativeMaleDuFrontTemplate);
await addHome("Sie", flyerRepresentativeMaleSieFrontTemplate);

// Urkunde (Repräsentant, männlich)
const cert = await renderFlyer({
  templateConfig: certificateRepresentativeMaleTemplate,
  textValues: { name: `${person.firstName} ${person.lastName}`, ifkId: person.ifkId },
  deps: { loadTemplateAssets },
});
files.push({ filename: "Urkunde_Repraesentant.pdf", content: Buffer.from(cert.bytes) });

files.push({ filename: "PayPal_QR_schwarz.png", content: Buffer.from(paypalQr) });
files.push({ filename: "GiroCode_schwarz.png", content: Buffer.from(qrGiro) });

const guide = await loadStaticCompanionMaterialGuide({ deps: { loadStaticBytes: loadFontFile } });
files.push({ filename: guide.filename, content: Buffer.from(await guide.content.arrayBuffer()) });

// --- Größen ---
let totalRaw = 0;
console.log(`\n=== Paket "${label}" (Foto: ${photoPath}, ${photoBytes.length}B ${photoMimeType}) ===`);
console.log("Material | Rohgröße (Byte) | Anteil");
for (const f of files) {
  totalRaw += f.content.length;
}
for (const f of files) {
  const pct = ((f.content.length / totalRaw) * 100).toFixed(1);
  console.log(`${f.filename} | ${f.content.length} | ${pct}%`);
}
console.log(`GESAMT (Summe Einzeldateien) | ${totalRaw} |`);

// ZIP
const zip = await createZip({ filename: "IFK_Materialien_Test.zip", files });
const zipBuf = Buffer.from(await zip.blob.arrayBuffer());
console.log(`ZIP-Datei | ${zipBuf.length} | (${((zipBuf.length / totalRaw) * 100).toFixed(1)}% der Summe Einzeldateien)`);

// Base64/JSON-Payload wie sendRepresentativeMaterials.js (recipient-Request: EIN ZIP-Anhang als base64 im JSON)
const zipBase64 = zipBuf.toString("base64");
const recipientPayload = JSON.stringify({
  recipient: {
    to: "test@example.com",
    subject: "Deine Materialien",
    text: "…",
    html: "<p>…</p>",
    zipFilename: zip.filename,
    zipContent: zipBase64,
  },
});
console.log(`\nrecipient-Request (ALT: ZIP als Base64 im JSON) | ${recipientPayload.length} Byte`);

// multipart/form-data-Payload wie sendRepresentativeMaterials.js SEIT der
// Umstellung "fix: send companion materials as multipart form data" —
// exakt gemessen (new Response(formData).arrayBuffer()), keine Schätzung.
const multipartFormData = new FormData();
multipartFormData.append(
  "metadata",
  JSON.stringify({ kind: "recipient", to: "test@example.com", subject: "Deine Materialien", text: "…", html: "<p>…</p>", zipFilename: zip.filename })
);
multipartFormData.append("files", zip.blob, zip.filename);
const multipartPayloadBytes = (await new Response(multipartFormData).arrayBuffer()).byteLength;
console.log(`recipient-Request (NEU: multipart/form-data) | ${multipartPayloadBytes} Byte`);
console.log(`Transport-Ersparnis durch multipart statt Base64/JSON | ${recipientPayload.length - multipartPayloadBytes} Byte (${((1 - multipartPayloadBytes / recipientPayload.length) * 100).toFixed(1)}%)`);

const MAX_REQUEST_BYTES = 4_450_000;
console.log(`\nMAX_REQUEST_BYTES (aktuelles Limit) | ${MAX_REQUEST_BYTES} Byte`);
console.log(`Multipart passt unter Limit: ${multipartPayloadBytes <= MAX_REQUEST_BYTES ? "JA" : "NEIN"} (${(multipartPayloadBytes / MAX_REQUEST_BYTES * 100).toFixed(1)}% des Limits, Reserve ${((1 - multipartPayloadBytes / MAX_REQUEST_BYTES) * 100).toFixed(1)}%)`);

const outDir = new URL("../artifacts/size-analysis/", import.meta.url);
mkdirSync(outDir, { recursive: true });
const resultPath = new URL(`package-${label}.json`, outDir);
writeFileSync(
  resultPath,
  JSON.stringify(
    {
      label,
      photoPath,
      photoBytes: photoBytes.length,
      photoMimeType,
      files: files.map((f) => ({ filename: f.filename, size: f.content.length })),
      totalRaw,
      zipSize: zipBuf.length,
      legacyBase64JsonPayloadBytes: recipientPayload.length,
      multipartPayloadBytes,
      maxRequestBytes: MAX_REQUEST_BYTES,
      fitsUnderLimit: multipartPayloadBytes <= MAX_REQUEST_BYTES,
      reservePercent: (1 - multipartPayloadBytes / MAX_REQUEST_BYTES) * 100,
    },
    null,
    2
  )
);
console.log(`\n-> ${resultPath.pathname}`);
