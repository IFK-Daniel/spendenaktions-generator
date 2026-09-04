import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import { renderMultiPageDocument } from "../pdf/renderMultiPageDocument.js";
import { renderFlyer } from "../pdf/renderFlyer.js";
import { loadTemplateAssets } from "../pdf/loadTemplateAssets.js";
import { generateFlyerHomeSheet } from "../materials/generateFlyerHomeSheet.js";
import { generateCompanionMaterialGuide } from "../materials/generateCompanionMaterialGuide.js";
import { loadFontFile } from "../pdf/loadFontFile.js";
import { createZip } from "../zip/createZip.js";

import { flyerRepresentativeMaleDuFrontTemplate } from "../../templates/flyer-representative-male-du-front/template.config.js";
import { flyerRepresentativeMaleSieFrontTemplate } from "../../templates/flyer-representative-male-sie-front/template.config.js";
import { sharedFlyerBackTemplate } from "../../templates/flyer-shared-back/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../../templates/flyer-representative-male-du-print/template.config.js";
import { flyerRepresentativeMaleSiePrintTemplate } from "../../templates/flyer-representative-male-sie-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../../templates/flyer-shared-back-print/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../../templates/certificate-representative-male/template.config.js";

/**
 * Payload-Regressionstest (Vorgabe: "Realistisches vollständiges Paket
 * -> Multipart-Payload < definierter Sicherheitsgrenze"). Baut mit dem
 * ECHTEN Rendering-Code ein typisches vollständiges Repräsentanten-
 * Materialpaket (4 Flyer-Varianten, Urkunde, 2 QR-Codes, Anleitung),
 * zippt es identisch zu `buildMaterialZip.js` und misst die reale
 * `multipart/form-data`-Bytezahl exakt genauso wie
 * `core/mail/sendRepresentativeMaterials.js` es vor dem echten Versand
 * tut (`new Response(formData).arrayBuffer()`).
 *
 * Schwelle: 90% des Vercel-Sicherheitslimits (siehe `MAX_REQUEST_BYTES`
 * in `sendRepresentativeMaterials.js`) — mindestens 10% Reserve, wie
 * in `artifacts/size-analysis/attachment-size-analysis.md` als Ziel
 * hergeleitet. Wächst das Materialpaket künftig (weitere Materialien,
 * höhere Auflösungen, …) über diese Schwelle, schlägt genau dieser
 * Test fehl und macht die Überschreitung sichtbar, statt sie erst bei
 * einem echten Versandversuch zu bemerken.
 */
const MAX_REQUEST_BYTES = 4_450_000;
const SAFETY_THRESHOLD_BYTES = MAX_REQUEST_BYTES * 0.9;

test(
  "realistisches vollständiges Repräsentanten-Paket bleibt als multipart/form-data-Payload unter 90% des Vercel-Sicherheitslimits (>=10% Reserve)",
  { timeout: 30_000 },
  async () => {
    const photoBytes = readFileSync(new URL("../../artifacts/flyer-preview/test-photo-source.png", import.meta.url));
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
      photo: { bytes: photoBytes, mimeType: "image/png" },
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

    const cert = await renderFlyer({
      templateConfig: certificateRepresentativeMaleTemplate,
      textValues: { name: `${person.firstName} ${person.lastName}`, ifkId: person.ifkId },
      deps: { loadTemplateAssets },
    });
    files.push({ filename: "Urkunde_Repraesentant.pdf", content: Buffer.from(cert.bytes) });

    files.push({ filename: "PayPal_QR_schwarz.png", content: Buffer.from(paypalQr) });
    files.push({ filename: "GiroCode_schwarz.png", content: Buffer.from(qrGiro) });

    const guide = await generateCompanionMaterialGuide({ deps: { loadFontBytes: loadFontFile } });
    files.push({ filename: guide.filename, content: Buffer.from(await guide.content.arrayBuffer()) });

    const zip = await createZip({ filename: "IFK_Materialien_Test.zip", files });

    // Exakt derselbe FormData-Aufbau wie beim echten Empfänger-Versand
    // (siehe `sendRepresentativeMaterials.js`, `buildFormData`).
    const formData = new FormData();
    formData.append(
      "metadata",
      JSON.stringify({
        kind: "recipient",
        to: "test@example.com",
        subject: "Deine Materialien",
        text: "…",
        html: "<p>…</p>",
        zipFilename: zip.filename,
      })
    );
    formData.append("files", zip.blob, zip.filename);

    const payloadBytes = (await new Response(formData).arrayBuffer()).byteLength;

    assert.ok(
      payloadBytes < SAFETY_THRESHOLD_BYTES,
      `Multipart-Payload ist ${payloadBytes} Byte (${(payloadBytes / 1024 / 1024).toFixed(2)} MB) — ` +
        `Schwelle ${SAFETY_THRESHOLD_BYTES} Byte (90% von ${MAX_REQUEST_BYTES}, mindestens 10% Reserve gefordert). ` +
        `Das Materialpaket ist gewachsen — bitte Größe erneut analysieren (siehe artifacts/size-analysis/).`
    );
  }
);
