import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import QRCode from "qrcode";
import { renderMultiPageDocument } from "../core/pdf/renderMultiPageDocument.js";
import { renderFlyer } from "../core/pdf/renderFlyer.js";
import { loadTemplateAssets } from "../core/pdf/loadTemplateAssets.js";
import { generateFlyerHomeSheet } from "../core/materials/generateFlyerHomeSheet.js";
import { loadStaticCompanionMaterialGuide } from "../core/materials/staticCompanionMaterialGuide.js";
import { loadFontFile } from "../core/pdf/loadFontFile.js";
import { createZip } from "../core/zip/createZip.js";
import { buildFlyerVariantEntries } from "../core/materials/buildFlyerVariantEntries.js";
import { ROLE_KEYS } from "../core/materials/roleConfig.js";

import { flyerRepresentativeMaleDuFrontTemplate } from "../templates/flyer-representative-male-du-front/template.config.js";
import { sharedFlyerBackTemplate } from "../templates/flyer-shared-back/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../templates/flyer-representative-male-du-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../templates/flyer-shared-back-print/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../templates/certificate-representative-male/template.config.js";

/**
 * Misst die BEIDEN unabhängigen Mails, die das reale Standard-Starter-
 * Set (Vorgabe Abschnitt 2/11/26/33) seit der Trennung von Arbeits-/
 * Marketingmaterialien und persönlicher Urkunde erzeugt (siehe
 * `core/materials/buildRepresentativeDeliveryRequest.js`):
 *
 * 1) Materialien-Mail: Flyer Druckerei Du, Flyer Home Du, PayPal-QR
 *    schwarz, GiroCode schwarz, Anleitung — als EIN ZIP-Archiv, OHNE
 *    Urkunde.
 * 2) Urkunden-Mail: ausschließlich die Repräsentantenurkunde als
 *    direkter PDF-Anhang, KEIN ZIP.
 *
 * Nutzt exakt denselben Rendering-Code wie die Produktivumgebung
 * (`buildFlyerVariantEntries` mit `salutationVariants: ["du"]`,
 * entspricht dem, was `applyStarterSet()` in `src/intern/generator.js`
 * setzt). Ziel: BEIDE Mails bleiben unabhängig voneinander deutlich
 * unter dem Vercel-Limit (Regressionsschutz gegen genau den
 * Produktionsfehler, der zur Trennung geführt hat — ein kombiniertes
 * "alles in einer Mail"-ZIP hatte das Limit gesprengt).
 *
 * Aufruf: node scripts/measure-starter-set.mjs --photo <pfad>
 */
const args = process.argv.slice(2);
const photoPathIdx = args.indexOf("--photo");
const photoPath = photoPathIdx !== -1 ? args[photoPathIdx + 1] : "artifacts/size-analysis/photo-realistic-current-1200.jpg";
// `new Uint8Array(...)` statt der rohen `readFileSync`-Rückgabe: Node
// gibt bei `readFileSync` ggf. einen Buffer zurück, der (Pooling) eine
// VIEW mit `byteOffset > 0` auf ein größeres, gemeinsames ArrayBuffer
// ist. pdf-lib liest bei `embedJpg` fälschlich `imageData.buffer` ohne
// den `byteOffset` zu berücksichtigen — bei einem gepoolten Buffer
// landet man dadurch mitten im falschen Speicherbereich ("SOI not
// found in JPEG"). Reine Eigenart dieses Node-Testskripts (readFileSync
// + Buffer-Pooling) — im echten Browser-Pfad (`fetch().arrayBuffer()`)
// tritt das nicht auf, da dort byteOffset immer 0 ist. Deshalb hier nur
// im Messskript korrigiert, KEINE Änderung an core/pdf/renderFlyer.js
// (Vorgabe Abschnitt 19: keine erneute Gefährdung der PDF-Integrität).
const photoBytes = new Uint8Array(readFileSync(photoPath));
const photoMimeType = photoPath.endsWith(".png") ? "image/png" : "image/jpeg";

const qrGiro = await QRCode.toBuffer("BCD002001DE12345678901234567890123", {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "H",
  color: { dark: "#000000", light: "#ffffff" },
});
const paypalQr = await QRCode.toBuffer("https://www.paypal.com/donate/?hosted_button_id=TESTBUTTON123", {
  width: 300,
  margin: 2,
  errorCorrectionLevel: "H",
  color: { dark: "#000000", light: "#ffffff" },
});
const imageAssets = {
  photo: { bytes: photoBytes, mimeType: photoMimeType },
  qrPaypal: { bytes: paypalQr, mimeType: "image/png" },
  qrGiro: { bytes: qrGiro, mimeType: "image/png" },
};

