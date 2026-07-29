import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCertificateMaterial } from "./generateCertificateMaterial.js";
import { buildMaterialManifest } from "./buildMaterialManifest.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

function manifestWithCertificate() {
  return buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    gender: "female",
    materials: [MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE],
  });
}

test("erzeugt ein Urkunde-PDF-Material mit korrektem Dateinamen/Mimetype und ruft renderFlyer mit dem zusammengesetzten Namen auf", async () => {
  const manifest = manifestWithCertificate();
  const entry = manifest.materials[0];

  let capturedArgs = null;
  const fakeRenderFlyer = async (args) => {
    capturedArgs = args;
    return { bytes: new Uint8Array([9, 9, 9]), warnings: [] };
  };

  const result = await generateCertificateMaterial({
    entry,
    templateConfig: { key: "CERTIFICATE_REPRESENTATIVE_FEMALE" },
    person: manifest.person,
    deps: { renderFlyer: fakeRenderFlyer },
  });

  assert.equal(result.key, MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE);
  assert.equal(result.filename, entry.filename);
  assert.equal(result.mimeType, "application/pdf");
  assert.deepEqual(result.warnings, []);

  assert.equal(capturedArgs.textValues.name, "Kim Yu");
  assert.deepEqual(capturedArgs.imageAssets, {});
  assert.equal(capturedArgs.templateConfig.key, "CERTIFICATE_REPRESENTATIVE_FEMALE");
});

test("gibt warnings von renderFlyer unverändert durch", async () => {
  const manifest = manifestWithCertificate();
  const fakeWarnings = [{ fieldKey: "name", sizePt: 24, minSizePt: 24, reason: "..." }];
  const fakeRenderFlyer = async () => ({ bytes: new Uint8Array([1]), warnings: fakeWarnings });

  const result = await generateCertificateMaterial({
    entry: manifest.materials[0],
    templateConfig: {},
    person: manifest.person,
    deps: { renderFlyer: fakeRenderFlyer },
  });

  assert.deepEqual(result.warnings, fakeWarnings);
});

test("wirft ohne templateConfig", async () => {
  const manifest = manifestWithCertificate();
  await assert.rejects(
    () =>
      generateCertificateMaterial({
        entry: manifest.materials[0],
        templateConfig: null,
        person: manifest.person,
      }),
    /templateConfig/
  );
});

test("wirft bei Nicht-Urkunde-Materialtyp", async () => {
  const manifest = buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    materials: [MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN],
  });
  await assert.rejects(
    () =>
      generateCertificateMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        person: manifest.person,
      }),
    /kein Urkunde-Materialtyp/
  );
});

test("wirft ohne Dateinamen im Eintrag", async () => {
  await assert.rejects(
    () =>
      generateCertificateMaterial({
        entry: { key: MATERIAL_TYPE_KEYS.CERTIFICATE_REPRESENTATIVE, filename: "" },
        templateConfig: {},
        person: { firstName: "Kim", lastName: "Yu" },
      }),
    /fehlender Dateiname/
  );
});
