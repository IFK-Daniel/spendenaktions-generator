import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, rgb } from "pdf-lib";
import {
  generateFlyerHomeSheet,
  HOME_SHEET_WIDTH_MM,
  HOME_SHEET_HEIGHT_MM,
  HOME_SLOT_WIDTH_MM,
  HOME_CUT_X_MM,
} from "./generateFlyerHomeSheet.js";
import { buildMaterialManifest } from "./buildMaterialManifest.js";
import { MATERIAL_TYPE_KEYS } from "./materialTypes.js";

const FAKE_PNG_BYTES = new Uint8Array([1, 2, 3]);

function fakeAsset() {
  return { bytes: FAKE_PNG_BYTES, mimeType: "image/png" };
}

function manifestWithHome() {
  return buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    region: "Wien",
    phone: "0170 1234567",
    email: "kim.yu@example.com",
    materials: [MATERIAL_TYPE_KEYS.FLYER_HOME],
  });
}

test("Geometrie: exakt DIN A4 quer (297x210mm), 2 Seiten, keine Warnungen", async () => {
  const manifest = manifestWithHome();
  const entry = manifest.materials[0];

  const result = await generateFlyerHomeSheet({
    entry,
    frontTemplateConfig: { key: "FRONT", fields: {} },
    backTemplateConfig: { key: "BACK", fields: {} },
    person: manifest.person,
    photoAsset: fakeAsset(),
    qrPaypalAsset: fakeAsset(),
    qrGiroAsset: fakeAsset(),
    deps: {
      renderFlyer: async ({ templateConfig }) => ({
        bytes: await buildSinglePagePdf(148, 210),
        warnings: [],
      }),
    },
  });

  assert.equal(result.key, MATERIAL_TYPE_KEYS.FLYER_HOME);
  assert.equal(result.filename, entry.filename);
  assert.equal(result.mimeType, "application/pdf");
  assert.deepEqual(result.warnings, []);

  const buf = await result.content.arrayBuffer();
  const doc = await PDFDocument.load(buf);
  assert.equal(doc.getPageCount(), 2);
  for (const page of doc.getPages()) {
    assert.ok(Math.abs(ptToMmLocal(page.getWidth()) - HOME_SHEET_WIDTH_MM) < 0.05, "Breite ~297mm");
    assert.ok(Math.abs(ptToMmLocal(page.getHeight()) - HOME_SHEET_HEIGHT_MM) < 0.05, "Höhe ~210mm");
  }
});

test("Konstanten: Slotbreite 148mm, Schnittposition bei 148,5mm (0,5mm Außenrand)", () => {
  assert.equal(HOME_SLOT_WIDTH_MM, 148);
  assert.equal(HOME_CUT_X_MM, 148.5);
  assert.equal(HOME_SHEET_WIDTH_MM - 2 * HOME_SLOT_WIDTH_MM, 1); // 297 - 2*148 = 1mm Rest, symmetrisch verteilt
});

test("Vorderseite wird über renderFlyer mit textValues/imageAssets aufgerufen, Rückseite ohne", async () => {
  const manifest = manifestWithHome();
  const calls = [];
  await generateFlyerHomeSheet({
    entry: manifest.materials[0],
    frontTemplateConfig: { key: "FRONT", fields: {} },
    backTemplateConfig: { key: "BACK", fields: {} },
    person: manifest.person,
    photoAsset: fakeAsset(),
    qrPaypalAsset: fakeAsset(),
    qrGiroAsset: fakeAsset(),
    deps: {
      renderFlyer: async (args) => {
        calls.push(args);
        return { bytes: await buildSinglePagePdf(148, 210), warnings: [] };
      },
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].templateConfig.key, "FRONT");
  assert.equal(calls[0].textValues.name, "Kim Yu");
  assert.equal(calls[0].textValues.region, "Wien");
  assert.deepEqual(Object.keys(calls[0].imageAssets).sort(), ["photo", "qrGiro", "qrPaypal"]);
  assert.equal(calls[1].templateConfig.key, "BACK");
  assert.equal(calls[1].textValues, undefined);
  assert.equal(calls[1].imageAssets, undefined);
});

test("gibt renderFlyer-Warnings mit pageIndex durchgereicht zurück", async () => {
  const manifest = manifestWithHome();
  const result = await generateFlyerHomeSheet({
    entry: manifest.materials[0],
    frontTemplateConfig: { key: "FRONT", fields: {} },
    backTemplateConfig: { key: "BACK", fields: {} },
    person: manifest.person,
    photoAsset: fakeAsset(),
    qrPaypalAsset: fakeAsset(),
    qrGiroAsset: fakeAsset(),
    deps: {
      renderFlyer: async ({ templateConfig }) => ({
        bytes: await buildSinglePagePdf(148, 210),
        warnings: templateConfig.key === "FRONT" ? [{ fieldKey: "name", sizePt: 6, minSizePt: 6, reason: "..." }] : [],
      }),
    },
  });
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].pageIndex, 0);
});

test("wirft ohne Foto-Asset", async () => {
  const manifest = manifestWithHome();
  await assert.rejects(
    () =>
      generateFlyerHomeSheet({
        entry: manifest.materials[0],
        frontTemplateConfig: { fields: {} },
        backTemplateConfig: { fields: {} },
        person: manifest.person,
        photoAsset: null,
        qrPaypalAsset: fakeAsset(),
        qrGiroAsset: fakeAsset(),
      }),
    /photoAsset/
  );
});

test("wirft bei Nicht-Home-Materialtyp", async () => {
  const manifest = buildMaterialManifest({
    firstName: "Kim",
    lastName: "Yu",
    ifkId: "IFK7QX",
    materials: [MATERIAL_TYPE_KEYS.FLYER_DRUCKEREI],
  });
  await assert.rejects(
    () =>
      generateFlyerHomeSheet({
        entry: manifest.materials[0],
        frontTemplateConfig: { fields: {} },
        backTemplateConfig: { fields: {} },
        person: manifest.person,
        photoAsset: fakeAsset(),
        qrPaypalAsset: fakeAsset(),
        qrGiroAsset: fakeAsset(),
      }),
    /kein Home-Flyer-Materialtyp/
  );
});

// --- Hilfsfunktionen ---

async function buildSinglePagePdf(widthMm, heightMm) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([widthMm * (72 / 25.4), heightMm * (72 / 25.4)]);
  // imposePagesOnSheet() embedded diese Seite per pdf-lib embedPage(),
  // was einen tatsächlichen Content-Stream erfordert — leere Seite reicht
  // als Testfixture nicht ("Can't embed page with missing Contents").
  page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: page.getHeight(), color: rgb(1, 1, 1) });
  return doc.save();
}

function ptToMmLocal(pt) {
  return pt / (72 / 25.4);
}