const person = { firstName: "Daniel", lastName: "Feigenbutz", region: "Düsseldorf", phone: "015233795099", email: "d.feigenbutz@its-for-kids.de", ifkId: "IFKDF001" };

const files = [];

// Flyer-Ansprache-Varianten wie das Standard-Starter-Set sie anfordert
// (siehe applyStarterSet() -> setFlyerSalutationMode("du")).
const flyerEntries = [
  { key: "FLYER_DRUCKEREI", label: "Flyer Druckerei", category: "flyer", format: "pdf", extension: "pdf", filename: "IFK_Daniel_Feigenbutz_Flyer_Druckerei.pdf" },
  { key: "FLYER_HOME", label: "Flyer Home", category: "flyer", format: "pdf", extension: "pdf", filename: "IFK_Daniel_Feigenbutz_Flyer_Home.pdf" },
];
const jobs = buildFlyerVariantEntries({ entries: flyerEntries, roleKey: ROLE_KEYS.REPRESENTATIVE, salutationVariants: ["du"] });
console.log("Angeforderte Ansprache-Varianten:", [...new Set(jobs.map((j) => j.salutation))]);

for (const job of jobs) {
  if (job.entry.key === "FLYER_DRUCKEREI") {
    const textValues = {
      name: `${person.firstName} ${person.lastName}`,
      region: `${flyerRepresentativeMaleDuPrintTemplate.fields.region?.regionPrefix ?? ""}${person.region}`,
      regionInParagraph: person.region,
      phone: person.phone,
      email: person.email,
    };
    const { bytes } = await renderMultiPageDocument({
      pages: [
        { templateConfig: flyerRepresentativeMaleDuPrintTemplate, textValues, imageAssets },
        { templateConfig: sharedFlyerBackPrintTemplate },
      ],
      deps: { loadTemplateAssets },
    });
    files.push({ filename: job.entry.filename, content: Buffer.from(bytes) });
  } else {
    const result = await generateFlyerHomeSheet({
      entry: job.entry,
      frontTemplateConfig: flyerRepresentativeMaleDuFrontTemplate,
      backTemplateConfig: sharedFlyerBackTemplate,
      person,
      photoAsset: imageAssets.photo,
      qrPaypalAsset: imageAssets.qrPaypal,
      qrGiroAsset: imageAssets.qrGiro,
      deps: { loadTemplateAssets },
    });
    files.push({ filename: result.filename, content: Buffer.from(await result.content.arrayBuffer()) });
  }
}

// Urkunde: eigene Mail, NICHT Teil von `files` (das ZIP der
// Materialien-Mail) — siehe buildRepresentativeDeliveryRequest.js.
const cert = await renderFlyer({
  templateConfig: certificateRepresentativeMaleTemplate,
  textValues: { name: `${person.firstName} ${person.lastName}`, ifkId: person.ifkId },
  deps: { loadTemplateAssets },
});
const certificateFile = { filename: "IFK_Daniel_Feigenbutz_Repraesentantenurkunde.pdf", content: Buffer.from(cert.bytes) };

files.push({ filename: "IFK_Daniel_Feigenbutz_PayPal_QR_schwarz.png", content: Buffer.from(paypalQr) });
files.push({ filename: "IFK_Daniel_Feigenbutz_GiroCode_schwarz.png", content: Buffer.from(qrGiro) });

const guide = await loadStaticCompanionMaterialGuide({ deps: { loadStaticBytes: loadFontFile } });
files.push({ filename: guide.filename, content: Buffer.from(await guide.content.arrayBuffer()) });

console.log("\n=== Standard-Starter-Set: Materialien-Mail (ohne Urkunde) ===");
console.log("Material | Rohgröße (Byte) | Anteil");
let totalRaw = 0;
for (const f of files) totalRaw += f.content.length;
for (const f of files) {
  console.log(`${f.filename} | ${f.content.length} | ${((f.content.length / totalRaw) * 100).toFixed(1)}%`);
}
console.log(`GESAMT (Summe Einzeldateien) | ${totalRaw} |`);

