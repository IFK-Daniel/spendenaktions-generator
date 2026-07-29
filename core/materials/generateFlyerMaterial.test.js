import { test } from "node:test";
import assert from "node:assert/strict";
import { generateFlyerMaterial } from "./generateFlyerMaterial.js";
import { buildMaterialManifest } from "./buildMaterialManifest.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

const FAKE_PNG_BYTES = new Uint8Array([1, 2, 3]);

function fakePhotoAsset() {
  return { bytes: FAKE_PNG_BYTES, mimeType: "image/png" };
}

function manifestWithFlyer() {
  return buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    region: "Wien",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
    materials: [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI],
  });
}

test("erzeugt ein Flyer-PDF-Material mit korrektem Dateinamen/Mimetype und ruft renderFlyer mit den erwarteten textValues auf", async () => {
  const manifest = manifestWithFlyer();
  const entry = manifest.materials[0];

  let capturedArgs = null;
  const fakeRenderFlyer = async (args) => {
    capturedArgs = args;
    return { bytes: new Uint8Array([9, 9, 9]), warnings: [] };
  };

  const result = await generateFlyerMaterial({
    entry,
    templateConfig: { key: "FLYER_DRUCKEREI" },
    person: manifest.person,
    photoAsset: fakePhotoAsset(),
    qrPaypalAsset: fakePhotoAsset(),
    qrGiroAsset: fakePhotoAsset(),
    deps: { renderFlyer: fakeRenderFlyer },
  });

  assert.equal(result.key, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI);
  assert.equal(result.filename, entry.filename);
  assert.equal(result.mimeType, "application/pdf");
  assert.deepEqual(result.warnings, []);

  assert.equal(capturedArgs.textValues.name, "Kim Yu");
  assert.equal(capturedArgs.textValues.region, "Wien");
  assert.equal(capturedArgs.textValues.regionInParagraph, "Wien");
  assert.equal(capturedArgs.textValues.phone, "0170 1234567");
  assert.equal(capturedArgs.textValues.email, "kim.yu@example.com");
  assert.equal(capturedArgs.imageAssets.photo.bytes, FAKE_PNG_BYTES);
});

test("gibt warnings von renderFlyer unverändert durch", async () => {
  const manifest = manifestWithFlyer();
  const fakeWarnings = [{ fieldKey: "regionInParagraph", sizePt: 4.25, minSizePt: 4, reason: "..." }];
  const fakeRenderFlyer = async () => ({ bytes: new Uint8Array([1]), warnings: fakeWarnings });

  const result = await generateFlyerMaterial({
    entry: manifest.materials[0],
    templateConfig: {},
    person: manifest.person,
    photoAsset: fakePhotoAsset(),
    qrPaypalAsset: fakePhotoAsset(),
    qrGiroAsset: fakePhotoAsset(),
    deps: { renderFlyer: fakeRenderFlyer },
  });

  assert.deepEqual(result.warnings, fakeWarnings);
});

test("wirft ohne Foto-Asset", async () => {
  const manifest = manifestWithFlyer();
  await assert.rejects(
    () =>
      generateFlyerMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        person: manifest.person,
        photoAsset: null,
        qrPaypalAsset: fakePhotoAsset(),
        qrGiroAsset: fakePhotoAsset(),
      }),
    /photoAsset/
  );
});

test("wirft ohne QR-Assets", async () => {
  const manifest = manifestWithFlyer();
  await assert.rejects(
    () =>
      generateFlyerMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        person: manifest.person,
        photoAsset: fakePhotoAsset(),
        qrPaypalAsset: null,
        qrGiroAsset: null,
      }),
    /qrPaypalAsset/
  );
});

test("wirft bei Nicht-Flyer-Materialtyp", async () => {
  const manifest = buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    materials: [MATERIAL_TYPE_KEYS.QR_PAYPAL_GREEN],
  });
  await assert.rejects(
    () =>
      generateFlyerMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        person: manifest.person,
        photoAsset: fakePhotoAsset(),
        qrPaypalAsset: fakePhotoAsset(),
        qrGiroAsset: fakePhotoAsset(),
      }),
    /kein Flyer-Materialtyp/
  );
});
