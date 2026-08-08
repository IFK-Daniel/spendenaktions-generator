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

function backAssets() {
  return { qrPartnerWerdenAsset: fakePhotoAsset(), qrMehrErfahrenAsset: fakePhotoAsset() };
}

test("erzeugt ein zweiseitiges Flyer-PDF-Material mit korrektem Dateinamen/Mimetype und ruft renderMultiPageDocument mit Vorder- UND Rückseite auf", async () => {
  const manifest = manifestWithFlyer();
  const entry = manifest.materials[0];

  let capturedArgs = null;
  const fakeRenderMultiPageDocument = async (args) => {
    capturedArgs = args;
    return { bytes: new Uint8Array([9, 9, 9]), warnings: [] };
  };

  const result = await generateFlyerMaterial({
    entry,
    templateConfig: { key: "FLYER_DRUCKEREI" },
    backTemplateConfig: { key: "FLYER_DRUCKEREI_BACK" },
    person: manifest.person,
    photoAsset: fakePhotoAsset(),
    qrPaypalAsset: fakePhotoAsset(),
    qrGiroAsset: fakePhotoAsset(),
    ...backAssets(),
    deps: { renderMultiPageDocument: fakeRenderMultiPageDocument },
  });

  assert.equal(result.key, MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI);
  assert.equal(result.filename, entry.filename);
  assert.equal(result.mimeType, "application/pdf");
  assert.deepEqual(result.warnings, []);

  assert.equal(capturedArgs.pages.length, 2);
  const [frontPage, backPage] = capturedArgs.pages;
  assert.equal(frontPage.templateConfig.key, "FLYER_DRUCKEREI");
  assert.equal(backPage.templateConfig.key, "FLYER_DRUCKEREI_BACK");
  assert.equal(frontPage.textValues.name, "Kim Yu");
  assert.equal(frontPage.textValues.region, "Wien");
  assert.equal(frontPage.textValues.regionInParagraph, "Wien");
  assert.equal(frontPage.textValues.phone, "0170 1234567");
  assert.equal(frontPage.textValues.email, "kim.yu@example.com");
  assert.equal(frontPage.imageAssets.photo.bytes, FAKE_PNG_BYTES);
  assert.equal(backPage.imageAssets.qrPartnerWerden.bytes, FAKE_PNG_BYTES);
  assert.equal(backPage.imageAssets.qrMehrErfahren.bytes, FAKE_PNG_BYTES);
});

test("gibt warnings von renderMultiPageDocument unverändert durch", async () => {
  const manifest = manifestWithFlyer();
  const fakeWarnings = [{ pageIndex: 0, fieldKey: "region", sizePt: 4.25, minSizePt: 4, reason: "..." }];
  const fakeRenderMultiPageDocument = async () => ({ bytes: new Uint8Array([1]), warnings: fakeWarnings });

  const result = await generateFlyerMaterial({
    entry: manifest.materials[0],
    templateConfig: {},
    backTemplateConfig: {},
    person: manifest.person,
    photoAsset: fakePhotoAsset(),
    qrPaypalAsset: fakePhotoAsset(),
    qrGiroAsset: fakePhotoAsset(),
    ...backAssets(),
    deps: { renderMultiPageDocument: fakeRenderMultiPageDocument },
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
        backTemplateConfig: {},
        person: manifest.person,
        photoAsset: null,
        qrPaypalAsset: fakePhotoAsset(),
        qrGiroAsset: fakePhotoAsset(),
        ...backAssets(),
      }),
    /photoAsset/
  );
});

test("wirft ohne QR-Assets (Vorderseite)", async () => {
  const manifest = manifestWithFlyer();
  await assert.rejects(
    () =>
      generateFlyerMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        backTemplateConfig: {},
        person: manifest.person,
        photoAsset: fakePhotoAsset(),
        qrPaypalAsset: null,
        qrGiroAsset: null,
        ...backAssets(),
      }),
    /qrPaypalAsset/
  );
});

test("wirft ohne QR-Assets (Rückseite)", async () => {
  const manifest = manifestWithFlyer();
  await assert.rejects(
    () =>
      generateFlyerMaterial({
        entry: manifest.materials[0],
        templateConfig: {},
        backTemplateConfig: {},
        person: manifest.person,
        photoAsset: fakePhotoAsset(),
        qrPaypalAsset: fakePhotoAsset(),
        qrGiroAsset: fakePhotoAsset(),
        qrPartnerWerdenAsset: null,
        qrMehrErfahrenAsset: null,
      }),
    /qrPartnerWerdenAsset/
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
        backTemplateConfig: {},
        person: manifest.person,
        photoAsset: fakePhotoAsset(),
        qrPaypalAsset: fakePhotoAsset(),
        qrGiroAsset: fakePhotoAsset(),
        ...backAssets(),
      }),
    /kein Flyer-Materialtyp/
  );
});