// Keine "_Sie"-Datei enthalten? (Sicherheitsnetz für die Messung selbst)
const sieFiles = files.filter((f) => /_Sie/.test(f.filename));
console.log(`\nSie-Dateien im Paket: ${sieFiles.length} (erwartet: 0)`);
// Die Urkunde darf NIE im ZIP der Materialien-Mail landen (fachliche
// Trennung, siehe CERTIFICATE_DELIVERY_MODES).
const certificateInMaterialsZip = files.some((f) => /Urkunde/.test(f.filename));
console.log(`Urkunde im Materialien-ZIP: ${certificateInMaterialsZip ? "JA (FEHLER!)" : "nein (korrekt)"}`);

const zip = await createZip({ filename: "IFK_Materialien_Starter_Set.zip", files });
const zipBuf = Buffer.from(await zip.blob.arrayBuffer());
console.log(`ZIP-Datei | ${zipBuf.length}`);

const MAX_REQUEST_BYTES = 4_450_000;
const targetPayloadBytes = MAX_REQUEST_BYTES * 0.9;

async function measureRecipientPayload({ label, filename, blob, subject }) {
  const formData = new FormData();
  formData.append(
    "metadata",
    JSON.stringify({ kind: "recipient", to: "test@example.com", subject, text: "…", html: "<p>…</p>", zipFilename: filename })
  );
  formData.append("files", blob, filename);
  const bytes = (await new Response(formData).arrayBuffer()).byteLength;
  console.log(`\n=== ${label} ===`);
  console.log(`Multipart-Payload | ${bytes} Byte (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`MAX_REQUEST_BYTES | ${MAX_REQUEST_BYTES} Byte`);
  console.log(`Anteil am Limit | ${((bytes / MAX_REQUEST_BYTES) * 100).toFixed(1)}%`);
  console.log(`Reserve | ${((1 - bytes / MAX_REQUEST_BYTES) * 100).toFixed(1)}%`);
  console.log(`Passt mit >=10% Reserve: ${bytes <= targetPayloadBytes ? "JA" : "NEIN"}`);
  return bytes;
}

const materialsMultipartPayloadBytes = await measureRecipientPayload({
  label: "Materialien-Mail-Payload",
  filename: zip.filename,
  blob: zip.blob,
  subject: "Deine personalisierten Materialien von It's for Kids",
});

const certificateMultipartPayloadBytes = await measureRecipientPayload({
  label: "Urkunden-Mail-Payload",
  filename: certificateFile.filename,
  blob: new Blob([certificateFile.content]),
  subject: "Deine Urkunde als Repräsentant von It's for Kids",
});

const outDir = new URL("../artifacts/size-analysis/", import.meta.url);
mkdirSync(outDir, { recursive: true });
writeFileSync(
  new URL("starter-set.json", outDir),
  JSON.stringify(
    {
      materials: {
        files: files.map((f) => ({ filename: f.filename, size: f.content.length })),
        totalRawBytes: totalRaw,
        zipBytes: zipBuf.length,
        multipartPayloadBytes: materialsMultipartPayloadBytes,
        percentOfLimit: (materialsMultipartPayloadBytes / MAX_REQUEST_BYTES) * 100,
        reservePercent: (1 - materialsMultipartPayloadBytes / MAX_REQUEST_BYTES) * 100,
        fitsWith10PercentReserve: materialsMultipartPayloadBytes <= targetPayloadBytes,
      },
      certificate: {
        filename: certificateFile.filename,
        size: certificateFile.content.length,
        multipartPayloadBytes: certificateMultipartPayloadBytes,
        percentOfLimit: (certificateMultipartPayloadBytes / MAX_REQUEST_BYTES) * 100,
        reservePercent: (1 - certificateMultipartPayloadBytes / MAX_REQUEST_BYTES) * 100,
        fitsWith10PercentReserve: certificateMultipartPayloadBytes <= targetPayloadBytes,
      },
      maxRequestBytes: MAX_REQUEST_BYTES,
    },
    null,
    2
  )
);
console.log(`\n-> ${outDir.pathname}starter-set.json`);

// Testartefakt für visuelle Prüfung
mkdirSync(new URL("../artifacts/pdf-regression/", import.meta.url), { recursive: true });
const druckereiFile = files.find((f) => f.filename.includes("Druckerei"));
if (druckereiFile) {
  writeFileSync(new URL("../artifacts/pdf-regression/starter-set-flyer-druckerei-du.pdf", import.meta.url), druckereiFile.content);
}
