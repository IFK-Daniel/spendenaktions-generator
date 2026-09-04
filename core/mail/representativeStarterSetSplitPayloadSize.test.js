import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import { renderMultiPageDocument } from "../pdf/renderMultiPageDocument.js";
import { renderFlyer } from "../pdf/renderFlyer.js";
import { loadTemplateAssets } from "../pdf/loadTemplateAssets.js";
import { generateFlyerHomeSheet } from "../materials/generateFlyerHomeSheet.js";
import { loadStaticCompanionMaterialGuide } from "../materials/staticCompanionMaterialGuide.js";
import { loadFontFile } from "../pdf/loadFontFile.js";
import { createZip } from "../zip/createZip.js";

import { flyerRepresentativeMaleDuFrontTemplate } from "../../templates/flyer-representative-male-du-front/template.config.js";
import { sharedFlyerBackTemplate } from "../../templates/flyer-shared-back/template.config.js";
import { flyerRepresentativeMaleDuPrintTemplate } from "../../templates/flyer-representative-male-du-print/template.config.js";
import { sharedFlyerBackPrintTemplate } from "../../templates/flyer-shared-back-print/template.config.js";
import { certificateRepresentativeMaleTemplate } from "../../templates/certificate-representative-male/template.config.js";

/**
 * Regressionsschutz gegen genau den Produktionsfehler, der zur
 * Trennung von Arbeits-/Marketingmaterialien und persönlicher Urkunde
 * geführt hat ("Anhänge zu groß für den Mailversand (4.2 MB, Limit ca.
 * 4.2 MB)" beim kombinierten Standard-Starter-Set-ZIP, siehe
 * `core/materials/buildRepresentativeDeliveryRequest.js`). Baut mit dem
 * ECHTEN Rendering-Code exakt das Standard-Starter-Set (Flyer
 * Druckerei Du, Flyer Home Du, PayPal-QR schwarz, GiroCode schwarz,
 * Anleitung, Repräsentantenurkunde — wie `applyStarterSet()` in
 * `src/intern/generator.js` es auswählt) und misst die reale
 * `multipart/form-data`-Bytezahl für BEIDE seit der Trennung
 * entstehenden Empfänger-Mails unabhängig voneinander — exakt so, wie
 * `sendRepresentativeMaterials.js` es vor dem echten Versand tut.
 *
 * Anders als der ältere Diagnosetest in
 * `representativeMailPayloadSize.test.js` (der bewusst ein
 * kombiniertes "alles in einem Paket"-Szenario misst, das die reale
 * Anwendung seit dieser Trennung gar nicht mehr erzeugen kann — Du/Sie
 * sind gegenseitig ausgeschlossen, die Urkunde ist nie Teil des
 * Materialien-ZIPs) ist dies ein HARTER Test gegen das 90%-Ziel: das
 * Standard-Starter-Set ist der alltägliche, garantiert unveränderte
 * Fall, für den die Trennung überhaupt eingeführt wurde.
 */
const MAX_REQUEST_BYTES = 4_450_000;
const TARGET_PAYLOAD_BYTES = MAX_REQUEST_BYTES * 0.9;

test(
  "Standard-Starter-Set: Materialien-Mail und Urkunden-Mail bleiben unabhängig voneinander unter 90% des Vercel-Limits",
  { timeout: 30_000 },
  async (t) => {
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

    // ---------- Materialien (Standard-Starter-Set: nur Du-Version) ----------
    const materialFiles = [];

    const druckereiTextValues = {
      name: `${person.firstName} ${person.lastName}`,
      region: `${flyerRepresentativeMaleDuPrintTemplate.fields.region?.regionPrefix ?? ""}${person.region}`,
      regionInParagraph: person.region,
      phone: person.phone,
      email: person.email,
    };
    const { bytes: druckereiBytes } = await renderMultiPageDocument({
      pages: [
        { templateConfig: flyerRepresentativeMaleDuPrintTemplate, textValues: druckereiTextValues, imageAssets },
        { templateConfig: sharedFlyerBackPrintTemplate },
      ],
      deps: { loadTemplateAssets },
    });
    materialFiles.push({ filename: "Flyer_Druckerei_Du.pdf", content: Buffer.from(druckereiBytes) });

    const homeResult = await generateFlyerHomeSheet({
      entry: { key: "FLYER_HOME", label: "Flyer Home", category: "flyer", format: "pdf", extension: "pdf", filename: "Flyer_Home_Du.pdf" },
      frontTemplateConfig: flyerRepresentativeMaleDuFrontTemplate,
      backTemplateConfig: sharedFlyerBackTemplate,
      person,
      photoAsset: imageAssets.photo,
      qrPaypalAsset: imageAssets.qrPaypal,
      qrGiroAsset: imageAssets.qrGiro,
      deps: { loadTemplateAssets },
    });
    materialFiles.push({ filename: homeResult.filename, content: Buffer.from(await homeResult.content.arrayBuffer()) });

    materialFiles.push({ filename: "PayPal_QR_schwarz.png", content: Buffer.from(paypalQr) });
    materialFiles.push({ filename: "GiroCode_schwarz.png", content: Buffer.from(qrGiro) });

    const guide = await loadStaticCompanionMaterialGuide({ deps: { loadStaticBytes: loadFontFile } });
    materialFiles.push({ filename: guide.filename, content: Buffer.from(await guide.content.arrayBuffer()) });

    // Sanity: keine Sie-Datei und keine Urkunde im Materialien-Paket.
    assert.equal(materialFiles.some((f) => /_Sie/.test(f.filename)), false, "Standard-Starter-Set enthält keine Sie-Variante");
    assert.equal(materialFiles.some((f) => /Urkunde/.test(f.filename)), false, "Urkunde ist nie Teil der Materialien-Mail");

    const zip = await createZip({ filename: "IFK_Materialien_Starter_Set.zip", files: materialFiles });

    async function measureRecipientPayload(filename, blob) {
      const formData = new FormData();
      formData.append(
        "metadata",
        JSON.stringify({ kind: "recipient", to: "test@example.com", subject: "s", text: "t", html: "<p>t</p>", zipFilename: filename })
      );
      formData.append("files", blob, filename);
      return (await new Response(formData).arrayBuffer()).byteLength;
    }

    const materialsPayloadBytes = await measureRecipientPayload(zip.filename, zip.blob);

    // ---------- Urkunde (eigene Mail, eigener direkter Anhang) ----------
    const cert = await renderFlyer({
      templateConfig: certificateRepresentativeMaleTemplate,
      textValues: { name: `${person.firstName} ${person.lastName}`, ifkId: person.ifkId },
      deps: { loadTemplateAssets },
    });
    const certificateBlob = new Blob([Buffer.from(cert.bytes)]);
    const certificatePayloadBytes = await measureRecipientPayload("Urkunde_Repraesentant.pdf", certificateBlob);

    t.diagnostic(
      `Materialien-Mail: ${materialsPayloadBytes} Byte (${((materialsPayloadBytes / MAX_REQUEST_BYTES) * 100).toFixed(1)}% des Limits). ` +
        `Urkunden-Mail: ${certificatePayloadBytes} Byte (${((certificatePayloadBytes / MAX_REQUEST_BYTES) * 100).toFixed(1)}% des Limits).`
    );

    assert.ok(
      materialsPayloadBytes < TARGET_PAYLOAD_BYTES,
      `Materialien-Mail-Payload (${materialsPayloadBytes} Byte) liegt nicht unter 90% des Vercel-Limits (${TARGET_PAYLOAD_BYTES} Byte) — genau das Szenario, das zur Trennung von Materialien und Urkunde geführt hat.`
    );
    assert.ok(
      certificatePayloadBytes < TARGET_PAYLOAD_BYTES,
      `Urkunden-Mail-Payload (${certificatePayloadBytes} Byte) liegt nicht unter 90% des Vercel-Limits (${TARGET_PAYLOAD_BYTES} Byte).`
    );
  }
);
